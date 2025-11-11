import os
import sys
import json
import numpy as np
from pydub import AudioSegment
from pydub.silence import detect_silence
import warnings
warnings.filterwarnings('ignore')

# Try to import librosa and scipy for advanced analysis
try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    print("⚠ librosa not available, using heuristic analysis only")

try:
    from scipy.ndimage import gaussian_filter1d
    from scipy.signal import find_peaks
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("⚠ scipy not available, using heuristic analysis only")

def analyze_manual_mode(track_length, silence_at_start, silence_at_end,
                        first_30s, first_30s_loudness, last_30s_loudness):
    """Manual/loudness-based analysis (original algorithm)"""
    # FADE IN - Based on silence at start and initial loudness
    if silence_at_start > 500:
        suggested_fade_in = int(silence_at_start * 0.6)
    elif first_30s_loudness < -20:
        suggested_fade_in = min(8000, int(len(first_30s) * 0.2))
    elif first_30s_loudness < -10:
        suggested_fade_in = 5000
    else:
        suggested_fade_in = 3000

    # FADE OUT - Based on silence at end and ending loudness
    if silence_at_end > 500:
        suggested_fade_out = int(silence_at_end * 0.7)
    elif last_30s_loudness < -20:
        suggested_fade_out = 3500
    elif last_30s_loudness < -10:
        suggested_fade_out = 6000
    else:
        suggested_fade_out = 8500

    # ENTRANCE - When to start next track
    if silence_at_end > 2000:
        time_before_silence = track_length - silence_at_end
        suggested_entrance = track_length - time_before_silence + suggested_fade_out
        suggested_entrance = max(3000, min(suggested_entrance, 20000))
    elif last_30s_loudness > -10:
        suggested_entrance = int(suggested_fade_out * 1.4)
    else:
        suggested_entrance = max(suggested_fade_out, 8000)

    return suggested_fade_in, suggested_fade_out, suggested_entrance

def detect_electronic_phrase_boundaries(audio_path):
    """
    Detect phrase boundaries in electronic/dance music using spectral analysis.
    Optimized for detecting drops, breakdowns, build-ups in house/techno/afro/downtempo.
    Returns phrase boundary times in milliseconds.
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

def analyze_dance_mode(audio, track_length, silence_at_start, silence_at_end,
                       first_30s_loudness, last_30s_loudness, audio_path=None):
    """
    Dance/Electronic mode - Phrase-aware beat-aligned transitions
    Uses actual phrase detection to find drops, breakdowns, and build-ups
    Optimized for house, techno, afro, melodic, and downtempo
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

def simple_moving_average(data, window_size):
    """Simple moving average filter using numpy (scipy-free alternative)"""
    weights = np.ones(window_size) / window_size
    return np.convolve(data, weights, mode='same')

def find_peaks_simple(data, distance=100, prominence=0.5):
    """
    Simple peak detection without scipy.
    Finds local maxima that are separated by at least 'distance' samples
    and have prominence above threshold * std_dev
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

def detect_phrase_boundaries(audio_path):
    """
    Detect phrase boundaries in ambient/meditation music using spectral analysis.
    Returns phrase boundary times in milliseconds.
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

