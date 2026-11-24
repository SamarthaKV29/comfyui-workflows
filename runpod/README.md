# RunPod Serverless Workers — Fluid Motion

> Self-contained serverless compute layer for the Fluid Motion video generation pipeline.
> Designed to be portable — can be extracted into its own repo with zero coupling to `n8n/` or `docs/`.

---

## Architecture

```text
runpod/
├── config/
│   ├── endpoint_defaults.json    # Serverless endpoint settings (workers, timeouts, GPU)
│   └── model_manifest.json       # Model names, paths, sizes, sources
├── image_worker/                 # ComfyUI + SDXL anime — serverless image generation
│   ├── Dockerfile
│   ├── handler.py
│   ├── comfy_workflow_draft.json  # 1024-1280px, ~20 steps (cheap iteration)
│   ├── comfy_workflow_final.json  # Upscale to 2K/4K, ~35 steps + refiner
│   ├── requirements.txt
│   └── README.md
└── video_worker/                 # LTX (standard) + Minimax (premium) — image-to-video
    ├── Dockerfile
    ├── handler.py
    ├── requirements.txt
    └── README.md
```

---

## Cost Strategy

| Principle | Implementation |
|-----------|---------------|
| **Scale to zero** | `workersMin=0` — \$0 when idle |
| **Fast cold starts** | VolumeCache hydrates weights from `/runpod-volume` |
| **Draft before final** | Cheap iterations at 1024px; upscale only after user confirms |
| **Lean Docker images** | No weights baked in; minimal OS packages |
| **LoRAs over checkpoints** | 1 base checkpoint + 2 small LoRAs, not multiple heavy models |
| **Tiered video** | LTX (budget) by default; Minimax (premium) only on request |

See [endpoint_defaults.json](config/endpoint_defaults.json) for exact settings.

---

## Model Stack

| Component | Model | Size | Role |
|-----------|-------|------|------|
| SDXL Anime Checkpoint | Animagine XL 4.0 | ~6.5 GB | House base model |
| SDXL VAE | sdxl_vae | ~300 MB | Consistent colors |
| Style LoRA (watercolor) | watercolor_style_sdxl | ~150 MB | Ghibli/warm aesthetic |
| Style LoRA (cyberpunk) | cyberpunk_style_sdxl | ~150 MB | Neon/dark aesthetic |
| Upscaler | 4x-UltraSharp | ~65 MB | Final mode upscaling |
| Video (standard) | LTX Video | ~9 GB | Default video gen |
| Video (premium) | Minimax H3 Max | TBD | Premium hero shots |

See [model_manifest.json](config/model_manifest.json) for paths and sources.

---

## Network Volume Layout

```text
/runpod-volume/models/
├── checkpoints/
│   └── animagine-xl-4.0.safetensors
├── vae/
│   └── sdxl_vae.safetensors
├── loras/
│   ├── watercolor_style_sdxl.safetensors
│   └── cyberpunk_style_sdxl.safetensors
├── upscale_models/
│   └── 4x-UltraSharp.pth
└── video/
    ├── ltx-video/
    └── minimax-h3-max/
```

---

## Deployment Steps

### 1. Create Network Volume

```bash
# Via RunPod dashboard:
# 1. Go to Storage > Network Volumes
# 2. Create volume in your preferred region
# 3. Note the volume ID
# 4. Upload model files to the volume layout above
```

### 2. Build & Push Docker Images

```bash
# Image worker
cd runpod/image_worker
docker build -t your-registry/fluid-motion-image:latest .
docker push your-registry/fluid-motion-image:latest

# Video worker
cd runpod/video_worker
docker build -t your-registry/fluid-motion-video:latest .
docker push your-registry/fluid-motion-video:latest
```

### 3. Create Serverless Endpoints

Create endpoints via RunPod dashboard or API:
- Attach the network volume
- Set `workersMin=0`, `workersMax=4`, `idleTimeout=10s`
- Enable VolumeCache
- Select appropriate GPU (A40 for image, A100 for video)

### 4. Wire into n8n

Update the n8n workflow HTTP Request nodes with:
- Endpoint URL: `https://api.runpod.ai/v2/{endpoint_id}/run`
- API Key: Your RunPod API key (stored as n8n credential)

---

## References

- [RunPod VolumeCache](https://docs.runpod.io/serverless/development/volume-cache)
- [Endpoint Configuration](https://docs.runpod.io/serverless/endpoints/endpoint-configurations)
- [Serverless Python SDK](https://github.com/runpod/runpod-python)
