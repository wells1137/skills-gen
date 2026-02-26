/**
 * image-gen-proxy — /api/generate
 * Proxies image generation requests to fal.ai.
 * Users send a simple JSON body; the proxy injects the FAL_KEY server-side.
 *
 * POST /api/generate
 * {
 *   "model": "flux-schnell",       // flux-pro | flux-dev | flux-schnell | sdxl | nano-banana | ideogram | recraft
 *   "prompt": "a cute cat ...",
 *   "aspect_ratio": "16:9",        // optional, default "1:1"
 *   "num_images": 1,               // optional, default 1, max 4
 *   "negative_prompt": "",          // optional
 *   "seed": 12345                   // optional
 * }
 *
 * GET /api/generate → model registry
 */

export const config = { maxDuration: 120 };

const FREE_LIMIT = 50;

// ── In-memory usage store (keyed by IP) ────────────────────────────────────
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

// ── fal.ai model registry ──────────────────────────────────────────────────
const FAL_MODELS = {
  "flux-pro":     { falId: "fal-ai/flux-pro/v1.1",   desc: "Flux Pro 1.1 — highest quality, commercial-grade" },
  "flux-dev":     { falId: "fal-ai/flux/dev",         desc: "Flux Dev — high quality, good balance of speed and detail" },
  "flux-schnell": { falId: "fal-ai/flux/schnell",     desc: "Flux Schnell — ultra-fast (~0.1s), great for drafts and iteration" },
  "sdxl":         { falId: "fal-ai/fast-sdxl",        desc: "SDXL — fast Stable Diffusion XL with LoRA support" },
  "nano-banana":  { falId: "fal-ai/nano-banana-pro",  desc: "Nano Banana Pro (Gemini) — versatile, good at creative styles" },
  "ideogram":     { falId: "fal-ai/ideogram/v3",      desc: "Ideogram v3 — best for text rendering in images, logos, posters" },
  "recraft":      { falId: "fal-ai/recraft-v3",       desc: "Recraft v3 — vector illustration, design assets, brand graphics" },
};

// ── Aspect ratio helpers ───────────────────────────────────────────────────
function arToWidthHeight(ar) {
  const map = {
    "1:1":  [1024, 1024], "16:9": [1344, 768], "9:16": [768, 1344],
    "4:3":  [1152, 864],  "3:4":  [864, 1152], "3:2":  [1216, 832],
    "2:3":  [832, 1216],  "21:9": [1536, 640],
  };
  return map[ar] || [1024, 1024];
}

function arToFalImageSize(ar) {
  const map = {
    "1:1":  "square_hd",      "16:9": "landscape_16_9",
    "9:16": "portrait_16_9",  "4:3":  "landscape_4_3",
    "3:4":  "portrait_4_3",
  };
  return map[ar] || "square_hd";
}

// ── Build fal.ai input payload per model ───────────────────────────────────
function buildFalInput(modelKey, payload) {
  const ar = payload.aspect_ratio || "1:1";
  const numImages = Math.min(payload.num_images || 1, 4);
  const seed = payload.seed !== undefined ? payload.seed : undefined;
  const negPrompt = payload.negative_prompt || "";
  const [width, height] = arToWidthHeight(ar);
  const imageSize = arToFalImageSize(ar);

  const base = { prompt: payload.prompt };

  switch (modelKey) {
    case "flux-pro":
      return { ...base, image_size: imageSize, num_images: numImages, safety_tolerance: "2", output_format: "jpeg", ...(seed !== undefined && { seed }) };
    case "flux-dev":
      return { ...base, image_size: imageSize, num_inference_steps: 28, num_images: numImages, enable_safety_checker: true, ...(seed !== undefined && { seed }) };
    case "flux-schnell":
      return { ...base, image_size: imageSize, num_inference_steps: 4, num_images: numImages, enable_safety_checker: true, ...(seed !== undefined && { seed }) };
    case "sdxl":
      return { ...base, negative_prompt: negPrompt || "blurry, low quality, distorted", image_size: { width, height }, num_images: numImages, ...(seed !== undefined && { seed }) };
    case "nano-banana":
      return { ...base, image_size: imageSize, num_images: numImages, ...(seed !== undefined && { seed }) };
    case "ideogram":
      return { ...base, aspect_ratio: ar, num_images: numImages, ...(negPrompt && { negative_prompt: negPrompt }), ...(seed !== undefined && { seed }) };
    case "recraft":
      return { ...base, image_size: imageSize, style: "realistic_image", num_images: numImages };
    default:
      return base;
  }
}

