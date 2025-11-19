import React from "react";
import { TextField, TableCell } from "@mui/material";

const msToMMSS = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const mmssToMs = (str) => {
  const [min, sec] = str.split(":").map(Number);
  if (isNaN(min) || isNaN(sec)) return 0;
  return (min * 60 + sec) * 1000;
};

const TimeInputCell = ({
  track,
  index,
  field,
  defaultValue,
  tracks,
  setTracks,
}) => {
  const tempField = `_${field}Input`;

  return (
    <TableCell onClick={(e) => e.stopPropagation()}>
      <TextField
        value={track[tempField] ?? msToMMSS(track[field] || defaultValue)}
        onChange={(e) => {
          const val = e.target.value;
          const updated = [...tracks];
          updated[index][tempField] = val;
          setTracks(updated);
        }}
        onBlur={() => {
          const parsed = mmssToMs(track[tempField] || "");
          const updated = [...tracks];
          updated[index][field] = parsed;
          delete updated[index][tempField];
          setTracks(updated);
        }}
        size="small"
        variant="outlined"
        InputProps={{ disableUnderline: true }}
        placeholder="MM:SS"
        inputProps={{ style: { color: "#eee" } }}
        sx={{
          input: { backgroundColor: "#2a2a2a" },
          width: "80px",
        }}
      />
    </TableCell>
  );
};

export default TimeInputCell;
