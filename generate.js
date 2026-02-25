#!/usr/bin/env node
/**
 * image-gen skill — generate.js
 * Unified image generation script for OpenClaw.
 * Supports: Midjourney (TTAPI), Flux Pro/Dev/Schnell, SDXL Lightning,
 *           Nano Banana Pro, Ideogram v3, Recraft v3 (all via fal.ai)
 *
 * Usage:
 *   node generate.js --model <id> --prompt "<text>" [options]
 *   node generate.js --model midjourney --action upscale --index 2 --job-id <id>
 */

import { fal } from "@fal-ai/client";
import https from "https";
import http from "http";
import { parseArgs } from "util";

// ── Parse CLI arguments ────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    model:           { type: "string", default: "flux-dev" },
    prompt:          { type: "string", default: "" },
    "aspect-ratio":  { type: "string", default: "1:1" },
    "num-images":    { type: "string", default: "1" },
    "negative-prompt": { type: "string", default: "" },
    action:          { type: "string", default: "" },   // upscale | variation | reroll
    index:           { type: "string", default: "1" },  // 1-4 for MJ actions
    "job-id":        { type: "string", default: "" },   // MJ jobId for actions
    seed:            { type: "string", default: "" },
  },
  strict: false,
});

const MODEL      = args["model"];
const PROMPT     = args["prompt"];
const AR         = args["aspect-ratio"];
const NUM_IMAGES = parseInt(args["num-images"], 10) || 1;
const NEG_PROMPT = args["negative-prompt"];
const ACTION     = args["action"];
const INDEX      = parseInt(args["index"], 10) || 1;
const JOB_ID     = args["job-id"];
const SEED       = args["seed"] ? parseInt(args["seed"], 10) : undefined;

// ── Environment variables ──────────────────────────────────────────────────
const FAL_KEY   = process.env.FAL_KEY;
const TTAPI_KEY = process.env.TTAPI_KEY;

// ── fal.ai model IDs ───────────────────────────────────────────────────────
const FAL_MODELS = {
  "flux-pro":      "fal-ai/flux-pro/v1.1",
  "flux-dev":      "fal-ai/flux/dev",
  "flux-schnell":  "fal-ai/flux/schnell",
  "sdxl":          "fal-ai/lightning-models/sdxl-lightning-4step",
  "nano-banana":   "fal-ai/nano-banana-pro",
  "ideogram":      "fal-ai/ideogram/v3",
  "recraft":       "fal-ai/recraft-v3",
};

// ── Aspect ratio helpers ───────────────────────────────────────────────────
function arToWidthHeight(ar) {
  const map = {
    "1:1":  [1024, 1024],
    "16:9": [1344, 768],
    "9:16": [768, 1344],
    "4:3":  [1152, 864],
    "3:4":  [864, 1152],
    "3:2":  [1216, 832],
    "2:3":  [832, 1216],
    "21:9": [1536, 640],
  };
  return map[ar] || [1024, 1024];
}

function arToFalImageSize(ar) {
  const map = {
    "1:1":  "square_hd",
    "16:9": "landscape_16_9",
    "9:16": "portrait_16_9",
    "4:3":  "landscape_4_3",
    "3:4":  "portrait_4_3",
  };
  return map[ar] || "square_hd";
}

// ── Output helpers ─────────────────────────────────────────────────────────
function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

function error(msg, details) {
  console.error(JSON.stringify({ success: false, error: msg, details }, null, 2));
  process.exit(1);
}

// ── TTAPI HTTP helper ──────────────────────────────────────────────────────
function ttapiPost(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: "api.ttapi.io",
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "TT-API-KEY": TTAPI_KEY,
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Invalid JSON: ${data}`)); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function ttapiPoll(jobId, maxWait = 300_000, interval = 5_000) {
  const deadline = Date.now() + maxWait;
  while (Date.now() < deadline) {
    const res = await ttapiPost("/midjourney/v1/fetch", { jobId });
    const d = res.data;
    if (d.status === "SUCCESS" || d.status === "FAILED") return d;
    process.stderr.write(`[MJ] Progress: ${d.progress ?? "?"}%\n`);
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Midjourney job ${jobId} timed out after ${maxWait / 1000}s`);
}

