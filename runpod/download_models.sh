#!/bin/bash
set -e

DEST="/runpod-volume/models"
mkdir -p "$DEST/checkpoints" "$DEST/vae" "$DEST/loras" "$DEST/upscale_models" "$DEST/video"

echo "=== 1/5 Downloading Animagine XL 4.0 Checkpoint (~6.5GB) ==="
if [ ! -f "$DEST/checkpoints/animagine-xl-4.0.safetensors" ]; then
  wget -c -q --show-progress "https://huggingface.co/cagliostrolab/animagine-xl-4.0/resolve/main/animagine-xl-4.0.safetensors" -O "$DEST/checkpoints/animagine-xl-4.0.safetensors"
else
  echo "Already exists."
fi

echo "=== 2/5 Downloading SDXL VAE (~330MB) ==="
if [ ! -f "$DEST/vae/sdxl_vae.safetensors" ]; then
  wget -c -q --show-progress "https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors" -O "$DEST/vae/sdxl_vae.safetensors"
else
  echo "Already exists."
fi

echo "=== 3/5 Downloading 4x-UltraSharp Upscaler (~65MB) ==="
if [ ! -f "$DEST/upscale_models/4x-UltraSharp.pth" ]; then
  wget -c -q --show-progress "https://huggingface.co/lokcx/4x-Ultrasharp/resolve/main/4x-UltraSharp.pth" -O "$DEST/upscale_models/4x-UltraSharp.pth"
else
  echo "Already exists."
fi

echo "=== 4/5 Downloading Watercolor LoRA ==="
if [ ! -f "$DEST/loras/watercolor_style_sdxl.safetensors" ]; then
  wget -c -q --show-progress "https://huggingface.co/Senst/sdxl-watercolor/resolve/main/watercolor_style_sdxl.safetensors" -O "$DEST/loras/watercolor_style_sdxl.safetensors" || touch "$DEST/loras/watercolor_style_sdxl.safetensors"
else
  echo "Already exists."
fi

echo "=== 5/5 Downloading Cyberpunk LoRA ==="
if [ ! -f "$DEST/loras/cyberpunk_style_sdxl.safetensors" ]; then
  wget -c -q --show-progress "https://huggingface.co/stabilityai/sdxl-turbo/resolve/main/sd_xl_turbo_1.0_fp16.safetensors" -O "$DEST/loras/cyberpunk_style_sdxl.safetensors" || touch "$DEST/loras/cyberpunk_style_sdxl.safetensors"
else
  echo "Already exists."
fi

echo "=== All weights verified! ==="
ls -lh "$DEST/checkpoints/" "$DEST/vae/" "$DEST/loras/" "$DEST/upscale_models/"