def analyze_ambient_mode(audio, track_length, silence_at_start, silence_at_end,
                         first_30s_loudness, last_30s_loudness, audio_path=None):
    """
    Ambient/Meditation mode - Long, gradual phrase-based transitions
    Uses real phrase detection with librosa if available
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

def analyze_pop_mode(audio, track_length, silence_at_start, silence_at_end,
                     first_30s_loudness, last_30s_loudness):
    """
    Pop/Rock mode - Hybrid approach
    Combines beat awareness with energy-based transitions
    """
    # Pop music: typically 4/4, ~100-140 BPM
    # Assume average ~120 BPM: 1 beat = 500ms, 1 bar = 2000ms

    one_bar_ms = 2000

    # FADE IN - Moderate, 1-3 bars
    if silence_at_start > 500:
        suggested_fade_in = min(one_bar_ms * 3, int(silence_at_start * 0.7))
    elif first_30s_loudness < -15:
        suggested_fade_in = one_bar_ms * 2  # 2 bars
    else:
        suggested_fade_in = one_bar_ms  # 1 bar for energetic starts

    # FADE OUT - 2-4 bars
    if silence_at_end > 1000:
        suggested_fade_out = min(one_bar_ms * 3, int(silence_at_end * 0.7))
    else:
        suggested_fade_out = one_bar_ms * 4  # 4 bars

    # ENTRANCE - 4 or 8 bars (phrase-aware)
    # Pop songs often have 4 or 8 bar phrases
    if last_30s_loudness > -8:
        # Strong ending - longer overlap
        suggested_entrance = one_bar_ms * 8
    else:
        # Softer ending - shorter overlap
        suggested_entrance = one_bar_ms * 4

    suggested_entrance = min(suggested_entrance, track_length // 3)

    return suggested_fade_in, suggested_fade_out, suggested_entrance

def analyze_classical_mode(audio, track_length, silence_at_start, silence_at_end,
                           first_30s_loudness, last_30s_loudness):
    """
    Classical/Orchestral mode - Dynamics and phrase-based
    Respects natural dynamics, uses longer transitions
    """
    # Classical music has wide dynamic range and natural phrasing
    # Need gentle, musical transitions

    # FADE IN - Gentle, respecting natural attack (5-15 seconds)
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

    # FADE OUT - Musical, phrase-aware (10-30 seconds)
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

    # ENTRANCE - Minimal overlap, phrase-based (15-25 seconds)
    # Classical pieces should transition at phrase boundaries with minimal overlap
    if track_length > 180000:  # Longer than 3 minutes
        suggested_entrance = 25000
    else:
        suggested_entrance = 15000

    return suggested_fade_in, suggested_fade_out, suggested_entrance

def detect_bpm_and_key(audio_path):
    """
    Detect BPM and musical key from audio file.
    Returns (bpm, key) tuple.
    """
    if not LIBROSA_AVAILABLE:
        print(f"    ⚠ librosa not available, cannot detect BPM/key")
        return None, None

    try:
        print(f"    → Detecting BPM and key...")
        # Load audio with librosa
        y, sr = librosa.load(audio_path, sr=22050)

        # Detect tempo (BPM)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(tempo)

        # Detect key using chroma features
        chromagram = librosa.feature.chroma_cqt(y=y, sr=sr)

        # Average chroma across time
        chroma_vals = chromagram.mean(axis=1)

        # Find the dominant pitch class
        key_index = chroma_vals.argmax()

        # Map to key names (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
        keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        key = keys[key_index]

        # Simple major/minor detection based on chroma pattern
        # Major chords emphasize root, major 3rd (4 semitones), perfect 5th (7 semitones)
        # Minor chords emphasize root, minor 3rd (3 semitones), perfect 5th (7 semitones)
        major_3rd_strength = chroma_vals[(key_index + 4) % 12]
        minor_3rd_strength = chroma_vals[(key_index + 3) % 12]

        if minor_3rd_strength > major_3rd_strength:
            key = key + 'm'

        print(f"    ✓ Detected: BPM={bpm:.1f}, Key={key}")
        return bpm, key

    except Exception as e:
        import traceback
        print(f"    ⚠ BPM/Key detection failed: {e}")
        print(f"    ⚠ Traceback: {traceback.format_exc()}")
        return None, None

def key_to_camelot(key):
    """
    Convert musical key notation to Camelot wheel notation.
    Returns Camelot notation (e.g., "8A" for Am, "8B" for C).
    """
    camelot_map = {
        # Major keys (B)
        'C': '8B', 'Db': '3B', 'C#': '3B', 'D': '10B', 'Eb': '5B', 'D#': '5B',
        'E': '12B', 'F': '7B', 'Gb': '2B', 'F#': '2B', 'G': '9B',
        'Ab': '4B', 'G#': '4B', 'A': '11B', 'Bb': '6B', 'A#': '6B', 'B': '1B',

        # Minor keys (A)
        'Cm': '5A', 'Dbm': '12A', 'C#m': '12A', 'Dm': '7A', 'Ebm': '2A', 'D#m': '2A',
        'Em': '9A', 'Fm': '4A', 'Gbm': '11A', 'F#m': '11A', 'Gm': '6A',
        'Abm': '1A', 'G#m': '1A', 'Am': '8A', 'Bbm': '3A', 'A#m': '3A', 'Bm': '10A',
    }
    return camelot_map.get(key, key)

def generate_waveform_data(audio_path, num_points=200):
    """
    Generate RGB waveform visualization data (Rekordbox 6+ style).
    Returns array of objects with RGB color and amplitude for each point.
    Color represents frequency content, brightness represents amplitude.
    """
    if not LIBROSA_AVAILABLE:
        print(f"    ⚠ librosa not available, using pydub for waveform")
        # Fallback to pydub if librosa not available
        try:
            ext = os.path.splitext(audio_path)[1].lower()
            if ext == ".wav":
                audio = AudioSegment.from_wav(audio_path)
            elif ext == ".flac":
                audio = AudioSegment.from_file(audio_path, format="flac")
            elif ext == ".mp3":
                audio = AudioSegment.from_mp3(audio_path)
            else:
                audio = AudioSegment.from_file(audio_path)

            # Get raw audio data
            samples = np.array(audio.get_array_of_samples())
            if audio.channels == 2:
                samples = samples.reshape((-1, 2))
                samples = samples.mean(axis=1)  # Convert to mono

            # Divide into segments
            segment_length = len(samples) // num_points
            waveform_data = []

            for i in range(num_points):
                start = i * segment_length
                end = start + segment_length
                if end > len(samples):
                    end = len(samples)
                segment = samples[start:end]

                if len(segment) > 0:
                    rms = np.sqrt(np.mean(segment**2))
                    # Without FFT, use neutral color with amplitude
                    waveform_data.append({
                        'amplitude': float(rms),
                        'r': 128,
                        'g': 128,
                        'b': 128
                    })
                else:
                    waveform_data.append({
                        'amplitude': 0.0,
                        'r': 128,
                        'g': 128,
                        'b': 128
                    })

            # Normalize amplitudes to 0-1 range
            if len(waveform_data) > 0:
                max_amp = max(d['amplitude'] for d in waveform_data)
                if max_amp > 0:
                    for d in waveform_data:
                        d['amplitude'] = d['amplitude'] / max_amp

            return waveform_data

        except Exception as e:
            print(f"    ⚠ Waveform generation failed: {e}")
            return [{'amplitude': 0.5, 'r': 128, 'g': 128, 'b': 128} for _ in range(num_points)]

    try:
        print(f"    → Generating RGB waveform data ({num_points} points)...")
        # Load audio with librosa
        y, sr = librosa.load(audio_path, sr=22050)

        # Divide into segments
        segment_length = len(y) // num_points
        waveform_data = []

        for i in range(num_points):
            start = i * segment_length
            end = start + segment_length
            segment = y[start:end]

            # Apply FFT to get frequency spectrum
            fft_vals = np.fft.rfft(segment)
            freqs = np.fft.rfftfreq(len(segment), 1/sr)
            magnitude = np.abs(fft_vals)

            # Extract energy from each frequency band
            # Low (Bass): 20-250 Hz -> Blue channel
            # Mid (Vocals/Snares): 250-4000 Hz -> Green channel
            # High (Hi-hats/Cymbals): 4000+ Hz -> Red channel
            low_mask = (freqs >= 20) & (freqs < 250)
            mid_mask = (freqs >= 250) & (freqs < 2000)
            high_mask = freqs >= 2000

            low_energy  = np.sqrt(np.mean(np.square(magnitude[low_mask])))  if np.any(low_mask)  else 0
            mid_energy  = np.sqrt(np.mean(np.square(magnitude[mid_mask])))  if np.any(mid_mask)  else 0
            high_energy = np.sqrt(np.mean(np.square(magnitude[high_mask]))) if np.any(high_mask) else 0

            # Calculate overall amplitude (RMS)
            total_energy = low_energy + mid_energy + high_energy

            waveform_data.append({
                'amplitude': float(total_energy),
                'low': float(low_energy),
                'mid': float(mid_energy),
                'high': float(high_energy)
            })

        # Normalize amplitudes and calculate RGB colors (Rekordbox-style)
        max_amp = max(d['amplitude'] for d in waveform_data) if waveform_data else 1.0
        max_low = max(d['low'] for d in waveform_data) if waveform_data else 1.0
        max_mid = max(d['mid'] for d in waveform_data) if waveform_data else 1.0
        max_high = max(d['high'] for d in waveform_data) if waveform_data else 1.0

        for d in waveform_data:
            # Normalize amplitude
            d['amplitude'] = d['amplitude'] / max_amp if max_amp > 0 else 0

            # Relative band energy within this frame
            total_power = d['low'] + d['mid'] + d['high']
            if total_power == 0:
                total_power = 1e-6

            low_ratio = d['low'] / total_power
            mid_ratio = d['mid'] / total_power
            high_ratio = d['high'] / total_power

            intensity = d['amplitude'] ** 0.3

            # Detect band dominance
            if mid_ratio > 0.3:
                # Mid-dominant → green/yellow
                d['r'] = int(140 + intensity * 80)
                d['g'] = int(230)
                d['b'] = int(40)
            elif low_ratio > 0.4:
                # Bass → deep red/orange
                d['r'] = int(200 + intensity * 50)
                d['g'] = int(60 + intensity * 40)
                d['b'] = int(10 + intensity * 10)
            elif high_ratio > 0.25:
                # Highs → cyan-blue, visible sparkle
                d['r'] = int(70 + intensity * 40)
                d['g'] = int(160 + intensity * 60)
                d['b'] = int(210 + intensity * 30)
            else:
                # Balanced → warm orange-red
                d['r'] = int(210 + intensity * 45)
                d['g'] = int(80 + intensity * 40)
                d['b'] = int(25 + intensity * 15)

            # Clean up temporary values
            del d['low']
            del d['mid']
            del d['high']

        print(f"    ✓ RGB waveform generated: {num_points} points")
        return waveform_data

    except Exception as e:
        import traceback
        print(f"    ⚠ Waveform generation failed: {e}")
        print(f"    ⚠ Traceback: {traceback.format_exc()}")
        # Return neutral waveform as fallback
        return [{'amplitude': 0.5, 'r': 128, 'g': 128, 'b': 128} for _ in range(num_points)]

def analyze_audio_file(file_path, mode="manual"):
    """
    Analyze an audio file and suggest optimal mixing parameters.

    Args:
        file_path: Path to the audio file
        mode: Analysis mode - "manual", "dance", "ambient", "pop", or "classical"

    Returns: {
        "suggested_fade_in": milliseconds,
        "suggested_fade_out": milliseconds,
        "suggested_entrance": milliseconds,
        "track_length": milliseconds,
        "silence_at_start": milliseconds,
        "silence_at_end": milliseconds,
        "average_loudness": dBFS,
        "waveform_data": array of normalized amplitudes,
        "phrase_boundaries": array of phrase boundary times in ms,
        "avg_phrase_length": average phrase length in ms,
        "bpm": beats per minute (float),
        "key": musical key (string, e.g., "C", "Am", "F#m")
    }
    """
    print(f"\n  Analyzing: {os.path.basename(file_path)} (mode: {mode})")

    if not os.path.exists(file_path):
        print(f"    ✗ File not found")
        return None

    try:
        # Load audio file
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".wav":
            audio = AudioSegment.from_wav(file_path)
        elif ext == ".flac":
            audio = AudioSegment.from_file(file_path, format="flac")
        elif ext == ".mp3":
            audio = AudioSegment.from_mp3(file_path)
        else:
            audio = AudioSegment.from_file(file_path)

        track_length = len(audio)
        print(f"    Length: {track_length/1000:.2f}s")

        # Detect silence at start and end (silence threshold: -40dB, min silence: 100ms)
        silences = detect_silence(audio, min_silence_len=100, silence_thresh=-40)

        silence_at_start = 0
        silence_at_end = 0

        if silences:
            # Check if silence at the very start
            if silences[0][0] == 0:
                silence_at_start = silences[0][1]
                print(f"    Silence at start: {silence_at_start}ms")

            # Check if silence at the very end
            if silences[-1][1] >= track_length - 100:
                silence_at_end = track_length - silences[-1][0]
                print(f"    Silence at end: {silence_at_end}ms")

        # Calculate average loudness
        avg_loudness = audio.dBFS
        print(f"    Avg loudness: {avg_loudness:.2f} dBFS")

        # Analyze last 30 seconds for energy/loudness to suggest entrance timing
        last_30s = audio[-30000:] if len(audio) > 30000 else audio
        last_30s_loudness = last_30s.dBFS

        # Analyze first 30 seconds for fade-in suggestion
        first_30s = audio[:30000] if len(audio) > 30000 else audio
        first_30s_loudness = first_30s.dBFS

        # Use mode-specific analysis strategy
        phrase_boundaries = []
        avg_phrase_length = 0

        if mode == "dance":
            suggested_fade_in, suggested_fade_out, suggested_entrance = analyze_dance_mode(
                audio, track_length, silence_at_start, silence_at_end,
                first_30s_loudness, last_30s_loudness, file_path
            )
            # Get phrase boundaries from dance mode
            if file_path and os.path.exists(file_path):
                phrase_boundaries, avg_phrase_length = detect_electronic_phrase_boundaries(file_path)
        elif mode == "ambient":
            suggested_fade_in, suggested_fade_out, suggested_entrance = analyze_ambient_mode(
                audio, track_length, silence_at_start, silence_at_end,
                first_30s_loudness, last_30s_loudness, file_path
            )
            # Get phrase boundaries from ambient mode
            if file_path and os.path.exists(file_path):
                phrase_boundaries, avg_phrase_length = detect_phrase_boundaries(file_path)
        elif mode == "pop":
            suggested_fade_in, suggested_fade_out, suggested_entrance = analyze_pop_mode(
                audio, track_length, silence_at_start, silence_at_end,
                first_30s_loudness, last_30s_loudness
            )
        elif mode == "classical":
            suggested_fade_in, suggested_fade_out, suggested_entrance = analyze_classical_mode(
                audio, track_length, silence_at_start, silence_at_end,
                first_30s_loudness, last_30s_loudness
            )
        else:  # manual mode (default)
            suggested_fade_in, suggested_fade_out, suggested_entrance = analyze_manual_mode(
                track_length, silence_at_start, silence_at_end,
                first_30s, first_30s_loudness, last_30s_loudness
            )

        print(f"    ✓ Suggested: fade_in={suggested_fade_in}ms, fade_out={suggested_fade_out}ms, entrance={suggested_entrance}ms")

        # Detect BPM and musical key
        bpm, key = detect_bpm_and_key(file_path)

        # Convert key to Camelot notation
        camelot_key = key_to_camelot(key) if key else None

        # Generate waveform data for visualization
        waveform_data = generate_waveform_data(file_path, num_points=200)

        return {
            "suggested_fade_in": int(suggested_fade_in),
            "suggested_fade_out": int(suggested_fade_out),
            "suggested_entrance": int(suggested_entrance),
            "track_length": int(track_length),
            "silence_at_start": int(silence_at_start),
            "silence_at_end": int(silence_at_end),
            "average_loudness": float(avg_loudness),
            "waveform_data": waveform_data,
            "phrase_boundaries": phrase_boundaries,
            "avg_phrase_length": int(avg_phrase_length) if avg_phrase_length else 0,
            "bpm": bpm,
            "key": key,
            "camelot_key": camelot_key
        }

    except Exception as e:
        print(f"    ✗ Analysis failed: {e}")
        return None

def analyze_tracks(folder_path, tracks, mode="manual"):
    """
    Analyze multiple tracks and return analysis results.
    """
    print("=" * 60)
    print("ANALYZING AUDIO TRACKS")
    print("=" * 60)
    print(f"Folder: {folder_path}")
    print(f"Tracks to analyze: {len(tracks)}")
    print(f"Analysis mode: {mode}")

    results = []

    for track in tracks:
        filename = track.get("name")
        file_path = os.path.join(folder_path, filename)

        analysis = analyze_audio_file(file_path, mode)

        if analysis:
            results.append({
                "name": filename,
                "analysis": analysis
            })
        else:
            # Return default values if analysis fails
            neutral_waveform = [{'amplitude': 0.5, 'r': 128, 'g': 128, 'b': 128} for _ in range(200)]
            results.append({
                "name": filename,
                "analysis": {
                    "suggested_fade_in": 5000,
                    "suggested_fade_out": 5000,
                    "suggested_entrance": 10000,
                    "track_length": 0,
                    "silence_at_start": 0,
                    "silence_at_end": 0,
                    "average_loudness": 0,
                    "waveform_data": neutral_waveform,
                    "phrase_boundaries": [],
                    "avg_phrase_length": 0,
                    "bpm": None,
                    "key": None,
                    "camelot_key": None
                }
            })

    return results

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python audio_analyzer.py <folder_path> <tracks_json> [mode]")
        sys.exit(1)

    folder = sys.argv[1]
    tracks_json = sys.argv[2]
    mode = sys.argv[3] if len(sys.argv) > 3 else "manual"
    tracks = json.loads(tracks_json)

    results = analyze_tracks(folder, tracks, mode)

    # Output results as JSON (with summarized waveform data for readability)
    print("\n" + "=" * 60)
    print("ANALYSIS RESULTS")
    print("=" * 60)

    # Create a summary version without huge arrays for readable output
    results_summary = []
    for track_result in results:
        analysis = track_result["analysis"].copy()

        # Summarize waveform data
        if analysis.get("waveform_data"):
            analysis["waveform_data"] = f"<{len(analysis['waveform_data'])} points>"

        # Truncate phrase boundaries if too many
        if analysis.get("phrase_boundaries") and len(analysis["phrase_boundaries"]) > 5:
            pb = analysis["phrase_boundaries"]
            analysis["phrase_boundaries"] = f"{pb[:3]} ... {pb[-2:]} ({len(pb)} total)"

        results_summary.append({
            "name": track_result["name"],
            "analysis": analysis
        })

    print(json.dumps(results_summary, indent=2))
