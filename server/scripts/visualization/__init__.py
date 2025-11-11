"""
Audio Visualization Package

This package provides visualization data generation for audio files.
Currently supports RGB waveform generation in the style of Rekordbox 6+.

Modules:
    - rgb_waveform: RGB waveform visualization with frequency-based coloring

Usage:
    from visualization import generate_waveform_data
    waveform = generate_waveform_data("track.mp3", num_points=200)
"""

from .rgb_waveform import generate_waveform_data

__all__ = ['generate_waveform_data']
