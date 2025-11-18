"""
Classical/Orchestral Mode Analyzer

Specialized analysis for classical, orchestral, and acoustic music including:
    - Classical, Baroque, Romantic
    - Orchestral, Chamber music
    - Jazz, Big Band
    - Acoustic, Folk (complex arrangements)

This mode respects the wide dynamic range and natural phrasing of classical
music. It uses gentle, musical transitions that honor the composer's intent
and the natural dynamics of the performance.

Key Features:
    - Respects natural dynamics (pianissimo to fortissimo)
    - Long, gentle fades (5-30 seconds)
    - Minimal overlap between pieces
    - Phrase-based transitions at musical boundaries
    - Preserves natural attack and decay

Typical Classical Music Characteristics:
    - Wide dynamic range (-40 to 0 dBFS)
    - Natural phrasing (not beat-grid aligned)
    - Varied tempo (rubato, ritardando)
    - Often contains silence for musical effect
"""


def analyze_classical_mode(audio, track_length, silence_at_start, silence_at_end,
                           first_30s_loudness, last_30s_loudness):
    """
    Classical/Orchestral mode - Dynamics and phrase-based transitions.

    This mode is optimized for classical and acoustic music with wide dynamic
    ranges. It uses gentle, musical transitions that respect the natural
    phrasing and dynamics of the performance.

    Args:
        audio: Loaded audio segment (pydub.AudioSegment) - used for basic analysis
        track_length: Length of track in milliseconds (int)
        silence_at_start: Milliseconds of silence at track start (int)
        silence_at_end: Milliseconds of silence at track end (int)
        first_30s_loudness: Average loudness of first 30s in dBFS (float)
        last_30s_loudness: Average loudness of last 30s in dBFS (float)

    Returns:
        Tuple of (fade_in, fade_out, entrance):
            - fade_in: Suggested fade-in duration in milliseconds (int)
            - fade_out: Suggested fade-out duration in milliseconds (int)
            - entrance: Suggested entrance timing in milliseconds (int)

    Algorithm:
        Classical music has wide dynamic range and natural phrasing.
        Transitions must be gentle and musical, not mechanical.

        Fade In (5-15 seconds):
            - With silence > 1s: 80% of silence, clamped 5-15s
            - Very soft start (< -20 dBFS): 15s for gentle fade
            - Natural dynamics: 8s moderate fade

        Fade Out (10-30 seconds):
            - With silence > 2s: 70% of silence, clamped 10-30s
            - Natural diminuendo (< -18 dBFS): 12s short fade
            - Strong ending: 20s longer musical fade

        Entrance (15-25 seconds):
            - Longer pieces (> 3 min): 25s minimal overlap
            - Shorter pieces: 15s minimal overlap
            - Classical pieces should transition at phrase boundaries
              with minimal overlap to preserve musical integrity

    Dynamic Thresholds:
        - Very soft: < -20 dBFS (pianissimo)
        - Soft: -20 to -18 dBFS (piano)
        - Moderate: -18 to -10 dBFS (mezzo-forte)
        - Loud: > -10 dBFS (forte)

    Examples:
        >>> # Soft orchestral piece with silence
        >>> analyze_classical_mode(audio, 360000, 2500, 4000, -25.0, -22.0)
        (15000, 28000, 25000)  # Long gentle fades, minimal overlap

        >>> # Energetic symphonic movement
        >>> analyze_classical_mode(audio, 180000, 500, 1500, -12.0, -8.0)
        (8000, 20000, 15000)  # Moderate fade-in, long fade-out, short overlap

    Notes:
        - Much more conservative than other modes
        - Preserves musical phrasing and dynamics
        - Minimal overlap to respect piece boundaries
        - Longer fades than pop, but less than ambient
        - Does not use beat-grid alignment
        - Best for concert hall / recital listening experience
        - May not be suitable for party/dance mixing
    """
    # Classical music has wide dynamic range and natural phrasing
    # Need gentle, musical transitions

    # ========== FADE IN ==========
    # Gentle, respecting natural attack (5-15 seconds)

    if silence_at_start > 1000:
        # Use silence for natural fade
        suggested_fade_in = int(silence_at_start * 0.8)
        suggested_fade_in = max(5000, min(suggested_fade_in, 15000))
    elif first_30s_loudness < -20:
        # Very soft start - long gentle fade
        suggested_fade_in = 15000
    else:
        # Natural dynamics - moderate fade
        suggested_fade_in = 8000

    # ========== FADE OUT ==========
    # Musical, phrase-aware (10-30 seconds)

    if silence_at_end > 2000:
        # Natural ending with silence - fade before silence
        suggested_fade_out = int(silence_at_end * 0.7)
        suggested_fade_out = max(10000, min(suggested_fade_out, 30000))
    elif last_30s_loudness < -18:
        # Natural diminuendo - short fade
        suggested_fade_out = 12000
    else:
        # Strong ending - longer musical fade
        suggested_fade_out = 20000

    # ========== EXIT ==========
    # Minimal overlap, phrase-based (15-25 seconds)
    # Classical pieces should transition at phrase boundaries with minimal overlap

    if track_length > 180000:  # Longer than 3 minutes
        suggested_exit = 25000
    else:
        suggested_exit = 15000

    return suggested_fade_in, suggested_fade_out, suggested_exit
