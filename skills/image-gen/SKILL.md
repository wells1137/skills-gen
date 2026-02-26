---
name: image-gen
description: Generate images using multiple AI models — Midjourney (via Legnext.ai), Flux, SDXL, Nano Banana (Gemini), and more via fal.ai. Automatically picks the best model based on user intent, or lets the user specify one explicitly.
homepage: https://legnext.ai
metadata: {"openclaw":{"emoji":"🎨","primaryEnv":"FAL_KEY","requires":{"env":["FAL_KEY","LEGNEXT_KEY"]},"install":[{"id":"node","kind":"node","package":"@fal-ai/client","label":"Install fal.ai client (npm)"}]}}
---

# Image Generation Skill

This skill enables you to generate images using a variety of state-of-the-art AI models. It supports:

- **Midjourney** (via [Legnext.ai](https://legnext.ai)) — Best for artistic, cinematic, and highly detailed images. Faster and more stable than other MJ providers.
- **Flux 1.1 Pro** (via fal.ai) — Best for photorealistic images and complex scenes.
- **Flux Dev** (via fal.ai) — Fast, high-quality generation for general use.
- **Flux Schnell** (via fal.ai) — Ultra-fast generation (<2s), great for quick drafts.
- **SDXL** (via fal.ai `fal-ai/fast-sdxl`) — Fastest SDXL endpoint, great for stylized art and LoRA support.
- **Nano Banana Pro** (via fal.ai `fal-ai/nano-banana-pro`) — Google Gemini-powered image generation and editing.
- **Ideogram v3** (via fal.ai) — Best for images with text, logos, and typography.
- **Recraft v3** (via fal.ai) — Best for vector-style, icon, and design assets.

---

## Model Selection Guide

When the user does not specify a model, use this guide to pick the best one:

| User Intent | Recommended Model | Model ID |
|---|---|---|
| Artistic, cinematic, painterly, highly detailed | Midjourney | `midjourney` |
| Photorealistic, portrait, product photo | Flux 1.1 Pro | `flux-pro` |
| General purpose, balanced quality/speed | Flux Dev | `flux-dev` |
| Quick draft, fast iteration (<2s) | Flux Schnell | `flux-schnell` |
| Image with text, logo, poster, typography | Ideogram v3 | `ideogram` |
| Vector art, icon, flat design, illustration | Recraft v3 | `recraft` |
| Stylized anime, illustration, concept art | SDXL | `sdxl` |
| Gemini-powered generation or editing | Nano Banana Pro | `nano-banana` |

---

## How to Use This Skill

### Basic Usage

When a user asks to generate an image, follow these steps:

1. **Understand the request**: Identify the subject, style, and any specific requirements.
2. **Select a model**: Use the guide above, or honor the user's explicit model choice.
3. **Enhance the prompt**: Expand the user's prompt with relevant style, lighting, and quality descriptors appropriate for the chosen model.
4. **Call the generation script**: Use the `exec` tool to run the generation script.
5. **Return the result**: Present the image URL(s) to the user.

### Calling the Generation Script

Use the `exec` tool to run the Node.js script at `{baseDir}/generate.js`:

```bash
node {baseDir}/generate.js \
  --model <model_id> \
  --prompt "<enhanced prompt>" \
  [--aspect-ratio <ratio>] \
  [--num-images <1-4>] \
  [--negative-prompt "<negative prompt>"]
```

**Parameters:**
- `--model`: One of `midjourney`, `flux-pro`, `flux-dev`, `flux-schnell`, `sdxl`, `nano-banana`, `ideogram`, `recraft`
- `--prompt`: The image generation prompt (required)
- `--aspect-ratio`: Output aspect ratio, e.g. `16:9`, `1:1`, `9:16`, `4:3`, `3:4` (default: `1:1`)
- `--num-images`: Number of images to generate, 1-4 (default: `1`, Midjourney always returns 4)
- `--negative-prompt`: Things to avoid in the image (not supported by Midjourney)
- `--mode`: Midjourney speed mode: `turbo` (default, ~10-20s, requires Pro/Mega plan), `fast` (~30-60s), `relax` (free but slow)

**Example:**
```bash
node {baseDir}/generate.js \
  --model flux-pro \
  --prompt "a majestic snow leopard on a mountain peak, golden hour lighting, photorealistic, 8k" \
  --aspect-ratio 16:9 \
  --num-images 1
```

---

## ⚡ Midjourney Async (Non-Blocking) Workflow — REQUIRED

**IMPORTANT**: Midjourney generation takes 10-60 seconds. To avoid blocking the bot from responding to other messages, you MUST use the async workflow for ALL Midjourney requests.

### Step 1 — Submit job (returns immediately, ~1s)

```bash
node {baseDir}/generate.js \
  --model midjourney \
  --prompt "<enhanced prompt>" \
  --aspect-ratio 16:9 \
  --async
```

This returns immediately with a `job_id`. Tell the user the job has been submitted and you'll notify them when done. **Do NOT wait — proceed to handle other messages.**

Example response to user:
> ✅ Midjourney 任务已提交！预计 10-20 秒完成（turbo 模式），我会在完成后立刻通知你。

### Step 2 — Poll status (non-blocking, call repeatedly until done)

```bash
node {baseDir}/generate.js \
  --model midjourney \
  --poll \
  --job-id <job_id>
```

Returns one of:
- `status: "completed"` → job done, `imageUrl` and `imageUrls` are available
- `status: "pending"` or `"processing"` → still running, poll again in ~10s
- `status: "failed"` → job failed, show error to user

### Step 3 — Notify user when completed

When poll returns `status: "completed"`, send the image URL(s) to the user.

**Important — link stability:** Legnext's grid preview link (`imageUrl`) can expire quickly. Prefer sending **single-image URLs** from the `imageUrls` array (e.g. `imageUrls[0]` for the first image, or all four) so the user can reliably see the result. If your client only supports one image, use `imageUrls[0]` (or `displayImageUrl` if present in the script output) first.

> 🎨 你的图片生成完成了！[查看图片](displayImageUrl 或 imageUrls[0])
> 
> 想要放大哪张？(U1-U4) 或者创建变体？(V1-V4)

### Polling Strategy

Use the `exec` tool to poll every ~15 seconds. After submitting, you can:
1. Tell the user the job is submitted
2. Poll once after ~15 seconds
3. If still pending, poll again after another 15 seconds
4. Repeat up to ~5 times (total ~75 seconds max wait per poll cycle)
5. If still not done, tell the user you'll check again later

---

## Midjourney-Specific Notes

Midjourney is powered by **Legnext.ai** (faster and more stable than TTAPI). **Turbo mode is enabled by default** (`--turbo`), which reduces generation time to ~10-20 seconds (requires a Midjourney Pro or Mega plan). The `--aspect-ratio` is automatically appended to the prompt as `--ar <ratio>`. The model always generates 4 images in a grid. After generation, you can:

- Ask the user if they want to **upscale** (U1-U4) or **create variations** (V1-V4) of any image.
- Use `--action upscale --index <1-4> --job-id <id>` to upscale a specific image.
- Use `--action variation --index <1-4> --job-id <id>` to create variations.
- Use `--action reroll --job-id <id>` to re-generate with the same prompt.
- Add `--async` to any action to make it non-blocking.

**Upscale types** (via `--upscale-type`):
- `0` = Subtle (default): Conservative enhancement, preserves original details. Best for photography.
- `1` = Creative: More artistic interpretation. Best for illustrations.

**Variation types** (via `--variation-type`):
- `0` = Subtle (default): Minor changes while preserving composition.
- `1` = Strong: More dramatic variations with significant changes.

```bash
# Upscale image 2 from a previous Midjourney generation (async, non-blocking)
node {baseDir}/generate.js \
  --model midjourney \
  --action upscale \
  --index 2 \
  --job-id <previous_job_id> \
  --upscale-type 0 \
  --async

# Create a strong variation of image 3 (async)
node {baseDir}/generate.js \
  --model midjourney \
  --action variation \
  --index 3 \
  --job-id <previous_job_id> \
  --variation-type 1 \
  --async

# Reroll (regenerate with same prompt, async)
node {baseDir}/generate.js \
  --model midjourney \
  --action reroll \
  --job-id <previous_job_id> \
  --async
```

### Prompt Enhancement Tips

- **For Midjourney**: Add style keywords like `cinematic lighting`, `photorealistic`, `--v 7`, `--style raw`, `--ar 16:9`. Legnext.ai supports all MJ parameters.
- **For Flux**: Add quality boosters like `masterpiece`, `highly detailed`, `sharp focus`, `professional photography`
- **For Ideogram**: Be explicit about text content, font style, and layout
- **For Recraft**: Specify `vector illustration`, `flat design`, `icon style`, `SVG-style`

---

## Environment Variables

This skill requires the following environment variables to be set in your OpenClaw config:

| Variable | Description | Where to get it |
|---|---|---|
| `FAL_KEY` | fal.ai API key (for Flux, SDXL, Nano Banana, Ideogram, Recraft) | https://fal.ai/dashboard/keys |
| `LEGNEXT_KEY` | Legnext.ai API key (for Midjourney) | https://legnext.ai/dashboard |
| `IMAGE_GEN_PROXY_URL` | (Optional) Proxy server URL — if set, no API keys needed | Deployed proxy URL |

Configure them in `~/.openclaw/openclaw.json`:
```json
{
  "skills": {
    "entries": {
      "image-gen": {
        "enabled": true,
        "env": {
          "FAL_KEY": "your_fal_key_here",
          "LEGNEXT_KEY": "your_legnext_key_here"
        }
      }
    }
  }
}
```

---

## Example Conversations

**User**: "帮我画一只在雪山上的雪豹，电影感光效"
**Action**: Select `midjourney`, enhance prompt to `"a majestic snow leopard on a snowy mountain peak, cinematic lighting, dramatic atmosphere, ultra detailed --ar 16:9 --v 7"`, run script with `--async`. Tell user job submitted, then poll for result.

**User**: "用 Flux 生成一张产品海报，白色背景，一瓶香水"
**Action**: Select `flux-pro`, enhance prompt, run script with `--aspect-ratio 3:4`. (Flux is fast ~5s, no async needed)

**User**: "快速生成一个草稿看看效果"
**Action**: Select `flux-schnell` for fastest generation (<2 seconds). No async needed.

**User**: "帮我做一个 App 图标，扁平风格，蓝色系"
**Action**: Select `recraft`, use prompt with `flat design icon, blue color scheme, minimal, vector style`.

**User**: "把第2张图片放大"
**Action**: Run with `--model midjourney --action upscale --index 2 --job-id <id> --async`, then poll for result.

---

## 🔌 Proxy Mode (Zero API Keys)

If `IMAGE_GEN_PROXY_URL` is set (or `--proxy` flag is used), the skill routes all requests through a proxy server instead of calling fal.ai / Legnext.ai directly. This means **users don't need any API keys** — the proxy handles authentication server-side.

### How It Works

```
User's Agent → generate.js --proxy → Image-Gen Proxy (Vercel) → fal.ai / Legnext.ai
```

### Usage

```bash
# Via environment variable (recommended — set once in OpenClaw config)
IMAGE_GEN_PROXY_URL=https://your-proxy.vercel.app node {baseDir}/generate.js \
  --model flux-schnell \
  --prompt "a cute cat"

# Via CLI flag
node {baseDir}/generate.js \
  --model flux-schnell \
  --prompt "a cute cat" \
  --proxy \
  --proxy-url https://your-proxy.vercel.app
```

### Proxy Mode for Midjourney

```bash
# Submit
node {baseDir}/generate.js --model midjourney --prompt "a dragon" --proxy --proxy-url https://your-proxy.vercel.app

# Poll
node {baseDir}/generate.js --model midjourney --poll --job-id <id> --proxy --proxy-url https://your-proxy.vercel.app
```

### Free Tier Limits (via Proxy)

| Model Type | Free Generations per IP |
|---|---|
| fal.ai models (Flux, SDXL, Ideogram, etc.) | 50 |
| Midjourney | 20 |

After the free tier is exhausted, users receive a `402` response with upgrade instructions.
