import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage track annotations (colors and comments)
 * Data is persisted to localStorage
 */
const useTrackAnnotations = () => {
  const [annotations, setAnnotations] = useState({});

  // Load annotations from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('track-annotations');
      if (saved) {
        setAnnotations(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load track annotations:', error);
    }
  }, []);

  // Save to localStorage whenever annotations change
  useEffect(() => {
    try {
      localStorage.setItem('track-annotations', JSON.stringify(annotations));
    } catch (error) {
      console.error('Failed to save track annotations:', error);
    }
  }, [annotations]);

  // Set color for a track
  const setTrackColor = useCallback((trackId, color) => {
    setAnnotations(prev => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        color: color
      }
    }));
  }, []);

  // Set comment for a track
  const setTrackComment = useCallback((trackId, comment) => {
    setAnnotations(prev => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        comment: comment
      }
    }));
  }, []);

  // Get annotation for a track
  const getTrackAnnotation = useCallback((trackId) => {
    return annotations[trackId] || { color: null, comment: '' };
  }, [annotations]);

  return {
    annotations,
    setTrackColor,
    setTrackComment,
    getTrackAnnotation
  };
};

export default useTrackAnnotations;