// ── Midjourney via TTAPI ───────────────────────────────────────────────────
async function generateMidjourney() {
  if (!TTAPI_KEY) error("TTAPI_KEY is not set. Please configure it in your OpenClaw skill env.");

  // Handle action commands (upscale / variation / reroll)
  if (ACTION && JOB_ID) {
    const actionMap = {
      upscale:   `upsample${INDEX}`,
      variation: `variation${INDEX}`,
      reroll:    "reroll",
      "vary-subtle":   "vary_subtle",
      "vary-strong":   "vary_strong",
      "zoom-out-2x":   "zoom_out_2x",
      "zoom-out-1.5x": "zoom_out_1_5x",
      "pan-left":      "pan_left",
      "pan-right":     "pan_right",
      "pan-up":        "pan_up",
      "pan-down":      "pan_down",
    };
    const mjAction = actionMap[ACTION];
    if (!mjAction) error(`Unknown action: ${ACTION}`);

    process.stderr.write(`[MJ] Submitting action: ${mjAction} on job ${JOB_ID}\n`);
    const res = await ttapiPost("/midjourney/v1/action", { jobId: JOB_ID, action: mjAction });
    if (res.status !== "SUCCESS") error("TTAPI action submission failed", res);
    const newJobId = res.data.jobId;
    process.stderr.write(`[MJ] Action job submitted: ${newJobId}\n`);
    const result = await ttapiPoll(newJobId);
    if (result.status === "FAILED") error("Midjourney action failed", result.failReason);

    output({
      success: true,
      model: "midjourney",
      action: ACTION,
      jobId: newJobId,
      imageUrl: result.cdnImage || result.discordImage,
      uImages: result.uImages || [],
    });
    return;
  }

  // Standard imagine
  if (!PROMPT) error("--prompt is required for Midjourney generation.");
  let mjPrompt = PROMPT;
  if (AR && AR !== "1:1") {
    const arForMJ = AR.replace(":", ":");
    mjPrompt += ` --ar ${arForMJ}`;
  }

  process.stderr.write(`[MJ] Submitting imagine: "${mjPrompt}"\n`);
  const res = await ttapiPost("/midjourney/v1/imagine", {
    prompt: mjPrompt,
    mode: "fast",
    hookUrl: "",
    timeout: 300,
    getUImages: true,
  });
  if (res.status !== "SUCCESS") error("TTAPI imagine submission failed", res);
  const jobId = res.data.jobId;
  process.stderr.write(`[MJ] Job submitted: ${jobId}\n`);

  const result = await ttapiPoll(jobId);
  if (result.status === "FAILED") error("Midjourney generation failed", result.failReason);

  output({
    success: true,
    model: "midjourney",
    jobId,
    prompt: mjPrompt,
    imageUrl: result.cdnImage || result.discordImage,
    uImages: result.uImages || [],
    note: "4 images generated. Use --action upscale --index <1-4> --job-id to upscale, or --action variation to create variants.",
  });
}

// ── fal.ai models ──────────────────────────────────────────────────────────
async function generateFal(modelKey) {
  if (!FAL_KEY) error("FAL_KEY is not set. Please configure it in your OpenClaw skill env.");
  fal.config({ credentials: FAL_KEY });

  const modelId = FAL_MODELS[modelKey];
  if (!modelId) error(`Unknown fal.ai model key: ${modelKey}`);
  if (!PROMPT) error("--prompt is required.");

  const [width, height] = arToWidthHeight(AR);
  const imageSize = arToFalImageSize(AR);

  // Build input based on model
  let input = {};

  if (modelKey === "flux-pro") {
    input = {
      prompt: PROMPT,
      image_size: imageSize,
      num_images: Math.min(NUM_IMAGES, 4),
      ...(SEED !== undefined && { seed: SEED }),
      safety_tolerance: "2",
      output_format: "jpeg",
    };
  } else if (modelKey === "flux-dev") {
    input = {
      prompt: PROMPT,
      image_size: imageSize,
      num_inference_steps: 28,
      num_images: Math.min(NUM_IMAGES, 4),
      enable_safety_checker: true,
      ...(SEED !== undefined && { seed: SEED }),
    };
  } else if (modelKey === "flux-schnell") {
    input = {
      prompt: PROMPT,
      image_size: imageSize,
      num_inference_steps: 4,
      num_images: Math.min(NUM_IMAGES, 4),
      enable_safety_checker: true,
      ...(SEED !== undefined && { seed: SEED }),
    };
  } else if (modelKey === "sdxl") {
    input = {
      prompt: PROMPT,
      negative_prompt: NEG_PROMPT || "blurry, low quality, distorted",
      image_size: { width, height },
      num_images: Math.min(NUM_IMAGES, 4),
      ...(SEED !== undefined && { seed: SEED }),
    };
  } else if (modelKey === "nano-banana") {
    input = {
      prompt: PROMPT,
      image_size: imageSize,
      num_images: Math.min(NUM_IMAGES, 4),
      ...(SEED !== undefined && { seed: SEED }),
    };
  } else if (modelKey === "ideogram") {
    input = {
      prompt: PROMPT,
      aspect_ratio: AR,
      num_images: Math.min(NUM_IMAGES, 4),
      ...(NEG_PROMPT && { negative_prompt: NEG_PROMPT }),
      ...(SEED !== undefined && { seed: SEED }),
    };
  } else if (modelKey === "recraft") {
    input = {
      prompt: PROMPT,
      image_size: imageSize,
      style: "realistic_image",
      num_images: Math.min(NUM_IMAGES, 4),
    };
  }

  process.stderr.write(`[fal] Calling ${modelId} ...\n`);
  const result = await fal.subscribe(modelId, {
    input,
    onQueueUpdate(update) {
      if (update.status === "IN_QUEUE") {
        process.stderr.write(`[fal] Queue position: ${update.position ?? "?"}\n`);
      } else if (update.status === "IN_PROGRESS") {
        process.stderr.write(`[fal] Generating...\n`);
      }
    },
  });

  const images = (result.data?.images || []).map((img) =>
    typeof img === "string" ? img : img.url
  );

  output({
    success: true,
    model: modelKey,
    modelId,
    prompt: PROMPT,
    images,
    imageUrl: images[0] || null,
    seed: result.data?.seed ?? null,
    timings: result.data?.timings ?? null,
  });
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  if (MODEL === "midjourney") {
    await generateMidjourney();
  } else if (FAL_MODELS[MODEL]) {
    await generateFal(MODEL);
  } else {
    error(`Unknown model: "${MODEL}". Valid options: midjourney, flux-pro, flux-dev, flux-schnell, sdxl, nano-banana, ideogram, recraft`);
  }
}

main().catch((err) => {
  error(err.message, err.stack);
});
