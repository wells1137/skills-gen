/**
 * _auth.js — Shared Token authentication & quota management
 *
 * Design:
 * - Each user gets a unique Token (UUID v4), auto-generated on first request
 * - Each IP can only have 1 Token (prevents abuse)
 * - Each Token has 100 free uses (persistent, never resets)
 * - Pro users (with IG_PRO_ key) bypass all limits
 *
 * Storage:
 * - Upstash Redis (via REST API) for persistence across serverless invocations
 *
 * Redis key structure:
 *   token:{token}       → JSON { ip, used, created_at }
 *   ip:{ip}             → token string
 */

import crypto from "crypto";
import { Redis } from "@upstash/redis";

const FREE_LIMIT = 100;

// ── Redis client (lazy singleton) ─────────────────────────────────────────
let _redis = null;
function getRedis() {
  if (!_redis) {
    // Vercel auto-injects KV_REST_API_URL and KV_REST_API_TOKEN when
    // an Upstash store is connected. We also support the UPSTASH_* names.
    const url =
      process.env.KV_REST_API_URL ||
      process.env.UPSTASH_REDIS_REST_URL;
    const token =
      process.env.KV_REST_API_TOKEN ||
      process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        "Redis not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN env vars."
      );
    }
    _redis = new Redis({ url, token });
  }
  return _redis;
}

/**
 * Check if user has a Pro key (bypasses all limits)
 */
export function isProUser(proKey) {
  return Boolean(proKey && proKey.startsWith("IG_PRO_"));
}

/**
 * Get the client IP from the request
 */
export function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "unknown"
  )
    .split(",")[0]
    .trim();
}

/**
 * Get the token from the request header
 */
export function getTokenFromRequest(req) {
  return req.headers["x-imagegen-token"] || "";
}

/**
 * Register a new token for an IP, or return existing one.
 * Returns: { token, is_new, used, remaining, limit }
 */
export async function registerToken(ip) {
  const redis = getRedis();

  // Check if this IP already has a token
  const existingToken = await redis.get(`ip:${ip}`);
  if (existingToken) {
    const data = await redis.get(`token:${existingToken}`);
    if (data) {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return {
        token: existingToken,
        is_new: false,
        used: parsed.used,
        remaining: Math.max(0, FREE_LIMIT - parsed.used),
        limit: FREE_LIMIT,
      };
    }
  }

  // Generate new token
  const token = crypto.randomUUID();
  const data = { ip, used: 0, created_at: new Date().toISOString() };

  // Store both mappings atomically via pipeline
  const pipeline = redis.pipeline();
  pipeline.set(`token:${token}`, JSON.stringify(data));
  pipeline.set(`ip:${ip}`, token);
  await pipeline.exec();

  return {
    token,
    is_new: true,
    used: 0,
    remaining: FREE_LIMIT,
    limit: FREE_LIMIT,
  };
}

/**
 * Validate a token and check quota.
 * Returns: { valid, token, used, remaining, limit, error?, message? }
 */
export async function validateToken(token) {
  if (!token) {
    return {
      valid: false,
      error: "missing_token",
      message:
        "No token provided. Call POST /api/token to get one.",
    };
  }

  const redis = getRedis();
  const raw = await redis.get(`token:${token}`);
  if (!raw) {
    return {
      valid: false,
      error: "invalid_token",
      message:
        "Invalid token. Call POST /api/token to get a new one.",
    };
  }

  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  const remaining = Math.max(0, FREE_LIMIT - data.used);

  if (remaining <= 0) {
    return {
      valid: false,
      error: "quota_exhausted",
      message: `You have used all ${FREE_LIMIT} free image generations. Please upgrade to Pro for unlimited access.`,
      used: data.used,
      remaining: 0,
      limit: FREE_LIMIT,
    };
  }

  return {
    valid: true,
    token,
    used: data.used,
    remaining,
    limit: FREE_LIMIT,
  };
}

/**
 * Increment usage for a token. Call AFTER successful generation.
 * Returns: { used, remaining, limit, warning? }
 */
export async function incrementUsage(token) {
  const redis = getRedis();
  const raw = await redis.get(`token:${token}`);
  if (!raw) return null;

  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  data.used += 1;
  await redis.set(`token:${token}`, JSON.stringify(data));

  const remaining = Math.max(0, FREE_LIMIT - data.used);
  const result = { used: data.used, remaining, limit: FREE_LIMIT };

  if (remaining <= 10 && remaining > 0) {
    result.warning = `You have ${remaining} free uses remaining out of ${FREE_LIMIT}. Upgrade to Pro for unlimited access.`;
  } else if (remaining === 0) {
    result.warning = `You have used all ${FREE_LIMIT} free image generations. Please upgrade to Pro for unlimited access.`;
  }

  return result;
}

/**
 * Get usage info for a token (read-only, no side effects)
 */
export async function getUsageInfo(token) {
  const redis = getRedis();
  const raw = await redis.get(`token:${token}`);
  if (!raw) return null;
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  const remaining = Math.max(0, FREE_LIMIT - data.used);
  return { used: data.used, remaining, limit: FREE_LIMIT };
}

export { FREE_LIMIT };
