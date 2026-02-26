# Image-Gen Proxy

A lightweight Vercel serverless proxy that powers the **image-gen** ClawHub skill. Users of the skill get free image generations without needing any API key. After the free trial, they can upgrade to Pro.

## Architecture

```
User's Agent
    ↓ (no API key needed)
image-gen skill (local)
    ↓ HTTP POST
Image-Gen Proxy (this Vercel project)
    ├─→ fal.ai (Flux, SDXL, Ideogram, Recraft, Nano Banana)
    └─→ Legnext.ai (Midjourney)
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET/POST | `/api/generate` | fal.ai image generation (GET = model list, POST = generate) |
| GET/POST | `/api/midjourney` | Midjourney via Legnext.ai (GET = info, POST = imagine/upscale/poll) |

## Request Format — `/api/generate`

```json
{
  "model": "flux-schnell",
  "prompt": "a cute cat sitting on a windowsill",
  "aspect_ratio": "16:9",
  "num_images": 1,
  "negative_prompt": "",
  "seed": 12345
}
```

Available models: `flux-pro`, `flux-dev`, `flux-schnell`, `sdxl`, `nano-banana`, `ideogram`, `recraft`

## Request Format — `/api/midjourney`

```json
{
  "action": "imagine",
  "prompt": "a majestic dragon on a mountain peak",
  "aspect_ratio": "16:9",
  "mode": "turbo"
}
```

Actions: `imagine`, `upscale`, `variation`, `reroll`, `describe`, `poll`

Add header `X-ImageGen-Key: IG_PRO_xxxxx` for Pro users (unlimited usage).

## Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Set environment variables:
   - `FAL_KEY=your_fal_ai_key`
   - `LEGNEXT_KEY=your_legnext_key`
3. Deploy: `vercel --prod`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FAL_KEY` | fal.ai API key (for Flux, SDXL, Ideogram, Recraft, Nano Banana) |
| `LEGNEXT_KEY` | Legnext.ai API key (for Midjourney) |

## Free Trial Logic

- **fal.ai models**: 50 free generations per IP
- **Midjourney**: 20 free generations per IP (higher cost per generation)
- After limits are reached, the API returns `402` with an upgrade prompt
- Pro users bypass all limits by sending `X-ImageGen-Key` header
