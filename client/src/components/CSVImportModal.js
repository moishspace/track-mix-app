import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  LinearProgress,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Select,
  MenuItem
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import useCSVImport from '../hooks/useCSVImport';

const CSVImportModal = ({ open, onClose, onSuccess, playlists = [] }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importMode, setImportMode] = useState('new'); // 'new' or 'existing'
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [isPublic, setIsPublic] = useState(false); // Public/Private toggle
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef(null);

  const { importFromCSV, isProcessing, progress, results, reset } = useCSVImport();

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      // Auto-generate playlist name from filename if empty
      const defaultName = file.name.replace('.csv', '');
      if (!playlistName) {
        setPlaylistName(defaultName);
      }
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      // Auto-generate playlist name from filename if empty
      const defaultName = file.name.replace('.csv', '');
      if (!playlistName) {
        setPlaylistName(defaultName);
      }
    } else {
      alert('Please drop a valid CSV file');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert('Please select a CSV file');
      return;
    }

    // Validate based on import mode
    if (importMode === 'existing') {
      if (!selectedPlaylistId) {
        alert('Please select a playlist to add tracks to');
        return;
      }
    }

    // Use provided name or fall back to filename (only for new playlists)
    const finalPlaylistName = importMode === 'new'
      ? (playlistName.trim() || selectedFile.name.replace('.csv', ''))
      : null;

    try {
      await importFromCSV(
        selectedFile,
        finalPlaylistName,
        playlistDescription,
        importMode === 'existing' ? selectedPlaylistId : null,
        isPublic
      );
      setShowResults(true);
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Import failed: ${error.message}`);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      reset();
      setSelectedFile(null);
      setPlaylistName('');
      setPlaylistDescription('');
      setShowResults(false);
      onClose();
    }
  };

  const handleFinish = () => {
    if (results?.success && onSuccess) {
      onSuccess(results.playlist);
    }
    handleClose();
  };

  const renderProgressBar = () => {
    if (!isProcessing || progress.total === 0) return null;

    const percentage = (progress.current / progress.total) * 100;

    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {progress.phase}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: '100%', mr: 1 }}>
            <LinearProgress variant="determinate" value={percentage} />
          </Box>
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">
              {progress.current}/{progress.total}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderResults = () => {
    if (!showResults || !results) return null;

    if (!results.success) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="h6">Import Failed</Typography>
          <Typography>{results.error}</Typography>
        </Alert>
      );
    }

    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
          <Typography variant="h6">Import Successful!</Typography>
          <Typography>
            {results.summary.added} track{results.summary.added !== 1 ? 's' : ''} added to playlist "{results.playlist.name}"
          </Typography>
        </Alert>

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>Summary</Typography>
          <Typography>Total tracks in CSV: {results.summary.total}</Typography>
          <Typography color="success.main">
            Found on Spotify: {results.summary.found}
          </Typography>
          <Typography color="success.main">
            Added to playlist: {results.summary.added}
          </Typography>
          {results.summary.csvDuplicates > 0 && (
            <Typography color="warning.main">
              Skipped (duplicate entries in CSV): {results.summary.csvDuplicates}
            </Typography>
          )}
          {results.summary.playlistDuplicates > 0 && (
            <Typography color="warning.main">
              Skipped (already in playlist): {results.summary.playlistDuplicates}
            </Typography>
          )}
          {results.summary.notFound > 0 && (
            <Typography color="error.main">
              Not found: {results.summary.notFound}
            </Typography>
          )}
        </Paper>

        {results.notFoundTracks.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom color="error">
              Tracks Not Found ({results.notFoundTracks.length})
            </Typography>
            <List dense>
              {results.notFoundTracks.map((track, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ErrorIcon color="error" sx={{ mr: 1 }} fontSize="small" />
                    <ListItemText
                      primary={`${track.artist} - ${track.title}`}
                      secondary={track.reason}
                    />
                  </ListItem>
                  {index < results.notFoundTracks.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    );
  };

  const renderUploadSection = () => {
    if (showResults) return null;

    return (
      <>
        <Box
          sx={{
            border: '2px dashed',
            borderColor: selectedFile ? 'primary.main' : 'grey.400',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: selectedFile ? 'action.hover' : 'background.paper',
            '&:hover': {
              backgroundColor: 'action.hover',
              borderColor: 'primary.main'
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            {selectedFile ? selectedFile.name : 'Drop CSV file here or click to browse'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            CSV should have columns: Artist, Title, Label (optional)
          </Typography>
        </Box>

        {/* Import Mode Selection */}
        <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
          <FormLabel component="legend">Import Mode</FormLabel>
          <RadioGroup
            row
            value={importMode}
            onChange={(e) => setImportMode(e.target.value)}
          >
            <FormControlLabel
              value="new"
              control={<Radio />}
              label="Create New Playlist"
              disabled={isProcessing}
            />
            <FormControlLabel
              value="existing"
              control={<Radio />}
              label="Add to Existing Playlist"
              disabled={isProcessing}
            />
          </RadioGroup>
        </FormControl>

        {/* Existing Playlist Selector */}
        {importMode === 'existing' && (
          <FormControl fullWidth margin="normal">
            <FormLabel>Select Playlist</FormLabel>
            <Select
              value={selectedPlaylistId}
              onChange={(e) => setSelectedPlaylistId(e.target.value)}
              disabled={isProcessing}
              displayEmpty
            >
              <MenuItem value="" disabled>
                Choose a playlist...
              </MenuItem>
              {playlists
                .filter(p => p.id !== 'liked-songs') // Exclude Liked Songs
                .map(playlist => (
                  <MenuItem key={playlist.id} value={playlist.id}>
                    {playlist.name} ({playlist.tracks?.total || 0} tracks)
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        )}

        {/* New Playlist Fields */}
        {importMode === 'new' && (
          <>
            <TextField
              fullWidth
              label="Playlist Name (Optional)"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              margin="normal"
              placeholder="Leave empty to use CSV filename"
              disabled={isProcessing}
              helperText={
                !playlistName.trim() && selectedFile
                  ? `Will use: "${selectedFile.name.replace('.csv', '')}"`
                  : ''
              }
            />

            <TextField
              fullWidth
              label="Playlist Description (Optional)"
              value={playlistDescription}
              onChange={(e) => setPlaylistDescription(e.target.value)}
              margin="normal"
              multiline
              rows={2}
              disabled={isProcessing}
            />

            {/* Public/Private Toggle */}
            <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
              <FormLabel component="legend">Playlist Visibility</FormLabel>
              <RadioGroup
                row
                value={isPublic ? 'public' : 'private'}
                onChange={(e) => setIsPublic(e.target.value === 'public')}
              >
                <FormControlLabel
                  value="private"
                  control={<Radio />}
                  label="Private"
                  disabled={isProcessing}
                />
                <FormControlLabel
                  value="public"
                  control={<Radio />}
                  label="Public"
                  disabled={isProcessing}
                />
              </RadioGroup>
            </FormControl>
          </>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>CSV Format Example:</strong>
          </Typography>
          <Typography variant="body2" component="pre" sx={{ mt: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
            {`Artist,Title,Label\nDisclosure,Latch,Island Records\nCalvin Harris,Summer,Columbia`}
          </Typography>
        </Alert>
      </>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={isProcessing}
    >
      <DialogTitle>
        Import Playlist from CSV
      </DialogTitle>

      <DialogContent>
        {renderUploadSection()}
        {renderProgressBar()}
        {renderResults()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isProcessing}>
          {showResults ? 'Close' : 'Cancel'}
        </Button>
        {!showResults && (
          <Button
            onClick={handleImport}
            variant="contained"
            color="primary"
            disabled={!selectedFile || isProcessing}
          >
            {isProcessing ? 'Importing...' : 'Import'}
          </Button>
        )}
        {showResults && results?.success && (
          <Button
            onClick={handleFinish}
            variant="contained"
            color="primary"
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CSVImportModal;
