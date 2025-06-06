import os
import sys
import tempfile
import base64
import torch
import torchaudio as ta
import re
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Tuple, Dict
from chatterbox.tts import ChatterboxTTS
import logging
import time
from generate_waveform import generate_waveform
import uuid
import signal
from contextlib import contextmanager
import threading
import asyncio
from text_processor import sanitize_text, split_into_chunks, parse_text_with_markers

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# Get device from environment variable, default to cuda
device_name = os.getenv('TTS_DEVICE', 'cuda')

# Check CUDA availability and memory before starting
if device_name == 'cuda':
    try:
        if not torch.cuda.is_available():
            logger.error("CUDA is not available on this system")
            sys.exit(1)
        logger.info(f"CUDA is available. Device count: {torch.cuda.device_count()}")
        logger.info(f"Current CUDA device: {torch.cuda.current_device()}")
        logger.info(f"CUDA device name: {torch.cuda.get_device_name()}")
        logger.info(f"CUDA memory allocated: {torch.cuda.memory_allocated() / 1024**2:.2f} MB")
        logger.info(f"CUDA memory cached: {torch.cuda.memory_reserved() / 1024**2:.2f} MB")
        
        # Set CUDA memory management
        torch.cuda.empty_cache()
        torch.cuda.set_per_process_memory_fraction(0.8)  # Use 80% of available memory
        logger.info("Set CUDA memory management parameters")
        
    except Exception as e:
        logger.error(f"Error checking CUDA availability: {str(e)}", exc_info=True)
        sys.exit(1)

# Monkey patch torch load needed for CPU support
# See https://github.com/resemble-ai/chatterbox/issues/96#issuecomment-2925635803
# See https://github.com/resemble-ai/chatterbox/blob/master/example_for_mac.py
original_torch_load = torch.load
def patched_torch_load(*args, **kwargs):
    if 'map_location' not in kwargs:
        kwargs['map_location'] = torch.device(device_name)
    return original_torch_load(*args, **kwargs)
if device_name != 'cuda':
    torch.load = patched_torch_load

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class TTSRequest(BaseModel):
    text: str
    voice: str = "default"
    voice_sample: Optional[str] = None
    exaggeration: float = 0.5
    temperature: float = 0.5

class TTSSettings:
    def __init__(self, exaggeration: float = 0.5, temperature: float = 0.5):
        self.exaggeration = exaggeration
        self.temperature = temperature

# Initialize TTS model
model = None
initialization_started = False
initialization_error = None
initialization_complete = False

def load_model():
    global model, initialization_error, initialization_complete
    try:
        logger.info("Starting model initialization...")
        
        # Initialize CUDA first if needed
        if device_name == 'cuda':
            logger.info("Initializing CUDA...")
            if not torch.cuda.is_available():
                logger.error("CUDA is not available on this system")
                sys.exit(1)
            logger.info(f"CUDA is available. Device count: {torch.cuda.device_count()}")
            logger.info(f"Current CUDA device: {torch.cuda.current_device()}")
            logger.info(f"CUDA device name: {torch.cuda.get_device_name()}")
            
            # Clear CUDA cache before initialization
            try:
                logger.info("Clearing CUDA cache...")
                torch.cuda.empty_cache()
                logger.info("CUDA cache cleared")
                logger.info(f"CUDA memory before model load: {torch.cuda.memory_allocated() / 1024**2:.2f} MB")
                logger.info(f"CUDA memory cached: {torch.cuda.memory_reserved() / 1024**2:.2f} MB")
            except Exception as e:
                logger.error(f"Error clearing CUDA cache: {str(e)}", exc_info=True)
                raise
            
            # Set memory management for model loading
            logger.info("Setting CUDA memory management parameters...")
            torch.cuda.empty_cache()
            torch.cuda.set_per_process_memory_fraction(0.8)
            logger.info("CUDA memory management parameters set")
        
        device = torch.device(device_name)
        logger.info(f"Using device: {device}")
        
        logger.info("Starting ChatterboxTTS model loading...")
        
        # Check if model directory exists
        model_dir = "data/model"
        if not os.path.exists(model_dir):
            raise RuntimeError(f"Model directory {model_dir} does not exist. Please run copy_models.sh first.")
        
        # Load model from local files
        device = torch.device(device_name)
        model = ChatterboxTTS.from_local("data/model", device)
        
        logger.info("Restoring original torch.load...")
        torch.load = original_torch_load
        logger.info("Original torch.load restored")
        
        if device_name == 'cuda':
            try:
                logger.info("Checking CUDA memory after model load...")
                logger.info(f"CUDA memory after model load: {torch.cuda.memory_allocated() / 1024**2:.2f} MB")
                logger.info(f"CUDA memory cached: {torch.cuda.memory_reserved() / 1024**2:.2f} MB")
            except Exception as e:
                logger.error(f"Error checking CUDA memory after load: {str(e)}", exc_info=True)
        
        logger.info("TTS model initialization completed successfully")
        initialization_complete = True
            
    except Exception as e:
        initialization_error = str(e)
        logger.error(f"Error initializing TTS model: {str(e)}", exc_info=True)
        sys.exit(1)

