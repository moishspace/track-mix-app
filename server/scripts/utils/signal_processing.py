"""
Signal Processing Utilities

This module is reserved for future signal processing functions.
Currently, all signal processing utilities are in __init__.py for
backward compatibility.

Future additions may include:
    - Spectral analysis functions
    - Filter design utilities
    - Audio feature extraction helpers
"""

# Import from __init__ for convenience
from . import simple_moving_average, find_peaks_simple

__all__ = ['simple_moving_average', 'find_peaks_simple']
