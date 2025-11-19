"""
Audio Analyzer - Main Entry Point

This module provides the main interface for analyzing audio files and suggesting
optimal mixing parameters for DJ applications. It orchestrates various analysis
modes and detection algorithms to provide intelligent mixing suggestions.

Features:
- Multiple analysis modes: manual, dance, ambient, pop, classical
- BPM and musical key detection with Camelot notation
- RGB waveform generation (Rekordbox-style)
- Phrase boundary detection for electronic and ambient music
- Silence and loudness analysis

Architecture:
This module is organized into several sub-packages:
- utils/: Signal processing utilities (moving average, peak detection)
- detection/: Audio property detection (BPM, key, phrase boundaries)
- visualization/: Waveform visualization generation (RGB waveform)
- analyzers/: Genre-specific analysis modes (manual, dance, ambient, pop, classical)

Usage:
    python audio_analyzer.py <folder_path> <tracks_json> [mode]

Modes:
    - manual: Basic loudness/silence-based analysis (default)
    - dance: Phrase-aware beat-aligned for electronic music
    - ambient: Long gradual phrase-based for meditation music
    - pop: Hybrid beat/energy-based for pop/rock
    - classical: Dynamics/phrase-based for orchestral music

Author: Track Mix Team
Version: 2.0.0 (Modular Architecture)
"""

import os
import sys
import json
from pydub import AudioSegment
from pydub.silence import detect_silence
import warnings
warnings.filterwarnings('ignore')

# Import detection modules
from detection import (
    detect_bpm_and_key,
    key_to_camelot,
    detect_electronic_phrase_boundaries,
    detect_phrase_boundaries
)

# Import visualization modules
from visualization import generate_waveform_data

# Import analyzer modules
from analyzers import (
    analyze_manual_mode,
    analyze_dance_mode,
    analyze_ambient_mode,
    analyze_pop_mode,
    analyze_classical_mode
)


