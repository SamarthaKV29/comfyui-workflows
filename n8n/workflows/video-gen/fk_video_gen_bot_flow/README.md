# fk_video_gen_bot_flow — Telegram Video Generation Bot

> Human-in-the-loop conversational workflow for the Fluid Motion pipeline.
> Drives the creative process from concept to final video render via Telegram.

---

## Workflow Architecture

This workflow is split into **4 decoupled stages** following the [n8n architecture conventions](../../docs/ARCHITECTURE.md):

| Stage | File | Trigger | State |
|-------|------|---------|-------|
| **1. Onboarding** | `01_onboarding_listener.json` | Telegram update | V1 |
| **2. Storyboard** | `02_storyboard_agent.json` | Callback / state change | V2 |
| **3. Scene & Image** | `03_scene_image_agent.json` | Callback / state change | V3 |
| **4. Video Handoff** | `04_video_handoff.json` | Callback / state change | V4 |

Each stage is a separate n8n workflow with its own trigger — no long-running `Wait` nodes.

---

## Status: 🔜 Phase 3

Workflow JSONs will be built via n8n MCP tools and exported here.
