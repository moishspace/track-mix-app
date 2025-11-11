"""
BPM and Musical Key Detection

This module provides tempo (BPM) and musical key detection using librosa.
The key detection uses chromagram analysis and includes basic major/minor
classification.

Dependencies:
    - librosa: For audio loading and feature extraction
    - numpy: For numerical operations

References:
    - Librosa beat tracking: https://librosa.org/doc/main/generated/librosa.beat.beat_track.html
    - Chroma features: https://librosa.org/doc/main/generated/librosa.feature.chroma_cqt.html
"""

import numpy as np

# Try to import librosa
try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    print("⚠ librosa not available, BPM/key detection disabled")


def detect_bpm_and_key(audio_path):
    """
    Detect BPM (tempo) and musical key from audio file.

    Uses librosa for beat tracking and chroma feature analysis to determine
    the tempo and harmonic content of the audio.

    Args:
        audio_path: Path to audio file (string)

    Returns:
        Tuple of (bpm, key):
            - bpm: Beats per minute as float, or None if detection fails
            - key: Musical key as string (e.g., "C", "Am", "F#m"), or None if detection fails

    Algorithm:
        BPM Detection:
            1. Load audio at 22050 Hz sample rate
            2. Use librosa.beat.beat_track for tempo estimation
            3. Return tempo as float

        Key Detection:
            1. Compute CQT (Constant-Q Transform) chromagram
            2. Average chroma values across time
            3. Find dominant pitch class (highest average energy)
            4. Detect major/minor by comparing 3rd intervals:
               - Major 3rd (4 semitones) vs Minor 3rd (3 semitones)
               - Higher energy determines major/minor

    Examples:
        >>> detect_bpm_and_key("track.mp3")
        (125.5, "Am")

        >>> detect_bpm_and_key("classical.wav")
        (72.0, "Cm")

    Notes:
        - Returns (None, None) if librosa is not available
        - Returns (None, None) if analysis fails
        - Key detection is approximate and may not always match human perception
        - Works best with clear harmonic content (struggles with atonal/noise)
        - Sample rate of 22050 Hz is used for performance optimization

    Limitations:
        - Simple major/minor detection (doesn't detect modes, diminished, etc.)
        - May struggle with:
            * Modulating pieces (key changes)
            * Atonal music
            * Heavy percussion/noise
            * Very short files (<10 seconds)
    """
    if not LIBROSA_AVAILABLE:
        print(f"    ⚠ librosa not available, cannot detect BPM/key")
        return None, None

    try:
        print(f"    → Detecting BPM and key...")
        # Load audio with librosa (downsampled to 22050 Hz for speed)
        y, sr = librosa.load(audio_path, sr=22050)

        # ========== DETECT TEMPO (BPM) ==========
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(tempo)

        # ========== DETECT KEY ==========
        # Use CQT chromagram for better harmonic resolution
        chromagram = librosa.feature.chroma_cqt(y=y, sr=sr)

        # Average chroma across time to find overall key
        chroma_vals = chromagram.mean(axis=1)

        # Find the dominant pitch class (0-11 mapping to C-B)
        key_index = chroma_vals.argmax()

        # Map index to key names
        keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        key = keys[key_index]

        # ========== DETECT MAJOR/MINOR ==========
        # Major chords emphasize: root, major 3rd (4 semitones), perfect 5th (7 semitones)
        # Minor chords emphasize: root, minor 3rd (3 semitones), perfect 5th (7 semitones)
        major_3rd_strength = chroma_vals[(key_index + 4) % 12]
        minor_3rd_strength = chroma_vals[(key_index + 3) % 12]

        # If minor 3rd is stronger, classify as minor key
        if minor_3rd_strength > major_3rd_strength:
            key = key + 'm'

        print(f"    ✓ Detected: BPM={bpm:.1f}, Key={key}")
        return bpm, key

    except Exception as e:
        import traceback
        print(f"    ⚠ BPM/Key detection failed: {e}")
        print(f"    ⚠ Traceback: {traceback.format_exc()}")
        return None, None
