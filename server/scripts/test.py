import librosa

# Example audio file (librosa's built-in example)
audio_path = librosa.example('trumpet')

# Load the audio
y, sr = librosa.load(audio_path)

# Calculate tempo
tempo, _ = librosa.beat.beat_track(y=y, sr=sr)

print(f"Audio file loaded successfully. Tempo: {tempo}")