"""
Phrase Boundary Detection

This module detects phrase boundaries (structural changes) in music using
spectral flux analysis. Different detection strategies are used for:
    - Electronic/Dance music (detect_electronic_phrase_boundaries)
    - Ambient/Meditation music (detect_phrase_boundaries)

The algorithms identify moments of significant spectral change, which typically
correspond to:
    - Drops and build-ups (electronic music)
    - Texture changes (ambient music)
    - Section transitions (verse/chorus, intro/outro)

Dependencies:
    - librosa: For audio loading and STFT computation
    - numpy: For numerical operations
    - utils: For signal processing (moving average)

References:
    - Spectral flux: https://en.wikipedia.org/wiki/Spectral_flux
    - Music segmentation: https://librosa.org/doc/main/auto_examples/plot_segmentation.html
"""

import os
import numpy as np
from utils import simple_moving_average

# Try to import librosa
try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    print("⚠ librosa not available, phrase detection disabled")


def detect_electronic_phrase_boundaries(audio_path):
    """
    Detect phrase boundaries in electronic/dance music using spectral analysis.

    Optimized for detecting drops, breakdowns, and build-ups in house, techno,
    afro, melodic techno, and downtempo electronic music.

    Args:
        audio_path: Path to audio file (string)

    Returns:
        Tuple of (phrase_boundaries, avg_phrase_length):
            - phrase_boundaries: List of times in milliseconds where phrases start (list of ints)
            - avg_phrase_length: Average length between phrases in milliseconds (int)

    Algorithm:
        1. Load audio at 22050 Hz
        2. Compute STFT (Short-Time Fourier Transform)
        3. Calculate spectral flux (rate of spectral change)
        4. Smooth flux with 50-sample moving average
        5. Find high-flux points (97th percentile, fallback to 95th)
        6. Cluster nearby points (12s minimum distance)
        7. Take peak of each cluster as phrase boundary
        8. Filter out boundaries in first 5 seconds
        9. Calculate average phrase length

    Typical Electronic Music Structure:
        - 8 bars at 125 BPM = 15.36 seconds
        - 16 bars at 125 BPM = 30.72 seconds
        - Phrases often align to 8, 16, or 32 bar sections

    Examples:
        >>> detect_electronic_phrase_boundaries("techno_track.mp3")
        ([45000, 75000, 105000], 30000)
        # 3 phrases at 45s, 75s, 105s with 30s average length

    Returns Default on Failure:
        ([], 15360)  # Empty boundaries, 8 bars at 125 BPM

    Notes:
        - Minimum 12 seconds between detected phrases
        - Uses top 3-5% most significant spectral changes
        - Estimates phrase length from track duration if no clear boundaries
        - Prints detailed debug information during processing
    """
    # Check if librosa is available
    if not LIBROSA_AVAILABLE:
        print(f"    ⚠ librosa not available, using heuristics")
        return [], 15360  # Default to 8 bars at 125 BPM

    try:
        print(f"    → Loading audio with librosa...")
        # Load audio with librosa
        y, sr = librosa.load(audio_path, sr=22050)
        print(f"    → Loaded {len(y)} samples at {sr}Hz ({len(y)/sr:.1f}s)")

        # Calculate spectral flux (rate of change in spectrum - high at phrase boundaries)
        print(f"    → Computing spectral flux...")
        spectral_flux = np.diff(np.abs(librosa.stft(y)), axis=1)
        spectral_flux = np.sum(spectral_flux, axis=0)

        # Smooth the spectral flux to find larger-scale changes
        # For electronic music, use smaller window for tighter detection
        smoothed_flux = simple_moving_average(spectral_flux, window_size=50)

        # Find peaks in smoothed flux (these are likely phrase boundaries)
        print(f"    → Detecting peaks in spectral flux...")

        # For electronic music, use top 3-5% most significant changes
        # Electronic music has clearer structure than ambient
        percentile_95 = np.percentile(smoothed_flux, 95)
        percentile_97 = np.percentile(smoothed_flux, 97)
        print(f"       95th percentile: {percentile_95:.2f}, 97th percentile: {percentile_97:.2f}")

        # Try 97th percentile first (top 3%)
        high_flux_indices = np.where(smoothed_flux > percentile_97)[0]
        print(f"       Found {len(high_flux_indices)} high-flux points (97th percentile)")

        # If we find very few points, fall back to 95th percentile
        if len(high_flux_indices) < 8:
            print(f"       Too few points, trying 95th percentile...")
            high_flux_indices = np.where(smoothed_flux > percentile_95)[0]
            print(f"       Found {len(high_flux_indices)} high-flux points (95th percentile)")

        # Cluster nearby high-flux points and take the peak of each cluster
        # For electronic music, use 8-16 bars minimum between phrases
        # Typical: 8 bars at 125 BPM = 15.36s, 16 bars = 30.72s
        min_distance_samples = int(sr * 12)  # 12 seconds minimum between phrases
        print(f"       Clustering with {min_distance_samples} sample distance ({min_distance_samples/sr:.1f}s)")
        peaks = []

        if len(high_flux_indices) > 0:
            current_cluster = [high_flux_indices[0]]
            cluster_count = 0

            for idx in high_flux_indices[1:]:
                # Check distance from the FIRST element of current cluster
                if idx - current_cluster[0] < min_distance_samples:
                    # Same cluster
                    current_cluster.append(idx)
                else:
                    # New cluster - find peak in previous cluster
                    cluster_values = smoothed_flux[current_cluster]
                    peak_idx = current_cluster[np.argmax(cluster_values)]
                    peaks.append(peak_idx)
                    cluster_count += 1
                    print(f"       Cluster {cluster_count}: {len(current_cluster)} points, peak at {peak_idx/sr:.1f}s")

                    # Start new cluster
                    current_cluster = [idx]

            # Don't forget the last cluster
            if current_cluster:
                cluster_values = smoothed_flux[current_cluster]
                peak_idx = current_cluster[np.argmax(cluster_values)]
                peaks.append(peak_idx)
                cluster_count += 1
                print(f"       Cluster {cluster_count}: {len(current_cluster)} points, peak at {peak_idx/sr:.1f}s")

        peaks = np.array(peaks)
        print(f"    → Found {len(peaks)} raw phrase boundaries")

        # Convert sample indices to milliseconds
        phrase_boundaries_ms = [int((peak / sr) * 1000) for peak in peaks]

        # Filter out boundaries in the first 5 seconds (track start, not real phrase boundary)
        phrase_boundaries_ms = [b for b in phrase_boundaries_ms if b > 5000]
        print(f"    → After filtering start: {len(phrase_boundaries_ms)} phrase boundaries")

        # Debug: show where the boundaries are
        if len(phrase_boundaries_ms) > 0:
            boundary_times = [f"{b/1000:.1f}s" for b in phrase_boundaries_ms]
            print(f"       Phrase boundaries at: {', '.join(boundary_times)}")

        # Calculate average phrase length
        if len(phrase_boundaries_ms) > 1:
            phrase_lengths = np.diff(phrase_boundaries_ms)
            avg_phrase_length = int(np.mean(phrase_lengths))
            print(f"       Using detected phrase length: {avg_phrase_length/1000:.1f}s")
        else:
            # No clear phrase boundaries detected - estimate based on typical electronic music structure
            # For electronic tracks, assume 16-bar phrases at ~125 BPM
            # 16 bars at 125 BPM = ~30.7 seconds
            track_duration_ms = len(y) / sr * 1000
            # Estimate based on track length, clamped to typical electronic phrase lengths
            avg_phrase_length = int(track_duration_ms / 4)  # Divide into 4 sections
            avg_phrase_length = max(15360, min(avg_phrase_length, 61440))  # Clamp between 8-32 bars
            print(f"       No clear phrases detected, estimating ~{avg_phrase_length/1000:.1f}s based on track length")

        if len(phrase_boundaries_ms) == 0:
            print(f"    ⚠ Track appears very smooth - using bar-based heuristics")

        return phrase_boundaries_ms, avg_phrase_length

    except Exception as e:
        import traceback
        print(f"    ⚠ Phrase detection failed: {e}")
        print(f"    ⚠ Traceback: {traceback.format_exc()}")
        return [], 15360  # Return empty boundaries and 8 bars at 125 BPM as default


