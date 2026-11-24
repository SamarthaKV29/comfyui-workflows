# Fluid Motion: Serverless Video Generation Architecture

## 1. Project Overview
**Fluid Motion** is a cost-effective, serverless video generation pipeline designed to replicate and exceed "Ultimate Motion" capabilities. It leverages n8n (hosted at n8n.fastkodelabs.com) for orchestration and stateful Telegram bot interactions, combined with RunPod Serverless endpoints to minimize compute costs (pay-per-second instead of always-on pods). 

**Architectural Standard:** The workflow design must utilize explicit stage-level versioning for all data objects and UI states. Cascade inheritance logic is strictly prohibited across the pipeline stages to ensure strict state control during iterative generation loops.

---

## 2. Directory Structure
```text
runpod_serverless/
├── n8n_workflows/
│   ├── fk_video_gen_bot_flow.json        # Conversational orchestration & agent handoffs
│   └── fluid_motion.json                 # Direct API-to-Video serverless orchestrator
├── agents/
│   ├── storyboard_writer.prompt          # Expands ideas into max 8-frame sequences
│   ├── scene_architect_neutral.prompt    # General/open-ended scene generation
│   ├── scene_architect_pro.prompt        # Nano Banana Pro character generation
│   └── scene_architect_diva.prompt       # Diva Nation high-glamor generation
└── runpod_templates/
    ├── image_gen_worker/                 # Serverless wrapper for Nano Banana 2/Pro
    └── video_gen_worker/                 # Serverless wrapper for Minimax H3 Max / LTX

```

---

## 3. Workflow 1: `fk_video_gen_bot_flow` (Telegram Orchestrator)

This is a human-in-the-loop (HITL) conversational workflow that drives the creative process from concept to final render. It uses n8n local storage for strict state management across explicit stages.

### Stage 1: Invocation & Onboarding (State V1)

* **Trigger:** Telegram Message / Webhook.
* **Action:** If session is new or inactive, send the preset welcome message.
* **Content:** List Available Characters (Pro: Sam, Singh, Brock, Alen, Dana, Boo, Miga, Sia. Diva: Rani, Gemma, etc.) and 5 brief scene ideas.
* **Data Collection:**
* Video Type Selection (Neutral, Pro, Diva).
* Brief Idea / Story context.
* Style / Aesthetic.
* Orientation & Size (Default: Landscape 1080p).



### Stage 2: Storyboard Iteration (State V2)

* **Agent Handoff:** Pass Stage V1 data to the **Storyboard Writer Agent**.
* **Execution:** Agent expands the brief into a highly visual, fast-paced shot-by-shot storyboard (Max 8 frames) focusing on visual hooks, camera angles, and transitions.
* **User Loop:** Send storyboard to user via Telegram. Allow inline buttons: `[Approve]` or `[Regenerate/Refine]`.
* **State:** Update to State V2.1 upon approval.

### Stage 3: Scene Architecture & Image Generation (State V3)

* **Agent Handoff:** Route the approved storyboard to the correct **Scene Architect Agent** based on the chosen Video Type (Neutral, Pro, or Diva).
* *Pro/Diva:* Enforce strict character attributes, specific styling (e.g., loose hair, short attire, specific tattoos), and high-glamor/action aesthetics.
* *Neutral:* Expand on user-provided character/environment details dynamically.


* **Prompt Generation:** The architect generates a dense, unified image prompt encompassing all characters, props, and backgrounds.
* **Serverless Execution (Image):** Send prompt to RunPod serverless endpoint running Nano Banana (2 or Pro).
* **User Loop:** Send the generated reference image to the user. Allow inline buttons: `[Confirm Image]` or `[Regenerate Image]`.

### Stage 4: Video Generation Hand-off (State V4)

* **Execution:** Once the image is confirmed, bundle the explicit V4 payload (Storyboard, Reference Image, Style, Orientation).
* **Routing:** Pass payload to the RunPod Serverless Video Worker (Minimax H3 Max or LTX).
* **Delivery:** Send the final generated video file/URL back to the user on Telegram.

---

## 4. Workflow 2: `fluid_motion` (Direct API Pipeline)

This is a streamlined, machine-to-machine workflow designed for direct n8n automation pipelines without conversational friction or scene architect agents.

* **Trigger:** Webhook / API Call.
* **Required Payload Inputs:**
* `duration`: (e.g., 5s, 10s)
* `orientation`: (e.g., 16:9, 9:16)
* `resolution`: (Standard/HD)
* `prompt`: (Explicit text instructions for motion and scene)
* `reference_image`: (URL or base64)


* **Optional Payload Inputs:**
* `reference_video`: (For V2V / Ultimate Motion style rotoscoping)
* `audio_track`: (For lip-sync or audio-reactive motion)


* **Execution Flow:**
1. Ingest payload and validate parameters.
2. Format request payload for the RunPod Serverless video worker.
3. Trigger Serverless Video endpoint (Minimax H3 Max / LTX).
4. Poll endpoint for completion status (Serverless async handling).
5. Output the finished MP4 video URL/buffer to the next node in the n8n automation pipeline.



---

## 5. Serverless Compute Strategy (RunPod)

To optimize pricing and hardware requirements compared to always-on ComfyUI instances:

* **Architecture:** Package the inference logic (image and video) into Docker containers exposing a serverless handler (`runpod-serverless-python` SDK).
* **Cold Start Mitigation:** Keep container sizes minimal. Store heavy weights (Minimax/LTX) on network volumes attached to the serverless endpoints.
* **Billing:** Compute time is strictly billed per second of generation, drastically lowering the cost profile for idle bot times.