// TrackTable.js
import React, { useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Checkbox } from "@mui/material";

// Energy level colors - soft palette
const ENERGY_COLORS = {
  "Chill / Ambient": { bg: "#a8d5e5", text: "#1a4a5e" },   // Soft blue
  "Warm-up Flow": { bg: "#b8e0c8", text: "#2d5a3d" },      // Soft green
  "Groove": { bg: "#f5e6a3", text: "#5c5020" },            // Soft yellow
  "Uplift": { bg: "#f5c6a5", text: "#6b3d1f" },            // Soft orange
  "Drive / Peak": { bg: "#e8a8a8", text: "#6b2020" },      // Soft red
  "Emotional High": { bg: "#d4a8e8", text: "#4a2060" },    // Soft purple
};

// Camelot wheel colors - soft palette following the wheel
const CAMELOT_COLORS = {
  "1A": { bg: "#f0c6d4", text: "#6b2040" },  // Soft pink
  "1B": { bg: "#f5d6e0", text: "#6b2040" },
  "2A": { bg: "#d4c6e8", text: "#4a2870" },  // Soft purple
  "2B": { bg: "#e0d4f0", text: "#4a2870" },
  "3A": { bg: "#c6c8e8", text: "#303070" },  // Soft indigo
  "3B": { bg: "#d4d6f0", text: "#303070" },
  "4A": { bg: "#c6d4e8", text: "#284060" },  // Soft blue
  "4B": { bg: "#d4e0f0", text: "#284060" },
  "5A": { bg: "#c6e0f0", text: "#1a4a60" },  // Soft sky blue
  "5B": { bg: "#d4e8f5", text: "#1a4a60" },
  "6A": { bg: "#c6e8f0", text: "#1a5560" },  // Soft cyan
  "6B": { bg: "#d4f0f5", text: "#1a5560" },
  "7A": { bg: "#c6f0e8", text: "#1a6055" },  // Soft teal
  "7B": { bg: "#d4f5f0", text: "#1a6055" },
  "8A": { bg: "#c6e8d4", text: "#1a5530" },  // Soft sea green
  "8B": { bg: "#d4f0e0", text: "#1a5530" },
  "9A": { bg: "#c6e0c6", text: "#2a4a2a" },  // Soft green
  "9B": { bg: "#d4ead4", text: "#2a4a2a" },
  "10A": { bg: "#d4e8c6", text: "#3a4a1a" }, // Soft lime
  "10B": { bg: "#e0f0d4", text: "#3a4a1a" },
  "11A": { bg: "#f0e8c6", text: "#5a4a1a" }, // Soft yellow
  "11B": { bg: "#f5f0d4", text: "#5a4a1a" },
  "12A": { bg: "#f0d8c6", text: "#5a3a1a" }, // Soft orange
  "12B": { bg: "#f5e4d4", text: "#5a3a1a" },
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
}) => {
  const columns = useMemo(
    () => [
      {
        field: "select",
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
        field: "releaseDate",
        headerName: "Release Date",
        minWidth: 120,
        flex: 1,
        sortable: true,
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
      },
      {
        field: "tempo",
        headerName: "BPM",
        minWidth: 80,
        flex: 1,
        sortable: true,
      },
      {
        field: "camelot",
        headerName: "Key",
        minWidth: 80,
        flex: 1,
        sortable: true,
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
        field: "energy",
        headerName: "Energy #",
        minWidth: 80,
        flex: 1,
        sortable: true,
        renderCell: (params) => {
          const energy = params.value;
          if (energy === null || energy === undefined || energy === '') return '';
          return typeof energy === 'number' ? energy.toFixed(2) : energy;
        },
      },
      {
        field: "energyLevel",
        headerName: "Energy Level",
        minWidth: 100,
        flex: 1,
        sortable: true,
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
    [selectAllChecked, selectedTrackIds]
  );

  return (
    <DataGrid
      className="custom-data-grid"
      key={processedTracks.length}
      rows={processedTracks}
      columns={columns}
      pageSize={10}
      rowHeight={90}
      disableSelectionOnClick
      disableColumnMenu
      getRowId={(row) => row.id}
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
      onRowContextMenu={(event, params) => {
        event.preventDefault();
        handleRowRightClick(event, params.row);
      }}
    />
  );
};

export default TrackTable;
