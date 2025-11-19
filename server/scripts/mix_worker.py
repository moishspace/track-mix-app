import os
import csv
from pydub import AudioSegment
print("Pydub is available!")
import sys
import json
import numpy as np

from logging_config import get_logger
logging = get_logger(__name__)

def load_audio_file(file_path):
    """
    Load an audio file from any supported format
    """
    logging.debug(f"\n  DEBUG: Attempting to load:")
    logging.debug(f"    Raw path: '{file_path}'")
    logging.debug(f"    Exists: {os.path.exists(file_path)}")
    if not os.path.exists(file_path):
        logging.error(f"    ✗ File not found: {file_path}")
        return None
    try:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".wav":
            audio = AudioSegment.from_wav(file_path)
        elif ext == ".flac":
            audio = AudioSegment.from_file(file_path, format="flac")
        elif ext == ".mp3":
            audio = AudioSegment.from_mp3(file_path)
        else:
            audio = AudioSegment.from_file(file_path)
        logging.debug(f"    ✓ Loaded successfully - {len(audio)/1000:.2f} seconds")
        return audio
    except Exception as e:
        logging.error(f"    ✗ Load failed: {e}")
        return None

def improved_crossfade(audio1: AudioSegment, audio2: AudioSegment,
                       fade_out_duration: int, fade_in_duration: int,
                       crossfade_type: str = "equal_power") -> AudioSegment:
    fade_out_duration = min(fade_out_duration, len(audio1))
    fade_in_duration = min(fade_in_duration, len(audio2))
    overlap_duration = min(fade_out_duration, fade_in_duration)

    fade_out_part = audio1[-fade_out_duration:]
    part1_before_fade = audio1[:-fade_out_duration]

    fade_in_part = audio2[:fade_in_duration]
    part2_after_fade = audio2[fade_in_duration:]

    if crossfade_type == "equal_power":
        overlapped = apply_equal_power_fade(fade_out_part, fade_in_part, fade_out_duration, fade_in_duration)
    elif crossfade_type == "exponential":
        overlapped = apply_exponential_fade(fade_out_part, fade_in_part, fade_out_duration, fade_in_duration)
    else:
        overlapped = apply_linear_fade(fade_out_part, fade_in_part, fade_out_duration, fade_in_duration)

    return part1_before_fade + overlapped + part2_after_fade

def apply_equal_power_fade(fade_out_part, fade_in_part, fade_out_duration, fade_in_duration):
    samples_out = np.array(fade_out_part.get_array_of_samples(), dtype=np.float32)
    samples_in = np.array(fade_in_part.get_array_of_samples(), dtype=np.float32)

    # Determine the appropriate dtype based on sample width (preserve bit depth)
    sample_width = fade_out_part.sample_width
    if sample_width == 1:
        target_dtype = np.int8
    elif sample_width == 2:
        target_dtype = np.int16
    else:  # sample_width >= 3 (24-bit or 32-bit)
        target_dtype = np.int32

    if len(samples_out) > 0:
        t_out = np.linspace(0, np.pi/2, len(samples_out))
        curve_out = np.cos(t_out)
        samples_out *= curve_out

    if len(samples_in) > 0:
        t_in = np.linspace(0, np.pi/2, len(samples_in))
        curve_in = np.sin(t_in)
        samples_in *= curve_in

    if fade_out_duration == fade_in_duration:
        mixed = (samples_out + samples_in).astype(target_dtype)
        return fade_out_part._spawn(mixed.tobytes())
    elif fade_out_duration > fade_in_duration:
        pre_overlap = samples_out[:-len(samples_in)]
        overlap = samples_out[-len(samples_in):] + samples_in
        mixed = np.concatenate([pre_overlap, overlap]).astype(target_dtype)
        return fade_out_part._spawn(mixed.tobytes())
    else:
        overlap = samples_out + samples_in[:len(samples_out)]
        post_overlap = samples_in[len(samples_out):]
        mixed = np.concatenate([overlap, post_overlap]).astype(target_dtype)
        result_segment = fade_out_part._spawn(mixed[:len(samples_out)].tobytes())
        if len(post_overlap) > 0:
            post_segment = fade_in_part._spawn(post_overlap.tobytes())
            result_segment = result_segment + post_segment
        return result_segment