def detect_phrase_boundaries(audio_path):
    """
    Detect phrase boundaries in ambient/meditation music using spectral analysis.

    Optimized for detecting gentle transitions in ambient, meditation, and
    atmospheric music where changes are more subtle than electronic music.

    Args:
        audio_path: Path to audio file (string)

    Returns:
        Tuple of (phrase_boundaries, avg_phrase_length):
            - phrase_boundaries: List of times in milliseconds where phrases start (list of ints)
            - avg_phrase_length: Average length between phrases in milliseconds (int)

    Algorithm:
        1. Load audio at 22050 Hz
        2. Compute STFT (Short-Time Fourier Transform)
        3. Calculate spectral flux (rate of spectral change)
        4. Smooth flux with 100-sample moving average (more aggressive than electronic)
        5. Find high-flux points (99th percentile, fallback to 98th)
        6. Cluster nearby points (20s minimum distance)
        7. Take peak of each cluster as phrase boundary
        8. Filter out boundaries in first 5 seconds
        9. Calculate average phrase length or estimate from track duration

    Typical Ambient Music Structure:
        - Phrases typically 20-90 seconds
        - Very smooth transitions
        - Fewer clear structural markers than electronic music

    Examples:
        >>> detect_phrase_boundaries("meditation.mp3")
        ([60000, 120000, 180000], 60000)
        # 3 phrases at 1min, 2min, 3min with 1min average length

    Returns Default on Failure:
        ([], 30000)  # Empty boundaries, 30 second default

    Notes:
        - Minimum 20 seconds between detected phrases
        - Uses top 1-2% most significant spectral changes
        - More aggressive smoothing than electronic detection
        - Estimates phrase length from track duration / 3 if no clear boundaries
        - Prints detailed debug information during processing
    """
    # Check if librosa is available
    if not LIBROSA_AVAILABLE:
        print(f"    ⚠ librosa not available, using heuristics")
        return [], 30000

    try:
        print(f"    → Loading audio with librosa...")
        # Load audio with librosa
        y, sr = librosa.load(audio_path, sr=22050)
        print(f"    → Loaded {len(y)} samples at {sr}Hz ({len(y)/sr:.1f}s)")

        # Calculate spectral flux (rate of change in spectrum - high at phrase boundaries)
        print(f"    → Computing spectral flux...")
        spectral_flux = np.diff(np.abs(librosa.stft(y)), axis=1)
        spectral_flux = np.sum(spectral_flux, axis=0)

        # Smooth the spectral flux to find larger-scale changes
        # Use simple moving average instead of gaussian_filter1d
        smoothed_flux = simple_moving_average(spectral_flux, window_size=100)

        # Find peaks in smoothed flux (these are likely phrase boundaries)
        # For ambient music, use a percentile-based approach
        print(f"    → Detecting peaks in spectral flux...")

        # For ambient music, use only the top 1-2% most significant changes
        # This filters out minor variations and focuses on real phrase boundaries
        percentile_98 = np.percentile(smoothed_flux, 98)
        percentile_99 = np.percentile(smoothed_flux, 99)
        print(f"       98th percentile: {percentile_98:.2f}, 99th percentile: {percentile_99:.2f}")

        # Try 99th percentile first (top 1%)
        high_flux_indices = np.where(smoothed_flux > percentile_99)[0]
        print(f"       Found {len(high_flux_indices)} high-flux points (99th percentile)")

        # If we find very few points, fall back to 98th percentile
        if len(high_flux_indices) < 10:
            print(f"       Too few points, trying 98th percentile...")
            high_flux_indices = np.where(smoothed_flux > percentile_98)[0]
            print(f"       Found {len(high_flux_indices)} high-flux points (98th percentile)")

        # Cluster nearby high-flux points and take the peak of each cluster
        # For ambient music, use 20 second minimum between phrases
        # (typical ambient phrase length is 20-40 seconds)
        min_distance_samples = int(sr * 20)  # 20 seconds minimum between phrases
        print(f"       Clustering with {min_distance_samples} sample distance ({min_distance_samples/sr:.1f}s)")
        peaks = []

        if len(high_flux_indices) > 0:
            current_cluster = [high_flux_indices[0]]
            cluster_count = 0

            for idx in high_flux_indices[1:]:
                # Check distance from the FIRST element of current cluster, not the last
                # This ensures the entire cluster fits within the min_distance window
                if idx - current_cluster[0] < min_distance_samples:
                    # Same cluster
                    current_cluster.append(idx)
                else:
                    # New cluster - find peak in previous cluster
                    cluster_values = smoothed_flux[current_cluster]
                    peak_idx = current_cluster[np.argmax(cluster_values)]
                    peaks.append(peak_idx)
                    cluster_count += 1
                    print(f"       Cluster {cluster_count}: {len(current_cluster)} points, peak at {peak_idx/sr:.1f}s")

                    # Start new cluster
                    current_cluster = [idx]

            # Don't forget the last cluster
            if current_cluster:
                cluster_values = smoothed_flux[current_cluster]
                peak_idx = current_cluster[np.argmax(cluster_values)]
                peaks.append(peak_idx)
                cluster_count += 1
                print(f"       Cluster {cluster_count}: {len(current_cluster)} points, peak at {peak_idx/sr:.1f}s")

        peaks = np.array(peaks)
        print(f"    → Found {len(peaks)} raw phrase boundaries")

        # Convert sample indices to milliseconds
        phrase_boundaries_ms = [int((peak / sr) * 1000) for peak in peaks]

        # Filter out boundaries in the first 5 seconds (track start, not real phrase boundary)
        phrase_boundaries_ms = [b for b in phrase_boundaries_ms if b > 5000]
        print(f"    → After filtering start: {len(phrase_boundaries_ms)} phrase boundaries")

        # Debug: show where the boundaries are
        if len(phrase_boundaries_ms) > 0:
            boundary_times = [f"{b/1000:.1f}s" for b in phrase_boundaries_ms]
            print(f"       Phrase boundaries at: {', '.join(boundary_times)}")

        # Calculate average phrase length
        if len(phrase_boundaries_ms) > 1:
            phrase_lengths = np.diff(phrase_boundaries_ms)
            avg_phrase_length = int(np.mean(phrase_lengths))
            print(f"       Using detected phrase length: {avg_phrase_length/1000:.1f}s")
        else:
            # No clear phrase boundaries detected - estimate based on track length
            # For smooth ambient tracks, use track_duration / 3 as phrase length
            track_duration_ms = len(y) / sr * 1000
            avg_phrase_length = int(track_duration_ms / 3)
            avg_phrase_length = max(20000, min(avg_phrase_length, 90000))  # Clamp between 20-90s
            print(f"       No clear phrases detected, estimating ~{avg_phrase_length/1000:.1f}s based on track length")

        if len(phrase_boundaries_ms) == 0:
            print(f"    ⚠ Track appears very smooth - using duration-based heuristics")

        return phrase_boundaries_ms, avg_phrase_length

    except Exception as e:
        import traceback
        print(f"    ⚠ Phrase detection failed: {e}")
        print(f"    ⚠ Traceback: {traceback.format_exc()}")
        return [], 30000  # Return empty boundaries and default phrase length
