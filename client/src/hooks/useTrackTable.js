// useTrackTable.js
import { useCallback, useState, useMemo } from 'react';

const useTrackTable = (filteredTracks, setSelectedTrack, setSelectedTrackIndex, selectedTrackIds, setSelectedTrackIds, selectAllChecked, setSelectAllChecked) => {
    const [contextMenu, setContextMenu] = useState(null);

    const handleSelectAllClick = useCallback(() => {
        if (selectAllChecked) {
            // Unselect all tracks
            setSelectedTrackIds([]);
            setSelectAllChecked(false);
        } else {
            // Select all tracks
            const allTrackIds = filteredTracks.map((track) => track.id);
            setSelectedTrackIds(allTrackIds);
            setSelectAllChecked(true);
        }
    }, [filteredTracks, selectAllChecked, setSelectedTrackIds, setSelectAllChecked]);

    const handleCheckboxClick = useCallback((id) => {
        if (!setSelectedTrackIds) {
            console.error("setSelectedTrackIds is not a function");
            return;
        }

        setSelectedTrackIds((prevSelectedIds) => {
            const newSelectedIds = prevSelectedIds.includes(id)
                ? prevSelectedIds.filter((selectedId) => selectedId !== id)
                : [...prevSelectedIds, id];

            const allSelected = newSelectedIds.length === filteredTracks.length;
            const noneSelected = newSelectedIds.length === 0;

            if (allSelected) {
                setSelectAllChecked(true);
            } else if (noneSelected) {
                setSelectAllChecked(false);
            } else {
                setSelectAllChecked(false);
            }

            return newSelectedIds;
        });
    }, [filteredTracks.length, setSelectedTrackIds, setSelectAllChecked]);

    const trackIdMap = useMemo(() => {
        return filteredTracks.map((track, index) => ({ id: track.id, index }));
      }, [filteredTracks]);
      
      const handleRowClick = useCallback(
        (row) => {
        const trackIndex = filteredTracks.findIndex((track) => track.id === row.id);
          if (trackIndex !== -1) {
            setSelectedTrack(row);
            setSelectedTrackIndex(trackIndex);
          } else {
            console.warn('Track not found in filteredTracks');
          }
        },
        [trackIdMap, setSelectedTrack, setSelectedTrackIndex]
      );

    const handleRowRightClick = useCallback((event, row) => {
        event.preventDefault();
        setContextMenu({
            mouseX: event.clientX,
            mouseY: event.clientY,
            row,
        });
    }, []);

    return {
        handleSelectAllClick,
        handleRowClick,
        handleCheckboxClick,
        handleRowRightClick,
    };
};

export default useTrackTable;