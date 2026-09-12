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