def apply_exponential_fade(fade_out_part, fade_in_part, fade_out_duration, fade_in_duration):
    samples_out = np.array(fade_out_part.get_array_of_samples(), dtype=np.float32)
    samples_in = np.array(fade_in_part.get_array_of_samples(), dtype=np.float32)

    # Determine the appropriate dtype based on sample width (preserve bit depth)
    sample_width = fade_out_part.sample_width
    if sample_width == 1:
        target_dtype = np.int8
    elif sample_width == 2:
        target_dtype = np.int16
    else:  # sample_width >= 3 (24-bit or 32-bit)
        target_dtype = np.int32

    if len(samples_out) > 0:
        t_out = np.linspace(0, 5, len(samples_out))
        curve_out = np.exp(-t_out)
        samples_out *= curve_out

    if len(samples_in) > 0:
        t_in = np.linspace(-5, 0, len(samples_in))
        curve_in = np.exp(t_in)
        samples_in *= curve_in

    if fade_out_duration == fade_in_duration:
        mixed = (samples_out + samples_in).astype(target_dtype)
        return fade_out_part._spawn(mixed.tobytes())
    elif fade_out_duration > fade_in_duration:
        pre_overlap = samples_out[:-len(samples_in)]
        overlap = samples_out[-len(samples_in):] + samples_in
        mixed = np.concatenate([pre_overlap, overlap]).astype(target_dtype)
        return fade_out_part._spawn(mixed.tobytes())
    else:
        overlap = samples_out + samples_in[:len(samples_out)]
        post_overlap = samples_in[len(samples_out):]
        mixed = np.concatenate([overlap, post_overlap]).astype(target_dtype)
        result_segment = fade_out_part._spawn(mixed[:len(samples_out)].tobytes())
        if len(post_overlap) > 0:
            post_segment = fade_in_part._spawn(post_overlap.tobytes())
            result_segment = result_segment + post_segment
        return result_segment

def apply_linear_fade(fade_out_part, fade_in_part, fade_out_duration, fade_in_duration):
    fade_out_applied = fade_out_part.fade_out(fade_out_duration)
    fade_in_applied = fade_in_part.fade_in(fade_in_duration)

    if fade_out_duration == fade_in_duration:
        return fade_out_applied.overlay(fade_in_applied)
    elif fade_out_duration > fade_in_duration:
        overlap_part = fade_out_applied[-fade_in_duration:]
        pre_part = fade_out_applied[:-fade_in_duration]
        mixed = overlap_part.overlay(fade_in_applied)
        return pre_part + mixed
    else:
        overlap_part = fade_in_applied[:fade_out_duration]
        post_part = fade_in_applied[fade_out_duration:]
        mixed = fade_out_applied.overlay(overlap_part)
        return mixed + post_part

def normalize_audio(audio, target_dBFS=-3.0):
    if audio.max_dBFS > target_dBFS:
        change = target_dBFS - audio.max_dBFS
        return audio.apply_gain(change)
    return audio

def simple_crossfade(audio1: AudioSegment, audio2: AudioSegment,
                     entrance_duration: int, fade_out_duration: int, fade_in_duration: int,
                     mode: str = "overlap") -> AudioSegment:
    """
    Crossfade two audio segments with specified entrance and fade durations.

    Args:
        audio1: The current/outgoing audio segment
        audio2: The next/incoming audio segment
        entrance_duration: How many ms before the end of audio1 should audio2 start (overlap mode)
                          OR when the fade-out starts (transition mode)
        fade_out_duration: Duration of fade out for audio1 (applied to the end)
        fade_in_duration: Duration of fade in for audio2 (applied to the beginning)
        mode: "overlap" or "transition"
              - "overlap": Track 2 starts entrance_duration before end, crossfade in last fade_out ms
              - "transition": Fade-out starts at entrance_duration, overlap = min(entrance, fade_out, fade_in)

    Returns:
        Mixed audio with proper crossfade
    """
    if mode == "transition":
        return _crossfade_transition_mode(audio1, audio2, entrance_duration, fade_out_duration, fade_in_duration)
    else:
        return _crossfade_overlap_mode(audio1, audio2, entrance_duration, fade_out_duration, fade_in_duration)

