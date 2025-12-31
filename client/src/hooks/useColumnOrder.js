import { useState, useEffect, useCallback } from 'react';

const useColumnOrder = () => {
  const [columnOrder, setColumnOrder] = useState([]);

  // Load column order from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('column-order');
      if (saved) {
        setColumnOrder(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load column order:', error);
    }
  }, []);

  // Save to localStorage whenever order changes
  useEffect(() => {
    if (columnOrder.length > 0) {
      try {
        localStorage.setItem('column-order', JSON.stringify(columnOrder));
      } catch (error) {
        console.error('Failed to save column order:', error);
      }
    }
  }, [columnOrder]);

  const moveColumn = useCallback((fromIndex, toIndex) => {
    setColumnOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const [movedItem] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, movedItem);
      return newOrder;
    });
  }, []);

  const initializeOrder = useCallback((fields) => {
    setColumnOrder(prevOrder => {
      // Only initialize if empty or if new fields don't match
      if (prevOrder.length === 0 || !fields.every(f => prevOrder.includes(f))) {
        return fields;
      }
      return prevOrder;
    });
  }, []);

  const setOrder = useCallback((newOrder) => {
    setColumnOrder(newOrder);
  }, []);

  const resetColumnOrder = useCallback(() => {
    setColumnOrder([]);
    localStorage.removeItem('column-order');
  }, []);

  return {
    columnOrder,
    moveColumn,
    initializeOrder,
    setOrder,
    resetColumnOrder
  };
};

export default useColumnOrder;
