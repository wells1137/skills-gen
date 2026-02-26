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
 * - Production: Vercel KV (Redis) for persistence
 * - Local dev: In-memory Map (resets on restart, fine for testing)
 *
 * Data structure in KV:
 *   token:{token}       → { ip, used, created_at }
 *   ip:{ip}             → { token }
 */

import crypto from "crypto";

const FREE_LIMIT = 100;

// ── Storage backend ───────────────────────────────────────────────────────
// In local dev, we use in-memory Maps.
// In production (Vercel), replace with Vercel KV calls.
const tokenStore = new Map();   // token → { ip, used, created_at }
const ipStore = new Map();      // ip → token

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
  return (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .split(",")[0].trim();
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
export function registerToken(ip) {
  // Check if this IP already has a token
  const existingToken = ipStore.get(ip);
  if (existingToken) {
    const data = tokenStore.get(existingToken);
    if (data) {
      return {
        token: existingToken,
        is_new: false,
        used: data.used,
        remaining: Math.max(0, FREE_LIMIT - data.used),
        limit: FREE_LIMIT,
      };
    }
  }

  // Generate new token
  const token = crypto.randomUUID();
  const data = { ip, used: 0, created_at: new Date().toISOString() };
  tokenStore.set(token, data);
  ipStore.set(ip, token);

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
 * Returns: { valid, token, used, remaining, limit, error? }
 */
export function validateToken(token) {
  if (!token) {
    return { valid: false, error: "missing_token", message: "No token provided. Call POST /api/token to get one." };
  }

  const data = tokenStore.get(token);
  if (!data) {
    return { valid: false, error: "invalid_token", message: "Invalid token. Call POST /api/token to get a new one." };
  }

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
export function incrementUsage(token) {
  const data = tokenStore.get(token);
  if (!data) return null;

  data.used += 1;
  tokenStore.set(token, data);

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
export function getUsageInfo(token) {
  const data = tokenStore.get(token);
  if (!data) return null;
  const remaining = Math.max(0, FREE_LIMIT - data.used);
  return { used: data.used, remaining, limit: FREE_LIMIT };
}

export { FREE_LIMIT };
