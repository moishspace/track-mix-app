"""
Audio Detection Package

This package provides detection algorithms for audio analysis:
    - BPM (tempo) detection
    - Musical key detection with Camelot notation
    - Phrase boundary detection for different music genres

Modules:
    - bpm_key: BPM and key detection using librosa
    - camelot: Camelot wheel notation conversion
    - phrase_boundaries: Phrase boundary detection for electronic and ambient music

Usage:
    from detection import detect_bpm_and_key, key_to_camelot
    from detection import detect_electronic_phrase_boundaries
"""

from .bpm_key import detect_bpm_and_key
from .camelot import key_to_camelot
from .phrase_boundaries import (
    detect_phrase_boundaries,
    detect_electronic_phrase_boundaries
)

__all__ = [
    'detect_bpm_and_key',
    'key_to_camelot',
    'detect_phrase_boundaries',
    'detect_electronic_phrase_boundaries'
]
