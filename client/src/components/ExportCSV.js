// src/components/ExportCSV.js

const ExportCSV = (tracks) => {
    if (!tracks || tracks.length === 0) {
      alert("No data available to export.");
      return;
    }
  
    const csvContent = tracks.map((track) => ({
      Name: track.name || 'Unknown',
      Artist: track.artistsName || 'Unknown',
      Album: track.albumName || 'Unknown',
      ReleaseDate: track.releaseDate || 'Unknown',
      Duration: track.duration || 'N/A',
      Tempo: track.tempo || '',
      Key: track.key || '',
      Danceability: track.danceability || '',
      Energy: track.energy || '',
      Valence: track.valence || '',
      Acousticness: track.acousticness || '',
      Instrumentalness: track.instrumentalness || '',
      Liveness: track.liveness || '',
      Genre: track.genre || '',
      SpotifyLink: `https://open.spotify.com/track/${track.id}`,
    }));
  
    const csvRows = [
      Object.keys(csvContent[0]).join(','), // Header row
      ...csvContent.map(row =>
        Object.values(row).map(value => `"${value}"`).join(',')
      )
    ].join('\n');
  
    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'tracks.csv');
    a.click();
  };
  
  export default ExportCSV;