def _crossfade_transition_mode(audio1: AudioSegment, audio2: AudioSegment,
                                entrance_duration: int, fade_out_duration: int, fade_in_duration: int) -> AudioSegment:
    """
    Transition mode: T2 starts at entrance point, T1 fade-out starts at same time.

    Example: fade_out=20s, fade_in=15s, entrance=90s
    - T2 starts 90s before end of T1
    - T1 fade-out starts at same moment (90s before end)
    - Equal-power crossfade for first 15s (min of fade_out and fade_in)
    - T1 continues fading out for remaining 5s (with T2 at full volume)
    - After 20s total, T1 is silent, T2 continues for remaining 70s
    """
    logging.debug(f"\n   🔧 CROSSFADE DEBUG (Transition Mode):")
    logging.debug(f"      Audio1: {len(audio1)/1000:.1f}s, {audio1.frame_rate}Hz, {audio1.sample_width*8}bit, {audio1.channels}ch")
    logging.debug(f"      Audio2: {len(audio2)/1000:.1f}s, {audio2.frame_rate}Hz, {audio2.sample_width*8}bit, {audio2.channels}ch")
    logging.debug(f"      Entrance duration: {entrance_duration/1000:.1f}s ({entrance_duration}ms)")
    logging.debug(f"      Fade out duration: {fade_out_duration/1000:.1f}s ({fade_out_duration}ms)")
    logging.debug(f"      Fade in duration: {fade_in_duration/1000:.1f}s ({fade_in_duration}ms)")

    # CRITICAL: Normalize audio formats to match before crossfading
    # This prevents corruption from sample rate or bit depth mismatches
    if (audio1.frame_rate != audio2.frame_rate or
        audio1.sample_width != audio2.sample_width or
        audio1.channels != audio2.channels):
        logging.debug(f"      ⚠️  Format mismatch detected! Normalizing audio2 to match audio1...")

        # Set target format to match audio1
        target_frame_rate = audio1.frame_rate
        target_sample_width = audio1.sample_width
        target_channels = audio1.channels

        # Convert audio2 to match audio1's format
        if audio2.frame_rate != target_frame_rate:
            logging.debug(f"         Resampling audio2: {audio2.frame_rate}Hz → {target_frame_rate}Hz")
            audio2 = audio2.set_frame_rate(target_frame_rate)

        if audio2.sample_width != target_sample_width:
            logging.debug(f"         Converting audio2 bit depth: {audio2.sample_width*8}bit → {target_sample_width*8}bit")
            audio2 = audio2.set_sample_width(target_sample_width)

        if audio2.channels != target_channels:
            logging.debug(f"         Converting audio2 channels: {audio2.channels}ch → {target_channels}ch")
            if target_channels == 1:
                audio2 = audio2.set_channels(1)
            else:
                audio2 = audio2.set_channels(2)

        logging.debug(f"      ✓ Audio2 normalized to: {audio2.frame_rate}Hz, {audio2.sample_width*8}bit, {audio2.channels}ch")

    # Determine the appropriate dtype based on sample width (preserve bit depth)
    sample_width = audio1.sample_width
    if sample_width == 1:
        target_dtype = np.int8
    elif sample_width == 2:
        target_dtype = np.int16
    else:  # sample_width >= 3 (24-bit or 32-bit)
        target_dtype = np.int32

    # Calculate actual crossfade duration (where both are fading)
    crossfade_duration = min(fade_out_duration, fade_in_duration)
    logging.debug(f"      Crossfade duration: {crossfade_duration/1000:.1f}s ({crossfade_duration}ms)")

    # Split audio1
    part_before_fade = audio1[:-entrance_duration]
    fade_region_audio1 = audio1[-entrance_duration:]

    logging.debug(f"      Part before fade: {len(part_before_fade)/1000:.1f}s")
    logging.debug(f"      Fade region audio1: {len(fade_region_audio1)/1000:.1f}s")

    # Within the entrance region of audio1, we have:
    # 1. Crossfade part (where both are fading): crossfade_duration
    # 2. T1 continues fading alone: (fade_out_duration - crossfade_duration), if any
    # 3. T1 is silent: the rest

    crossfade_part_audio1 = fade_region_audio1[:crossfade_duration]
    logging.debug(f"      Crossfade part audio1: {len(crossfade_part_audio1)/1000:.1f}s")

    # If fade_out > crossfade_duration, T1 continues fading after crossfade
    if fade_out_duration > crossfade_duration:
        t1_solo_fade_duration = fade_out_duration - crossfade_duration
        t1_solo_fade = fade_region_audio1[crossfade_duration:crossfade_duration + t1_solo_fade_duration]

        # Apply continuation of fade-out (from where crossfade left off to silence)
        t1_solo_samples = np.array(t1_solo_fade.get_array_of_samples(), dtype=np.float32)
        # Continue the cosine fade from where it left off
        t_start = np.pi/2 * (crossfade_duration / fade_out_duration)
        t = np.linspace(t_start, np.pi/2, len(t1_solo_samples))
        fade_curve = np.cos(t)
        faded_samples = (t1_solo_samples * fade_curve).astype(target_dtype)
        t1_solo_faded = t1_solo_fade._spawn(faded_samples.tobytes())
    else:
        t1_solo_faded = AudioSegment.empty()

    # Split audio2
    crossfade_part_audio2 = audio2[:crossfade_duration]
    logging.debug(f"      Crossfade part audio2: {len(crossfade_part_audio2)/1000:.1f}s")

    # If fade_in < crossfade_duration, T2 reaches full volume before crossfade ends
    if fade_in_duration < crossfade_duration:
        t2_full_volume_start = fade_in_duration
        t2_full_during_crossfade = audio2[t2_full_volume_start:crossfade_duration]
    else:
        t2_full_during_crossfade = AudioSegment.empty()

    # Part after T1's fade-out completes
    part_after_t1_fade = audio2[fade_out_duration:]

    # Apply equal-power crossfade to the crossfade region
    fade_out_samples = np.array(crossfade_part_audio1.get_array_of_samples(), dtype=np.float32)
    fade_in_samples = np.array(crossfade_part_audio2.get_array_of_samples(), dtype=np.float32)

    logging.debug(f"      Fade out samples: {len(fade_out_samples)} samples")
    logging.debug(f"      Fade in samples: {len(fade_in_samples)} samples")
    # Check if we have actual audio data
    if len(fade_out_samples) > 0:
        logging.debug(f"      Audio1 sample range: min={np.min(fade_out_samples):.1f}, max={np.max(fade_out_samples):.1f}, mean={np.mean(np.abs(fade_out_samples)):.1f}")
    if len(fade_in_samples) > 0:
        logging.debug(f"      Audio2 sample range: min={np.min(fade_in_samples):.1f}, max={np.max(fade_in_samples):.1f}, mean={np.mean(np.abs(fade_in_samples)):.1f}")

    # Equal-power crossfade curves (over the actual fade durations)
    min_len = min(len(fade_out_samples), len(fade_in_samples))
    logging.debug(f"      Min length for crossfade: {min_len} samples ({min_len/audio1.frame_rate:.2f}s)")

    # For fade-out: use the first part of the cosine curve (0 to crossfade_duration/fade_out_duration * π/2)
    t_out = np.linspace(0, np.pi/2 * (crossfade_duration / fade_out_duration), min_len)
    fade_out_curve = np.cos(t_out)
    logging.debug(f"      Fade out curve: start={fade_out_curve[0]:.3f}, end={fade_out_curve[-1]:.3f}")

    # For fade-in: use the full sine curve if fade_in == crossfade, otherwise partial
    t_in = np.linspace(0, np.pi/2 * (crossfade_duration / fade_in_duration), min_len)
    fade_in_curve = np.sin(t_in)
    logging.debug(f"      Fade in curve: start={fade_in_curve[0]:.3f}, end={fade_in_curve[-1]:.3f}")

    # Apply curves and mix
    faded_out = fade_out_samples[:min_len] * fade_out_curve
    faded_in = fade_in_samples[:min_len] * fade_in_curve
    mixed_samples = (faded_out + faded_in).astype(target_dtype)

    logging.debug(f"      After applying fade curves:")
    logging.debug(f"        Faded out range: min={np.min(faded_out):.1f}, max={np.max(faded_out):.1f}, mean={np.mean(np.abs(faded_out)):.1f}")
    logging.debug(f"        Faded in range: min={np.min(faded_in):.1f}, max={np.max(faded_in):.1f}, mean={np.mean(np.abs(faded_in)):.1f}")
    logging.debug(f"        Mixed samples range: min={np.min(mixed_samples):.1f}, max={np.max(mixed_samples):.1f}, mean={np.mean(np.abs(mixed_samples)):.1f}")

    crossfaded = crossfade_part_audio1._spawn(mixed_samples.tobytes())

    # Build the result
    # Part before entrance + crossfade region + T1 solo fade + T2 full during crossfade + rest of T2
    result = part_before_fade + crossfaded

    # Add T1's solo fade-out (if any)
    if len(t1_solo_faded) > 0:
        # During this time, T2 might still be fading in or already at full volume
        t2_during_t1_solo = audio2[crossfade_duration:fade_out_duration]

        # Get the raw (already faded) samples from T1
        t1_faded_samples = np.array(t1_solo_faded.get_array_of_samples(), dtype=np.float32)
        # Get samples from T2
        t2_samples = np.array(t2_during_t1_solo.get_array_of_samples(), dtype=np.float32)

        # Check if T2 is still fading in during this region
        if fade_in_duration > crossfade_duration:
            # T2 continues fading in during T1's solo fade
            remaining_fade_in_duration = fade_in_duration - crossfade_duration
            fade_in_region_length = min(remaining_fade_in_duration, len(t2_during_t1_solo))

            # Apply continuation of fade-in curve to T2
            if fade_in_region_length > 0 and len(t2_samples) > 0:
                # Continue the sine curve from where crossfade left off
                t_in_start = np.pi/2 * (crossfade_duration / fade_in_duration)
                fade_in_samples = t2_samples[:int(fade_in_region_length * len(t2_samples) / len(t2_during_t1_solo))]

                if len(fade_in_samples) > 0:
                    t_in = np.linspace(t_in_start, np.pi/2, len(fade_in_samples))
                    fade_in_curve = np.sin(t_in)
                    fade_in_samples = fade_in_samples * fade_in_curve

                    # Rest of T2 at full volume (if any)
                    full_volume_samples = t2_samples[len(fade_in_samples):]
                    t2_samples = np.concatenate([fade_in_samples, full_volume_samples])

        # Ensure both arrays have the same length
        min_len = min(len(t1_faded_samples), len(t2_samples))
        if min_len > 0:
            # Mix faded T1 with T2 (which may be fading in or at full volume)
            mixed = (t1_faded_samples[:min_len] + t2_samples[:min_len]).astype(target_dtype)
            result = result + t1_solo_faded._spawn(mixed.tobytes())

            # If t2 is longer, append the remaining part
            if len(t2_samples) > min_len:
                remaining_samples = t2_samples[min_len:].astype(target_dtype)
                remaining_audio = t2_during_t1_solo._spawn(remaining_samples.tobytes())
                result = result + remaining_audio
    elif len(t2_full_during_crossfade) > 0:
        # T2 reached full volume before crossfade ended
        result = result + t2_full_during_crossfade

    # Add the rest of T2 after T1's fade-out completes
    result = result + part_after_t1_fade

    return result

