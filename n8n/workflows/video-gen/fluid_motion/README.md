# fluid_motion — Direct API Video Pipeline

> Streamlined machine-to-machine workflow for direct video generation without conversational friction.
> Accepts a webhook/API call and outputs a finished MP4.

---

## Trigger

**Webhook** accepting JSON payload.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `prompt` | string | Explicit text instructions for motion and scene |
| `reference_image` | string | URL or base64-encoded reference image |
| `duration` | string | Video duration (e.g., "5s", "10s") |
| `orientation` | string | Aspect ratio (e.g., "16:9", "9:16") |
| `resolution` | string | "720p" or "1080p" |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `reference_video` | string | URL or base64 for V2V rotoscoping |
| `audio_track` | string | URL or base64 for lip-sync / audio-reactive motion |
| `tier` | string | "standard" (LTX) or "premium" (Minimax). Default: "standard" |

---

## Status: 🔜 Phase 2

Workflow JSON will be built via n8n MCP tools and exported here.
