import React, { useEffect, useState } from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
} from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const FileList = ({ tracks, setTracks }) => {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    // On load, select all
    setSelected(tracks.map((_, i) => i));
  }, [tracks]);

  const handleSelectAll = (e) => {
    setSelected(e.target.checked ? tracks.map((_, i) => i) : []);
  };

  const handleSelectOne = (index) => {
    setSelected((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = [...tracks];
    const [movedItem] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, movedItem);
    setTracks(reordered);

    // Also reorder selected indices
    const reorderedSelected = selected.map((i) =>
      i === result.source.index
        ? result.destination.index
        : i > result.source.index && i <= result.destination.index
        ? i - 1
        : i < result.source.index && i >= result.destination.index
        ? i + 1
        : i
    );
    setSelected(reorderedSelected);
  };

  return (
    <div style={{ padding: 10 }}>
      <h2>🎵 File List</h2>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="file-table">
          {(provided) => (
            <Table
              {...provided.droppableProps}
              ref={provided.innerRef}
              sx={{ backgroundColor: "#111", color: "#fff" }}
            >
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.length === tracks.length}
                      indeterminate={
                        selected.length > 0 &&
                        selected.length < tracks.length
                      }
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>#</TableCell>
                  <TableCell>Track Title</TableCell>
                  <TableCell>BPM</TableCell>
                  <TableCell>Key</TableCell>
                  <TableCell>Length</TableCell>
                  <TableCell>Fade In (ms)</TableCell>
                  <TableCell>Fade Out (ms)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tracks.map((track, index) => (
                  <Draggable
                    key={index}
                    draggableId={`track-${index}`}
                    index={index}
                  >
                    {(provided) => (
                      <TableRow
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        hover
                        selected={selected.includes(index)}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selected.includes(index)}
                            onChange={() => handleSelectOne(index)}
                          />
                        </TableCell>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{track}</TableCell>
                        <TableCell>–</TableCell>
                        <TableCell>–</TableCell>
                        <TableCell>–</TableCell>
                        <TableCell>30000</TableCell>
                        <TableCell>30000</TableCell>
                      </TableRow>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </TableBody>
            </Table>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default FileList;