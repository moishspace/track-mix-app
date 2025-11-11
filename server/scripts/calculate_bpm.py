import requests
import librosa
import numpy as np
import sys
import tempfile
import os

import sys

DEBUG = "--debug" in sys.argv

def log_debug(message):
    if DEBUG:
        print(message)

def get_bpm_from_url(url):
    try:
        log_debug(f"Starting BPM calculation for URL: {url}")

        # Step 1: Download audio file
        log_debug("Downloading audio file...")
        response = requests.get(url, stream=True)
        if response.status_code != 200:
            log_debug(f"Failed to download audio: {response.status_code}")
            return None
        log_debug("Audio file downloaded successfully.")

        # Step 2: Save audio to temporary file
        log_debug("Saving audio to a temporary file...")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_audio_file:
            for chunk in response.iter_content(chunk_size=1024):
                temp_audio_file.write(chunk)
            temp_file_path = temp_audio_file.name
        log_debug(f"Audio saved to temporary file: {temp_file_path}")

        # Step 3: Load audio and calculate BPM
        log_debug("Loading audio file for analysis...")
        y, sr = librosa.load(temp_file_path, sr=None)
        log_debug(f"Audio file loaded. Sample rate: {sr}, Audio length: {len(y)} samples")

        log_debug("Analyzing audio for BPM...")
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        log_debug(f"BPM detected: {tempo}")

        # Step 4: Clean up temporary file
        log_debug(f"Deleting temporary file: {temp_file_path}")
        os.remove(temp_file_path)

        return tempo
    except Exception as e:
        log_debug(f"Error calculating BPM: {e}")
        return None

if __name__ == "__main__":
    log_debug("Starting script...")

    # Step 1: Validate input arguments
    if len(sys.argv) < 2:
        log_debug("Usage: python3 calculate_bpm.py <preview_url>")
        sys.exit(1)

    # Step 2: Parse input
    preview_url = sys.argv[1]
    log_debug(f"Preview URL received: {preview_url}")

    # Step 3: Calculate BPM
    bpm = get_bpm_from_url(preview_url)

    # Step 4: Output result
    if bpm is not None:
        # Output a single float value
        if isinstance(bpm, (list, np.ndarray)):
            log_debug(float(bpm[0]))
        else:
            log_debug(float(bpm))
    else:
        log_debug("Error")