// ── fal.ai queue-based call ────────────────────────────────────────────────
async function callFalQueue(falId, falInput, falKey) {
  const headers = {
    "Authorization": `Key ${falKey}`,
    "Content-Type": "application/json"
  };

  // 1. Submit to queue
  const submitRes = await fetch(`https://queue.fal.run/${falId}`, {
    method: "POST", headers, body: JSON.stringify(falInput)
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    return { error: `fal.ai submit failed (${submitRes.status}): ${err}`, status: submitRes.status };
  }

  const submitData = await submitRes.json();
  const request_id = submitData.request_id;
  if (!request_id) return { error: "No request_id from fal.ai" };

  // 2. Poll for result (max ~100s)
  const pollUrl = submitData.status_url || `https://queue.fal.run/${falId}/requests/${request_id}/status`;
  const resultUrl = submitData.response_url || `https://queue.fal.run/${falId}/requests/${request_id}`;

  for (let i = 0; i < 50; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const statusRes = await fetch(pollUrl, { headers });
      if (!statusRes.ok) continue;
      const statusData = await statusRes.json();
      if (statusData.status === "COMPLETED") {
        const resultRes = await fetch(resultUrl, { headers });
        if (!resultRes.ok) return { error: `fal.ai result fetch failed: ${resultRes.status}` };
        return await resultRes.json();
      }
      if (statusData.status === "FAILED") {
        return { error: "fal.ai generation failed", detail: statusData };
      }
    } catch (_) { /* retry */ }
  }
  return { error: "fal.ai timeout: generation took too long" };
}

// ── MAIN HANDLER ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-ImageGen-Key");

  if (req.method === "OPTIONS") return res.status(200).end();

  // GET → model registry
  if (req.method === "GET") {
    return res.status(200).json({
      service: "Image-Gen Proxy",
      version: "1.0.0",
      free_limit: FREE_LIMIT,
      models: Object.entries(FAL_MODELS).map(([id, m]) => ({
        id, fal_id: m.falId, description: m.desc
      })),
      note: "For Midjourney, use POST /api/midjourney instead."
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const payload = req.body;
  if (!payload || !payload.prompt) {
    return res.status(400).json({ error: "Missing required field: prompt" });
  }

  // Auth & usage check
  const proKey = req.headers["x-imagegen-key"] || "";
  const userIp = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .split(",")[0].trim();

  if (!isProUser(proKey)) {
    const usage = getUsage(userIp);
    if (usage >= FREE_LIMIT) {
      return res.status(402).json({
        error: "free_trial_exhausted",
        message: `You have used all ${FREE_LIMIT} free image generations. Upgrade to Pro for unlimited access.`,
        used: usage, limit: FREE_LIMIT
      });
    }
  }

  // Resolve model
  const modelKey = payload.model || "flux-schnell";
  const model = FAL_MODELS[modelKey];
  if (!model) {
    return res.status(400).json({
      error: `Unknown model: "${modelKey}"`,
      available: Object.keys(FAL_MODELS)
    });
  }

  // Call fal.ai
  const falKey = process.env.FAL_KEY;
  if (!falKey) return res.status(500).json({ error: "FAL_KEY not configured on server" });

  let result;
  try {
    const falInput = buildFalInput(modelKey, payload);
    result = await callFalQueue(model.falId, falInput, falKey);
  } catch (err) {
    return res.status(502).json({ error: "Image generation service error", detail: err.message });
  }

  if (result.error) return res.status(result.status || 500).json(result);

  // Extract images
  const images = (result.images || []).map(img => typeof img === "string" ? img : img.url);

  // Track usage
  let usageInfo = {};
  if (!isProUser(proKey)) {
    const newCount = incrementUsage(userIp);
    const remaining = FREE_LIMIT - newCount;
    usageInfo = { _remaining_uses: remaining, _plan: "free" };
    if (remaining <= 5) {
      usageInfo._warning = `Only ${remaining} free uses remaining. Upgrade to Pro for unlimited access.`;
    }
  } else {
    usageInfo = { _plan: "pro" };
  }

  return res.status(200).json({
    success: true,
    model: modelKey,
    fal_model_id: model.falId,
    prompt: payload.prompt,
    images,
    image_url: images[0] || null,
    seed: result.seed ?? null,
    timings: result.timings ?? null,
    ...usageInfo
  });
}
