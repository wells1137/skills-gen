# skills-gen

A personal AI agent framework and skill collection for [OpenClaw](https://openclaw.ai) and MCP-compatible platforms. This repository contains the agent's soul, a library of skills, and the backing services that power them.

---

## Framework

The `framework/` directory defines the agent's core identity and operating principles.

| File | Purpose |
|---|---|
| `SOUL.md` | Who the agent is — personality, values, and working style |
| `AGENTS.md` | How to boot up and behave in every session |
| `BOOTSTRAP.md` | First-run initialization guide |
| `HEARTBEAT.md` | Periodic background tasks |
| `TOOLS.md` | Environment-specific tool notes (cameras, SSH hosts, etc.) |

---

## Skills

The `skills/` directory contains all agent skills, organized by capability.

### Generation Skills

| Skill | Description | ClawHub |
|---|---|---|
| 🎨 **image-gen** | Unified image generation — Midjourney, Flux, SDXL, Ideogram, Recraft | [clawhub.ai/skills/image-gen](https://clawhub.ai/skills/image-gen) |
| 🎧 **audiomind** | Intelligent audio dispatch — TTS, Music, SFX, Voice Clone (17+ models via ElevenLabs & fal.ai) | [clawhub.ai/skills/audiomind](https://clawhub.ai/skills/audiomind) |

### Tool & Integration Skills

| Skill | Description | ClawHub |
|---|---|---|
| 🏠 **mcp-hass** | Control Home Assistant smart home devices via MCP | — |
| 🔌 **openclaw-mcp-plugin** | Connect any MCP server to your OpenClaw agent | — |
| 🎭 **playwright-mcp** | Full browser automation via Playwright MCP | — |

---

## Services

The `services/` directory contains backend services that power the skills.

| Service | Description | Deployed At |
|---|---|---|
| **audiomind-proxy** | Vercel proxy for audiomind — handles API key management, free trial counting (100 uses), and Pro validation | [audiomind-proxy.vercel.app](https://audiomind-proxy.vercel.app) |

---

## Structure

```
/
├── framework/              # Agent identity & operating principles
│   ├── SOUL.md
│   ├── AGENTS.md
│   ├── BOOTSTRAP.md
│   ├── HEARTBEAT.md
│   └── TOOLS.md
├── skills/
│   ├── image-gen/          # Image generation skill
│   ├── audiomind/          # Audio generation & dispatch skill
│   ├── mcp-hass/           # Home Assistant MCP skill
│   ├── openclaw-mcp-plugin/ # MCP integration plugin
│   └── playwright-mcp/     # Browser automation skill
└── services/
    └── audiomind-proxy/    # Vercel proxy service for audiomind
```

---

## Quick Start

```bash
# Install a skill via ClawHub
npx clawhub@latest install audiomind
npx clawhub@latest install image-gen

# Or clone the full repo to use as your OpenClaw workspace
git clone https://github.com/wells1137/skills-gen.git
```
