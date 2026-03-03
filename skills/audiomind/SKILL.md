---
name: AudioMind
version: 3.0.0
author: "wells"
emoji: "🎙️"
tags:
  - audio
  - tts
  - music
  - sfx
  - voice-clone
  - elevenlabs
  - fal
description: >
  Generate speech, music, and sound effects with one command. Routes to ElevenLabs and fal.ai automatically. Works out of the box — just set ELEVENLABS_API_KEY.
homepage: https://github.com/wells1137/audiomind-skill
metadata:
  openclaw:
    emoji: "🎙️"
    primaryEnv: ELEVENLABS_API_KEY
    requires:
      env:
        - ELEVENLABS_API_KEY
    install:
      - id: elevenlabs-mcp
        kind: npm
        package: "@elevenlabs/mcp"
        label: "Install ElevenLabs MCP server"
---

# 🎙️ AudioMind

**Use when:** User asks to generate speech, narrate text, create a voice-over, compose music, or produce a sound effect.

AudioMind is a smart audio dispatcher. It analyzes your request and routes it to the best available model — ElevenLabs for speech and music, fal.ai for fast SFX — and returns a ready-to-use audio URL.

---

## Quick Reference

| Request Type | Best Model | Latency |
|---|---|---|
| Narrate text / Voice-over | `elevenlabs-tts-v3` | ~3s |
| Low-latency TTS (real-time) | `elevenlabs-tts-turbo` | <1s |
| Background music | `cassetteai-music` | ~15s |
| Sound effect | `elevenlabs-sfx` | ~5s |
| Clone a voice from audio | `elevenlabs-voice-clone` | ~10s |

---

## How to Use

### 1. Start the AudioMind server (once per session)

```bash
bash {baseDir}/tools/start_server.sh
```

This starts the ElevenLabs MCP server on port 8124. The skill uses it for all audio generation.

### 2. Route the request

Analyze the user's request and call the appropriate tool via the MCP server:

**Text-to-Speech (TTS)**

When user asks to "narrate", "read aloud", "say", or "create a voice-over":

```
Use MCP tool: text_to_speech
  text: "<the text to narrate>"
  voice_id: "JBFqnCBsd6RMkjVDRZzb"   # Default: "George" (professional, neutral)
  model_id: "eleven_multilingual_v2"   # Use "eleven_turbo_v2_5" for low latency
```

**Music Generation**

When user asks to "compose", "create background music", or "make a soundtrack":

```
Use MCP tool: text_to_sound_effects  (via cassetteai-music on fal.ai)
  prompt: "<music description, e.g. 'upbeat lo-fi hip hop, 90 seconds'>"
  duration_seconds: <duration>
```

**Sound Effect (SFX)**

When user asks for a specific sound (e.g., "a door creaking", "rain on a window"):

```
Use MCP tool: text_to_sound_effects
  text: "<sound description>"
  duration_seconds: <1-22>
```

**Voice Cloning**

When user provides an audio sample and wants to clone the voice:

```
Use MCP tool: voice_add
  name: "<voice name>"
  files: ["<audio_file_url>"]
```

---

## Example Conversations

**User:** "帮我把这段文字配音：欢迎来到我们的产品发布会"

```
→ Route to: text_to_speech
  text: "欢迎来到我们的产品发布会"
  voice_id: "JBFqnCBsd6RMkjVDRZzb"
  model_id: "eleven_multilingual_v2"
```

> 🎙️ 配音完成！[点击收听](audio_url)

---

**User:** "给我生成一段 60 秒的轻松背景音乐，适合播客"

```
→ Route to: cassetteai-music (fal.ai)
  prompt: "relaxing lo-fi background music for a podcast, gentle piano and soft beats, 60 seconds"
  duration_seconds: 60
```

> 🎵 背景音乐生成完成！[点击收听](audio_url)

---

**User:** "生成一个科幻风格的门开启音效"

```
→ Route to: text_to_sound_effects
  text: "a futuristic sci-fi door sliding open with a hydraulic hiss"
  duration_seconds: 3
```

---

## Setup

### Required

Set `ELEVENLABS_API_KEY` in `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "audiomind": {
        "enabled": true,
        "env": {
          "ELEVENLABS_API_KEY": "your_elevenlabs_key_here"
        }
      }
    }
  }
}
```

Get your key at [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys).

### Optional (for fal.ai music & SFX models)

```json
"FAL_KEY": "your_fal_key_here"
```

Get your key at [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys).

---

## Model Reference

| Model ID | Type | Provider | Notes |
|---|---|---|---|
| `eleven_multilingual_v2` | TTS | ElevenLabs | Best quality, supports 29 languages |
| `eleven_turbo_v2_5` | TTS | ElevenLabs | Ultra-low latency, ideal for real-time |
| `eleven_monolingual_v1` | TTS | ElevenLabs | English only, fastest |
| `cassetteai-music` | Music | fal.ai | Reliable, fast music generation |
| `elevenlabs-sfx` | SFX | ElevenLabs | High-quality sound effects (up to 22s) |
| `elevenlabs-voice-clone` | Clone | ElevenLabs | Clone any voice from a short audio sample |

---

## Changelog

### v3.0.0
- **Simplified routing table**: Removed unstable/offline models from the main reference. The skill now only surfaces models that reliably work.
- **Clearer use-case triggers**: Added "Use when" section so the agent activates this skill at the right moment.
- **Unified setup**: Single `ELEVENLABS_API_KEY` is all you need to get started. `FAL_KEY` is now optional.
- **Removed polling complexity**: Music generation now uses `cassetteai-music` by default, which completes synchronously.

### v2.1.0
- Added async workflow for long-running music generation tasks.
- Added `cassetteai-music` as a stable alternative for music generation.

### v2.0.0
- Migrated to ElevenLabs MCP server architecture.
- Added voice cloning support.

### v1.0.0
- Initial release with TTS, music, and SFX routing.
