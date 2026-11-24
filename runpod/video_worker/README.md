# RunPod Video Generation Worker

This repository contains a RunPod serverless worker for image-to-video generation. It uses a dual-model architecture, routing requests based on a specified quality/cost tier:
- **Standard Tier (`standard`)**: Powered by LTX (optimized for quick iteration and budget).
- **Premium Tier (`premium`)**: Powered by Minimax H3 Max (optimized for high-fidelity hero shots).

## Architecture & Cost Optimization

To avoid baking massive video models into the Docker container (which would cause extremely slow cold starts and bloated registry sizes), this worker uses the **VolumeCache pattern**.

1. **Network Volume:** Model weights are stored on a RunPod network volume mapped to `/runpod-volume`.
2. **Hydration:** On cold start, the worker copies the weights from the slow network volume to the container's fast local storage (`/app/models`).
3. **Lazy Loading:** Models are loaded into VRAM only when requested by their specific tier, reducing idle VRAM usage.

## Setup & Deployment

### 1. Network Volume Preparation
Create a RunPod Network Volume. Upload your model weights so the directory structure looks like this:
```
/runpod-volume/
└── models/
    └── video/
        ├── ltx/       # LTX weights here
        └── minimax/   # Minimax weights here
```

### 2. Build and Push Docker Image
```bash
docker build -t your-registry/video-worker:latest .
docker push your-registry/video-worker:latest
```

### 3. Create RunPod Endpoint
Create a new Serverless endpoint in RunPod:
- **GPU:** Choose an appropriate GPU (e.g., RTX 4090 or A100 based on VRAM needs).
- **Network Volume:** Attach the volume you prepared.
- **Volume Mount Path:** `/runpod-volume`
- **Image Name:** `your-registry/video-worker:latest`

## API Schema

The worker accepts JSON requests with the following schema:

```json
{
  "input": {
    "prompt": "A beautiful sunset over the mountains, slow pan right",
    "reference_image": "https://example.com/image.jpg", // URL or base64 encoded string
    "duration": 5.0,           // (Optional) Video duration in seconds. Default: 5.0
    "orientation": "16:9",     // (Optional) Aspect ratio. Default: "16:9"
    "resolution": "1080p",     // (Optional) "720p" or "1080p". Default: "720p"
    "tier": "premium",         // (Optional) "standard" (LTX) or "premium" (Minimax). Default: "standard"
    "reference_video": null,   // (Optional) URL/base64 for video-to-video transfers
    "audio_track": null,       // (Optional) URL/base64 for audio-reactive motion
    "seed": 42,                // (Optional) Random seed for reproducibility
    "fps": 24                  // (Optional) Frames per second. Default: 24
  }
}
```

### Output format

```json
{
  "video": "<base64_encoded_mp4_string>",
  "duration": 5.0,
  "fps": 24,
  "tier": "premium",
  "status": "success"
}
```

### Example Curl Request

```bash
curl -X POST "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{
       "input": {
         "prompt": "Cinematic pan of a neon cyberpunk city",
         "reference_image": "https://example.com/cyberpunk.png",
         "tier": "standard",
         "duration": 3.0
       }
     }'
```
