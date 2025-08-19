import { Box, Paper, useMediaQuery, useTheme } from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface BottomSheetProps {
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  snapPoints?: number[]; // Heights as percentages of screen height
  initialSnap?: number; // Index of initial snap point
  onSnapChange?: (snapIndex: number) => void;
  closeOnOutsideClick?: boolean;
  alwaysVisible?: boolean; // Never fully close, always show handle
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  children,
  isOpen,
  onToggle,
  snapPoints = [0.3, 0.7, 0.95], // Default: 30%, 70%, 95% of screen height
  initialSnap = 0,
  onSnapChange,
  closeOnOutsideClick = true,
  alwaysVisible = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Calculate sheet height based on current snap point
  const getSheetHeight = useCallback(
    (snapIndex: number) => {
      const windowHeight = window.innerHeight;
      return windowHeight * snapPoints[snapIndex];
    },
    [snapPoints],
  );

  // Calculate transform based on snap point
  const getTransform = useCallback(
    (snapIndex: number, offset = 0) => {
      const windowHeight = window.innerHeight;
      const sheetHeight = getSheetHeight(snapIndex);
      const baseTransform = windowHeight - sheetHeight;
      
      // Ensure minimum 20px is always visible
      const minVisibleHeight = 20;
      const maxTransform = windowHeight - minVisibleHeight;
      
      return Math.min(baseTransform + offset, maxTransform);
    },
    [getSheetHeight],
  );

  // Snap to the nearest snap point
  const snapToPoint = useCallback(
    (snapIndex: number) => {
      if (!sheetRef.current) return;

      const transform = getTransform(snapIndex);
      setTranslateY(transform);
      setCurrentSnapIndex(snapIndex);

      if (onSnapChange) {
        onSnapChange(snapIndex);
      }

      sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      sheetRef.current.style.transform = `translateY(${transform}px)`;
    },
    [getTransform, onSnapChange],
  );

  // Find the closest snap point
  const findClosestSnapPoint = useCallback(
    (currentTransform: number) => {
      let closestIndex = 0;
      let minDistance = Math.abs(currentTransform - getTransform(0));

      for (let i = 1; i < snapPoints.length; i++) {
        const distance = Math.abs(currentTransform - getTransform(i));
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }

      return closestIndex;
    },
    [getTransform, snapPoints],
  );

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!dragHandleRef.current?.contains(e.target as Node)) return;

    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !sheetRef.current) return;

      e.preventDefault();
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - startY;
      const baseTransform = getTransform(currentSnapIndex);
      const newTransform = baseTransform + deltaY;

      // Limit dragging beyond boundaries
      const minTransform = getTransform(snapPoints.length - 1);
      const minVisibleHeight = 20;
      const maxTransform = window.innerHeight - minVisibleHeight;

      let constrainedTransform = Math.max(minTransform, Math.min(maxTransform, newTransform));

      // Add resistance when dragging beyond limits
      if (newTransform < minTransform) {
        const overDrag = minTransform - newTransform;
        constrainedTransform = minTransform - Math.sqrt(overDrag * 10);
      } else if (newTransform > maxTransform) {
        const overDrag = newTransform - maxTransform;
        constrainedTransform = maxTransform + Math.sqrt(overDrag * 10);
      }

      setCurrentY(touchY);
      setTranslateY(constrainedTransform);
      sheetRef.current.style.transform = `translateY(${constrainedTransform}px)`;
    },
    [isDragging, startY, currentSnapIndex, getTransform, snapPoints],
  );

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    const velocity = currentY - startY;
    const currentTransform = translateY;

    // Determine target snap point based on velocity and position
    let targetSnapIndex = findClosestSnapPoint(currentTransform);

    // Adjust based on velocity
    if (Math.abs(velocity) > 50) {
      if (velocity > 0 && targetSnapIndex > 0) {
        // Dragging down, go to lower snap point
        targetSnapIndex = Math.max(0, targetSnapIndex - 1);
      } else if (velocity < 0 && targetSnapIndex < snapPoints.length - 1) {
        // Dragging up, go to higher snap point
        targetSnapIndex = Math.min(snapPoints.length - 1, targetSnapIndex + 1);
      }
    }

    // Special behavior for alwaysVisible mode
    if (alwaysVisible) {
      // If at maximum snap (fully expanded) and dragging down significantly,
      // drop to 50% (middle snap point)
      if (currentSnapIndex === snapPoints.length - 1 && velocity > 100) {
        const middleIndex = Math.floor(snapPoints.length / 2);
        targetSnapIndex = middleIndex;
      }
      // Never allow full closure - minimum is first snap point
      const minVisibleHeight = 20;
      const maxAllowedTransform = window.innerHeight - minVisibleHeight;
      if (targetSnapIndex < 0 || (velocity > 100 && currentTransform > maxAllowedTransform * 0.8)) {
        targetSnapIndex = 0; // Stay at minimum visible state
        return;
      }
    } else {
      // Original behavior: Check if should close (dragging down past threshold)
      const minVisibleHeight = 20;
      const maxAllowedTransform = window.innerHeight - minVisibleHeight;
      if (velocity > 100 && currentTransform > maxAllowedTransform * 0.8) {
        onToggle();
        return;
      }
    }

    snapToPoint(targetSnapIndex);
  }, [
    isDragging,
    currentY,
    startY,
    translateY,
    findClosestSnapPoint,
    snapPoints,
    onToggle,
    snapToPoint,
  ]);

  // Handle mouse events for desktop
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!dragHandleRef.current?.contains(e.target as Node)) return;

    setIsDragging(true);
    setStartY(e.clientY);
    setCurrentY(e.clientY);

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !sheetRef.current) return;

      const deltaY = e.clientY - startY;
      const baseTransform = getTransform(currentSnapIndex);
      const newTransform = baseTransform + deltaY;

      const minTransform = getTransform(snapPoints.length - 1);
      const minVisibleHeight = 20;
      const maxTransform = window.innerHeight - minVisibleHeight;

      let constrainedTransform = Math.max(minTransform, Math.min(maxTransform, newTransform));

      if (newTransform < minTransform) {
        const overDrag = minTransform - newTransform;
        constrainedTransform = minTransform - Math.sqrt(overDrag * 10);
      } else if (newTransform > maxTransform) {
        const overDrag = newTransform - maxTransform;
        constrainedTransform = maxTransform + Math.sqrt(overDrag * 10);
      }

      setCurrentY(e.clientY);
      setTranslateY(constrainedTransform);
      sheetRef.current.style.transform = `translateY(${constrainedTransform}px)`;
    },
    [isDragging, startY, currentSnapIndex, getTransform, snapPoints],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    const velocity = currentY - startY;
    const currentTransform = translateY;

    let targetSnapIndex = findClosestSnapPoint(currentTransform);

    if (Math.abs(velocity) > 50) {
      if (velocity > 0 && targetSnapIndex > 0) {
        targetSnapIndex = Math.max(0, targetSnapIndex - 1);
      } else if (velocity < 0 && targetSnapIndex < snapPoints.length - 1) {
        targetSnapIndex = Math.min(snapPoints.length - 1, targetSnapIndex + 1);
      }
    }

    const minVisibleHeight = 20;
    const maxAllowedTransform = window.innerHeight - minVisibleHeight;
    if (velocity > 100 && currentTransform > maxAllowedTransform * 0.8) {
      onToggle();
      return;
    }

    snapToPoint(targetSnapIndex);
  }, [
    isDragging,
    currentY,
    startY,
    translateY,
    findClosestSnapPoint,
    snapPoints,
    onToggle,
    snapToPoint,
  ]);

  // Set up event listeners
  useEffect(() => {
    if (!isOpen || !isMobile) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);

      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isOpen,
    isMobile,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  ]);

  // Initialize position when opened or when always visible
  useEffect(() => {
    if ((isOpen || alwaysVisible) && isMobile) {
      snapToPoint(initialSnap);
    }
  }, [isOpen, isMobile, snapToPoint, initialSnap, alwaysVisible]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if ((isOpen || alwaysVisible) && isMobile) {
        snapToPoint(currentSnapIndex);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, isMobile, currentSnapIndex, snapToPoint]);

  // Handle outside click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnOutsideClick && e.target === e.currentTarget) {
        if (alwaysVisible) {
          // In always visible mode, clicking backdrop just minimizes to smallest snap
          snapToPoint(0);
        } else {
          // Original behavior: close completely
          onToggle();
        }
      }
    },
    [closeOnOutsideClick, onToggle, alwaysVisible, snapToPoint],
  );

  // Show if open OR if always visible (even when "closed")
  if (!isOpen && !alwaysVisible) return null;

  // On desktop, show as sidebar
  if (!isMobile) {
    return (
      <Paper
        elevation={2}
        sx={{
          width: 400,
          height: '100%',
          borderLeft: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          bgcolor: 'background.paper',
          zIndex: 1000,
        }}
      >
        {children}
      </Paper>
    );
  }

  // On mobile, show as bottom sheet
  return (
    <>
      {/* Backdrop - only show when not in alwaysVisible mode or when expanded */}
      {!alwaysVisible && (
        <Box
          onClick={handleBackdropClick}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1300,
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.3s',
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        />
      )}

      {/* Bottom Sheet */}
      <Paper
        ref={sheetRef}
        elevation={8}
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1400,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '95vh',
          overflow: 'hidden',
          transform: `translateY(${window.innerHeight}px)`,
        }}
      >
        {/* Drag Handle */}
        <Box
          ref={dragHandleRef}
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 1.5,
            cursor: 'grab',
            '&:active': {
              cursor: 'grabbing',
            },
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 4,
              bgcolor: 'grey.400',
              borderRadius: 2,
            }}
          />
        </Box>

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0, // Important for flex scrolling
          }}
        >
          {children}
        </Box>
      </Paper>
    </>
  );
};

export default BottomSheet;
