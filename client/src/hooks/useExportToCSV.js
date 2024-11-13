// hooks/useExportToCSV.js

const useExportToCSV = (tracks) => {
    const exportToCSV = () => {
      // Check if there are any tracks to export
      if (!tracks || tracks.length === 0) {
        alert("No data available to export.");
        return;
      }
  
      // Create CSV content with headers and rows
      const headers = [
        'Name',
        'Artist',
        'Album',
        'ReleaseDate',
        'Duration',
        'Tempo',
        'Key',
        'Danceability',
        'Energy',
        'Valence',
        'Acousticness',
        'Instrumentalness',
        'Liveness',
        'Genre',
        'SpotifyLink',
      ];
  
      const csvContent = tracks.map((track) => ({
        Name: track.name || 'Unknown',
        Artist: track.artists?.[0]?.name || 'Unknown',
        Album: track.album?.name || 'Unknown',
        ReleaseDate: track.album?.release_date || 'Unknown',
        Duration: track.duration_ms
          ? `${Math.floor(track.duration_ms / 60000)}:${String(
              Math.floor((track.duration_ms % 60000) / 1000)
            ).padStart(2, '0')}`
          : 'N/A',
        Tempo: track.tempo || '',
        Key: track.key || '',
        Danceability: track.danceability || '',
        Energy: track.energy || '',
        Valence: track.valence || '',
        Acousticness: track.acousticness || '',
        Instrumentalness: track.instrumentalness || '',
        Liveness: track.liveness || '',
        Genre: track.genres?.join(', ') || '',
        SpotifyLink: `https://open.spotify.com/track/${track.id}`,
      }));
  
      // Prepare the CSV rows
      const csvRows = [
        headers.join(','), // Header row
        ...csvContent.map((row) =>
          headers.map((header) => `"${row[header]}"`).join(',')
        ),
      ].join('\n');
  
      // Create a Blob from the CSV content
      const blob = new Blob([csvRows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
  
      // Create a temporary link element for downloading
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', 'tracks.csv');
      a.click();
  
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    };
  
    return exportToCSV;
  };
  
  export default useExportToCSV;