import json
import base64
import time
import subprocess
import os
import shutil
import random
import runpod
import requests
from typing import Dict, Any, Optional

COMFYUI_DIR = "/app/ComfyUI"
COMFYUI_PORT = 8188
COMFYUI_URL = f"http://127.0.0.1:{COMFYUI_PORT}"
VOLUME_DIR = "/runpod-volume"

# Constants for LoRAs
LORA_MAP = {
    "watercolor": "watercolor_style_sdxl.safetensors",
    "cyberpunk": "cyberpunk_style_sdxl.safetensors"
}

def setup_volume_cache():
    """
    Hydrate models from /runpod-volume to /app/ComfyUI/models.
    Alternatively, symlinks can be used to save space and time.
    """
    if not os.path.exists(VOLUME_DIR):
        print(f"Warning: Volume directory {VOLUME_DIR} not found. Ensure models are provided.")
        return

    model_dirs = ["checkpoints", "loras", "vae", "upscale_models"]
    
    for mdir in model_dirs:
        src = os.path.join(VOLUME_DIR, "models", mdir)
        dst = os.path.join(COMFYUI_DIR, "models", mdir)
        
        if os.path.exists(src):
            # Using symlinks to save time and disk space inside the container
            if os.path.exists(dst) and not os.path.islink(dst):
                shutil.rmtree(dst)
            if not os.path.exists(dst):
                print(f"Symlinking {src} to {dst}")
                os.symlink(src, dst)
        else:
            print(f"Warning: Source model directory {src} does not exist in volume.")

def start_comfyui():
    """Starts the ComfyUI subprocess and waits for it to become healthy."""
    print("Starting ComfyUI...")
    process = subprocess.Popen(
        ["python", "main.py", "--port", str(COMFYUI_PORT)],
        cwd=COMFYUI_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for ComfyUI to start
    max_retries = 30
    for i in range(max_retries):
        try:
            response = requests.get(COMFYUI_URL)
            if response.status_code == 200:
                print("ComfyUI is ready.")
                return process
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(1)
        
    raise RuntimeError("Failed to start ComfyUI within the timeout period.")

def load_workflow(mode: str) -> Dict[str, Any]:
    """Loads the appropriate ComfyUI workflow JSON based on mode."""
    filename = "comfy_workflow_draft.json" if mode == "draft" else "comfy_workflow_final.json"
    with open(filename, "r") as f:
        return json.load(f)

def modify_workflow(workflow: Dict[str, Any], params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Modifies the workflow dictionary with generation parameters.
    This logic assumes a specific node structure matching our provided JSONs.
    """
    prompt = params.get("prompt", "")
    negative_prompt = params.get("negative_prompt", "")
    seed = params.get("seed", random.randint(1, 2**63 - 1))
    steps = params.get("steps")
    style = params.get("style", "watercolor")
    mode = params.get("mode", "draft")
    orientation = params.get("orientation", "landscape")
    width = params.get("width")
    height = params.get("height")

    # Set default resolution based on orientation if width/height not provided
    if not width or not height:
        if orientation == "portrait":
            width, height = 720, 1280
        else:
            width, height = 1280, 720

    # Locate node IDs
    # These IDs must match the node IDs in the workflow JSON
    prompt_node_id = "6"      # CLIPTextEncode (Positive)
    neg_prompt_node_id = "7"  # CLIPTextEncode (Negative)
    sampler_node_id = "3"     # KSampler
    empty_latent_node_id = "5"# EmptyLatentImage
    lora_node_id = "10"       # LoraLoader
    
    # 1. Set prompts
    if prompt_node_id in workflow:
        workflow[prompt_node_id]["inputs"]["text"] = prompt
    if neg_prompt_node_id in workflow:
        workflow[neg_prompt_node_id]["inputs"]["text"] = negative_prompt
        
    # 2. Set KSampler params
    if sampler_node_id in workflow:
        workflow[sampler_node_id]["inputs"]["seed"] = seed
        if steps:
            workflow[sampler_node_id]["inputs"]["steps"] = steps

    # 3. Set Resolution
    if empty_latent_node_id in workflow:
        workflow[empty_latent_node_id]["inputs"]["width"] = width
        workflow[empty_latent_node_id]["inputs"]["height"] = height

    # 4. Handle LoRA
    if lora_node_id in workflow:
        if style in LORA_MAP:
            workflow[lora_node_id]["inputs"]["lora_name"] = LORA_MAP[style]
            workflow[lora_node_id]["inputs"]["strength_model"] = 1.0
            workflow[lora_node_id]["inputs"]["strength_clip"] = 1.0
        else:
            # Bypass LoRA by setting strength to 0
            workflow[lora_node_id]["inputs"]["strength_model"] = 0.0
            workflow[lora_node_id]["inputs"]["strength_clip"] = 0.0

    return workflow, seed

def queue_prompt(workflow: Dict[str, Any]) -> str:
    """Submits workflow to ComfyUI API."""
    data = {"prompt": workflow}
    response = requests.post(f"{COMFYUI_URL}/prompt", json=data)
    response.raise_for_status()
    return response.json()["prompt_id"]

def get_image(filename: str, subfolder: str, folder_type: str) -> bytes:
    """Gets the image data from ComfyUI API."""
    data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
    response = requests.get(f"{COMFYUI_URL}/view", params=data)
    response.raise_for_status()
    return response.content

def get_history(prompt_id: str) -> Dict[str, Any]:
    """Gets the execution history of a prompt."""
    response = requests.get(f"{COMFYUI_URL}/history/{prompt_id}")
    response.raise_for_status()
    return response.json()

def wait_for_completion(prompt_id: str, timeout: int = 300) -> Dict[str, Any]:
    """Polls history until the prompt completes."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        history = get_history(prompt_id)
        if prompt_id in history:
            return history[prompt_id]
        time.sleep(1)
    raise TimeoutError("Prompt execution timed out.")

def handler(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    RunPod serverless handler entry point.
    event["input"] contains the user's input JSON.
    """
    try:
        job_input = event.get("input", {})
        
        # Validate required inputs
        if "prompt" not in job_input:
            return {"error": "Missing required field: prompt"}
            
        mode = job_input.get("mode", "draft")
        
        # Load and modify workflow
        base_workflow = load_workflow(mode)
        workflow, seed = modify_workflow(base_workflow, job_input)
        
        # Submit to ComfyUI
        prompt_id = queue_prompt(workflow)
        print(f"Queued prompt ID: {prompt_id}")
        
        # Wait for completion
        history = wait_for_completion(prompt_id)
        
        # Extract output image
        # Assuming the SaveImage node produces outputs under history[prompt_id]['outputs']
        outputs = history.get("outputs", {})
        images = []
        for node_id, node_output in outputs.items():
            if "images" in node_output:
                for img in node_output["images"]:
                    img_data = get_image(img["filename"], img["subfolder"], img["type"])
                    b64_img = base64.b64encode(img_data).decode("utf-8")
                    images.append(b64_img)
                    
        if not images:
            return {"error": "No images generated."}
            
        return {
            "image": images[0],  # Return the first image generated
            "seed": seed,
            "mode": mode
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

if __name__ == "__main__":
    setup_volume_cache()
    start_comfyui()
    runpod.serverless.start({"handler": handler})
