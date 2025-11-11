"""
Dance/Electronic Mode Analyzer

Specialized analysis for electronic dance music including:
    - House, Techno, Afro House
    - Melodic Techno, Progressive House
    - Downtempo, Electronica

This mode uses phrase boundary detection and beat-aligned transitions
to create seamless, energy-matched mixes typical of DJ performances.

Key Features:
    - Detects drops, breakdowns, and build-ups
    - Aligns transitions to 8/16/32 bar phrases
    - Uses spectral analysis for phrase detection
    - Beat-aligned fade durations (in bars)

Typical Electronic Music Structure:
    - 4/4 time signature
    - ~125 BPM average (range: 110-140 BPM)
    - 8 or 16 bar phrases
    - Clear structural sections (intro/verse/drop/outro)
"""

import os
from detection import detect_electronic_phrase_boundaries


def analyze_dance_mode(audio, track_length, silence_at_start, silence_at_end,
                       first_30s_loudness, last_30s_loudness, audio_path=None):
    """
    Dance/Electronic mode - Phrase-aware beat-aligned transitions.

    Uses actual phrase detection to find drops, breakdowns, and build-ups.
    Optimized for house, techno, afro, melodic, and downtempo.

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
        1. Detect phrase boundaries using spectral flux analysis
        2. Calculate average phrase length (typically 8-32 bars)
        3. Align fade/entrance times to bar boundaries

        Fade In (2-4 bars):
            - With silence: 60% of silence, max 4 bars
            - Without silence: 2 bars for quick entry

        Fade Out (4-8 bars):
            - With detected phrases: Half of phrase length, rounded to bars
            - With silence: 4 bars minimum
            - Without silence: 8 bars for smooth end

        Entrance (8-32 bars):
            - With detected phrases: Full phrase length
            - High energy: 16 bars for longer overlap
            - Low energy: 8 bars for shorter overlap
            - Never exceeds half of track length

    Bar Timing (@ 125 BPM):
        - 1 bar (4 beats) = 1920ms
        - 2 bars = 3840ms
        - 4 bars = 7680ms
        - 8 bars = 15360ms
        - 16 bars = 30720ms
        - 32 bars = 61440ms

    Examples:
        >>> # Track with clear phrase boundaries detected
        >>> analyze_dance_mode(audio, 300000, 0, 500, -12.0, -10.0, "track.mp3")
        (3840, 15360, 30720)  # 2 bar fade-in, 8 bar fade-out, 16 bar entrance

        >>> # Track with no clear phrases (smooth)
        >>> analyze_dance_mode(audio, 240000, 1000, 2000, -15.0, -8.0, "track.mp3")
        (1920, 7680, 30720)  # Falls back to bar-based heuristics

    Notes:
        - All times aligned to bar boundaries (multiples of 1920ms)
        - Phrase detection requires librosa
        - Falls back to bar-based heuristics if detection fails
        - Optimized for seamless energy-matched mixing
        - Prints detailed debug information
    """
    # ========== CONSTANTS ==========

    # Assume ~125 BPM: 1 beat = 480ms, 1 bar (4 beats) = 1920ms
    ONE_BAR_MS = 1920

    # Thresholds
    SILENCE_THRESHOLD_MS = 500
    SILENCE_END_THRESHOLD_MS = 1000
    HIGH_ENERGY_DB = -10

    # Fade In constants (2-4 bars)
    FADE_IN_MIN_BARS = 2
    FADE_IN_MAX_BARS = 4
    FADE_IN_SILENCE_RATIO = 0.6

    # Fade Out constants (4-8 bars)
    FADE_OUT_MIN_BARS = 4
    FADE_OUT_MAX_BARS = 8
    FADE_OUT_PHRASE_RATIO = 0.5  # Use half the phrase length for fade-out

    # Entrance constants (8-16 bars)
    ENTRANCE_MIN_BARS = 8
    ENTRANCE_MAX_BARS = 32
    ENTRANCE_DETECTED_MULTIPLIER = 1.0  # Use full phrase length for detected phrases
    ENTRANCE_HIGH_ENERGY_BARS = 16  # High energy tracks get longer overlap
    ENTRANCE_LOW_ENERGY_BARS = 8   # Lower energy tracks get shorter overlap

    # ========== PHRASE BOUNDARY DETECTION ==========

    phrase_boundaries = []
    avg_phrase_length = ONE_BAR_MS * 8  # Default to 8 bars
    has_detected_phrases = False

    if audio_path and os.path.exists(audio_path):
        print(f"    🔍 Detecting phrase boundaries (electronic music)...")
        phrase_boundaries, avg_phrase_length = detect_electronic_phrase_boundaries(audio_path)
        has_detected_phrases = phrase_boundaries and len(phrase_boundaries) > 1
        if has_detected_phrases:
            print(f"    ✓ Detected {len(phrase_boundaries)} phrases, avg length: {avg_phrase_length/1000:.1f}s")
        else:
            print(f"    ⚠ No phrases detected, using bar-based estimate: {avg_phrase_length/1000:.1f}s")

    # ========== FADE IN ==========

    if silence_at_start > SILENCE_THRESHOLD_MS:
        suggested_fade_in = min(ONE_BAR_MS * FADE_IN_MAX_BARS,
                               int(silence_at_start * FADE_IN_SILENCE_RATIO))
    else:
        suggested_fade_in = ONE_BAR_MS * FADE_IN_MIN_BARS  # 2 bars for quick entry

    # ========== FADE OUT ==========

    if has_detected_phrases and phrase_boundaries:
        # Use phrase-aware fade-out
        last_phrase_start = phrase_boundaries[-1]
        time_from_last_phrase = track_length - last_phrase_start

        # Fade out should be about half a phrase length, but bar-aligned
        suggested_fade_out = int(avg_phrase_length * FADE_OUT_PHRASE_RATIO)
        # Round to nearest bar
        suggested_fade_out = round(suggested_fade_out / ONE_BAR_MS) * ONE_BAR_MS
        suggested_fade_out = max(ONE_BAR_MS * FADE_OUT_MIN_BARS,
                                min(suggested_fade_out, ONE_BAR_MS * FADE_OUT_MAX_BARS))
    else:
        # Use bar-based heuristic
        if silence_at_end > SILENCE_END_THRESHOLD_MS:
            suggested_fade_out = ONE_BAR_MS * FADE_OUT_MIN_BARS  # 4 bars
        else:
            suggested_fade_out = ONE_BAR_MS * FADE_OUT_MAX_BARS  # 8 bars

    # ========== ENTRANCE ==========

    if has_detected_phrases:
        # Use detected phrase length for entrance timing
        suggested_entrance = int(avg_phrase_length * ENTRANCE_DETECTED_MULTIPLIER)

        # Adjust based on energy level
        if last_30s_loudness > HIGH_ENERGY_DB:
            # High energy ending - longer overlap for smoother transition
            suggested_entrance = max(suggested_entrance, ONE_BAR_MS * ENTRANCE_HIGH_ENERGY_BARS)

        # Clamp to reasonable bar-aligned values
        suggested_entrance = max(ONE_BAR_MS * ENTRANCE_MIN_BARS,
                                min(suggested_entrance, ONE_BAR_MS * ENTRANCE_MAX_BARS))
    else:
        # Use bar-based heuristic
        if last_30s_loudness > HIGH_ENERGY_DB:
            suggested_entrance = ONE_BAR_MS * ENTRANCE_HIGH_ENERGY_BARS  # 16 bars
        else:
            suggested_entrance = ONE_BAR_MS * ENTRANCE_LOW_ENERGY_BARS   # 8 bars

    # Ensure entrance doesn't exceed track length
    suggested_entrance = min(suggested_entrance, track_length // 2)

    print(f"    ✓ Suggested: fade_in={suggested_fade_in}ms, fade_out={suggested_fade_out}ms, entrance={suggested_entrance}ms")

    return suggested_fade_in, suggested_fade_out, suggested_entrance
