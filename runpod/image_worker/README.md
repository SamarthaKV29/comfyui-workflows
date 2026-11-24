# RunPod Serverless Image Worker (ComfyUI)

This directory contains a complete RunPod serverless worker for generating images using ComfyUI as the backend engine.

## Architecture

1.  **Docker Container**: Runs Ubuntu with Python 3.11, CUDA 12.1 runtime, and installs ComfyUI.
2.  **Handler**: A Python script (`handler.py`) utilizing the `runpod` SDK.
    *   Starts ComfyUI as a subprocess and waits for it to become healthy.
    *   Listens for serverless requests.
    *   Constructs a ComfyUI API workflow JSON, submits it to the local ComfyUI API, and polls for the result.
3.  **Volume Cache Strategy**: Model weights are NOT baked into the Docker image. Instead, they are expected to be mounted at `/runpod-volume`. On startup, `handler.py` symlinks the model directories from `/runpod-volume/models/` to `/app/ComfyUI/models/` to save disk space and startup time.

## Requirements

### Volume Structure
Create a Network Volume in RunPod and ensure the following structure under `/runpod-volume`:
```
/runpod-volume/
└── models/
    ├── checkpoints/
    │   └── sdxl_anime.safetensors
    ├── loras/
    │   ├── watercolor_style.safetensors
    │   └── cyberpunk_style.safetensors
    ├── vae/
    └── upscale_models/
        └── 4x-UltraSharp.pth
```
You can populate this volume by starting a basic Pod with the volume mounted, downloading the files, and then terminating the Pod.

## Deployment

1.  **Build the Docker Image:**
    ```bash
    docker build -t your-dockerhub-user/comfyui-runpod-worker:v1 .
    ```
2.  **Push the Image:**
    ```bash
    docker push your-dockerhub-user/comfyui-runpod-worker:v1
    ```
3.  **Create RunPod Endpoint:**
    *   Go to Serverless in RunPod console.
    *   Create a new Endpoint.
    *   Set the Container Image to `your-dockerhub-user/comfyui-runpod-worker:v1`.
    *   Attach the Network Volume you created.
    *   Set the Container Disk size and other parameters as needed.

## API Schema

### Input

Send a JSON payload in the `input` field of your request:

```json
{
  "input": {
    "prompt": "1girl, solo, anime style, highly detailed, beautiful landscape",
    "negative_prompt": "low quality, bad anatomy",
    "style": "watercolor",
    "mode": "draft",
    "orientation": "landscape",
    "steps": 25,
    "seed": 12345
  }
}
```

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prompt` | string | **Yes** | | The positive prompt for image generation. |
| `negative_prompt`| string | No | `""` | The negative prompt. |
| `style` | string | No | `"watercolor"` | Style LoRA to apply: `"watercolor"`, `"cyberpunk"`, or `"none"`. |
| `mode` | string | No | `"draft"` | Generation quality: `"draft"` (faster, 720p base) or `"final"` (slower, upscaled via 4x-UltraSharp). |
| `orientation` | string | No | `"landscape"` | `"landscape"` (1280x720) or `"portrait"` (720x1280). Overridden by width/height. |
| `width` | int | No | | Explicit width (overrides orientation). |
| `height` | int | No | | Explicit height (overrides orientation). |
| `steps` | int | No | | Override default step count (Draft: 20, Final: 35). |
| `seed` | int | No | Random | Set a specific seed for reproducibility. |

### Output

```json
{
  "image": "<base64_encoded_image_string>",
  "seed": 12345,
  "mode": "draft"
}
```

## Modes Explained

*   **Draft**: Runs a fast, single-pass generation using KSampler with 20 steps (by default). Good for quick iterations and previews.
*   **Final**: Runs a higher-quality generation with 35 steps, then passes the output through an `UpscaleModelLoader` and `ImageUpscaleWithModel` node using `4x-UltraSharp.pth` to dramatically increase resolution and clarity. Slower, but production-ready quality.

## Cost Optimization Notes

*   Using a Network Volume allows the Docker image to be extremely small, meaning the serverless container boots up much faster (less cold start penalty).
*   Symlinking models instead of copying them saves I/O time during the cold start.
*   Idle containers will scale to zero based on your RunPod endpoint configuration, saving money when not in use.
