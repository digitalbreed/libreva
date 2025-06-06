#!/bin/bash

# Function to download file with progress
download_file() {
    local url=$1
    local output_file=$2
    local file_name=$(basename "$output_file")
    
    echo "Downloading $file_name..."
    curl -L -# "$url" -o "$output_file"
    
    if [ $? -eq 0 ]; then
        echo "✓ Downloaded $file_name"
    else
        echo "✗ Failed to download $file_name"
        exit 1
    fi
}

# Create model directory if it doesn't exist
MODEL_DIR="data/model"
mkdir -p "$MODEL_DIR"

# Define model files and their URLs
declare -A MODEL_FILES=(
    ["conds.pt"]="https://huggingface.co/ResembleAI/chatterbox/resolve/main/conds.pt?download=true"
    ["s3gen.pt"]="https://huggingface.co/ResembleAI/chatterbox/resolve/main/s3gen.pt?download=true"
    ["t3_cfg.pt"]="https://huggingface.co/ResembleAI/chatterbox/resolve/main/t3_cfg.pt?download=true"
    ["tokenizer.json"]="https://huggingface.co/ResembleAI/chatterbox/resolve/main/tokenizer.json?download=true"
    ["ve.pt"]="https://huggingface.co/ResembleAI/chatterbox/resolve/main/ve.pt?download=true"
)

# Check and download missing files
echo "Checking model files..."
for file in "${!MODEL_FILES[@]}"; do
    if [ ! -f "$MODEL_DIR/$file" ]; then
        echo "Model file $file not found. Starting download..."
        download_file "${MODEL_FILES[$file]}" "$MODEL_DIR/$file"
    else
        echo "✓ $file already exists"
    fi
done

# Set up CUDA environment if using GPU
if [ "$TTS_DEVICE" = "cuda" ]; then
    echo "Setting up CUDA environment..."
    # Check if CUDA is available
    if command -v nvidia-smi &> /dev/null; then
        echo "NVIDIA driver detected"
        # Set CUDA environment variables
        export TORCH_CUDA_ARCH_LIST="compute_35,compute_50,compute_60,compute_70,compute_75,compute_80,compute_86"
        export CUDA_HOME=/usr/local/cuda
        export PATH=$CUDA_HOME/bin:$PATH
        export LD_LIBRARY_PATH=$CUDA_HOME/lib64:$LD_LIBRARY_PATH
        
        # Set PyTorch environment variables
        export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
        export CUDA_LAUNCH_BLOCKING=1
        export CUDA_VISIBLE_DEVICES=0
        
        # Check if CUDA is working
        if python3 -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('CUDA version:', torch.version.cuda)" 2>/dev/null; then
            echo "CUDA setup complete"
        else
            echo "Warning: CUDA setup might be incomplete"
        fi
    else
        echo "Warning: nvidia-smi not found, CUDA setup might be incomplete"
    fi
else
    echo "Running in CPU mode"
fi

# Function to check if the server is ready
check_server() {
    # Try to connect to the health endpoint
    response=$(curl -s -w "\n%{http_code}" http://localhost:3100/health 2>/dev/null)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo "Health check response: $body (Status: $status_code)"
    
    if [ "$status_code" = "200" ]; then
        return 0
    elif [ "$status_code" = "503" ]; then
        # Service is still initializing
        echo "Service is still initializing..."
        return 1
    elif [ "$status_code" = "500" ]; then
        # Service encountered an error
        echo "Service encountered an error during initialization"
        return 1
    else
        # Service might be starting up or having issues
        echo "Service is starting up..."
        return 1
    fi
}

# Start the Python server in the background
echo "Starting TTS server..."
python tts_server.py &
SERVER_PID=$!

# Wait for the server to be ready
echo "Waiting for TTS service to initialize..."
MAX_ATTEMPTS=240  # 20 minutes total (240 * 5 seconds)
ATTEMPT=0

while ! check_server; do
    # Check if the server process is still running
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "TTS service failed to start"
        exit 1
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo "TTS service took too long to initialize"
        kill $SERVER_PID
        exit 1
    fi
    
    sleep 5
done

echo "TTS service is ready!"
wait $SERVER_PID 