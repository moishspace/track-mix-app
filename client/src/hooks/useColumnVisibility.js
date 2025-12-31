import { useState, useEffect, useCallback } from 'react';

const useColumnVisibility = () => {
  const [columnVisibility, setColumnVisibility] = useState({});

  // Load column visibility from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('column-visibility');
      if (saved) {
        setColumnVisibility(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load column visibility:', error);
    }
  }, []);

  // Save to localStorage whenever visibility changes
  useEffect(() => {
    try {
      localStorage.setItem('column-visibility', JSON.stringify(columnVisibility));
    } catch (error) {
      console.error('Failed to save column visibility:', error);
    }
  }, [columnVisibility]);

  const toggleColumnVisibility = useCallback((field) => {
    setColumnVisibility(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  }, []);

  const isColumnVisible = useCallback((field) => {
    // Default to true if not set
    return columnVisibility[field] !== false;
  }, [columnVisibility]);

  const resetColumnVisibility = useCallback(() => {
    setColumnVisibility({});
  }, []);

  return {
    columnVisibility,
    toggleColumnVisibility,
    isColumnVisible,
    resetColumnVisibility
  };
};

export default useColumnVisibility;
