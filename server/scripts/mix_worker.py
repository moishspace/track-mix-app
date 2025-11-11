import os
import csv
from pydub import AudioSegment
print("Pydub is available!")
import sys
import json
from collections import Counter
import numpy as np

def load_audio_file(file_path):
    """
    Load an audio file from any supported format
    """
    print(f"\n  DEBUG: Attempting to load:")
    print(f"    Raw path: '{file_path}'")
    print(f"    Exists: {os.path.exists(file_path)}")
    if not os.path.exists(file_path):
        print(f"    ✗ File not found")
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
        print(f"    ✓ Loaded successfully - {len(audio)/1000:.2f} seconds")
        return audio
    except Exception as e:
        print(f"    ✗ Load failed: {e}")
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

    if len(samples_out) > 0:
        t_out = np.linspace(0, np.pi/2, len(samples_out))
        curve_out = np.cos(t_out)
        samples_out *= curve_out

    if len(samples_in) > 0:
        t_in = np.linspace(0, np.pi/2, len(samples_in))
        curve_in = np.sin(t_in)
        samples_in *= curve_in

    if fade_out_duration == fade_in_duration:
        mixed = (samples_out + samples_in).astype(np.int16)
        return fade_out_part._spawn(mixed.tobytes())
    elif fade_out_duration > fade_in_duration:
        pre_overlap = samples_out[:-len(samples_in)]
        overlap = samples_out[-len(samples_in):] + samples_in
        mixed = np.concatenate([pre_overlap, overlap]).astype(np.int16)
        return fade_out_part._spawn(mixed.tobytes())
    else:
        overlap = samples_out + samples_in[:len(samples_out)]
        post_overlap = samples_in[len(samples_out):]
        mixed = np.concatenate([overlap, post_overlap]).astype(np.int16)
        result_segment = fade_out_part._spawn(mixed[:len(samples_out)].tobytes())
        if len(post_overlap) > 0:
            post_segment = fade_in_part._spawn(post_overlap.tobytes())
            result_segment = result_segment + post_segment
        return result_segment

def apply_exponential_fade(fade_out_part, fade_in_part, fade_out_duration, fade_in_duration):
    samples_out = np.array(fade_out_part.get_array_of_samples(), dtype=np.float32)
    samples_in = np.array(fade_in_part.get_array_of_samples(), dtype=np.float32)

    if len(samples_out) > 0:
        t_out = np.linspace(0, 5, len(samples_out))
        curve_out = np.exp(-t_out)
        samples_out *= curve_out

    if len(samples_in) > 0:
        t_in = np.linspace(-5, 0, len(samples_in))
        curve_in = np.exp(t_in)
        samples_in *= curve_in

    if fade_out_duration == fade_in_duration:
        mixed = (samples_out + samples_in).astype(np.int16)
        return fade_out_part._spawn(mixed.tobytes())
    elif fade_out_duration > fade_in_duration:
        pre_overlap = samples_out[:-len(samples_in)]
        overlap = samples_out[-len(samples_in):] + samples_in
        mixed = np.concatenate([pre_overlap, overlap]).astype(np.int16)
        return fade_out_part._spawn(mixed.tobytes())
    else:
        overlap = samples_out + samples_in[:len(samples_out)]
        post_overlap = samples_in[len(samples_out):]
        mixed = np.concatenate([overlap, post_overlap]).astype(np.int16)
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
    # Calculate actual crossfade duration (where both are fading)
    crossfade_duration = min(fade_out_duration, fade_in_duration)

    # Split audio1
    part_before_fade = audio1[:-entrance_duration]
    fade_region_audio1 = audio1[-entrance_duration:]

    # Within the entrance region of audio1, we have:
    # 1. Crossfade part (where both are fading): crossfade_duration
    # 2. T1 continues fading alone: (fade_out_duration - crossfade_duration), if any
    # 3. T1 is silent: the rest

    crossfade_part_audio1 = fade_region_audio1[:crossfade_duration]

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
        faded_samples = (t1_solo_samples * fade_curve).astype(np.int16)
        t1_solo_faded = t1_solo_fade._spawn(faded_samples.tobytes())
    else:
        t1_solo_faded = AudioSegment.empty()

    # Split audio2
    crossfade_part_audio2 = audio2[:crossfade_duration]

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

    # Equal-power crossfade curves (over the actual fade durations)
    min_len = min(len(fade_out_samples), len(fade_in_samples))

    # For fade-out: use the first part of the cosine curve (0 to crossfade_duration/fade_out_duration * π/2)
    t_out = np.linspace(0, np.pi/2 * (crossfade_duration / fade_out_duration), min_len)
    fade_out_curve = np.cos(t_out)

    # For fade-in: use the full sine curve if fade_in == crossfade, otherwise partial
    t_in = np.linspace(0, np.pi/2 * (crossfade_duration / fade_in_duration), min_len)
    fade_in_curve = np.sin(t_in)

    # Apply curves and mix
    faded_out = fade_out_samples[:min_len] * fade_out_curve
    faded_in = fade_in_samples[:min_len] * fade_in_curve
    mixed_samples = (faded_out + faded_in).astype(np.int16)
    crossfaded = crossfade_part_audio1._spawn(mixed_samples.tobytes())

    # Build the result
    # Part before entrance + crossfade region + T1 solo fade + T2 full during crossfade + rest of T2
    result = part_before_fade + crossfaded

    # Add T1's solo fade-out (if any)
    if len(t1_solo_faded) > 0:
        # During this time, T2 is at full volume, so we need to mix them
        t2_during_t1_solo = audio2[crossfade_duration:fade_out_duration]
        t1_samples = np.array(t1_solo_faded.get_array_of_samples(), dtype=np.float32)
        t2_samples = np.array(t2_during_t1_solo.get_array_of_samples(), dtype=np.float32)

        # Ensure both arrays have the same length by taking the minimum
        min_len = min(len(t1_samples), len(t2_samples))
        if min_len > 0:
            mixed = (t1_samples[:min_len] + t2_samples[:min_len]).astype(np.int16)
            result = result + t1_solo_faded._spawn(mixed.tobytes())

            # If t2 is longer, append the remaining part
            if len(t2_samples) > min_len:
                remaining_samples = t2_samples[min_len:].astype(np.int16)
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
        mixed_fade_samples = (faded_out + faded_in).astype(np.int16)
        mixed_fade = fade_out_part._spawn(mixed_fade_samples.tobytes())

        # Handle any remaining parts (these shouldn't mix, just append)
        if len(fade_out_samples) > overlap_duration:
            fade_out_remainder = fade_out_part._spawn(fade_out_samples[overlap_duration:].astype(np.int16).tobytes())
            mixed_fade = mixed_fade + fade_out_remainder
        elif len(fade_in_samples) > overlap_duration:
            fade_in_remainder = fade_in_part._spawn(fade_in_samples[overlap_duration:].astype(np.int16).tobytes())
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
        mixed_samples = ((samples1 * 0.5) + (samples2 * 0.5)).astype(np.int16)
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
        print("\n✗ ERROR: No audio files could be loaded")
        return None

    print(f"\n✓ Loaded {len(audio_segments)} files successfully")
    print("\n" + "=" * 60)
    print("MIXING AUDIO")
    print("=" * 60)

    mixed_audio = audio_segments[0][1]
    print(f"Starting with: {audio_segments[0][0]}")

    for i in range(1, len(audio_segments)):
        # Get parameters from the segments
        curr_name, _, curr_fade_out, _, curr_entrance = audio_segments[i - 1]
        next_name, next_audio, _, next_fade_in, _ = audio_segments[i]

        print(f"\n→ Mixing: {curr_name} → {next_name}")
        print(f"   Fade out: {curr_fade_out}ms | Fade in: {next_fade_in}ms | Entrance: {curr_entrance}ms")
        print(f"   Mode: {mixing_mode}")

        if curr_entrance > len(mixed_audio):
            print(f"   ✗ ERROR: Entrance point ({curr_entrance}ms) is longer than accumulated mix length. Skipping.")
            continue

        # Use simple_crossfade to properly mix the tracks
        mixed_audio = simple_crossfade(
            mixed_audio,
            next_audio,
            entrance_duration=curr_entrance,
            fade_out_duration=curr_fade_out,
            fade_in_duration=next_fade_in,
            mode=mixing_mode
        )

        print(f"   → Mix complete at {len(mixed_audio)/1000:.2f}s total")

    return mixed_audio

