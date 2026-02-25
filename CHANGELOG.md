# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-25

### Added
- Initial release of the unified image generation skill.
- **Midjourney** support via TTAPI (imagine, upscale U1-U4, variation V1-V4, reroll, zoom, pan).
- **Flux 1.1 Pro** support via fal.ai (`fal-ai/flux-pro/v1.1`).
- **Flux Dev** support via fal.ai (`fal-ai/flux/dev`).
- **Flux Schnell** support via fal.ai (`fal-ai/flux/schnell`).
- **SDXL Lightning** support via fal.ai (`fal-ai/lightning-models/sdxl-lightning-4step`).
- **Nano Banana Pro** (Gemini-powered) support via fal.ai (`fal-ai/nano-banana-pro`).
- **Ideogram v3** support via fal.ai (`fal-ai/ideogram/v3`).
- **Recraft v3** support via fal.ai (`fal-ai/recraft-v3`).
- Aspect ratio support: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `21:9`.
- Multi-image generation support (1-4 images per request).
- Negative prompt support for fal.ai models.
- Seed parameter support for reproducible results.
- Automatic job polling for Midjourney tasks (up to 5 minutes).
- Published to ClawHub as `wells1137/image-gen@1.0.0`.
