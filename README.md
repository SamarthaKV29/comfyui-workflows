# ⚡ ComfyUI Workflows Library & Interactive Catalog

A curated, categorized repository of **420+ production-ready ComfyUI workflows** covering generative video synthesis, 3D mesh generation, face restoration, multi-pass ControlNet pipelines, high-speed sampling (LCM/Lightning/Turbo), and extreme upscaling. Includes a built-in dark-mode **Single Page Application (SPA)** catalog for searching, filtering, and inspecting workflows.

---

## 🚀 Quick Start: Launch the Interactive Catalog

The repository includes a standalone, zero-dependency browser catalog powered by vanilla HTML5, CSS3, and JavaScript that dynamically parses [`workflow_details.json`](./workflow_details.json).

```bash
# Clone the repository
git clone https://github.com/aimpowerment/comfyui-workflows.git
cd comfyui-workflows

# Launch local HTTP server (Python 3)
python3 -m http.server 8000
```

Open **`http://localhost:8000`** in your browser to:
- **Instant Search**: Filter 420+ workflows by title, model, category, or practical use cases.
- **Category Pills**: Filter by domain (AnimateDiff, SVD, 3D/TripoSR, Face Transfer, SDXL, etc.).
- **Application Context**: View what each workflow is best used for and its primary production applications.

*(Alternatively, you can use `npx serve .` or any static file server).*

---

## 📂 Repository Structure

```
comfyui-workflows/
├── index.html               # SPA dashboard UI with real-time search & filters
├── styles.css               # Clean dark-mode stylesheet (CSS variables & flex layout)
├── app.js                   # Client-side dynamic data loader and search engine
├── workflow_details.json    # Complete JSON metadata database (423 workflows indexed)
├── README.md                # Project documentation and usage guide
└── workflows/               # Directory containing all 423 ComfyUI workflow JSON files
    ├── 1 - Basic Vid2Vid 1 ControlNet.json
    ├── 1) ControlNet_Passes_Export_v2.1.json
    ├── 2 - Vid2Vid Multi-ControlNet.json
    ├── 2) Animation Raw - LCM v2.1.json
    ├── 200524_Mickmumpitz_3D-RENDERING_IMG_SD15_SIMPLE_v3.json
    ├── 3d-model-generator-o68hj.json
    ├── 3d-tripoSR-layered-diffusion.json
    ├── ... (423 JSON files total)
```

---

## 🧭 Workflow Taxonomy & Breakdown

The 423 workflows are classified across 12 primary domains:

| Category | Count | Focus & Technologies | Primary Use Cases |
|---|---|---|---|
| **Animation & Generation** | **89** | AnimateDiff Evolved, Prompt Travel schedules, Motion LoRAs, FreeU v2 | AI video clips, music video visuals, camera pans/zooms |
| **Face & Character Transfer** | **56** | InstantID, PuLID, FaceID, Impact Pack FaceDetailer, SAMLoader | Character consistency, face replacement, portrait enhancement |
| **Image-to-Video & SVD** | **53** | Stable Video Diffusion (SVD, SVD-XT), VideoLinearCFGGuidance | Animating still photos, concept art animation, motion graphic loops |
| **Upscaling & Refinement** | **45** | Ultimate SD Upscale, SUPIR, ESRGAN, tiled VAE encoders/decoders | 4K/8K upscaling, texture enhancement, fixing blurry renders |
| **SDXL & Fast Models** | **41** | SDXL 1.0, SDXL Lightning, SDXL Turbo, SDXS, Hyper-SD (1 to 8 steps) | Low-latency real-time rendering, 1024px+ high-res image synthesis |
| **3D & TripoSR** | **36** | TripoSR feed-forward 3D, CRM 4-stage pipeline, Blender/CAD stylization | 2D-to-3D mesh generation (`.obj`/`.gltf`), game assets, 3D print prep |
| **Text-to-Image & General** | **32** | SD 1.5, prompt scheduling, multi-area conditioning, LoRA stacks | Artistic image generation, concept exploration, styling experiments |
| **Video-to-Video** | **28** | Multi-ControlNet (OpenPose, LineArt, Depth), context windowing | Restyling live-action video into anime/sketch while keeping motion |
| **Inpainting & Editing** | **27** | RemBG (Background Removal), Layered Diffusion, IC-Light relighting | Clothes swap, background replacement, object insertion/removal |
| **ControlNet & Conditioning** | **7** | DWPose, MiDaS Depth, soft-weighted brightness ControlNets | Precise pose guidance, lighting control, structural map generation |
| **Utilities & Preprocessing** | **2** | ControlNet multi-pass map exporters, Timestep/Latent keyframe morphing | Pre-rendering control passes to disk to eliminate redundant compute |
| **Archived Resources** | **7** | External documentation web pages saved with `.json` extensions | Reference documents |

---

## 🛠️ How to Use Workflows in ComfyUI