@app.on_event("startup")
async def startup_event():
    global initialization_started
    logger.info("Starting TTS model initialization...")
    initialization_started = True
    
    # Start model loading in a separate thread
    thread = threading.Thread(target=load_model)
    thread.daemon = True
    thread.start()

@app.get("/health")
async def health_check():
    if initialization_error:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Initialization failed: {initialization_error}"}
        )
    if not initialization_started:
        return JSONResponse(
            status_code=503,
            content={"status": "not_started", "message": "TTS model initialization has not started"}
        )
    if not initialization_complete:
        return JSONResponse(
            status_code=503,
            content={"status": "initializing", "message": "TTS model is still initializing"}
        )
    if model is None:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": "Model failed to initialize"}
        )
    return JSONResponse(
        status_code=200,
        content={"status": "healthy", "message": "TTS model is initialized and ready"}
    )

def create_silence(duration_ms: int, sample_rate: int) -> torch.Tensor:
    """Create a silence tensor of specified duration in milliseconds."""
    num_samples = int((duration_ms / 1000.0) * sample_rate)
    return torch.zeros(1, num_samples)

@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    temp_path = None
    voice_path = None
    try:
        if not model:
            raise HTTPException(status_code=503, detail="TTS model is still initializing")

        start_time = time.time()
        logger.info(f"Received TTS request for text length {len(request.text)} and voice {request.voice}")
        
        # Handle custom voice sample
        if request.voice == "custom" and request.voice_sample:
            try:
                # Create a temporary file for the voice sample
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_voice:
                    # Decode base64 and write to file
                    voice_data = base64.b64decode(request.voice_sample)
                    temp_voice.write(voice_data)
                    voice_path = temp_voice.name
                    logger.info(f"Created temporary voice file at: {voice_path}")
            except Exception as e:
                logger.error(f"Error creating voice sample file: {str(e)}", exc_info=True)
                raise HTTPException(status_code=400, detail=f"Invalid voice sample: {str(e)}")
        
        # Create a temporary file for output
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_path = temp_file.name
                logger.info(f"Created temporary output file at: {temp_path}")
        except Exception as e:
            logger.error(f"Error creating temporary output file: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to create temporary file")
        
        # Parse text for markers and split into chunks
        text_parts = parse_text_with_markers(request.text)
        
        if not text_parts:
            raise HTTPException(status_code=400, detail="No valid text parts found after parsing")
        
        # Initialize settings with request defaults
        current_settings = TTSSettings(
            exaggeration=request.exaggeration,
            temperature=request.temperature
        )
        
        # Generate speech for each part and collect audio tensors
        audio_parts = []
        for text_part, settings in text_parts:
            # Update settings if markers are present
            if 'exaggeration' in settings:
                current_settings.exaggeration = settings['exaggeration']
                logger.info(f"Updated exaggeration to: {current_settings.exaggeration}")
            if 'temperature' in settings:
                current_settings.temperature = settings['temperature']
                logger.info(f"Updated temperature to: {current_settings.temperature}")
            
            if text_part and text_part.strip():  # Only generate for non-empty text parts
                # Split text into chunks if needed
                chunks = split_into_chunks(text_part)
                logger.info(f"Split text into {len(chunks)} chunks")
                
                for chunk in chunks:
                    logger.info(f"Generating speech for chunk: '{chunk}' with settings: {current_settings.__dict__}")
                    wav = model.generate(
                        chunk,
                        audio_prompt_path=voice_path,
                        exaggeration=current_settings.exaggeration,
                        temperature=current_settings.temperature
                    )
                    audio_parts.append(wav)
            
            if 'pause_ms' in settings:  # Add silence for pause markers
                logger.info(f"Adding pause of {settings['pause_ms']}ms")
                silence = create_silence(settings['pause_ms'], model.sr)
                audio_parts.append(silence)
        
        # Concatenate all audio parts
        if audio_parts:
            final_audio = torch.cat(audio_parts, dim=1)
        else:
            raise HTTPException(status_code=400, detail="No audio parts were generated")
        
        # Save to temporary file
        ta.save(temp_path, final_audio, model.sr)
        
        end_time = time.time()
        logger.info(f"Speech generation completed in {end_time - start_time:.2f} seconds")
        
        # Clean up voice sample temp file if it was created
        if request.voice == "custom" and request.voice_sample:
            os.unlink(voice_path)
        
        # Return the file using FileResponse
        logger.info(f"Returning file response for {temp_path}")
        return FileResponse(
            temp_path,
            media_type="audio/wav",
            filename="generated_speech.wav",
            background=lambda: asyncio.create_task(cleanup_file(temp_path))
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in text_to_speech: {str(e)}", exc_info=True)
        # Clean up temp files if they exist
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception as cleanup_error:
                logger.error(f"Error cleaning up temp_path: {str(cleanup_error)}", exc_info=True)
        if voice_path and os.path.exists(voice_path):
            try:
                os.unlink(voice_path)
            except Exception as cleanup_error:
                logger.error(f"Error cleaning up voice_path: {str(cleanup_error)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def cleanup_file(file_path: str):
    """Helper function to safely clean up temporary files with proper error handling."""
    try:
        if os.path.exists(file_path):
            logger.info(f"Attempting to clean up temporary file: {file_path}")
            try:
                os.unlink(file_path)
                logger.info(f"Successfully cleaned up temporary file: {file_path}")
            except PermissionError as pe:
                logger.error(f"Permission error cleaning up {file_path}: {str(pe)}", exc_info=True)
            except OSError as oe:
                logger.error(f"OS error cleaning up {file_path}: {str(oe)}", exc_info=True)
        else:
            logger.warning(f"Temporary file {file_path} does not exist during cleanup")
    except Exception as e:
        logger.error(f"Unexpected error cleaning up temporary file {file_path}: {str(e)}", exc_info=True)

@app.post("/generate-waveform")
async def generate_waveform_endpoint(file: UploadFile = File(...)):
    try:
        # Create a temporary file for the input
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_input:
            content = await file.read()
            if not content:
                raise HTTPException(status_code=400, detail="Empty file uploaded")
            temp_input.write(content)
            input_path = temp_input.name

        # Create a temporary file for the output
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_output:
            output_path = temp_output.name

        # Generate waveform
        try:
            generate_waveform(input_path, output_path)
        except Exception as e:
            logger.error(f"Error in waveform generation: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error generating waveform: {str(e)}")

        # Clean up input file
        os.unlink(input_path)

        # Return the waveform image
        return FileResponse(
            output_path,
            media_type="image/png",
            filename="waveform.png",
            background=lambda: asyncio.create_task(cleanup_file(output_path))  # Delete file after sending
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in waveform endpoint: {str(e)}", exc_info=True)
        # Clean up temp files if they exist
        if 'input_path' in locals() and os.path.exists(input_path):
            os.unlink(input_path)
        if 'output_path' in locals() and os.path.exists(output_path):
            os.unlink(output_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler to catch and log all unhandled exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting TTS server...")
    uvicorn.run(app, host="0.0.0.0", port=3100) 