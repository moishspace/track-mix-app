"""
Utility Functions for Audio Signal Processing

This module provides low-level signal processing utilities used across
the audio analysis system. These functions are optimized to work with
or without scipy for maximum compatibility.

Functions:
    - simple_moving_average: Moving average filter without scipy dependency
    - find_peaks_simple: Peak detection without scipy dependency
"""

import numpy as np


def simple_moving_average(data, window_size):
    """
    Simple moving average filter using numpy (scipy-free alternative).

    This function smooths time-series data by computing a moving average
    over a sliding window. It's used to smooth spectral flux data for
    phrase boundary detection.

    Args:
        data: Input array to smooth (numpy array)
        window_size: Size of the moving average window (int)

    Returns:
        Smoothed array (numpy array) of same length as input

    Examples:
        >>> data = np.array([1, 2, 3, 4, 5])
        >>> simple_moving_average(data, window_size=3)
        array([2., 2., 3., 4., 4.])

    Notes:
        - Uses numpy.convolve with 'same' mode to preserve input length
        - Edge effects may occur at boundaries
        - For phrase detection, typical window_size is 50-100 samples
    """
    weights = np.ones(window_size) / window_size
    return np.convolve(data, weights, mode='same')


def find_peaks_simple(data, distance=100, prominence=0.5):
    """
    Simple peak detection without scipy.

    Finds local maxima in data that are:
    1. Separated by at least 'distance' samples
    2. Have prominence above threshold * std_dev

    This is a scipy-free alternative to scipy.signal.find_peaks.

    Args:
        data: Input signal (numpy array)
        distance: Minimum samples between peaks (int, default: 100)
        prominence: Threshold multiplier for std_dev (float, default: 0.5)

    Returns:
        Array of peak indices (numpy array)

    Algorithm:
        1. Calculate threshold = mean + (prominence * std_dev)
        2. For each point above threshold:
           - Check if it's higher than all points within 'distance'
           - If yes, mark as peak

    Examples:
        >>> data = np.array([0, 1, 0, 2, 0, 3, 0])
        >>> find_peaks_simple(data, distance=1, prominence=0)
        array([1, 3, 5])

    Notes:
        - Prints debug information about data statistics
        - Used for phrase boundary detection when scipy unavailable
    """
    peaks = []
    std_dev = np.std(data)
    mean_val = np.mean(data)
    threshold = mean_val + (prominence * std_dev)

    # Debug info
    print(f"       Data stats: mean={mean_val:.2f}, std={std_dev:.2f}, threshold={threshold:.2f}")
    print(f"       Data range: min={np.min(data):.2f}, max={np.max(data):.2f}")

    for i in range(distance, len(data) - distance):
        # Check if this point is above threshold
        if data[i] > threshold:
            is_peak = True
            # Check if it's higher than surrounding points
            for j in range(max(0, i - distance), min(len(data), i + distance + 1)):
                if j != i and data[j] >= data[i]:
                    is_peak = False
                    break

            if is_peak:
                peaks.append(i)

    print(f"       Found {len(peaks)} peaks above threshold")
    return np.array(peaks)
