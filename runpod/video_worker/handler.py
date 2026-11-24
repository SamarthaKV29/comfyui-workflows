import os
import io
import time
import base64
import shutil
import logging
import requests
import subprocess
import tempfile
from typing import Dict, Any, Optional
from pydantic import BaseModel, HttpUrl, Field, validator

import runpod
import torch
from diffusers import LTXPipeline, LTXVideoPipeline # Assuming hypothetical pipeline names for these models
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
NETWORK_VOLUME_PATH = "/runpod-volume/models/video"
LOCAL_CACHE_PATH = "/app/models"

class VideoRequest(BaseModel):
    """Schema for incoming video generation requests."""
    prompt: str = Field(..., description="Motion/scene description")
    reference_image: str = Field(..., description="Base64 encoded reference image OR URL")
    duration: float = Field(5.0, description="Video duration in seconds")
    orientation: str = Field("16:9", description="Aspect ratio")
    resolution: str = Field("720p", description="Resolution: 720p or 1080p")
    tier: str = Field("standard", description="Model tier: standard (LTX) or premium (Minimax)")
    reference_video: Optional[str] = Field(None, description="Base64 or URL for video-to-video")
    audio_track: Optional[str] = Field(None, description="Base64 or URL for audio-reactive motion")
    seed: Optional[int] = Field(None, description="Random seed")
    fps: int = Field(24, description="Frames per second")

    @validator('tier')
    def validate_tier(cls, v):
        if v not in ['standard', 'premium']:
            raise ValueError('Tier must be "standard" or "premium"')
        return v

    @validator('resolution')
    def validate_resolution(cls, v):
        if v not in ['720p', '1080p']:
            raise ValueError('Resolution must be "720p" or "1080p"')
        return v


def hydrate_models():
    """VolumeCache pattern: Copy models from slow network storage to fast local storage."""
    if not os.path.exists(NETWORK_VOLUME_PATH):
        logger.warning(f"Network volume not found at {NETWORK_VOLUME_PATH}. Bypassing hydration.")
        return

    os.makedirs(LOCAL_CACHE_PATH, exist_ok=True)
    
    # Example: Copying LTX model
    ltx_net_path = os.path.join(NETWORK_VOLUME_PATH, "ltx")
    ltx_local_path = os.path.join(LOCAL_CACHE_PATH, "ltx")
    if os.path.exists(ltx_net_path) and not os.path.exists(ltx_local_path):
        logger.info("Hydrating LTX model to local cache...")
        shutil.copytree(ltx_net_path, ltx_local_path)
    
    # Example: Copying Minimax model
    minimax_net_path = os.path.join(NETWORK_VOLUME_PATH, "minimax")
    minimax_local_path = os.path.join(LOCAL_CACHE_PATH, "minimax")
    if os.path.exists(minimax_net_path) and not os.path.exists(minimax_local_path):
        logger.info("Hydrating Minimax model to local cache...")
        shutil.copytree(minimax_net_path, minimax_local_path)
        
    logger.info("Model hydration complete.")


def load_image(image_input: str) -> Image.Image:
    """Load image from Base64 or URL."""
    if image_input.startswith("http://") or image_input.startswith("https://"):
        response = requests.get(image_input, timeout=10)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content)).convert("RGB")
    else:
        # Assuming base64
        if "," in image_input:
            image_input = image_input.split(",", 1)[1]
        image_bytes = base64.b64decode(image_input)
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def frames_to_mp4(frames, fps: int) -> bytes:
    """Convert a list of PIL Images to an MP4 video using ffmpeg."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Save frames
        for i, frame in enumerate(frames):
            frame.save(os.path.join(temp_dir, f"frame_{i:04d}.png"))
        
        output_path = os.path.join(temp_dir, "output.mp4")
        
        # Run ffmpeg
        cmd = [
            "ffmpeg",
            "-y",
            "-framerate", str(fps),
            "-i", os.path.join(temp_dir, "frame_%04d.png"),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            output_path
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            with open(output_path, "rb") as f:
                return f.read()
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg error: {e.stderr.decode()}")
            raise RuntimeError("Failed to encode video")


class ModelManager:
    """Lazy-loads and manages model pipelines."""
    def __init__(self):
        self.ltx_pipeline = None
        self.minimax_pipeline = None

    def get_ltx(self):
        if not self.ltx_pipeline:
            logger.info("Loading LTX model into memory...")
            model_path = os.path.join(LOCAL_CACHE_PATH, "ltx")
            if not os.path.exists(model_path):
                 # Fallback to dummy for demonstration if not found
                 logger.warning("LTX path not found, using placeholder logic.")
                 return None
            # e.g. self.ltx_pipeline = LTXPipeline.from_pretrained(model_path, torch_dtype=torch.float16).to("cuda")
        return self.ltx_pipeline

    def get_minimax(self):
        if not self.minimax_pipeline:
            logger.info("Loading Minimax model into memory...")
            model_path = os.path.join(LOCAL_CACHE_PATH, "minimax")
            if not os.path.exists(model_path):
                 logger.warning("Minimax path not found, using placeholder logic.")
                 return None
            # e.g. self.minimax_pipeline = MinimaxPipeline.from_pretrained(model_path, torch_dtype=torch.float16).to("cuda")
        return self.minimax_pipeline

model_manager = ModelManager()

def handler(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    RunPod serverless handler function.
    """
    try:
        # Validate Input
        job_input = event.get("input", {})
        request = VideoRequest(**job_input)
        
        logger.info(f"Processing request for tier: {request.tier}, resolution: {request.resolution}")
        
        # Parse image
        ref_image = load_image(request.reference_image)
        
        # Determine num frames
        num_frames = int(request.duration * request.fps)

        generator = torch.Generator("cuda")
        if request.seed is not None:
            generator.manual_seed(request.seed)
        else:
            generator.seed()

        # Route to model
        if request.tier == "standard":
            pipeline = model_manager.get_ltx()
            logger.info("Running LTX inference...")
            # frames = pipeline(prompt=request.prompt, image=ref_image, num_frames=num_frames, generator=generator).frames
            # Mocking output for template
            frames = [ref_image] * num_frames
        else:
            pipeline = model_manager.get_minimax()
            logger.info("Running Minimax inference...")
            # frames = pipeline(prompt=request.prompt, image=ref_image, num_frames=num_frames, generator=generator).frames
            # Mocking output for template
            frames = [ref_image] * num_frames

        # Post-processing to MP4
        mp4_bytes = frames_to_mp4(frames, request.fps)
        mp4_b64 = base64.b64encode(mp4_bytes).decode("utf-8")

        return {
            "video": mp4_b64,
            "duration": request.duration,
            "fps": request.fps,
            "tier": request.tier,
            "status": "success"
        }

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}", exc_info=True)
        return {
            "error": str(e),
            "status": "failed"
        }


if __name__ == "__main__":
    # Hydrate models on worker start
    hydrate_models()
    # Start RunPod serverless worker
    runpod.serverless.start({"handler": handler})