def export_mix(mixed_audio, output_path, output_format):
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"\nCreated output directory: {output_dir}")
    print(f"\nExporting to: {output_path}")
    mixed_audio.export(output_path, format=output_format)
    print(f"✓ Export complete!")
    print(f"Final duration: {len(mixed_audio) / 1000:.2f} seconds")

def mix_from_list(folder_path, entries, output_path, default_fadeIn=5000, default_fadeOut=5000, default_entrance=5000, mixing_mode="transition"):
    print("=" * 60)
    print("MIXING FROM FILE LIST")
    print("=" * 60)
    print(f"Folder path: '{folder_path}'")
    print(f"Output path: '{output_path}'")
    print(f"Default fade in: {default_fadeIn}ms")
    print(f"Default fade out: {default_fadeOut}ms")
    print(f"Default entrance: {default_entrance}ms")
    print(f"Mixing mode: {mixing_mode}")

    audio_segments = []
    format_counts = Counter()

    for entry in entries:
        filename = entry.get("name")
        fade_out = int(entry.get("fadeOut", default_fadeOut))
        fade_in = int(entry.get("fadeIn", default_fadeIn))
        entrance = int(entry.get("entrance", default_entrance))

        file_path = os.path.join(folder_path, filename)
        ext = os.path.splitext(filename)[1].lower().lstrip(".")
        format_counts[ext] += 1

        print(f"\nLoading '{filename}' → {file_path}")
        audio = load_audio_file(file_path)
        if audio:
            audio_segments.append((filename, audio, fade_out, fade_in, entrance))
            print(f"  ✓ Added '{filename}' to mix queue")
        else:
            print(f"  ✗ Failed to load '{filename}'")

    if not audio_segments:
        print("✗ No valid audio files found. Exiting.")
        return

    most_common_format = format_counts.most_common(1)[0][0] if format_counts else "wav"
    output_path = f"{output_path}.{most_common_format}"

    mixed_audio = mix_audio_segments(audio_segments, mixing_mode=mixing_mode)
    if mixed_audio:
        # mixed_audio = normalize_audio(mixed_audio, target_dBFS=-1.0)
        export_mix(mixed_audio, output_path, most_common_format)

if __name__ == "__main__":
    folder = sys.argv[1]
    outFolder = sys.argv[2]
    entries_json = sys.argv[3]
    default_fadeIn = int(sys.argv[4])
    default_fadeOut = int(sys.argv[5])
    default_entrance = int(sys.argv[6])
    mixing_mode = sys.argv[7] if len(sys.argv) > 7 else "transition"
    entries = json.loads(entries_json)
    folder_name = os.path.basename(os.path.normpath(folder))
    if not outFolder or not os.path.isdir(outFolder):
        outFolder = folder
    output_file = os.path.join(outFolder, f"{folder_name}_mix")
    
    mix_from_list(folder, entries, output_file,
                  default_fadeIn=default_fadeIn,
                  default_fadeOut=default_fadeOut,
                  default_entrance=default_entrance,
                  mixing_mode=mixing_mode)