def analyze_audio_file(file_path, mode="manual"):
    """
    Analyze an audio file and suggest optimal mixing parameters.

    This is the main analysis function that coordinates all the different
    detection and analysis algorithms. It:
    1. Loads the audio file
    2. Detects silence and calculates loudness
    3. Applies the selected analysis mode
    4. Detects BPM and musical key
    5. Generates RGB waveform visualization data
    6. Detects phrase boundaries (for applicable modes)

    Args:
        file_path: Path to the audio file (string)
        mode: Analysis mode (string) - "manual", "dance", "ambient", "pop", or "classical"

    Returns:
        Dictionary containing:
        {
            "suggested_fade_in": milliseconds (int),
            "suggested_fade_out": milliseconds (int),
            "suggested_entrance": milliseconds (int),
            "suggested_exit": milliseconds (int),
            "track_length": milliseconds (int),
            "silence_at_start": milliseconds (int),
            "silence_at_end": milliseconds (int),
            "average_loudness": dBFS (float),
            "waveform_data": array of RGB color and amplitude data (list),
            "phrase_boundaries": array of phrase boundary times in ms (list),
            "avg_phrase_length": average phrase length in ms (int),
            "bpm": beats per minute (float or None),
            "key": musical key like "C", "Am", "F#m" (string or None),
            "camelot_key": Camelot notation like "8A", "11B" (string or None)
        }

    Examples:
        >>> analyze_audio_file("track.mp3", mode="dance")
        {
            "suggested_fade_in": 3840,
            "suggested_fade_out": 7680,
            "suggested_entrance": 15360,
            "suggested_exit": 15360,
            "track_length": 240000,
            ...
        }
    """
    print(f"\n  Analyzing: {os.path.basename(file_path)} (mode: {mode})")

    if not os.path.exists(file_path):
        print(f"    ✗ File not found")
        return None

    try:
        # ========== LOAD AUDIO FILE ==========
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".wav":
            audio = AudioSegment.from_wav(file_path)
        elif ext == ".flac":
            audio = AudioSegment.from_file(file_path, format="flac")
        elif ext == ".mp3":
            audio = AudioSegment.from_mp3(file_path)
        else:
            audio = AudioSegment.from_file(file_path)

        track_length = len(audio)
        print(f"    Length: {track_length/1000:.2f}s")

        # ========== DETECT SILENCE ==========
        # Detect silence at start and end (silence threshold: -40dB, min silence: 100ms)
        silences = detect_silence(audio, min_silence_len=100, silence_thresh=-40)

        silence_at_start = 0
        silence_at_end = 0

        if silences:
            # Check if silence at the very start
            if silences[0][0] == 0:
                silence_at_start = silences[0][1]
                print(f"    Silence at start: {silence_at_start}ms")

            # Check if silence at the very end
            if silences[-1][1] >= track_length - 100:
                silence_at_end = track_length - silences[-1][0]
                print(f"    Silence at end: {silence_at_end}ms")

        # ========== CALCULATE LOUDNESS ==========
        # Calculate average loudness
        avg_loudness = audio.dBFS
        print(f"    Avg loudness: {avg_loudness:.2f} dBFS")

        # Analyze last 30 seconds for energy/loudness to suggest exit timing
        last_30s = audio[-30000:] if len(audio) > 30000 else audio
        last_30s_loudness = last_30s.dBFS

        # Analyze first 30 seconds for fade-in suggestion
        first_30s = audio[:30000] if len(audio) > 30000 else audio
        first_30s_loudness = first_30s.dBFS

        # ========== USE MODE-SPECIFIC ANALYSIS ==========
        phrase_boundaries = []
        avg_phrase_length = 0

        if mode == "dance":
            suggested_fade_in, suggested_fade_out, suggested_exit = analyze_dance_mode(
                audio, track_length, silence_at_start, silence_at_end,
                first_30s_loudness, last_30s_loudness, file_path
            )
            # Get phrase boundaries from dance mode
            if file_path and os.path.exists(file_path):
                phrase_boundaries, avg_phrase_length = detect_electronic_phrase_boundaries(file_path)

        elif mode == "ambient":
            suggested_fade_in, suggested_fade_out, suggested_exit = analyze_ambient_mode(
                audio, track_length, silence_at_start, silence_at_end,
                first_30s_loudness, last_30s_loudness, file_path
            )
            # Get phrase boundaries from ambient mode
            if file_path and os.path.exists(file_path):
                phrase_boundaries, avg_phrase_length = detect_phrase_boundaries(file_path)

        elif mode == "pop":
            suggested_fade_in, suggested_fade_out, suggested_exit = analyze_pop_mode(
                audio, track_length, silence_at_start, silence_at_end,
                first_30s_loudness, last_30s_loudness
            )

        elif mode == "classical":
            suggested_fade_in, suggested_fade_out, suggested_exit = analyze_classical_mode(
                audio, track_length, silence_at_start, silence_at_end,
                first_30s_loudness, last_30s_loudness
            )

        else:  # manual mode (default)
            suggested_fade_in, suggested_fade_out, suggested_exit = analyze_manual_mode(
                track_length, silence_at_start, silence_at_end,
                first_30s, first_30s_loudness, last_30s_loudness
            )

        # Default entrance to 0 (start from beginning of track)
        suggested_entrance = 0

        print(f"    ✓ Suggested: fade_in={suggested_fade_in}ms, fade_out={suggested_fade_out}ms, entrance={suggested_entrance}ms, exit={suggested_exit}ms")

        # ========== DETECT BPM AND MUSICAL KEY ==========
        bpm, key = detect_bpm_and_key(file_path)

        # Convert key to Camelot notation
        camelot_key = key_to_camelot(key) if key else None

        # ========== GENERATE WAVEFORM DATA ==========
        waveform_data = generate_waveform_data(file_path, num_points=200)

        # ========== RETURN ANALYSIS RESULTS ==========
        return {
            "suggested_fade_in": int(suggested_fade_in),
            "suggested_fade_out": int(suggested_fade_out),
            "suggested_entrance": int(suggested_entrance),
            "suggested_exit": int(suggested_exit),
            "track_length": int(track_length),
            "silence_at_start": int(silence_at_start),
            "silence_at_end": int(silence_at_end),
            "average_loudness": float(avg_loudness),
            "waveform_data": waveform_data,
            "phrase_boundaries": phrase_boundaries,
            "avg_phrase_length": int(avg_phrase_length) if avg_phrase_length else 0,
            "bpm": bpm,
            "key": key,
            "camelot_key": camelot_key
        }

    except Exception as e:
        print(f"    ✗ Analysis failed: {e}")
        return None


