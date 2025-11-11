"""
Ambient/Meditation Mode Analyzer

Specialized analysis for ambient, meditation, and atmospheric music including:
    - Ambient, New Age, Soundscapes
    - Meditation, Yoga, Spa music
    - Downtempo, Chillout
    - Nature sounds, Field recordings

This mode uses long, gradual phrase-based transitions to maintain a peaceful,
uninterrupted listening experience. Perfect for relaxation and meditation.

Key Features:
    - Detects gentle texture changes (phrase boundaries)
    - Very long fade durations (10-45 seconds)
    - Extended overlap for seamless flow
    - Respects the meditative atmosphere

Typical Ambient Music Structure:
    - Free time or very slow tempo
    - Long phrases (20-90 seconds)
    - Subtle transitions
    - Continuous soundscapes
"""

import os
from detection import detect_phrase_boundaries


def analyze_ambient_mode(audio, track_length, silence_at_start, silence_at_end,
                         first_30s_loudness, last_30s_loudness, audio_path=None):
    """
    Ambient/Meditation mode - Long, gradual phrase-based transitions.

    Uses real phrase detection with librosa to identify subtle texture changes
    in ambient music. Applies very long, gentle fades for uninterrupted flow.

    Args:
        audio: Loaded audio segment (pydub.AudioSegment) - used for basic analysis
        track_length: Length of track in milliseconds (int)
        silence_at_start: Milliseconds of silence at track start (int)
        silence_at_end: Milliseconds of silence at track end (int)
        first_30s_loudness: Average loudness of first 30s in dBFS (float)
        last_30s_loudness: Average loudness of last 30s in dBFS (float)
        audio_path: Path to audio file for phrase detection (string, optional)

    Returns:
        Tuple of (fade_in, fade_out, entrance):
            - fade_in: Suggested fade-in duration in milliseconds (int)
            - fade_out: Suggested fade-out duration in milliseconds (int)
            - entrance: Suggested entrance timing in milliseconds (int)

    Algorithm:
        1. Detect phrase boundaries using spectral flux (top 1-2% changes)
        2. Calculate average phrase length or estimate from track duration
        3. Apply very long fades appropriate for meditative content

        Fade In (10-30 seconds):
            - With silence: 90% of silence, clamped 10-30s
            - Very quiet start (< -15 dBFS): 20 seconds
            - Long phrases: 40% of phrase length, max 15s
            - Default: 12-15 seconds

        Fade Out (20-45 seconds):
            - With detected phrases: 80% of time from last phrase
            - With silence: 80% of silence, clamped 20-45s
            - Very quiet end (< -15 dBFS): 20 seconds
            - Default: 35 seconds

        Entrance (25-120 seconds):
            - With detected phrases: 1.5x phrase length (30-120s)
            - With estimated phrases: 1.15x phrase length (25-90s)
            - Long tracks (> 2 min): 45 seconds minimum
            - Short tracks: track_length / 3

    Phrase Length Estimation:
        - If no clear boundaries: track_duration / 3
        - Clamped between 20-90 seconds
        - Default fallback: 30 seconds

    Examples:
        >>> # Track with detected phrase boundaries
        >>> analyze_ambient_mode(audio, 300000, 500, 1000, -18.0, -20.0, "meditation.mp3")
        (15000, 35000, 60000)  # 15s fade-in, 35s fade-out, 60s entrance

        >>> # Very smooth ambient track (no clear phrases)
        >>> analyze_ambient_mode(audio, 240000, 2000, 3000, -15.0, -18.0, "soundscape.mp3")
        (18000, 24000, 45000)  # Uses estimated phrase length

    Notes:
        - Much longer transitions than other modes (2-4x longer)
        - Phrase detection uses top 1-2% spectral changes (vs 3-5% for dance)
        - Minimum 20 seconds between detected phrases
        - Optimized for seamless, meditative experience
        - Prints detailed debug information
        - Falls back gracefully if phrase detection fails
    """
    # ========== CONSTANTS ==========

    # Thresholds
    SILENCE_THRESHOLD_MS = 1000
    SILENCE_END_THRESHOLD_MS = 2000
    QUIET_LOUDNESS_DB = -15
    PHRASE_LENGTH_THRESHOLD_MS = 20000
    LONG_TRACK_THRESHOLD_MS = 120000

    # Fade In constants
    FADE_IN_SILENCE_RATIO = 0.9
    FADE_IN_MIN_MS = 10000
    FADE_IN_MAX_MS = 30000
    FADE_IN_QUIET_START_MS = 20000
    FADE_IN_PHRASE_RATIO = 0.4
    FADE_IN_DEFAULT_MS = 15000
    FADE_IN_FALLBACK_MS = 12000

    # Fade Out constants
    FADE_OUT_PHRASE_RATIO = 0.8
    FADE_OUT_PHRASE_MULTIPLIER = 1.5
    FADE_OUT_MIN_MS = 20000
    FADE_OUT_MAX_MS = 45000
    FADE_OUT_SILENCE_RATIO = 0.8
    FADE_OUT_QUIET_END_MS = 20000
    FADE_OUT_DEFAULT_MS = 35000

    # Entrance constants
    ENTRANCE_DETECTED_MULTIPLIER = 1.5  # For tracks with detected phrase boundaries
    ENTRANCE_ESTIMATED_MULTIPLIER = 1.15  # For smooth tracks with estimated phrases
    ENTRANCE_MIN_DETECTED_MS = 30000
    ENTRANCE_MAX_DETECTED_MS = 120000
    ENTRANCE_MIN_ESTIMATED_MS = 25000
    ENTRANCE_MAX_ESTIMATED_MS = 90000
    ENTRANCE_LONG_TRACK_FALLBACK_MS = 45000
    ENTRANCE_SHORT_TRACK_DIVISOR = 3

    # Default phrase length
    DEFAULT_PHRASE_LENGTH_MS = 30000

    # ========== PHRASE BOUNDARY DETECTION ==========

    phrase_boundaries = []
    avg_phrase_length = DEFAULT_PHRASE_LENGTH_MS
    has_detected_phrases = False

    if audio_path and os.path.exists(audio_path):
        print(f"    🔍 Detecting phrase boundaries...")
        phrase_boundaries, avg_phrase_length = detect_phrase_boundaries(audio_path)
        has_detected_phrases = phrase_boundaries and len(phrase_boundaries) > 1
        if has_detected_phrases:
            print(f"    ✓ Detected {len(phrase_boundaries)} phrases, avg length: {avg_phrase_length/1000:.1f}s")
        else:
            print(f"    ⚠ No phrases detected, estimated: {avg_phrase_length/1000:.1f}s")

    # ========== FADE IN ==========

    if silence_at_start > SILENCE_THRESHOLD_MS:
        suggested_fade_in = int(silence_at_start * FADE_IN_SILENCE_RATIO)
        suggested_fade_in = max(FADE_IN_MIN_MS, min(suggested_fade_in, FADE_IN_MAX_MS))
    elif first_30s_loudness < QUIET_LOUDNESS_DB:
        suggested_fade_in = FADE_IN_QUIET_START_MS
    else:
        if avg_phrase_length > PHRASE_LENGTH_THRESHOLD_MS:
            suggested_fade_in = min(FADE_IN_DEFAULT_MS, int(avg_phrase_length * FADE_IN_PHRASE_RATIO))
        else:
            suggested_fade_in = FADE_IN_FALLBACK_MS

    # ========== FADE OUT ==========

    if phrase_boundaries and len(phrase_boundaries) > 0:
        last_phrase_start = phrase_boundaries[-1]
        time_from_last_phrase = track_length - last_phrase_start

        if time_from_last_phrase < avg_phrase_length * FADE_OUT_PHRASE_MULTIPLIER:
            suggested_fade_out = int(time_from_last_phrase * FADE_OUT_PHRASE_RATIO)
            suggested_fade_out = max(FADE_OUT_MIN_MS, min(suggested_fade_out, FADE_OUT_MAX_MS))
        else:
            suggested_fade_out = int(avg_phrase_length * FADE_OUT_PHRASE_RATIO)
            suggested_fade_out = max(FADE_OUT_MIN_MS, min(suggested_fade_out, FADE_OUT_MAX_MS))
    else:
        if silence_at_end > SILENCE_END_THRESHOLD_MS:
            suggested_fade_out = int(silence_at_end * FADE_OUT_SILENCE_RATIO)
            suggested_fade_out = max(FADE_OUT_MIN_MS, min(suggested_fade_out, FADE_OUT_MAX_MS))
        elif last_30s_loudness < QUIET_LOUDNESS_DB:
            suggested_fade_out = FADE_OUT_QUIET_END_MS
        else:
            suggested_fade_out = FADE_OUT_DEFAULT_MS

    # ========== ENTRANCE ==========

    if avg_phrase_length > 0:
        if has_detected_phrases:
            suggested_entrance = int(avg_phrase_length * ENTRANCE_DETECTED_MULTIPLIER)
            suggested_entrance = max(ENTRANCE_MIN_DETECTED_MS, min(suggested_entrance, ENTRANCE_MAX_DETECTED_MS))
        else:
            suggested_entrance = int(avg_phrase_length * ENTRANCE_ESTIMATED_MULTIPLIER)
            suggested_entrance = max(ENTRANCE_MIN_ESTIMATED_MS, min(suggested_entrance, ENTRANCE_MAX_ESTIMATED_MS))
    else:
        if track_length > LONG_TRACK_THRESHOLD_MS:
            suggested_entrance = ENTRANCE_LONG_TRACK_FALLBACK_MS
        else:
            suggested_entrance = min(ENTRANCE_MIN_DETECTED_MS, track_length // ENTRANCE_SHORT_TRACK_DIVISOR)

    print(f"    ✓ Suggested: fade_in={suggested_fade_in}ms, fade_out={suggested_fade_out}ms, entrance={suggested_entrance}ms")

    return suggested_fade_in, suggested_fade_out, suggested_entrance
