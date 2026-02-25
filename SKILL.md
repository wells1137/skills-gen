---
name: image-gen
description: Generate images using multiple AI models — Midjourney (via TTAPI), Flux, SDXL, Nano Banana (Gemini), and more via fal.ai. Automatically picks the best model based on user intent, or lets the user specify one explicitly.
homepage: https://fal.ai
metadata: {"openclaw":{"emoji":"🎨","primaryEnv":"FAL_KEY","requires":{"env":["FAL_KEY","TTAPI_KEY"]},"install":[{"id":"node","kind":"node","package":"@fal-ai/client","label":"Install fal.ai client (npm)"}]}}
---

# Image Generation Skill

This skill enables you to generate images using a variety of state-of-the-art AI models. It supports:

- **Midjourney** (via TTAPI) — Best for artistic, cinematic, and highly detailed images.
- **Flux 1.1 Pro** (via fal.ai) — Best for photorealistic images and complex scenes.
- **Flux Dev** (via fal.ai) — Fast, high-quality generation for general use.
- **Flux Schnell** (via fal.ai) — Ultra-fast generation (4 steps), great for drafts.
- **SDXL Lightning** (via fal.ai) — Fast Stable Diffusion XL, great for stylized art.
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
| Quick draft, fast iteration | Flux Schnell | `flux-schnell` |
| Image with text, logo, poster, typography | Ideogram v3 | `ideogram` |
| Vector art, icon, flat design, illustration | Recraft v3 | `recraft` |
| Stylized anime, illustration, concept art | SDXL Lightning | `sdxl` |
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

**Example:**
```bash
node {baseDir}/generate.js \
  --model flux-pro \
  --prompt "a majestic snow leopard on a mountain peak, golden hour lighting, photorealistic, 8k" \
  --aspect-ratio 16:9 \
  --num-images 1
```

### Midjourney-Specific Notes

For Midjourney, the `--aspect-ratio` is automatically appended to the prompt as `--ar <ratio>`. The model always generates 4 images in a grid. After generation, you can:

- Ask the user if they want to **upscale** (U1-U4) or **create variations** (V1-V4) of any image.
- Use `--action upscale --index <1-4> --job-id <id>` to upscale a specific image.
- Use `--action variation --index <1-4> --job-id <id>` to create variations.

```bash
# Upscale image 2 from a previous Midjourney generation
node {baseDir}/generate.js \
  --model midjourney \
  --action upscale \
  --index 2 \
  --job-id <previous_job_id>
```

### Prompt Enhancement Tips

- **For Midjourney**: Add style keywords like `cinematic lighting`, `photorealistic`, `--v 6.1`, `--style raw`, `--ar 16:9`
- **For Flux**: Add quality boosters like `masterpiece`, `highly detailed`, `sharp focus`, `professional photography`
- **For Ideogram**: Be explicit about text content, font style, and layout
- **For Recraft**: Specify `vector illustration`, `flat design`, `icon style`, `SVG-style`

---

## Environment Variables

This skill requires the following environment variables to be set in your OpenClaw config:

| Variable | Description | Where to get it |
|---|---|---|
| `FAL_KEY` | fal.ai API key (for Flux, SDXL, Nano Banana, Ideogram, Recraft) | https://fal.ai/dashboard/keys |
| `TTAPI_KEY` | TTAPI key (for Midjourney only) | https://ttapi.io/dashboard |

Configure them in `~/.openclaw/openclaw.json`:
```json
{
  "skills": {
    "entries": {
      "image-gen": {
        "enabled": true,
        "env": {
          "FAL_KEY": "your_fal_key_here",
          "TTAPI_KEY": "your_ttapi_key_here"
        }
      }
    }
  }
}
```

---

## Example Conversations

**User**: "帮我画一只在雪山上的雪豹，电影感光效"
**Action**: Select `midjourney`, enhance prompt to `"a majestic snow leopard on a snowy mountain peak, cinematic lighting, dramatic atmosphere, ultra detailed --ar 16:9 --v 6.1"`, run script.

**User**: "用 Flux 生成一张产品海报，白色背景，一瓶香水"
**Action**: Select `flux-pro`, enhance prompt, run script with `--aspect-ratio 3:4`.

**User**: "快速生成一个草稿看看效果"
**Action**: Select `flux-schnell` for fastest generation.

**User**: "帮我做一个 App 图标，扁平风格，蓝色系"
**Action**: Select `recraft`, use prompt with `flat design icon, blue color scheme, minimal, vector style`.
