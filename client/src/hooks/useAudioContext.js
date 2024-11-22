let audioContextRef = null;
let analyserNodeRef = null;

export const initializeAudioContext = (spotifyPlayerInstance) => {
  if (analyserNodeRef) {
    console.log('Using existing AnalyserNode.');
    return analyserNodeRef;
  }

  console.log('Initializing Audio Context...');
  try {
    // Get the internal audio context from the Spotify Player
    if (!audioContextRef) {
      audioContextRef = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Spotify.Player exposes `getAudioNode` for raw audio output
    const spotifyAudioNode = spotifyPlayerInstance._options.audioElement;

    if (spotifyAudioNode) {
      const source = audioContextRef.createMediaElementSource(spotifyAudioNode);
      analyserNodeRef = audioContextRef.createAnalyser();

      // Configure analyser node
      analyserNodeRef.fftSize = 2048;
      analyserNodeRef.smoothingTimeConstant = 0.8;

      // Connect the graph: source -> analyser -> destination
      source.connect(analyserNodeRef);
      analyserNodeRef.connect(audioContextRef.destination);

      console.log('AnalyserNode successfully connected to Spotify.Player audio source.');
    } else {
      console.error('Spotify Player audio element is not accessible.');
      return null;
    }

    // Resume the AudioContext if suspended
    if (audioContextRef.state === 'suspended') {
      audioContextRef.resume().then(() => console.log('AudioContext resumed.'));
    }

    return analyserNodeRef;
  } catch (error) {
    console.error('Failed to initialize AudioContext:', error);
    return null;
  }
};