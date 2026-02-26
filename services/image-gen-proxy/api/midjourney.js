/**
 * image-gen-proxy — /api/midjourney
 * Proxies Midjourney requests to Legnext.ai.
 * Supports: imagine, upscale, variation, reroll, describe, poll.
 *
 * POST /api/midjourney
 * {
 *   "action": "imagine",           // imagine | upscale | variation | reroll | describe | poll
 *   "prompt": "a dragon ...",       // required for imagine
 *   "job_id": "...",               // required for upscale/variation/reroll/describe/poll
 *   "index": 1,                    // 1-4, for upscale/variation
 *   "type": 0,                     // 0=Subtle, 1=Creative (for upscale/variation)
 *   "mode": "turbo",               // turbo | fast | relax
 *   "aspect_ratio": "16:9",        // optional, appended to prompt
 *   "remix_prompt": "..."          // optional, for variation with remix
 * }
 */

export const config = { maxDuration: 30 };

const FREE_LIMIT = 20;  // MJ is expensive, lower free limit

// ── In-memory usage store ──────────────────────────────────────────────────
const usageStore = {};
function getUsage(userId) { return usageStore[userId] || 0; }
function incrementUsage(userId) {
  const count = (usageStore[userId] || 0) + 1;
  usageStore[userId] = count;
  return count;
}
function isProUser(proKey) {
  return Boolean(proKey && proKey.startsWith("IG_PRO_"));
}

