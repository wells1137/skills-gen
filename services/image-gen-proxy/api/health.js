export default function handler(req, res) {
  const hasRedis = Boolean(
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  );

  res.status(200).json({
    status: "ok",
    service: "Image-Gen Proxy",
    version: "2.1.0",
    storage: hasRedis ? "redis" : "not_configured",
    free_limit: 100,
    auth: "Token-based. POST /api/token to register. Include X-ImageGen-Token header in requests.",
    endpoints: {
      "POST /api/token": "Register a free token (100 uses per IP, 1 token per IP)",
      "GET  /api/token": "Check remaining quota (requires X-ImageGen-Token header)",
      "GET  /api/health": "Health check + endpoint listing",
      "POST /api/generate": "Image generation (fal.ai models: Flux, SDXL, Ideogram, Recraft, etc.)",
      "POST /api/midjourney": "Midjourney imagine / upscale / variation / poll"
    }
  });
}
