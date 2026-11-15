# Video toolchain for marketing/video: headless Chromium (page recording), ffmpeg, Kokoro TTS (offline).
FROM debian:trixie-slim
ENV DEBIAN_FRONTEND=noninteractive CHROME_BIN=/usr/bin/chromium PIP_BREAK_SYSTEM_PACKAGES=1
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl python3 python3-pip chromium ffmpeg nodejs libsndfile1 \
        fonts-dejavu-core fonts-inter \
    && rm -rf /var/lib/apt/lists/*
RUN pip3 install --no-cache-dir playwright==1.63.0 pillow==12.3.0 numpy==2.5.3 soundfile==0.14.0 kokoro-onnx==0.6.1 piper-tts==1.8.0
WORKDIR /workspace
