/**
 * image-gen-proxy — /api/token
 * Token registration and quota query endpoint.
 *
 * POST /api/token → Register a new token (or return existing one for this IP)
 *   Response: { token, is_new, used, remaining, limit, message }
 *
 * GET /api/token → Query quota for an existing token
 *   Header: X-ImageGen-Token: <token>
 *   Response: { token, used, remaining, limit }
 */

import {
  getClientIp,
  getTokenFromRequest,
  registerToken,
  getUsageInfo,
  FREE_LIMIT,
} from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-ImageGen-Token, X-ImageGen-Key");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // ── POST: Register token ──────────────────────────────────────────────
    if (req.method === "POST") {
      const ip = getClientIp(req);
      const result = await registerToken(ip);

      const message = result.is_new
        ? `Welcome! Your free token has been created. You have ${FREE_LIMIT} free image generations.`
        : `Welcome back! You have ${result.remaining} free image generations remaining out of ${FREE_LIMIT}.`;

      return res.status(200).json({
        success: true,
        token: result.token,
        is_new: result.is_new,
        used: result.used,
        remaining: result.remaining,
        limit: result.limit,
        message,
      });
    }

    // ── GET: Query quota ──────────────────────────────────────────────────
    if (req.method === "GET") {
      const token = getTokenFromRequest(req);
      if (!token) {
        return res.status(400).json({
          error: "missing_token",
          message: "Provide your token via X-ImageGen-Token header. Or POST /api/token to get one.",
        });
      }

      const info = await getUsageInfo(token);
      if (!info) {
        return res.status(404).json({
          error: "invalid_token",
          message: "Token not found. POST /api/token to register a new one.",
        });
      }

      return res.status(200).json({
        success: true,
        token,
        used: info.used,
        remaining: info.remaining,
        limit: info.limit,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Token endpoint error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
