FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3-pip \
    python3.11-dev \
    ffmpeg \
    git \
    wget \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set python3.11 as default
RUN ln -s /usr/bin/python3.11 /usr/local/bin/python && \
    ln -s /usr/bin/pip3 /usr/local/bin/pip

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY handler.py .

# Do NOT bake model weights - they will be mounted via network volume at /runpod-volume

CMD ["python", "-u", "handler.py"]
