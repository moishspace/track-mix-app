import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, Checkbox, FormControlLabel, Tooltip, Box, Divider, ListItemIcon, ListItemText } from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ReorderIcon from '@mui/icons-material/Reorder';
import ColumnOrderManager from './ColumnOrderManager';

const ColumnVisibilityMenu = ({ columns, isColumnVisible, toggleColumnVisibility, columnOrder, onSaveOrder, onResetOrder }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event, reason) => {
    // Only close on escape key or backdrop click, not on item clicks
    if (reason === 'escapeKeyDown' || reason === 'backdropClick') {
      setAnchorEl(null);
    }
  };

  const handleToggle = (field, event) => {
    event.stopPropagation();
    event.preventDefault();
    toggleColumnVisibility(field);
  };

  const handleOpenOrderDialog = () => {
    setAnchorEl(null);
    setOrderDialogOpen(true);
  };

  // Filter out columns that shouldn't be togglable
  const togglableColumns = columns.filter(col =>
    col.field !== 'select' &&
    col.field !== 'reorder' &&
    col.field !== 'albumImageUrl'
  );

  return (
    <>
      <Tooltip title="Column Settings">
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{
            color: '#1db954',
            '&:hover': {
              backgroundColor: 'rgba(29, 185, 84, 0.1)',
            }
          }}
        >
          <ViewColumnIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disableAutoFocusItem
        autoFocus={false}
        disableEnforceFocus
        MenuListProps={{
          'aria-labelledby': 'column-settings-button',
          autoFocusItem: false,
          disablePadding: false,
        }}
        PaperProps={{
          sx: {
            backgroundColor: '#282828',
            color: '#ffffff',
            maxHeight: 500,
            '& .MuiMenuItem-root': {
              '&:hover': {
                backgroundColor: 'rgba(29, 185, 84, 0.1)',
              }
            }
          }
        }}
      >
        <MenuItem onClick={handleOpenOrderDialog}>
          <ListItemIcon>
            <ReorderIcon fontSize="small" sx={{ color: '#1db954' }} />
          </ListItemIcon>
          <ListItemText primary="Reorder Columns" />
        </MenuItem>
        <Divider sx={{ backgroundColor: '#404040', my: 1 }} />
        {togglableColumns.map((column) => (
          <MenuItem
            key={column.field}
            dense
            disableRipple
            onClick={(e) => {
              // Prevent MenuItem from triggering menu close
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            sx={{
              '&:hover': { backgroundColor: 'rgba(29, 185, 84, 0.1)' },
              cursor: 'default'
            }}
          >
            <Checkbox
              checked={isColumnVisible(column.field)}
              onChange={(e) => handleToggle(column.field, e)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              sx={{
                color: '#b3b3b3',
                padding: '4px 8px 4px 4px',
                '&.Mui-checked': {
                  color: '#1db954',
                },
                '&:focus': {
                  outline: 'none',
                }
              }}
            />
            <ListItemText
              primary={column.headerName || column.field}
              onClick={(e) => handleToggle(column.field, e)}
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                cursor: 'pointer',
                '& .MuiListItemText-primary': {
                  fontSize: '14px'
                }
              }}
            />
          </MenuItem>
        ))}
      </Menu>

      <ColumnOrderManager
        open={orderDialogOpen}
        onClose={() => setOrderDialogOpen(false)}
        columns={columns}
        columnOrder={columnOrder || []}
        onSaveOrder={onSaveOrder}
        onReset={onResetOrder}
      />
    </>
  );
};

export default ColumnVisibilityMenu;
