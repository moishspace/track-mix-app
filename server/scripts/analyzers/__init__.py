"""
Genre-Specific Audio Analyzers

This package provides genre-specific analysis algorithms for determining
optimal DJ mixing parameters (fade in, fade out, entrance timing).

Each analyzer is optimized for different music genres and mixing styles:
    - manual_mode: Basic loudness/silence-based analysis
    - dance_mode: Phrase-aware beat-aligned for electronic music
    - ambient_mode: Long gradual phrase-based for meditation music
    - pop_mode: Hybrid beat/energy-based for pop/rock
    - classical_mode: Dynamics/phrase-based for orchestral music

Usage:
    from analyzers import analyze_dance_mode, analyze_ambient_mode
    fade_in, fade_out, entrance = analyze_dance_mode(audio, length, ...)
"""

from .manual_mode import analyze_manual_mode
from .dance_mode import analyze_dance_mode
from .ambient_mode import analyze_ambient_mode
from .pop_mode import analyze_pop_mode
from .classical_mode import analyze_classical_mode

__all__ = [
    'analyze_manual_mode',
    'analyze_dance_mode',
    'analyze_ambient_mode',
    'analyze_pop_mode',
    'analyze_classical_mode'
]
