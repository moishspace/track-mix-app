import requests
import librosa
import numpy as np
import sys
import tempfile
import os
import json

DEBUG = "--debug" in sys.argv

def log_debug(message):
    if DEBUG:
        print(f"[DEBUG] {message}", file=sys.stderr)

# Key detection using Krumhansl-Schmuckler key-finding algorithm
KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# Krumhansl-Kessler key profiles
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

# Camelot wheel mapping (alphanumeric key notation for DJs)
# Major keys use 'B', Minor keys use 'A'
CAMELOT_MAJOR = {
    'C': '8B', 'C#': '3B', 'D': '10B', 'D#': '5B', 'E': '12B', 'F': '7B',
    'F#': '2B', 'G': '9B', 'G#': '4B', 'A': '11B', 'A#': '6B', 'B': '1B'
}
CAMELOT_MINOR = {
    'C': '5A', 'C#': '12A', 'D': '7A', 'D#': '2A', 'E': '9A', 'F': '4A',
    'F#': '11A', 'G': '6A', 'G#': '1A', 'A': '8A', 'A#': '3A', 'B': '10A'
}

def key_to_camelot(key):
    """Convert musical key to Camelot notation."""
    if not key or key == "Unknown":
        return None

    # Check if minor key (ends with 'm')
    if key.endswith('m'):
        root = key[:-1]  # Remove 'm'
        return CAMELOT_MINOR.get(root)
    else:
        return CAMELOT_MAJOR.get(key)

def calculate_energy(y):
    """Calculate energy (intensity/loudness) of the audio, normalized to 0-1."""
    try:
        # Calculate RMS energy
        rms = librosa.feature.rms(y=y)[0]
        # Get mean RMS and normalize to 0-1 scale
        # Typical RMS values for music range from 0.01 to 0.3
        mean_rms = np.mean(rms)
        # Normalize: map 0.01-0.25 range to 0-1
        energy = np.clip((mean_rms - 0.01) / 0.24, 0, 1)
        return round(float(energy), 3)
    except Exception:
        return None

def energy_to_level(energy):
    """Translate Deezer energy (0–1) into perceived DJ energy."""
    if energy is None:
        return None
    if energy < 0.25:
        return "Chill / Ambient"
    elif energy < 0.45:
        return "Warm-up Flow"
    elif energy < 0.6:
        return "Groove"
    elif energy < 0.75:
        return "Uplift"
    elif energy < 0.9:
        return "Drive / Peak"
    else:
        return "Emotional High"


def detect_key(y, sr):
    """Detect the musical key using chroma features and key profiles."""
    try:
        # Compute chroma features
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)

        # Average chroma across time to get pitch class distribution
        chroma_avg = np.mean(chroma, axis=1)

        # Normalize
        chroma_avg = chroma_avg / np.sum(chroma_avg)

        best_correlation = -1
        best_key = "Unknown"

        # Try all 12 major and 12 minor keys
        for i in range(12):
            # Rotate profiles to match each key
            major_rotated = np.roll(MAJOR_PROFILE, i)
            minor_rotated = np.roll(MINOR_PROFILE, i)

            # Normalize profiles
            major_rotated = major_rotated / np.sum(major_rotated)
            minor_rotated = minor_rotated / np.sum(minor_rotated)

            # Compute correlation
            major_corr = np.corrcoef(chroma_avg, major_rotated)[0, 1]
            minor_corr = np.corrcoef(chroma_avg, minor_rotated)[0, 1]

            if major_corr > best_correlation:
                best_correlation = major_corr
                best_key = f"{KEY_NAMES[i]}"

            if minor_corr > best_correlation:
                best_correlation = minor_corr
                best_key = f"{KEY_NAMES[i]}m"

        return best_key
    except Exception as e:
        log_debug(f"Error detecting key: {e}")
        return None

def analyze_audio_from_url(url):
    """Download audio and analyze for BPM, key, and energy."""
    try:
        log_debug(f"Starting analysis for URL: {url}")

        # Step 1: Download audio file
        log_debug("Downloading audio file...")
        response = requests.get(url, stream=True)
        if response.status_code != 200:
            log_debug(f"Failed to download audio: {response.status_code}")
            return None, None, None
        log_debug("Audio file downloaded successfully.")

        # Step 2: Save audio to temporary file
        log_debug("Saving audio to a temporary file...")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_audio_file:
            for chunk in response.iter_content(chunk_size=1024):
                temp_audio_file.write(chunk)
            temp_file_path = temp_audio_file.name
        log_debug(f"Audio saved to temporary file: {temp_file_path}")

        # Step 3: Load audio
        log_debug("Loading audio file for analysis...")
        y, sr = librosa.load(temp_file_path, sr=None)
        log_debug(f"Audio file loaded. Sample rate: {sr}, Audio length: {len(y)} samples")

        # Step 4: Calculate BPM
        log_debug("Analyzing audio for BPM...")
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        if isinstance(tempo, (list, np.ndarray)):
            tempo = float(tempo[0])
        else:
            tempo = float(tempo)

        # Fix half-tempo detection: double only if very low (< 70)
        if tempo < 70:
            tempo = tempo * 2
            log_debug(f"BPM doubled to {tempo}")

        # Round to nearest integer
        tempo = round(tempo)
        log_debug(f"BPM detected: {tempo}")

        # Step 5: Detect key
        log_debug("Analyzing audio for musical key...")
        key = detect_key(y, sr)
        log_debug(f"Key detected: {key}")

        # Step 6: Calculate energy
        log_debug("Calculating energy...")
        energy = calculate_energy(y)
        log_debug(f"Energy: {energy}")

        # Step 7: Clean up temporary file
        log_debug(f"Deleting temporary file: {temp_file_path}")
        os.remove(temp_file_path)

        return tempo, key, energy
    except Exception as e:
        log_debug(f"Error analyzing audio: {e}")
        return None, None, None

if __name__ == "__main__":
    log_debug("Starting script...")

    # Step 1: Validate input arguments
    if len(sys.argv) < 2:
        log_debug("Usage: python3 calculate_bpm.py <preview_url>")
        sys.exit(1)

    # Step 2: Parse input
    preview_url = sys.argv[1]
    log_debug(f"Preview URL received: {preview_url}")

    # Step 3: Analyze audio
    bpm, key, energy = analyze_audio_from_url(preview_url)

    # Step 4: Convert to Camelot notation
    camelot = key_to_camelot(key) if key else None

    # Step 5: Output result as JSON (for Node.js to parse)
    result = {
        "bpm": bpm if bpm else None,
        "key": key,
        "camelot": camelot,
        "energy": energy
    }
    print(json.dumps(result))