def analyze_tracks(folder_path, tracks, mode="manual"):
    """
    Analyze multiple tracks and return analysis results.

    This is a convenience function for batch analysis of multiple tracks.
    It calls analyze_audio_file() for each track and collects the results.

    Args:
        folder_path: Path to folder containing audio files (string)
        tracks: List of track dictionaries with "name" field (list)
        mode: Analysis mode (string) - "manual", "dance", "ambient", "pop", or "classical"

    Returns:
        List of dictionaries, each containing:
        {
            "name": filename (string),
            "analysis": analysis result dictionary from analyze_audio_file()
        }

    Examples:
        >>> analyze_tracks("/music", [{"name": "track1.mp3"}], mode="dance")
        [{"name": "track1.mp3", "analysis": {...}}]
    """
    print("=" * 60)
    print("ANALYZING AUDIO TRACKS")
    print("=" * 60)
    print(f"Folder: {folder_path}")
    print(f"Tracks to analyze: {len(tracks)}")
    print(f"Analysis mode: {mode}")

    results = []

    for track in tracks:
        filename = track.get("name")
        file_path = os.path.join(folder_path, filename)

        analysis = analyze_audio_file(file_path, mode)

        if analysis:
            results.append({
                "name": filename,
                "analysis": analysis
            })
        else:
            # Return default values if analysis fails
            # Generate neutral RGB waveform data (gray)
            neutral_waveform = [
                {"amplitude": 0.5, "r": 128, "g": 128, "b": 128}
                for _ in range(200)
            ]
            results.append({
                "name": filename,
                "analysis": {
                    "suggested_fade_in": 5000,
                    "suggested_fade_out": 5000,
                    "suggested_entrance": 0,
                    "suggested_exit": 10000,
                    "track_length": 0,
                    "silence_at_start": 0,
                    "silence_at_end": 0,
                    "average_loudness": 0,
                    "waveform_data": neutral_waveform,
                    "phrase_boundaries": [],
                    "avg_phrase_length": 0,
                    "bpm": None,
                    "key": None,
                    "camelot_key": None
                }
            })

    return results


if __name__ == "__main__":
    """
    Command-line interface for audio analysis.

    Usage:
        python audio_analyzer.py <folder_path> <tracks_json> [mode]

    Args:
        folder_path: Path to folder containing audio files
        tracks_json: JSON string containing array of track objects
        mode: Optional analysis mode (default: "manual")

    Example:
        python audio_analyzer.py /music '[{"name": "track.mp3"}]' dance
    """
    if len(sys.argv) < 3:
        print("Usage: python audio_analyzer.py <folder_path> <tracks_json> [mode]")
        sys.exit(1)

    folder = sys.argv[1]
    tracks_json = sys.argv[2]
    mode = sys.argv[3] if len(sys.argv) > 3 else "manual"
    tracks = json.loads(tracks_json)

    results = analyze_tracks(folder, tracks, mode)

    # Output results as JSON
    print("\n" + "=" * 60)
    print("ANALYSIS RESULTS")
    print("=" * 60)
    print(json.dumps(results, indent=2))
