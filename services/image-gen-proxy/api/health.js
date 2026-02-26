export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    service: "Image-Gen Proxy",
    version: "1.0.0",
    endpoints: {
      "GET  /api/health": "Health check + model registry",
      "POST /api/generate": "Image generation (fal.ai models)",
      "POST /api/midjourney": "Midjourney imagine / upscale / variation / poll"
    }
  });
}
