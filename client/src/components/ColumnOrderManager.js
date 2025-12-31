import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Box,
  Typography
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

const ColumnOrderManager = ({ open, onClose, columns, columnOrder, onSaveOrder, onReset }) => {
  const [orderedFields, setOrderedFields] = useState([]);

  useEffect(() => {
    if (open && columns.length > 0) {
      // Get all column fields (exclude select, reorder, albumImageUrl as they're fixed)
      const movableFields = columns
        .filter(col => col.field !== 'select' && col.field !== 'reorder' && col.field !== 'albumImageUrl')
        .map(col => col.field);

      if (columnOrder.length > 0) {
        // Use saved order, but ensure all current columns are included
        const existingOrder = columnOrder.filter(field => movableFields.includes(field));
        const newFields = movableFields.filter(field => !columnOrder.includes(field));
        setOrderedFields([...existingOrder, ...newFields]);
      } else {
        setOrderedFields(movableFields);
      }
    }
  }, [open, columns, columnOrder]);

  const getColumnName = (field) => {
    const column = columns.find(col => col.field === field);
    return column?.headerName || field;
  };

  const handleMoveUp = (index) => {
    if (index > 0) {
      const newOrder = [...orderedFields];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setOrderedFields(newOrder);
    }
  };

  const handleMoveDown = (index) => {
    if (index < orderedFields.length - 1) {
      const newOrder = [...orderedFields];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setOrderedFields(newOrder);
    }
  };

  const handleSave = () => {
    // Build complete order including fixed columns
    const fixedFields = columns
      .filter(col => col.field === 'select' || col.field === 'reorder' || col.field === 'albumImageUrl')
      .map(col => col.field);

    const completeOrder = [...fixedFields, ...orderedFields];
    onSaveOrder(completeOrder);
    onClose();
  };

  const handleReset = () => {
    onReset();
    // Reset local state to default column order
    const defaultOrder = columns
      .filter(col => col.field !== 'select' && col.field !== 'reorder' && col.field !== 'albumImageUrl')
      .map(col => col.field);
    setOrderedFields(defaultOrder);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#282828',
          color: '#ffffff',
        }
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid #404040' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Reorder Columns</Typography>
          <IconButton
            onClick={handleReset}
            size="small"
            sx={{ color: '#1db954' }}
            title="Reset to default order"
          >
            <RestartAltIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" sx={{ mb: 2, color: '#b3b3b3' }}>
          Use the arrows to reorder columns. Fixed columns (checkbox, album art) cannot be moved.
        </Typography>
        <List>
          {orderedFields.map((field, index) => (
            <ListItem
              key={field}
              sx={{
                backgroundColor: index % 2 === 0 ? '#1a1a1a' : '#222222',
                mb: 0.5,
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: '#2a2a2a'
                }
              }}
            >
              <ListItemText
                primary={getColumnName(field)}
                sx={{ color: '#ffffff' }}
              />
              <Box>
                <IconButton
                  size="small"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  sx={{
                    color: index === 0 ? '#666' : '#1db954',
                    '&:hover': {
                      backgroundColor: 'rgba(29, 185, 84, 0.1)'
                    }
                  }}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === orderedFields.length - 1}
                  sx={{
                    color: index === orderedFields.length - 1 ? '#666' : '#1db954',
                    '&:hover': {
                      backgroundColor: 'rgba(29, 185, 84, 0.1)'
                    }
                  }}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </Box>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #404040', p: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            color: '#b3b3b3',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{
            backgroundColor: '#1db954',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#1ed760'
            }
          }}
        >
          Save Order
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColumnOrderManager;
