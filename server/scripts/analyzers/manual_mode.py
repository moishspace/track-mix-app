"""
Manual Mode Analyzer

This is the original, basic analysis algorithm that uses loudness and silence
detection to suggest mixing parameters. It doesn't use advanced features like
BPM detection or phrase boundaries.

Best for:
    - Quick analysis without genre-specific optimization
    - Tracks where you want manual control
    - Mixed genre playlists
    - Users who prefer traditional DJ mixing

Algorithm:
    - Fade In: Based on silence at start and initial loudness
    - Fade Out: Based on silence at end and ending loudness
    - Entrance: Based on silence at end and ending energy
"""


def analyze_manual_mode(track_length, silence_at_start, silence_at_end,
                        first_30s, first_30s_loudness, last_30s_loudness):
    """
    Manual/loudness-based analysis (original algorithm).

    This is the simplest analysis mode, using only silence detection and
    loudness measurements to determine mixing parameters. No beat or phrase
    detection is used.

    Args:
        track_length: Length of track in milliseconds (int)
        silence_at_start: Milliseconds of silence at track start (int)
        silence_at_end: Milliseconds of silence at track end (int)
        first_30s: AudioSegment of first 30 seconds (pydub.AudioSegment)
        first_30s_loudness: Average loudness of first 30s in dBFS (float)
        last_30s_loudness: Average loudness of last 30s in dBFS (float)

    Returns:
        Tuple of (fade_in, fade_out, entrance):
            - fade_in: Suggested fade-in duration in milliseconds (int)
            - fade_out: Suggested fade-out duration in milliseconds (int)
            - entrance: Suggested entrance timing in milliseconds (int)

    Fade In Logic:
        - If silence at start > 500ms: Use 60% of silence duration
        - Else if very quiet start (< -20 dBFS): Use 20% of first 30s, max 8s
        - Else if quiet start (< -10 dBFS): Use 5 seconds
        - Else: Use 3 seconds (energetic start)

    Fade Out Logic:
        - If silence at end > 500ms: Use 70% of silence duration
        - Else if very quiet end (< -20 dBFS): Use 3.5 seconds
        - Else if quiet end (< -10 dBFS): Use 6 seconds
        - Else: Use 8.5 seconds (energetic end)

    Entrance Logic:
        - If silence at end > 2s: Start before silence, with fade_out consideration
        - Else if loud end (> -10 dBFS): Use 1.4x fade_out duration
        - Else: Use fade_out duration, minimum 8 seconds

    Examples:
        >>> analyze_manual_mode(240000, 1000, 2500, first_30s, -15.0, -12.0)
        (600, 1750, 2450)

    Notes:
        - All times clamped to reasonable ranges (3-20 seconds)
        - Conservative approach suitable for most genres
        - No beat alignment - may not align with bars/phrases
    """
    # ========== FADE IN ==========
    # Based on silence at start and initial loudness
    if silence_at_start > 500:
        suggested_fade_in = int(silence_at_start * 0.6)
    elif first_30s_loudness < -20:
        suggested_fade_in = min(8000, int(len(first_30s) * 0.2))
    elif first_30s_loudness < -10:
        suggested_fade_in = 5000
    else:
        suggested_fade_in = 3000

    # ========== FADE OUT ==========
    # Based on silence at end and ending loudness
    if silence_at_end > 500:
        suggested_fade_out = int(silence_at_end * 0.7)
    elif last_30s_loudness < -20:
        suggested_fade_out = 3500
    elif last_30s_loudness < -10:
        suggested_fade_out = 6000
    else:
        suggested_fade_out = 8500

    # ========== ENTRANCE ==========
    # When to start next track
    if silence_at_end > 2000:
        time_before_silence = track_length - silence_at_end
        suggested_entrance = track_length - time_before_silence + suggested_fade_out
        suggested_entrance = max(3000, min(suggested_entrance, 20000))
    elif last_30s_loudness > -10:
        suggested_entrance = int(suggested_fade_out * 1.4)
    else:
        suggested_entrance = max(suggested_fade_out, 8000)

    return suggested_fade_in, suggested_fade_out, suggested_entrance
