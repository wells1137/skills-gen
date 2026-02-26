---
name: AudioMind
version: 2.1.7
author: "@wells1137"
emoji: "🎧"
tags:
  - audio
  - tts
  - music
  - sfx
  - voice-clone
  - elevenlabs
  - fal
description: >
  One skill for all AI audio: TTS, music, SFX, and voice cloning. Routes your requests to 17+ models (ElevenLabs, fal.ai) via a single proxy. Free tier included; async support for long tasks.
homepage: https://github.com/wells1137/skills-gen
metadata:
  clawdbot:
    emoji: "🎧"
    requires:
      env: []
    files: ["cli.js", "tools/start_server.sh"]
---

## Description

**AudioMind** is a zero-configuration audio skill that routes natural-language requests to 17+ models from **ElevenLabs** and **fal.ai** for TTS, music, sound effects, and voice cloning. No API keys needed for the free tier; the skill calls a public proxy that handles auth and rate limits. Long-running tasks (e.g. music) use an async workflow with status polling so the agent does not block or timeout.

## How It Works (v2.1.0 with Async)

1.  **Request**: The user makes a request (e.g., "*Compose a 2-minute cinematic score*").
2.  **Smart Routing**: AudioMind analyzes the request and selects the best model.
3.  **Proxy Call**: The skill sends a request to the AudioMind Proxy Service.
4.  **Immediate Response**: 
    - For **fast tasks** (most TTS), the audio is returned directly.
    - For **long tasks** (music, some SFX), the proxy immediately returns a `task_id` and a `status_url`.
5.  **Polling**: The agent (or user) periodically checks the `status_url`.
6.  **Result**: Once the task is complete, the `status_url` will contain the final `audio_url`.

## Usage

**Synchronous (for TTS & fast SFX)**

```
"Narrate this: Hello, world!"
> Returns audio file directly.
```

**Asynchronous (for Music & long SFX)**

```
"Compose a 90-second lo-fi track."
> Returns: {"status": "in_progress", "task_id": "...", "status_url": "..."}

# Agent should then poll the status_url until status is "completed"
```

## User Experience Rules (Important)

When serving end users in chat, keep progress updates minimal:

1. Send at most **one** start message (for example: "Started generating, will send result shortly.").
2. Do **not** send repeated waiting messages like "please wait", "still generating", or duplicate status lines.
3. Agent should **proactively poll generation status** in the background (do not wait for the user to ask).
4. If generation is still running after ~45 seconds, send only **one** concise progress update.
5. As soon as generation completes, send the final audio link immediately.
6. If the user asks "Not ready yet?" or "Are we done?" while running, reply with one short status sentence only.

Default style should be concise and low-interruption.

### Be terse — no fluff

- **Do not** send "please wait" / "I am trying to send the file, please wait" after each audio.
- **Do not** send a separate "Success! This is the XXX you requested!" message for each file; the audio message (and its short caption) is enough.
- **Do not** announce each step (e.g. "Next, generating the second...", "Finally, the third..."); just generate and send.
- For **multiple items**: send each audio with at most a one-line caption (e.g. effect name: "ocean waves", "thunder"); no per-item progress + success pair.
- At the end, **one** short closing is optional (e.g. "Done." or "Sent 3."); omit if the files speak for themselves.

## Output Handling Rules (Telegram-safe)

1. Never paste large `audio_base64` content directly into chat.
2. Prefer `audio_url` when available.
3. If response contains `audio_file_path`, send it as media attachment with a **short caption only** (e.g. the effect name); do not add a follow-up text message saying "Success!" or "Sent!".
4. Do not regenerate the same request repeatedly just because delivery failed once; retry delivery first.
5. For sound effects requests, always pass `--action sfx` explicitly (do not rely on implicit routing).
6. If tool output includes `delivery_hint`, follow it exactly and avoid additional transformation steps.
7. Never tell the user "I will save base64 to file" unless an actual `exec` command has completed that file write successfully.

## External Endpoints

| Endpoint | Method | Data sent | Purpose |
|----------|--------|-----------|---------|
| `AUDIOMIND_PROXY_URL` (default: `https://audiomind-proxy.vercel.app/api/audio`) | POST | `action`, `text`, `prompt`, optional `duration_seconds`, `model`, `fast`; optional header `X-Audiomind-Key` for Pro | Request audio generation |
| Same origin, `status_url` from response | GET | None (URL only) | Poll async task status until `audio_url` is returned |