// ── Legnext.ai HTTP helper ─────────────────────────────────────────────────
async function legnextRequest(method, path, body) {
  const apiKey = process.env.LEGNEXT_KEY;
  if (!apiKey) throw new Error("LEGNEXT_KEY not configured on server");

  const url = `https://api.legnext.ai/api/v1${path}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (_) {
    throw new Error(`Invalid JSON from Legnext.ai: ${text.slice(0, 200)}`);
  }
}

// ── MAIN HANDLER ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-ImageGen-Key");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({
      service: "Image-Gen Proxy — Midjourney",
      version: "1.0.0",
      free_limit: FREE_LIMIT,
      actions: ["imagine", "upscale", "variation", "reroll", "describe", "poll"],
      modes: ["turbo", "fast", "relax"]
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const payload = req.body;
  if (!payload) return res.status(400).json({ error: "Invalid JSON body" });

  const action = (payload.action || "imagine").toLowerCase();

  // Auth & usage check (only for imagine, not for poll/upscale)
  const proKey = req.headers["x-imagegen-key"] || "";
  const userIp = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .split(",")[0].trim();

  if (action === "imagine" && !isProUser(proKey)) {
    const usage = getUsage(userIp);
    if (usage >= FREE_LIMIT) {
      return res.status(402).json({
        error: "free_trial_exhausted",
        message: `You have used all ${FREE_LIMIT} free Midjourney generations. Upgrade to Pro for unlimited access.`,
        used: usage, limit: FREE_LIMIT
      });
    }
  }

  try {
    // ── Poll (non-blocking status check) ─────────────────────────────────
    if (action === "poll") {
      if (!payload.job_id) return res.status(400).json({ error: "job_id is required for poll" });
      const result = await legnextRequest("GET", `/job/${payload.job_id}`);
      const status = result.status;

      if (status === "completed") {
        return res.status(200).json({
          success: true, model: "midjourney", job_id: payload.job_id, status: "completed",
          image_url: result.output?.image_url || null,
          image_urls: result.output?.image_urls || [],
          seed: result.output?.seed || null,
        });
      } else if (status === "failed") {
        return res.status(200).json({
          success: false, model: "midjourney", job_id: payload.job_id, status: "failed",
          error: result.error?.message || "Job failed",
        });
      } else {
        return res.status(200).json({
          success: true, model: "midjourney", job_id: payload.job_id,
          status: status || "pending", pending: true,
          message: `Job is still ${status || "pending"}. Check again in a few seconds.`,
        });
      }
    }

    // ── Imagine ──────────────────────────────────────────────────────────
    if (action === "imagine") {
      if (!payload.prompt) return res.status(400).json({ error: "prompt is required for imagine" });

      let mjPrompt = payload.prompt;
      const ar = payload.aspect_ratio;
      const mode = payload.mode || "turbo";

      if (ar && ar !== "1:1") mjPrompt += ` --ar ${ar}`;
      if (mode === "turbo") mjPrompt += " --turbo";
      else if (mode === "fast") mjPrompt += " --fast";
      else if (mode === "relax") mjPrompt += " --relax";

      const result = await legnextRequest("POST", "/diffusion", { text: mjPrompt });
      if (!result.job_id) return res.status(502).json({ error: "Legnext.ai submission failed", detail: result });

      // Track usage
      if (!isProUser(proKey)) incrementUsage(userIp);

      return res.status(200).json({
        success: true, model: "midjourney", action: "imagine",
        job_id: result.job_id, status: "submitted", pending: true,
        prompt: mjPrompt,
        message: `Midjourney job submitted. Poll with action:"poll", job_id:"${result.job_id}" to check status.`,
      });
    }

    // ── Upscale ──────────────────────────────────────────────────────────
    if (action === "upscale") {
      if (!payload.job_id) return res.status(400).json({ error: "job_id is required" });
      const imageNo = (payload.index || 1) - 1;
      const type = payload.type || 0;

      const result = await legnextRequest("POST", "/upscale", {
        jobId: payload.job_id, imageNo, type
      });
      if (!result.job_id) return res.status(502).json({ error: "Upscale submission failed", detail: result });

      return res.status(200).json({
        success: true, model: "midjourney", action: "upscale",
        job_id: result.job_id, status: "submitted", pending: true,
        message: `Upscale job submitted. Poll with action:"poll", job_id:"${result.job_id}" to check status.`,
      });
    }

    // ── Variation ────────────────────────────────────────────────────────
    if (action === "variation") {
      if (!payload.job_id) return res.status(400).json({ error: "job_id is required" });
      const imageNo = (payload.index || 1) - 1;
      const type = payload.type || 0;
      const body = { jobId: payload.job_id, imageNo, type };
      if (payload.remix_prompt) body.remixPrompt = payload.remix_prompt;

      const result = await legnextRequest("POST", "/variation", body);
      if (!result.job_id) return res.status(502).json({ error: "Variation submission failed", detail: result });

      return res.status(200).json({
        success: true, model: "midjourney", action: "variation",
        job_id: result.job_id, status: "submitted", pending: true,
        message: `Variation job submitted. Poll with action:"poll", job_id:"${result.job_id}" to check status.`,
      });
    }

    // ── Reroll ───────────────────────────────────────────────────────────
    if (action === "reroll") {
      if (!payload.job_id) return res.status(400).json({ error: "job_id is required" });
      const result = await legnextRequest("POST", "/reroll", { jobId: payload.job_id });
      if (!result.job_id) return res.status(502).json({ error: "Reroll submission failed", detail: result });

      return res.status(200).json({
        success: true, model: "midjourney", action: "reroll",
        job_id: result.job_id, status: "submitted", pending: true,
      });
    }

    // ── Describe ─────────────────────────────────────────────────────────
    if (action === "describe") {
      if (!payload.job_id) return res.status(400).json({ error: "job_id is required" });
      const result = await legnextRequest("POST", "/describe", { jobId: payload.job_id });
      if (!result.job_id) return res.status(502).json({ error: "Describe submission failed", detail: result });

      return res.status(200).json({
        success: true, model: "midjourney", action: "describe",
        job_id: result.job_id, status: "submitted", pending: true,
      });
    }

    return res.status(400).json({ error: `Unknown action: "${action}"`, available: ["imagine", "upscale", "variation", "reroll", "describe", "poll"] });

  } catch (err) {
    return res.status(502).json({ error: "Midjourney service error", detail: err.message });
  }
}
