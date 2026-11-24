FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=UTF-8

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3-pip \
    git \
    wget \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set python3.11 as default
RUN ln -s /usr/bin/python3.11 /usr/bin/python

# Clone ComfyUI
RUN git clone https://github.com/comfyanonymous/ComfyUI.git /app/ComfyUI

# Install ComfyUI Manager
RUN git clone https://github.com/ltdrdata/ComfyUI-Manager.git /app/ComfyUI/custom_nodes/ComfyUI-Manager

# Install python dependencies for ComfyUI
WORKDIR /app/ComfyUI
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 \
    && pip install --no-cache-dir -r requirements.txt

# Create model directories if they don't exist
RUN mkdir -p /app/ComfyUI/models/checkpoints \
    /app/ComfyUI/models/loras \
    /app/ComfyUI/models/vae \
    /app/ComfyUI/models/upscale_models \
    /app/ComfyUI/output

# We will symlink models in handler.py on startup if runpod-volume is mounted,
# or copy them over as part of the VolumeCache strategy.

# Copy handler and requirements
WORKDIR /app
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY handler.py /app/
COPY comfy_workflow_draft.json /app/
COPY comfy_workflow_final.json /app/

# Run the handler
CMD ["python", "-u", "/app/handler.py"]