All user-provided text (prompt, narration, effect description) is sent only to the proxy above. The proxy forwards requests to ElevenLabs and fal.ai; it does not store prompts long-term. No other external URLs are called by this skill.

## Security & Privacy

- **What leaves the machine:** The skill sends only the user’s request (text/prompt, action type, duration) to the AudioMind Proxy (and the proxy to ElevenLabs/fal.ai). No browser data, credentials, or local files are read or uploaded.
- **What stays local:** Optional local file write: decoded audio may be written under `AUDIOMIND_OUTPUT_DIR` or `~/.openclaw/workspace/tmp/audiomind/` for delivery. No other local files are read. Usage count for free tier is stored in `/tmp/audiomind_usage_count.txt` by `tools/start_server.sh` when that script is used.
- **Credentials:** No API keys are required for the free tier. Optional env: `AUDIOMIND_API_KEY` (Pro), `AUDIOMIND_PROXY_URL` (override proxy), `ELEVENLABS_API_KEY` (only when running Pro mode locally). Keys are never logged or sent except to the documented proxy or ElevenLabs as intended.
- **No shell injection:** User input is passed only as JSON in HTTP request bodies (cli.js) or not at all (start_server.sh). No `eval`, no unsanitized shell interpolation.

## Trust Statement

By using this skill, your prompts and text are sent to the AudioMind Proxy (hosted at audiomind-proxy.vercel.app) and, for generation, to ElevenLabs and fal.ai. Only install if you trust these services. The skill does not download or execute arbitrary code; it only calls the documented HTTP API and optional local scripts (cli.js, start_server.sh) included in the skill package.

## Model Registry (Vercel Pro–ready)

With the proxy on **Vercel Pro**, function timeout is 5 minutes. Long-running models (music, some TTS/voice-clone/SFX) are stable.

| Type          | Model ID                    | Provider   | Status         | Notes                                      |
| :------------ | :-------------------------- | :--------- | :------------- | :----------------------------------------- |
| **TTS**       | `elevenlabs-tts-v3`         | ElevenLabs | ✅ **Stable**   | High quality, fast                         |
|               | `elevenlabs-tts-v2`         | ElevenLabs | ✅ **Stable**   |                                            |
|               | `elevenlabs-tts-turbo`      | ElevenLabs | ✅ **Stable**   | Ultra-low latency                          |
|               | `minimax-tts-2.8-turbo`     | fal.ai     | ✅ **Stable**   | Fast, good quality                         |
|               | `chatterbox-tts`             | fal.ai     | ✅ **Stable**   | Stable with 5 min timeout (Vercel Pro)    |
|               | `minimax-tts-hd`            | fal.ai     | ❌ **Offline**  | fal.ai API returns 502                     |
|               | `minimax-tts-2.6-hd`        | fal.ai     | ❌ **Offline**  | fal.ai API returns 502                     |
|               | `playai-dialog`             | fal.ai     | ✅ **Stable**   | Stable with 5 min timeout (Vercel Pro)     |
| **Voice Clone** | `dia-voice-clone`           | fal.ai     | ✅ **Stable**   | Stable with 5 min timeout (Vercel Pro)     |
| **Music**     | `elevenlabs-music`          | ElevenLabs | ✅ **Stable**   | Stable with Vercel Pro (5 min timeout)    |
|               | `cassetteai-music`          | fal.ai     | ✅ **Stable**   | Fast, reliable                             |
|               | `beatoven-music`            | fal.ai     | ✅ **Stable**   | Stable with Vercel Pro (5 min timeout)   |
| **SFX**       | `elevenlabs-sfx`            | ElevenLabs | ✅ **Stable**   | Stable with Vercel Pro (5 min timeout)    |
|               | `beatoven-sfx`              | fal.ai     | ✅ **Stable**   | Stable with Vercel Pro (5 min timeout)   |

---

## Commercial Use

This skill includes a free tier of **100 generations** (stable models only). For unlimited use and access to all models, upgrade to AudioMind Pro (Gumroad link provided when the free limit is reached or on the skill homepage).
