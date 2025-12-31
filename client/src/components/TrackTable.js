// TrackTable.js
import React, { useMemo, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Checkbox, IconButton, Tooltip, CircularProgress, Box, Select, MenuItem, TextField } from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteIcon from "@mui/icons-material/Delete";
import { addToCart } from "../services/api";
import useColumnVisibility from "../hooks/useColumnVisibility";
import useColumnOrder from "../hooks/useColumnOrder";
import ColumnVisibilityMenu from "./ColumnVisibilityMenu";

// Track annotation colors
const ANNOTATION_COLORS = [
  { value: 'red', label: 'Red', hex: '#ff4444' },
  { value: 'orange', label: 'Orange', hex: '#ff9944' },
  { value: 'yellow', label: 'Yellow', hex: '#ffdd44' },
  { value: 'green', label: 'Green', hex: '#44ff44' },
  { value: 'blue', label: 'Blue', hex: '#4444ff' },
  { value: 'purple', label: 'Purple', hex: '#dd44dd' },
  { value: 'pink', label: 'Pink', hex: '#ff88cc' },
  { value: 'gray', label: 'Gray', hex: '#888888' },
];

// Energy level colors - soft palette
const ENERGY_COLORS = {
  "Chill / Ambient": { bg: "#a8d5e5", text: "#1a4a5e" }, // Soft blue
  "Warm-up Flow": { bg: "#b8e0c8", text: "#2d5a3d" }, // Soft green
  Groove: { bg: "#f5e6a3", text: "#5c5020" }, // Soft yellow
  Uplift: { bg: "#f5c6a5", text: "#6b3d1f" }, // Soft orange
  "Drive / Peak": { bg: "#e8a8a8", text: "#6b2020" }, // Soft red
  "Emotional High": { bg: "#d4a8e8", text: "#4a2060" }, // Soft purple
};

// Camelot wheel colors - soft palette following the wheel
const CAMELOT_COLORS = {
  "1A": { bg: "#f0c6d4", text: "#6b2040" }, // Soft pink
  "1B": { bg: "#f5d6e0", text: "#6b2040" },
  "2A": { bg: "#d4c6e8", text: "#4a2870" }, // Soft purple
  "2B": { bg: "#e0d4f0", text: "#4a2870" },
  "3A": { bg: "#c6c8e8", text: "#303070" }, // Soft indigo
  "3B": { bg: "#d4d6f0", text: "#303070" },
  "4A": { bg: "#c6d4e8", text: "#284060" }, // Soft blue
  "4B": { bg: "#d4e0f0", text: "#284060" },
  "5A": { bg: "#c6e0f0", text: "#1a4a60" }, // Soft sky blue
  "5B": { bg: "#d4e8f5", text: "#1a4a60" },
  "6A": { bg: "#c6e8f0", text: "#1a5560" }, // Soft cyan
  "6B": { bg: "#d4f0f5", text: "#1a5560" },
  "7A": { bg: "#c6f0e8", text: "#1a6055" }, // Soft teal
  "7B": { bg: "#d4f5f0", text: "#1a6055" },
  "8A": { bg: "#c6e8d4", text: "#1a5530" }, // Soft sea green
  "8B": { bg: "#d4f0e0", text: "#1a5530" },
  "9A": { bg: "#c6e0c6", text: "#2a4a2a" }, // Soft green
  "9B": { bg: "#d4ead4", text: "#2a4a2a" },
  "10A": { bg: "#d4e8c6", text: "#3a4a1a" }, // Soft lime
  "10B": { bg: "#e0f0d4", text: "#3a4a1a" },
  "11A": { bg: "#f0e8c6", text: "#5a4a1a" }, // Soft yellow
  "11B": { bg: "#f5f0d4", text: "#5a4a1a" },
  "12A": { bg: "#f0d8c6", text: "#5a3a1a" }, // Soft orange
  "12B": { bg: "#f5e4d4", text: "#5a3a1a" },
};

