"""
RGB Waveform Generation (Rekordbox 6+ Style)

This module generates RGB waveform visualization data similar to Pioneer's
Rekordbox 6+ DJ software. The waveform uses frequency-based coloring where:
    - Blue: Bass/Low frequencies (20-250 Hz)
    - Green/Yellow: Mids/Vocals (250-4000 Hz)
    - Red/Orange: Balanced content
    - Cyan: High frequencies (4000+ Hz)

The visualization helps DJs identify:
    - Bass-heavy sections (drops, kick patterns)
    - Vocal/melody sections (breakdowns, hooks)
    - High-energy cymbal/hi-hat sections
    - Overall track structure and energy flow

Dependencies:
    - librosa: For audio loading and FFT analysis (optional)
    - pydub: Fallback for basic waveform without frequency analysis
    - numpy: For numerical operations

References:
    - Rekordbox waveforms: https://www.pioneerdj.com/rekordbox/
    - Frequency ranges: https://en.wikipedia.org/wiki/Audio_frequency
"""

import os
import numpy as np
from pydub import AudioSegment

# Try to import librosa
try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    print("⚠ librosa not available, using pydub for waveform")


def generate_waveform_data(audio_path, num_points=200):
    """
    Generate RGB waveform visualization data (Rekordbox 6+ style).

    Creates an array of data points, each containing:
        - amplitude: Overall energy level (0.0 to 1.0)
        - r, g, b: RGB color values (0-255) based on frequency content

    Args:
        audio_path: Path to audio file (string)
        num_points: Number of points to generate (int, default: 200)

    Returns:
        List of dictionaries, each containing:
        {
            'amplitude': float (0.0 to 1.0, normalized),
            'r': int (0-255, red channel),
            'g': int (0-255, green channel),
            'b': int (0-255, blue channel)
        }

    Color Mapping (Rekordbox-style):
        - Mid-dominant (vocals/snares): Green/Yellow (r:140-220, g:230, b:40)
        - Bass-dominant (kicks/subs): Deep Red/Orange (r:200-250, g:60-100, b:10-20)
        - High-dominant (hi-hats/cymbals): Cyan-Blue (r:70-110, g:160-220, b:210-240)
        - Balanced: Warm Orange-Red (r:210-255, g:80-120, b:25-40)

    Frequency Bands:
        - Low (Bass): 20-250 Hz → affects blue channel calculation
        - Mid (Vocals/Instruments): 250-2000 Hz → affects green channel calculation
        - High (Cymbals/Air): 2000+ Hz → affects cyan/blue calculation

    Examples:
        >>> waveform = generate_waveform_data("track.mp3", num_points=200)
        >>> len(waveform)
        200
        >>> waveform[0]
        {'amplitude': 0.85, 'r': 210, 'g': 85, 'b': 30}

    Fallback Behavior:
        If librosa is not available:
            - Uses pydub for basic amplitude waveform
            - All points colored neutral gray (r:128, g:128, b:128)
            - Amplitude still reflects track energy

    Notes:
        - Audio is loaded at 22050 Hz for performance
        - Each point represents (track_length / num_points) of audio
        - FFT is applied to each segment for frequency analysis
        - Colors are enhanced for visibility (intensity adjustment)
        - Returns neutral gray waveform on error
    """
    if not LIBROSA_AVAILABLE:
        print(f"    ⚠ librosa not available, using pydub for waveform")
        return _generate_waveform_pydub_fallback(audio_path, num_points)

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

            # Detect band dominance and assign Rekordbox-style colors
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


def _generate_waveform_pydub_fallback(audio_path, num_points=200):
    """
    Fallback waveform generation using pydub (no frequency analysis).

    This function is used when librosa is not available. It generates a simple
    amplitude-based waveform with neutral gray coloring.

    Args:
        audio_path: Path to audio file (string)
        num_points: Number of points to generate (int)

    Returns:
        List of waveform data dictionaries with neutral gray color
    """
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