### 1. Load the Workflow
1. Open your running ComfyUI instance (default: `http://127.0.0.1:8188`).
2. Drag and drop any `.json` file from the [`workflows/`](./workflows/) folder directly onto the ComfyUI canvas.
3. Alternatively, click **Load** in the ComfyUI control panel and select the file.

### 2. Resolving Missing Custom Nodes
Most advanced workflows use community nodes (e.g. *AnimateDiff-Evolved*, *ComfyUI-Impact-Pack*, *IP-Adapter-Plus*, *ComfyUI-VideoHelperSuite*, *Comfy3D*).

1. Install **[ComfyUI-Manager](https://github.com/ltdrdata/ComfyUI-Manager)** if you haven't already.
2. In ComfyUI, click **Manager** > **Install Missing Custom Nodes**.
3. Click **Install** next to any red/missing node packs, then restart ComfyUI.

### 3. Model Placement Reference
Ensure relevant weights are placed in your ComfyUI models directory:

| Model Type | Destination Directory | Examples |
|---|---|---|
| **Base Checkpoints** | `ComfyUI/models/checkpoints/` | `v1-5-pruned-emaonly.safetensors`, `sd_xl_base_1.0.safetensors` |
| **ControlNet Models** | `ComfyUI/models/controlnet/` | `control_v11p_sd15_lineart.pth`, `control_v11p_sd15_openpose.pth` |
| **LoRAs** | `ComfyUI/models/loras/` | `lcm-lora-sdv1-5.safetensors`, `sdxl_lightning_8step_lora.safetensors` |
| **AnimateDiff Motion Models** | `ComfyUI/custom_nodes/ComfyUI-AnimateDiff-Evolved/models/` | `v3_sd15_mm.ckpt`, `animatediffMotion_v15V2.ckpt` |
| **IP-Adapter Models** | `ComfyUI/models/ipadapter/` | `ip-adapter-plus_sd15.safetensors`, `ip-adapter_sdxl_vit-h.safetensors` |
| **Upscale Models** | `ComfyUI/models/upscale_models/` | `4x-UltraSharp.pth`, `4x_NMKD-Superscale-SP_178000_G.pth` |
| **TripoSR Weights** | `ComfyUI/models/checkpoints/` or Comfy3D path | `model.ckpt` (TripoSR) |

---

## ☁️ Cloud & Hardware Requirements (RunPod & Local Specs)

ComfyUI workflows in this library vary drastically in compute requirements—from lightweight 1-step SDXS generators running on 6GB VRAM GPUs to multi-ControlNet AnimateDiff and Stable Video Diffusion pipelines requiring 24GB+ VRAM.

### 1. Requirements Matrix by Workflow Type

| Workflow Category | Minimum VRAM | Recommended VRAM | Recommended Local GPU / PC | Best RunPod GPU |
|---|---|---|---|---|
| **SD 1.5 & Basic Txt2Img** | **6 GB** | **8–12 GB** | RTX 3060 / 4060, Apple M1/M2/M3 (16GB RAM) | RTX 3070 / RTX 4000 Ada |
| **SDXL, Turbo & Lightning** | **8 GB** | **12–16 GB** | RTX 3080 / 4070 / 4080, Apple Silicon (32GB+ Unified) | RTX 3090 / RTX 4080 |
| **Video-to-Video & Multi-ControlNet** | **12 GB** | **16–24 GB** | RTX 3090, RTX 4080 / 4090 | RTX 3090 / RTX 4090 |
| **AnimateDiff (Evolved, Long, LoRAs)** | **12 GB** | **24 GB** | RTX 3090 / RTX 4090 | RTX 3090 / RTX 4090 / A5000 |
| **Stable Video Diffusion (SVD & SVD-XT)** | **16 GB** | **24 GB** | RTX 3090 / RTX 4090 | RTX 3090 / RTX 4090 / L40S |
| **3D & TripoSR / CRM Pipelines** | **12 GB** | **24 GB** (CUDA required) | RTX 3090 / RTX 4090 (NVIDIA only) | RTX 3090 / RTX 4090 |
| **Extreme Upscaling (SUPIR, 4K/8K Tiled)** | **16 GB** | **24–48 GB** | RTX 3090 / RTX 4090 | RTX 4090 / A6000 / L40S |
| **Face Restoration & Detailers (Impact Pack)** | **8 GB** | **12–16 GB** | RTX 3060 (12GB) / 4070 | RTX 3080 / RTX 4000 Ada |

> [!TIP]
> **Apple Silicon (Mac M-Series)**: Basic SD 1.5 and SDXL workflows will run using MPS (Metal Performance Shaders) on unified memory Macs with 16GB+ RAM. However, **CUDA-dependent custom nodes** (such as *TripoSR*, *CRM Modeler CUDA*, *OneFormer segmentation*, and *FlashAttention*) **require NVIDIA GPUs**. For these, RunPod or a dedicated NVIDIA workstation is required.

---

### 2. RunPod GPU Tier & Cost Guide

RunPod is the most cost-effective cloud GPU provider for running heavy ComfyUI pipelines without upfront hardware investment.

| GPU Model | VRAM | Spot Price (Approx.) | Secure / On-Demand (Approx.) | Best For Workflows |
|---|---|---|---|---|
| **NVIDIA RTX 3090** | **24 GB** | **~$0.22 / hr** | **~$0.34 / hr** | 🌟 **The Sweet Spot**: Runs 95% of workflows (AnimateDiff, SVD, SDXL, TripoSR, Multi-ControlNet). |
| **NVIDIA RTX 4000 Ada** | **20 GB** | **~$0.20 / hr** | **~$0.30 / hr** | Great budget choice for SDXL, FaceDetailer, and basic AnimateDiff. |
| **NVIDIA RTX 4090** | **24 GB** | **~$0.44 / hr** | **~$0.69 / hr** | **Fastest Consumer GPU**: 2x faster sampling and video generation speeds than 3090. |
| **NVIDIA A5000** | **24 GB** | **~$0.24 / hr** | **~$0.40 / hr** | Solid enterprise stability with 24GB VRAM for continuous production batches. |
| **NVIDIA L40S** | **48 GB** | **~$0.79 / hr** | **~$0.99 / hr** | **High VRAM**: Multiple concurrent workflows, massive batch latent rendering, SUPIR 8K. |
| **NVIDIA A100 (80GB SXM)**| **80 GB** | **~$1.49 / hr** | **~$1.89 / hr** | Enterprise pipelines, heavy model training, and massive parallel batch jobs. |

*(Prices are approximate and subject to RunPod market availability. Network volume storage costs approximately ~$0.07/GB per month).*

---

### 3. Step-by-Step: Deploying on RunPod

#### Step 1: Deploy a Pod
1. Sign in to [RunPod.io](https://runpod.io).
2. Go to **Pods** > **Deploy**.
3. Choose your GPU (an **RTX 3090 24GB** or **RTX 4090 24GB** is recommended).
4. Select the **ComfyUI Official Template** (e.g. `runpod/comfyui` or search community templates for *ComfyUI with Manager*).
5. Attach a **Network Volume** (50GB–100GB recommended) mounted to `/workspace` so your models, checkpoints, and custom nodes persist across pod restarts without re-downloading.

#### Step 2: Clone Workflows Into Your Pod
Open the web terminal or Jupyter terminal inside your pod and run:

```bash
# Navigate to ComfyUI directory
cd /workspace/ComfyUI

# Clone this workflow repository
git clone https://github.com/aimpowerment/comfyui-workflows.git

# Link or copy workflows into ComfyUI user folder
mkdir -p user/default/workflows
cp comfyui-workflows/workflows/*.json user/default/workflows/
```

#### Step 3: Access ComfyUI & Web Catalog
- **ComfyUI Interface**: Click the **Connect** button on RunPod and open **HTTP Service [Port 8188]**.
- **Interactive Catalog**: From the terminal inside `comfyui-workflows`, run `python3 -m http.server 8000` and connect via RunPod's port forwarder or SSH tunnel to browse and search workflows directly.

#### Step 4: Cost Saving Best Practices
- **Stop vs Terminate**: Always **Stop** your pod when not rendering. Stopping stops GPU per-hour billing (you only pay pennies/month for disk storage).
- **Spot Instances**: Use Spot instances for 40–50% discounts during experimentation and prototyping.
- **Pre-download Checkpoints to Network Volume**: Keep your heavy models (`v1-5-pruned`, `sd_xl_base_1.0`, SVD models) inside `/workspace/models` so they survive pod re-creations.

---

## 🔍 Database Schema (`workflow_details.json`)

The metadata catalog [`workflow_details.json`](./workflow_details.json) follows this schema:

```json
{
  "id": 1,
  "filename": "workflows/1 - Basic Vid2Vid 1 ControlNet.json",
  "name": "Basic Vid2Vid (1 ControlNet)",
  "category": "Video-to-Video",
  "target_model": "SD 1.5 + AnimateDiff",
  "key_nodes": [
    "ADE_AnimateDiffLoaderWithContext",
    "ControlNetApplyAdvanced",
    "LineArtPreprocessor",
    "KSampler",
    "ADE_AnimateDiffCombine"
  ],
  "description": "Extracts structural contours from input video frames using LineArtPreprocessor and applies single ControlNet guidance with AnimateDiff Evolved. Uses context windowing for smooth temporal restyling.",
  "use_cases": "Ideal for converting real-world video footage into line art, sketch, anime, or painterly styles while maintaining frame-to-frame motion consistency."
}
```

---

## 🤝 Contributing

1. Add your new ComfyUI workflow `.json` into the [`workflows/`](./workflows/) directory.
2. Add a corresponding metadata entry into [`workflow_details.json`](./workflow_details.json) with accurate category, target model, description, and application use cases.
3. Verify your entry appears properly in the local web dashboard (`http://localhost:8000`).
4. Submit a Pull Request.