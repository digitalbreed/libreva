import os
import numpy as np
import librosa
import matplotlib.pyplot as plt
from PIL import Image
import io

def generate_waveform(wav_path: str, output_path: str, width: int = 800, height: int = 200):
    """
    Generate a waveform visualization from a WAV file.
    
    Args:
        wav_path: Path to the WAV file
        output_path: Path to save the waveform image
        width: Width of the output image
        height: Height of the output image
    """
    # Load the audio file
    y, sr = librosa.load(wav_path, sr=None)
    
    # Create figure with transparent background
    plt.figure(figsize=(width/100, height/100), dpi=100)
    plt.axis('off')
    
    # Plot waveform
    plt.plot(y, color='#2563eb', linewidth=1, alpha=0.8)
    
    # Remove padding
    plt.margins(x=0)
    
    # Save to buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png', transparent=True, bbox_inches='tight', pad_inches=0)
    plt.close()
    
    # Open the image and resize
    img = Image.open(buf)
    img = img.resize((width, height), Image.Resampling.LANCZOS)
    
    # Save the image
    img.save(output_path, 'PNG')
    
    return output_path

if __name__ == '__main__':
    import sys
    if len(sys.argv) != 3:
        print("Usage: python generate_waveform.py <input_wav> <output_png>")
        sys.exit(1)
    
    generate_waveform(sys.argv[1], sys.argv[2]) 