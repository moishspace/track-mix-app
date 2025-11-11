// src/components/FadeControls.js
import React from "react";
import { Box, TextField, Typography } from "@mui/material";

const FadeControls = ({ fadeIn, fadeOut, setFadeIn, setFadeOut }) => {
  return (
    <Box display="flex" gap={4} alignItems="center">
      <Box>
        <Typography variant="body2">Default Fade In (s)</Typography>
        <TextField
          type="number"
          value={fadeIn}
          onChange={(e) => setFadeIn(Number(e.target.value))}
          size="small"
          inputProps={{ min: 0, step: 0.5 }}
        />
      </Box>
      <Box>
        <Typography variant="body2">Default Fade Out (s)</Typography>
        <TextField
          type="number"
          value={fadeOut}
          onChange={(e) => setFadeOut(Number(e.target.value))}
          size="small"
          inputProps={{ min: 0, step: 0.5 }}
        />
      </Box>
    </Box>
  );
};

export default FadeControls;