def _crossfade_overlap_mode(audio1: AudioSegment, audio2: AudioSegment,
                             entrance_duration: int, fade_out_duration: int, fade_in_duration: int) -> AudioSegment:
    """
    Overlap mode: Entrance marks when track 2 starts.
    Full entrance_duration overlap with crossfade in the fade regions.
    """
    # CRITICAL: Normalize audio formats to match before crossfading
    # This prevents corruption from sample rate or bit depth mismatches
    if (audio1.frame_rate != audio2.frame_rate or
        audio1.sample_width != audio2.sample_width or
        audio1.channels != audio2.channels):
        logging.debug(f"      ⚠️  Format mismatch in overlap mode! Normalizing audio2 to match audio1...")

        # Set target format to match audio1
        target_frame_rate = audio1.frame_rate
        target_sample_width = audio1.sample_width
        target_channels = audio1.channels

        # Convert audio2 to match audio1's format
        if audio2.frame_rate != target_frame_rate:
            logging.debug(f"         Resampling audio2: {audio2.frame_rate}Hz → {target_frame_rate}Hz")
            audio2 = audio2.set_frame_rate(target_frame_rate)

        if audio2.sample_width != target_sample_width:
            logging.debug(f"         Converting audio2 bit depth: {audio2.sample_width*8}bit → {target_sample_width*8}bit")
            audio2 = audio2.set_sample_width(target_sample_width)

        if audio2.channels != target_channels:
            logging.debug(f"         Converting audio2 channels: {audio2.channels}ch → {target_channels}ch")
            if target_channels == 1:
                audio2 = audio2.set_channels(1)
            else:
                audio2 = audio2.set_channels(2)

        logging.debug(f"      ✓ Audio2 normalized to: {audio2.frame_rate}Hz, {audio2.sample_width*8}bit, {audio2.channels}ch")

    # Determine the appropriate dtype based on sample width (preserve bit depth)
    sample_width = audio1.sample_width
    if sample_width == 1:
        target_dtype = np.int8
    elif sample_width == 2:
        target_dtype = np.int16
    else:  # sample_width >= 3 (24-bit or 32-bit)
        target_dtype = np.int32

    # Split audio1: everything before overlap + overlap region
    part_before_overlap = audio1[:-entrance_duration]
    overlap_from_audio1 = audio1[-entrance_duration:]

    # Split audio2: overlap region + everything after overlap
    overlap_from_audio2 = audio2[:entrance_duration]
    part_after_overlap = audio2[entrance_duration:]

    # Further split the overlap regions for fading
    # audio1: non-faded part + fade-out part
    if fade_out_duration < entrance_duration:
        non_faded_part1 = overlap_from_audio1[:-fade_out_duration]
        fade_out_part = overlap_from_audio1[-fade_out_duration:]
    else:
        non_faded_part1 = AudioSegment.empty()
        fade_out_part = overlap_from_audio1

    # audio2: fade-in part + non-faded part
    if fade_in_duration < entrance_duration:
        fade_in_part = overlap_from_audio2[:fade_in_duration]
        non_faded_part2 = overlap_from_audio2[fade_in_duration:]
    else:
        fade_in_part = overlap_from_audio2
        non_faded_part2 = AudioSegment.empty()

    # Apply exponential fades to the fade regions using equal-power crossfade
    fade_out_samples = np.array(fade_out_part.get_array_of_samples(), dtype=np.float32)
    fade_in_samples = np.array(fade_in_part.get_array_of_samples(), dtype=np.float32)

    # Use equal-power crossfade curves (sine/cosine) for smooth volume transition
    # This maintains constant perceived loudness throughout the crossfade
    overlap_duration = min(len(fade_out_samples), len(fade_in_samples))

    if overlap_duration > 0:
        # Equal-power crossfade: use cosine for fade out, sine for fade in
        t = np.linspace(0, np.pi/2, overlap_duration)
        fade_out_curve = np.cos(t)  # Goes from 1 to 0
        fade_in_curve = np.sin(t)   # Goes from 0 to 1

        # Apply curves to the overlapping portion
        faded_out = fade_out_samples[:overlap_duration] * fade_out_curve
        faded_in = fade_in_samples[:overlap_duration] * fade_in_curve

        # Mix the faded portions
        mixed_fade_samples = (faded_out + faded_in).astype(target_dtype)
        mixed_fade = fade_out_part._spawn(mixed_fade_samples.tobytes())

        # Handle any remaining parts (these shouldn't mix, just append)
        if len(fade_out_samples) > overlap_duration:
            fade_out_remainder = fade_out_part._spawn(fade_out_samples[overlap_duration:].astype(target_dtype).tobytes())
            mixed_fade = mixed_fade + fade_out_remainder
        elif len(fade_in_samples) > overlap_duration:
            fade_in_remainder = fade_in_part._spawn(fade_in_samples[overlap_duration:].astype(target_dtype).tobytes())
            mixed_fade = mixed_fade + fade_in_remainder
    else:
        mixed_fade = AudioSegment.empty()

    # Build the overlap region by overlaying (mixing) the non-faded parts
    overlap_region = AudioSegment.empty()

    # Mix non_faded_part1 with non_faded_part2 using equal volume (50/50 mix)
    if len(non_faded_part1) > 0 and len(non_faded_part2) > 0:
        samples1 = np.array(non_faded_part1.get_array_of_samples(), dtype=np.float32)
        samples2 = np.array(non_faded_part2.get_array_of_samples(), dtype=np.float32)
        # Mix at 50/50 for the non-faded overlap region
        mixed_samples = ((samples1 * 0.5) + (samples2 * 0.5)).astype(target_dtype)
        overlap_region = non_faded_part1._spawn(mixed_samples.tobytes())
    elif len(non_faded_part1) > 0:
        overlap_region = non_faded_part1
    elif len(non_faded_part2) > 0:
        overlap_region = non_faded_part2

    # Add the crossfaded portion
    if len(mixed_fade) > 0:
        overlap_region = overlap_region + mixed_fade

    # Build final mix: part_before_overlap + overlap_region + part_after_overlap
    result = part_before_overlap + overlap_region + part_after_overlap

    return result