// Platform cart button component
const PlatformCartButton = ({ platform, trackId, trackUrl, color }) => {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation();

    console.log(`Clicking ${platform} button:`, { trackId, trackUrl });

    if (added) {
      // Already added, open the URL
      window.open(trackUrl, "_blank");
      return;
    }

    setLoading(true);
    try {
      const result = await addToCart(platform, trackId, trackUrl);
      if (result.success) {
        setAdded(true);
        // For Bandcamp, open the URL directly
        if (result.action === "open_link" && result.url) {
          window.open(result.url, "_blank");
        }
      }
    } catch (error) {
      console.error(`Failed to add to ${platform} cart:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title={added ? `Added to ${platform}` : `Add to ${platform} cart`}>
      <IconButton
        size="small"
        onClick={handleClick}
        disabled={loading}
        sx={{
          color: added ? "#4caf50" : color,
          "&:hover": { backgroundColor: `${color}20` },
        }}
      >
        {loading ? (
          <CircularProgress size={20} sx={{ color }} />
        ) : added ? (
          <CheckCircleIcon fontSize="small" />
        ) : (
          <ShoppingCartIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
};

const TrackTable = ({
  processedTracks,
  selectedTrack,
  selectAllChecked,
  selectedTrackIds,
  handleSelectAllClick,
  handleCheckboxClick,
  handleRowClick,
  handleRowRightClick,
  playlistTotal = 0,
  onReorderTrack = null,
  selectedPlaylistId = null,
  isReorderingEnabled = false,
  onColorChange = null,
  onCommentChange = null,
  getAnnotation = null,
  onDeleteTrack = null,
}) => {
  const [reorderingTrackId, setReorderingTrackId] = useState(null);
  const [deletingTrackId, setDeletingTrackId] = useState(null);
  const { isColumnVisible, toggleColumnVisibility } = useColumnVisibility();
  const { columnOrder, initializeOrder, setOrder, resetColumnOrder } = useColumnOrder();

  const handleMoveTrack = async (trackIndex, direction) => {
    if (!onReorderTrack || !selectedPlaylistId) return;

    const newPosition = direction === 'up' ? trackIndex - 1 : trackIndex + 1;

    // Prevent moving beyond boundaries
    if (newPosition < 0 || newPosition >= processedTracks.length) return;

    setReorderingTrackId(processedTracks[trackIndex].id);

    try {
      await onReorderTrack(selectedPlaylistId, trackIndex, newPosition);
    } catch (error) {
      console.error('Error reordering track:', error);
    } finally {
      setReorderingTrackId(null);
    }
  };

  const handleDeleteTrack = async (track) => {
    if (!onDeleteTrack || !selectedPlaylistId) return;

    setDeletingTrackId(track.id);

    try {
      await onDeleteTrack(selectedPlaylistId, [track.uri]);
    } catch (error) {
      console.error('Error deleting track:', error);
    } finally {
      setDeletingTrackId(null);
    }
  };

  const columns = useMemo(
    () => [
      // Reorder column (only show if enabled)
      ...(isReorderingEnabled && onReorderTrack ? [{
        field: "reorder",
        headerName: "Order",
        width: 80,
        sortable: false,
        align: "center",
        renderCell: (params) => {
          const trackIndex = processedTracks.findIndex(t => t.id === params.row.id);
          const isFirst = trackIndex === 0;
          const isLast = trackIndex === processedTracks.length - 1;
          const isReordering = reorderingTrackId === params.row.id;

          return (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Move up">
                <span>
                  <IconButton
                    size="small"
                    disabled={isFirst || isReordering}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTrack(trackIndex, 'up');
                    }}
                    sx={{
                      padding: '2px',
                      color: isFirst ? '#666' : '#1db954',
                      '&:hover': {
                        color: '#1ed760',
                        backgroundColor: 'rgba(29, 185, 84, 0.1)'
                      }
                    }}
                  >
                    {isReordering ? (
                      <CircularProgress size={16} sx={{ color: '#1db954' }} />
                    ) : (
                      <ArrowUpwardIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Move down">
                <span>
                  <IconButton
                    size="small"
                    disabled={isLast || isReordering}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTrack(trackIndex, 'down');
                    }}
                    sx={{
                      padding: '2px',
                      color: isLast ? '#666' : '#1db954',
                      '&:hover': {
                        color: '#1ed760',
                        backgroundColor: 'rgba(29, 185, 84, 0.1)'
                      }
                    }}
                  >
                    {isReordering ? (
                      <CircularProgress size={16} sx={{ color: '#1db954' }} />
                    ) : (
                      <ArrowDownwardIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          );
        },
      }] : []),
      {
        field: "select",
        width: 120,
        renderHeader: () => {
          return (
            <Checkbox
              className="header-checkbox"
              checked={selectAllChecked}
              indeterminate={
                selectedTrackIds.length > 0 &&
                selectedTrackIds.length < processedTracks.length
              }
              onChange={handleSelectAllClick}
            />
          );
        },
        renderCell: (params) => (
          <Checkbox
            className="row-checkbox"
            checked={selectedTrackIds.includes(params.row.id)}
            onChange={(event) => {
              event.stopPropagation();
              handleCheckboxClick(params.row.id);
            }}
          />
        ),
        sortable: false,
        width: 50,
        align: "center",
      },
      // Actions column (delete/unlike track) - positioned early for visibility
      ...(onDeleteTrack && selectedPlaylistId ? [{
        field: "actions",
        headerName: "Actions",
        width: 80,
        sortable: false,
        align: "center",
        renderCell: (params) => {
          const isDeleting = deletingTrackId === params.row.id;
          const isLikedSongs = selectedPlaylistId === 'liked-songs';
          const actionText = isLikedSongs ? 'Unlike' : 'Delete';
          const tooltipText = isLikedSongs ? 'Unlike track' : 'Delete track from playlist';
          const confirmMessage = isLikedSongs
            ? `Unlike "${params.row.name}"?`
            : `Delete "${params.row.name}" from playlist?`;

          return (
            <Tooltip title={tooltipText}>
              <span>
                <IconButton
                  size="small"
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(confirmMessage)) {
                      handleDeleteTrack(params.row);
                    }
                  }}
                  sx={{
                    padding: '4px',
                    color: '#ff4444',
                    '&:hover': {
                      color: '#ff0000',
                      backgroundColor: 'rgba(255, 68, 68, 0.1)'
                    }
                  }}
                >
                  {isDeleting ? (
                    <CircularProgress size={20} sx={{ color: '#ff4444' }} />
                  ) : (
                    <DeleteIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          );
        },
      }] : []),
      {
        field: "albumImageUrl",
        headerName: "Album Art",
        minWidth: 80,
        flex: 1,
        sortable: false,
        renderCell: (params) => (
          <img
            src={params.row.albumImageUrl || "default-placeholder-image-url"}
            alt="Album Art"
            style={{ width: 60, height: 60, borderRadius: "4px" }}
          />
        ),
      },
      {
        field: "name",
        headerName: "Track Name",
        minWidth: 150,
        flex: 1,
        sortable: true,
        cellClassName: "track-name-cell",
      },
      {
        field: "artistsName",
        headerName: "Artist Name",
        minWidth: 150,
        flex: 1,
        sortable: true,
      },
      {
        field: "albumName",
        headerName: "Album Name",
        minWidth: 150,
        flex: 1,
        sortable: true,
      },
      {
        field: "color",
        headerName: "Color",
        minWidth: 100,
        flex: 0.8,
        sortable: false,
        align: "center",
        renderCell: (params) => {
          if (!getAnnotation) return null;

          const annotation = getAnnotation(params.row.id);
          const currentColor = annotation?.color || '';

          return (
            <Select
              value={currentColor}
              onChange={(e) => {
                e.stopPropagation();
                if (onColorChange) {
                  onColorChange(params.row.id, e.target.value);
                }
              }}
              displayEmpty
              size="small"
              onClick={(e) => e.stopPropagation()}
              sx={{
                minWidth: 80,
                color: '#ffffff',
                '.MuiSelect-select': {
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                },
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: '#404040',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1db954',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1db954',
                },
                '.MuiSvgIcon-root': {
                  color: '#ffffff',
                },
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {ANNOTATION_COLORS.map((color) => (
                <MenuItem key={color.value} value={color.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: color.hex,
                        border: '1px solid #ccc'
                      }}
                    />
                    <span>{color.label}</span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          );
        },
      },
      {
        field: "comment",
        headerName: "Comment",
        minWidth: 180,
        flex: 1.2,
        sortable: false,
        renderCell: (params) => {
          if (!getAnnotation) return null;

          const annotation = getAnnotation(params.row.id);
          const currentComment = annotation?.comment || '';

          return (
            <TextField
              value={currentComment}
              onChange={(e) => {
                e.stopPropagation();
                if (onCommentChange) {
                  onCommentChange(params.row.id, e.target.value);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Add comment..."
              size="small"
              fullWidth
              sx={{
                '.MuiInputBase-input': {
                  padding: '4px 8px',
                  fontSize: '14px',
                  color: '#ffffff',
                },
                '.MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#404040',
                  },
                  '&:hover fieldset': {
                    borderColor: '#1db954',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#1db954',
                  },
                },
              }}
            />
          );
        },
      },
      {
        field: "releaseDate",
        headerName: "Release Date",
        minWidth: 120,
        flex: 1,
        sortable: true,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "genre",
        headerName: "Genre",
        minWidth: 140,
        flex: 1,
        sortable: true,
      },
      {
        field: "duration",
        headerName: "Duration",
        minWidth: 100,
        flex: 1,
        sortable: true,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "tempo",
        headerName: "BPM",
        minWidth: 80,
        flex: 1,
        sortable: true,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "camelot",
        headerName: "Key",
        minWidth: 80,
        flex: 1,
        sortable: true,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const camelot = params.value;
          const colors = CAMELOT_COLORS[camelot];
          if (!camelot || !colors) return camelot || "";
          return (
            <span
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                padding: "4px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            >
              {camelot}
            </span>
          );
        },
      },
      // {
      //   field: "key",
      //   headerName: "Key",
      //   minWidth: 80,
      //   flex: 1,
      //   sortable: true,
      // },
      {
        field: "energyLevel",
        headerName: "Energy Level",
        minWidth: 100,
        flex: 1,
        sortable: true,
        headerAlign: "center",
        align: "center",

        renderCell: (params) => {
          const level = params.value;
          const colors = ENERGY_COLORS[level];
          if (!level || !colors) return level || "";
          return (
            <span
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                padding: "4px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
                fontSize: "11px",
              }}
            >
              {level}
            </span>
          );
        },
      },
      // {
      //   field: "energy",
      //   headerName: "Energy #",
      //   minWidth: 80,
      //   flex: 1,
      //   sortable: true,
      //   renderCell: (params) => {
      //     const energy = params.value;
      //     if (energy === null || energy === undefined || energy === "")
      //       return "";
      //     return typeof energy === "number" ? energy.toFixed(2) : energy;
      //   },
      // },
      // Platform columns - Soundeo, Bandcamp, Beatport
      {
        field: "soundeo",
        headerName: "Soundeo",
        minWidth: 70,
        flex: 0.5,
        sortable: false,
        renderCell: (params) => {
          const platform = params.row.platforms?.soundeo;
          if (!platform?.found) return null;
          return (
            <PlatformCartButton
              platform="soundeo"
              trackId={platform.trackId}
              trackUrl={platform.url}
              color="#FF6B35"
            />
          );
        },
      },
      {
        field: "bandcamp",
        headerName: "Bandcamp",
        minWidth: 70,
        flex: 0.5,
        sortable: false,
        renderCell: (params) => {
          const platform = params.row.platforms?.bandcamp;
          if (!platform?.found) return null;
          return (
            <PlatformCartButton
              platform="bandcamp"
              trackId={platform.trackId}
              trackUrl={platform.url}
              color="#1DA0C3"
            />
          );
        },
      },
      {
        field: "beatport",
        headerName: "Beatport",
        minWidth: 70,
        flex: 0.5,
        sortable: false,
        renderCell: (params) => {
          const platform = params.row.platforms?.beatport;
          if (!platform?.found) return null;
          return (
            <PlatformCartButton
              platform="beatport"
              trackId={platform.trackId}
              trackUrl={platform.url}
              color="#94D500"
            />
          );
        },
      },
      // {
      //   field: "traxsource",
      //   headerName: "Traxsource",
      //   minWidth: 70,
      //   flex: 0.5,
      //   sortable: false,
      //   renderCell: (params) => {
      //     const platform = params.row.platforms?.traxsource;
      //     if (!platform?.found) return null;
      //     return (
      //       <PlatformCartButton
      //         platform="traxsource"
      //         trackId={platform.trackId}
      //         trackUrl={platform.url}
      //         color="#FF0077" /* choose a distinct color */
      //       />
      //     );
      //   },
      // },
      // {
      //   field: "sevendigital",
      //   headerName: "7digital",
      //   minWidth: 70,
      //   flex: 0.5,
      //   sortable: false,
      //   renderCell: (params) => {
      //     const platform = params.row.platforms?.sevendigital;
      //     if (!platform?.found) return null;
      //     return (
      //       <PlatformCartButton
      //         platform="sevendigital"
      //         trackId={platform.trackId}
      //         trackUrl={platform.url}
      //         color="#e56e0dff"
      //       />
      //     );
      //   },
      // },
      // {
      //   field: "junodownload",
      //   headerName: "junodownload",
      //   minWidth: 70,
      //   flex: 0.5,
      //   sortable: false,
      //   renderCell: (params) => {
      //     const platform = params.row.platforms?.junodownload;
      //     if (!platform?.found) return null;
      //     return (
      //       <PlatformCartButton
      //         platform="junodownload"
      //         trackId={platform.trackId}
      //         trackUrl={platform.url}
      //         color="#d34a00ff" /* choose a distinct color */
      //       />
      //     );
      //   },
      // },
      // {
      //   field: "danceability",
      //   headerName: "Danceability",
      //   minWidth: 80,
      //   flex: 1,
      //   sortable: true,
      // },
      // {
      //   field: "valence",
      //   headerName: "Valence",
      //   minWidth: 80,
      //   flex: 1,
      //   sortable: true,
      // },
      // {
      //   field: "acousticness",
      //   headerName: "Acousticness",
      //   minWidth: 80,
      //   flex: 1,
      //   sortable: true,
      // },
      // {
      //   field: "instrumentalness",
      //   headerName: "Instrumentalness",
      //   minWidth: 80,
      //   flex: 1,
      //   sortable: true,
      // },
      // {
      //   field: "liveness",
      //   headerName: "Liveness",
      //   minWidth: 80,
      //   flex: 1,
      //   sortable: true,
      // },
    ],
    [selectAllChecked, selectedTrackIds, isReorderingEnabled, onReorderTrack, processedTracks, reorderingTrackId, onColorChange, onCommentChange, getAnnotation, onDeleteTrack, deletingTrackId, selectedPlaylistId]
  );

  // Initialize column order when columns change
  React.useEffect(() => {
    const allFields = columns.map(col => col.field);
    initializeOrder(allFields);
  }, [columns, initializeOrder]);

  // Filter columns based on visibility
  const visibleColumns = useMemo(
    () => columns.filter(col => {
      // Always show select, reorder, and albumImageUrl columns
      if (col.field === 'select' || col.field === 'reorder' || col.field === 'albumImageUrl') {
        return true;
      }
      return isColumnVisible(col.field);
    }),
    [columns, isColumnVisible]
  );

  // Apply column order
  const orderedColumns = useMemo(() => {
    if (!columnOrder || columnOrder.length === 0) {
      return visibleColumns;
    }

    // Separate fixed columns (select, reorder, albumImageUrl)
    const fixedColumns = visibleColumns.filter(col =>
      col.field === 'select' || col.field === 'reorder' || col.field === 'albumImageUrl'
    );

    // Get movable columns
    const movableColumns = visibleColumns.filter(col =>
      col.field !== 'select' && col.field !== 'reorder' && col.field !== 'albumImageUrl'
    );

    // Sort movable columns by saved order
    const sortedMovable = movableColumns.sort((a, b) => {
      const indexA = columnOrder.indexOf(a.field);
      const indexB = columnOrder.indexOf(b.field);

      // If not in order, put at end
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });

    return [...fixedColumns, ...sortedMovable];
  }, [visibleColumns, columnOrder]);

  // Handle column reordering - receives the entire new order
  const handleSaveColumnOrder = (newOrder) => {
    setOrder(newOrder);
  };

  // Custom toolbar with column visibility menu
  const CustomToolbar = () => (
    <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid #404040' }}>
      <ColumnVisibilityMenu
        columns={columns}
        isColumnVisible={isColumnVisible}
        toggleColumnVisibility={toggleColumnVisibility}
        columnOrder={columnOrder}
        onSaveOrder={handleSaveColumnOrder}
        onResetOrder={resetColumnOrder}
      />
    </Box>
  );

  return (
    <DataGrid
      className="custom-data-grid"
      rows={processedTracks}
      columns={orderedColumns}
      pageSize={10}
      rowHeight={90}
      disableSelectionOnClick
      disableColumnMenu
      getRowId={(row) => row.id}
      rowCount={playlistTotal > 0 ? playlistTotal : processedTracks.length}
      onRowClick={(params, event) => {
        if (!event.target.closest('input[type="checkbox"]')) {
          handleRowClick(params.row);
        }
      }}
      getRowClassName={(params) => {
        const isSelected = params.row.id === selectedTrack?.id;
        const isEvenRow = params.indexRelativeToCurrentPage % 2 === 0;
        return `${isSelected ? "selected-row" : ""} ${
          isEvenRow ? "even-row" : "odd-row"
        }`.trim();
      }}
      slots={{
        toolbar: CustomToolbar,
      }}
      slotProps={{
        row: {
          onContextMenu: (event) => {
            console.log("✅ Right-click detected via slotProps!", event);
            event.preventDefault();
            // Get the row data from the event target
            const rowElement = event.currentTarget;
            const rowId = rowElement.getAttribute("data-id");
            const row = processedTracks.find((t) => t.id === rowId);
            if (row) {
              console.log("Found row:", row);
              handleRowRightClick(event, row);
            } else {
              console.warn("Row not found for id:", rowId);
            }
          },
        },
      }}
    />
  );
};

export default TrackTable;
