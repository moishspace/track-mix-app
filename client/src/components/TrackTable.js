// TrackTable.js
import React, { useMemo } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Checkbox } from '@mui/material';

const TrackTable = ({
  processedTracks,
  selectedTrack,
  selectAllChecked,
  selectedTrackIds,
  handleSelectAllClick,
  handleCheckboxClick,
  handleRowClick,
  handleRowRightClick
}) => {
  const columns = useMemo(() => [
    {
        field: 'select',
        renderHeader: () => {
          return (
          <Checkbox
            className="header-checkbox"
            checked={selectAllChecked}
            indeterminate={
              selectedTrackIds.length > 0 && selectedTrackIds.length < processedTracks.length
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
        align: 'center',
    },
    {
      field: 'albumImageUrl',
      headerName: 'Album Art',
      minWidth: 80,
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <img
          src={params.row.albumImageUrl || 'default-placeholder-image-url'}
          alt="Album Art"
          style={{ width: 60, height: 60, borderRadius: '4px' }}
        />
      ),
    },
    {
      field: 'name',
      headerName: 'Track Name',
      minWidth: 150,
      flex: 1,
      sortable: true,
    },
    {
      field: 'artistsName',
      headerName: 'Artist Name',
      minWidth: 150,
      flex: 1,
      sortable: true,
    },
    {
      field: 'albumName',
      headerName: 'Album Name',
      minWidth: 150,
      flex: 1,
      sortable: true,
    },
    {
      field: 'releaseDate',
      headerName: 'Release Date',
      minWidth: 120,
      flex: 1,
      sortable: true,
    },
    {
      field: 'genre',
      headerName: 'Genre',
      minWidth: 140,
      flex: 1,
      sortable: true,
    },
    {
      field: 'duration',
      headerName: 'Duration',
      minWidth: 100,
      flex: 1,
      sortable: true,
    },
    {
      field: 'tempo',
      headerName: 'BPM',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'key',
      headerName: 'Key',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'danceability',
      headerName: 'Danceability',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'energy',
      headerName: 'Energy',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'valence',
      headerName: 'Valence',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'acousticness',
      headerName: 'Acousticness',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'instrumentalness',
      headerName: 'Instrumentalness',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'liveness',
      headerName: 'Liveness',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
  ], [selectAllChecked, selectedTrackIds]);

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
            return `${isSelected ? 'selected-row' : ''} ${isEvenRow ? 'even-row' : 'odd-row'}`.trim();
        }}
        onRowContextMenu={(event, params) => {
            event.preventDefault();
            handleRowRightClick(event, params.row);
        }}
    />
  );
};

export default TrackTable;