def mix_audio_segments(audio_segments, mixing_mode="transition"):
    if not audio_segments:
        logging.error("\n✗ ERROR: No audio files could be loaded")
        return None

    logging.info(f"\n✓ Loaded {len(audio_segments)} files successfully")
    logging.info("\n" + "=" * 60)
    logging.info("MIXING AUDIO")
    logging.info("=" * 60)

    mixed_audio = audio_segments[0][1]
    logging.info(f"Starting with: {audio_segments[0][0]}")

    # Track crossfade positions for final summary
    crossfade_positions = []
    # Track the absolute timeline position in the final mix
    # This accounts for overlaps from crossfades
    absolute_timeline_position = 0

    for i in range(1, len(audio_segments)):
        # Get parameters from the segments
        curr_name, _, curr_fade_out, _, curr_exit, _, curr_track_length = audio_segments[i - 1]
        next_name, next_audio, _, next_fade_in, _, next_entrance, _ = audio_segments[i]

        logging.info(f"\n→ Mixing: {curr_name} → {next_name}")
        logging.debug(f"   Current mix length: {len(mixed_audio)/1000:.1f}s ({len(mixed_audio)}ms)")
        logging.debug(f"   Absolute timeline position: {absolute_timeline_position/1000:.1f}s ({absolute_timeline_position}ms)")
        logging.debug(f"   Original track length: {curr_track_length/1000:.1f}s ({curr_track_length}ms)")
        logging.debug(f"   Exit (from end): {curr_exit/1000:.1f}s ({curr_exit}ms)")

        # Calculate exit_absolute using the ORIGINAL track length, not the current mix length
        exit_absolute_from_track_start = curr_track_length - curr_exit
        logging.debug(f"   Exit (from track start): {exit_absolute_from_track_start/1000:.1f}s ({exit_absolute_from_track_start}ms)")

        # Calculate the absolute position in the FINAL MIX where this track should exit
        exit_absolute_in_mix = absolute_timeline_position + exit_absolute_from_track_start
        logging.debug(f"   Exit (absolute in final mix): {exit_absolute_in_mix/1000:.1f}s ({exit_absolute_in_mix}ms)")
        logging.debug(f"   Fade out: {curr_fade_out/1000:.1f}s | Fade in: {next_fade_in/1000:.1f}s | Next entrance: {next_entrance/1000:.1f}s")
        logging.debug(f"   Mode: {mixing_mode}")

        if curr_exit > curr_track_length:
            logging.error(f"   ✗ ERROR: Exit point ({curr_exit}ms from end) is longer than original track length ({curr_track_length}ms). Skipping.")
            continue

        # Exit point is where fade-out STARTS
        # Trim to: exit_point + fade_out_duration (to keep the fade region)
        # Calculate trim position in the FINAL MIX timeline
        trim_to_in_mix = exit_absolute_in_mix + curr_fade_out

        if trim_to_in_mix < len(mixed_audio):
            trim_amount = len(mixed_audio) - trim_to_in_mix
            original_length = len(mixed_audio)
            mixed_audio = mixed_audio[:trim_to_in_mix]
            logging.debug(f"   ✂️  Trimming mix to exit + fade duration")
            logging.debug(f"   → Exit (fade starts) in final mix: {exit_absolute_in_mix/1000:.1f}s ({exit_absolute_in_mix}ms)")
            logging.debug(f"   → Fade duration: {curr_fade_out/1000:.1f}s ({curr_fade_out}ms)")
            logging.debug(f"   → Trim to (in final mix): {trim_to_in_mix/1000:.1f}s ({trim_to_in_mix}ms)")
            logging.debug(f"   → Trimming last {trim_amount/1000:.1f}s ({trim_amount}ms)")
            logging.debug(f"   → Original: {original_length/1000:.1f}s → New: {len(mixed_audio)/1000:.1f}s")

        # Skip ahead in next_audio if entrance > 0
        if next_entrance > 0 and next_entrance < len(next_audio):
            next_audio = next_audio[next_entrance:]
            logging.debug(f"   → Skipping first {next_entrance}ms of '{next_name}'")

        # Use fade_out duration as entrance_duration
        # This makes next track start fade_out ms before the end (at the exit point)
        entrance_duration = min(curr_fade_out, len(mixed_audio))

        # Calculate crossfade position in the final mix
        # The crossfade occurs entrance_duration before the end of the current accumulated mix
        crossfade_start_in_mix = len(mixed_audio) - entrance_duration
        crossfade_end_in_mix = len(mixed_audio)

        logging.debug(f"   → Next track will start {entrance_duration/1000:.1f}s ({entrance_duration}ms) before end")
        logging.debug(f"   → Crossfade region in final mix: {crossfade_start_in_mix/1000:.1f}s to {crossfade_end_in_mix/1000:.1f}s")
        logging.debug(f"   → Current track region for fade: {len(mixed_audio)-entrance_duration}ms to {len(mixed_audio)}ms")
        logging.debug(f"   → Next track region for fade: 0ms to {entrance_duration}ms")
        logging.debug(f"   → Current track length before crossfade: {len(mixed_audio)/1000:.1f}s")
        logging.debug(f"   → Next track length before crossfade: {len(next_audio)/1000:.1f}s")

        # Store crossfade position info
        crossfade_positions.append({
            'track1': curr_name,
            'track2': next_name,
            'start_ms': crossfade_start_in_mix,
            'end_ms': crossfade_end_in_mix,
            'duration_ms': entrance_duration
        })

        # Use simple_crossfade to properly mix the tracks
        mixed_audio = simple_crossfade(
            mixed_audio,
            next_audio,
            entrance_duration=entrance_duration,
            fade_out_duration=curr_fade_out,
            fade_in_duration=next_fade_in,
            mode=mixing_mode
        )

        logging.debug(f"   → Result length after crossfade: {len(mixed_audio)/1000:.1f}s")

        # Update absolute timeline position for the NEXT track
        # The next track starts where this crossfade started (where it entered)
        absolute_timeline_position = crossfade_start_in_mix

        logging.debug(f"   → Mix complete at {len(mixed_audio)/1000:.2f}s total")
        logging.debug(f"   → Next track will start at absolute position: {absolute_timeline_position/1000:.1f}s")

    # Print summary of all crossfade positions
    if crossfade_positions:
        logging.info("\n" + "=" * 60)
        logging.info("CROSSFADE POSITIONS IN FINAL MIX")
        logging.info("=" * 60)
        for idx, cf in enumerate(crossfade_positions, 1):
            start_time = cf['start_ms'] / 1000
            end_time = cf['end_ms'] / 1000
            duration = cf['duration_ms'] / 1000

            # Format as MM:SS
            start_mm = int(start_time // 60)
            start_ss = int(start_time % 60)
            end_mm = int(end_time // 60)
            end_ss = int(end_time % 60)

            logging.info(f"\nCrossfade {idx}: {cf['track1']} → {cf['track2']}")
            logging.info(f"  Position: {start_mm}:{start_ss:02d} - {end_mm}:{end_ss:02d} ({duration:.1f}s duration)")
            logging.info(f"  Exact: {start_time:.2f}s - {end_time:.2f}s")

    return mixed_audio

def export_mix(mixed_audio, output_path, output_format):
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
        logging.info(f"\nCreated output directory: {output_dir}")
    logging.info(f"\nExporting to: {output_path}")

    # Prepare high-quality export parameters based on format and bit depth
    parameters = []

    if output_format == "wav":
        # Determine bit depth from sample width and use appropriate codec
        sample_width = mixed_audio.sample_width
        if sample_width == 4:  # 32-bit
            parameters = ["-acodec", "pcm_s32le"]
            logging.debug(f"  → Exporting as 32-bit WAV")
        elif sample_width == 3:  # 24-bit
            parameters = ["-acodec", "pcm_s24le"]
            logging.debug(f"  → Exporting as 24-bit WAV")
        elif sample_width == 2:  # 16-bit
            parameters = ["-acodec", "pcm_s16le"]
            logging.debug(f"  → Exporting as 16-bit WAV")
        else:  # 8-bit
            parameters = ["-acodec", "pcm_u8"]
            logging.debug(f"  → Exporting as 8-bit WAV")

        # Preserve sample rate and channels
        parameters.extend([
            "-ar", str(mixed_audio.frame_rate),
            "-ac", str(mixed_audio.channels)
        ])
        logging.debug(f"  → Sample rate: {mixed_audio.frame_rate} Hz")
        logging.debug(f"  → Channels: {mixed_audio.channels}")
    elif output_format == "flac":
        # Maximum lossless compression for FLAC
        parameters = [
            "-compression_level", "8",
            "-ar", str(mixed_audio.frame_rate)
        ]
        logging.debug(f"  → Exporting as FLAC (lossless, max compression)")

    mixed_audio.export(output_path, format=output_format, parameters=parameters)
    logging.info(f"✓ Export complete!")
    logging.info(f"Final duration: {len(mixed_audio) / 1000:.2f} seconds")

def mix_from_list(folder_path, entries, output_path, default_fadeIn=5000, default_fadeOut=5000, default_entrance=5000, default_exit=5000, mixing_mode="transition"):
    logging.info("=" * 60)
    logging.info("MIXING FROM FILE LIST")
    logging.info("=" * 60)
    logging.info(f"Folder path: '{folder_path}'")
    logging.info(f"Output path: '{output_path}'")
    logging.debug(f"Default fade in: {default_fadeIn}ms")
    logging.debug(f"Default fade out: {default_fadeOut}ms")
    logging.debug(f"Default entrance: {default_entrance}ms")
    logging.debug(f"Default exit: {default_exit}ms")
    logging.info(f"Mixing mode: {mixing_mode}")

    audio_segments = []

    for entry in entries:
        filename = entry.get("name")
        fade_out = int(entry.get("fadeOut", default_fadeOut))
        fade_in = int(entry.get("fadeIn", default_fadeIn))
        exit_point = int(entry.get("exit", default_exit))
        entrance = int(entry.get("entrance", default_entrance))
        track_length = entry.get("trackLength")  # Get original track length

        file_path = os.path.join(folder_path, filename)

        logging.info(f"\nLoading '{filename}' → {file_path}")
        audio = load_audio_file(file_path)
        if audio:
            # If trackLength wasn't provided, use the loaded audio's length
            if track_length is None:
                track_length = len(audio)
            else:
                track_length = int(track_length)
            audio_segments.append((filename, audio, fade_out, fade_in, exit_point, entrance, track_length))
            logging.info(f"  ✓ Added '{filename}' to mix queue (length: {track_length}ms)")
        else:
            logging.error(f"  ✗ Failed to load '{filename}'")

    if not audio_segments:
        logging.error("✗ No valid audio files found. Exiting.")
        return

    # Always use WAV format for high-quality lossless output
    output_format = "wav"
    output_path = f"{output_path}.{output_format}"
    logging.info(f"\n✓ Output format: WAV (high-quality lossless)")

    mixed_audio = mix_audio_segments(audio_segments, mixing_mode=mixing_mode)
    if mixed_audio:
        # mixed_audio = normalize_audio(mixed_audio, target_dBFS=-1.0)
        export_mix(mixed_audio, output_path, output_format)

if __name__ == "__main__":
    folder = sys.argv[1]
    outFolder = sys.argv[2]
    entries_json = sys.argv[3]
    default_fadeIn = int(sys.argv[4])
    default_fadeOut = int(sys.argv[5])
    default_entrance = int(sys.argv[6])
    default_exit = int(sys.argv[7])
    mixing_mode = sys.argv[8] if len(sys.argv) > 8 else "transition"
    entries = json.loads(entries_json)
    folder_name = os.path.basename(os.path.normpath(folder))
    if not outFolder or not os.path.isdir(outFolder):
        outFolder = folder
    output_file = os.path.join(outFolder, f"{folder_name}_mix")
    
    mix_from_list(folder, entries, output_file,
                  default_fadeIn=default_fadeIn,
                  default_fadeOut=default_fadeOut,
                  default_entrance=default_entrance,
                  default_exit=default_exit,
                  mixing_mode=mixing_mode)