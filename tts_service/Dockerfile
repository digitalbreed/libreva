# Use Python base image for CPU compatibility
# CUDA will be available through the host's NVIDIA runtime when running with GPU
# When running on CPU-only devices, the service will automatically fall back to CPU
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make the startup script executable
RUN chmod +x start_tts.sh

EXPOSE 5000

# Use the startup script instead of directly running Python
CMD ["./start_tts.sh"] 