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
  draggableContent?: React.ReactNode; // Content that should be draggable (filters section)
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
  draggableContent,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [isPotentialDrag, setIsPotentialDrag] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const draggableAreaRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

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

      // Prevent unnecessary snapping if already at the target position
      if (currentSnapIndex === snapIndex && !isDragging) {
        return;
      }

      const transform = getTransform(snapIndex);
      setTranslateY(transform);
      setCurrentSnapIndex(snapIndex);

      if (onSnapChange) {
        onSnapChange(snapIndex);
      }

      sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      sheetRef.current.style.transform = `translateY(${transform}px)`;
    },
    [getTransform, onSnapChange, currentSnapIndex, isDragging],
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
    // Check if touch started on drag handle or draggable content area
    const target = e.target as Node;
    const isDragHandle = dragHandleRef.current?.contains(target);
    const isDraggableArea = draggableAreaRef.current?.contains(target);
    const isContentArea = contentAreaRef.current?.contains(target);

    // Always allow dragging from drag handle or draggable area
    const canDragImmediately = isDragHandle || isDraggableArea;
    
    // If touching content area at top of scroll, mark as potential drag (but don't start dragging yet)
    if (!canDragImmediately && isContentArea && contentAreaRef.current) {
      const isAtTop = contentAreaRef.current.scrollTop === 0;
      if (isAtTop) {
        setIsPotentialDrag(true);
        setStartY(e.touches[0].clientY);
        setCurrentY(e.touches[0].clientY);
        setHasMoved(false);
        return; // Don't start dragging yet, wait for movement direction
      }
    }

    if (!canDragImmediately) return;

    // Start dragging immediately for drag handle and draggable area
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
    setHasMoved(false);

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }

    // Don't preventDefault on touch start - we need to allow potential clicks
  }, []);

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      
      // Handle potential drag state (when touching content area at top)
      if (isPotentialDrag && !isDragging) {
        const deltaY = touchY - startY;
        const absDeltaY = Math.abs(deltaY);
        
        // If moved more than 10px, decide direction
        if (absDeltaY > 10) {
          if (deltaY > 0) {
            // Moving down - start bottom sheet dragging
            setIsPotentialDrag(false);
            setIsDragging(true);
            if (sheetRef.current) {
              sheetRef.current.style.transition = 'none';
            }
          } else {
            // Moving up - cancel potential drag, allow normal scroll
            setIsPotentialDrag(false);
            return;
          }
        } else {
          // Not enough movement yet, keep waiting
          return;
        }
      }

      if (!isDragging || !sheetRef.current) return;

      const deltaY = Math.abs(touchY - startY);

      // Mark as moved if we've moved more than 5px (threshold for drag vs tap)
      if (deltaY > 5) {
        setHasMoved(true);
        // Only prevent default once we're actually dragging
        e.preventDefault();
      }

      // Only update transform if we're actually dragging
      if (deltaY > 5) {
        const deltaYSigned = touchY - startY;
        const baseTransform = getTransform(currentSnapIndex);
        const newTransform = baseTransform + deltaYSigned;

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
      }
    },
    [isDragging, isPotentialDrag, startY, currentSnapIndex, getTransform, snapPoints],
  );

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    // Reset potential drag state
    if (isPotentialDrag) {
      setIsPotentialDrag(false);
      return;
    }

    if (!isDragging) return;

    setIsDragging(false);

    // If it was a tap (not much movement), allow normal interactions
    // This enables tap functionality on day buttons and search input
    if (!hasMoved) {
      // Reset state and return early - let the original element handle the tap
      setHasMoved(false);
      if (sheetRef.current) {
        sheetRef.current.style.transition = '';
      }
      return;
    }

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
      // Never allow full closure - always return to minimum snap point
      if (targetSnapIndex < 0) {
        targetSnapIndex = 0; // Always go back to minimum visible state
      }
      // If dragging down significantly, go to minimum snap point
      if (velocity > 50 && targetSnapIndex === 0) {
        targetSnapIndex = 0; // Stay at minimum
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
    hasMoved,
    currentY,
    startY,
    translateY,
    findClosestSnapPoint,
    snapPoints,
    onToggle,
    snapToPoint,
    alwaysVisible,
    currentSnapIndex,
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

  // Handle content area touch events to allow bottom sheet drag but prevent browser pull-to-refresh
  const handleContentTouchStart = useCallback((e: TouchEvent) => {
    const contentArea = contentAreaRef.current;
    if (!contentArea) return;

    const isAtTop = contentArea.scrollTop === 0;
    if (isAtTop) {
      // Store initial touch position to allow bottom sheet dragging
      contentArea.dataset.initialTouchY = e.touches[0].clientY.toString();
      contentArea.dataset.allowBottomSheetDrag = 'true';
    }
  }, []);

  const handleContentTouchMove = useCallback((e: TouchEvent) => {
    const contentArea = contentAreaRef.current;
    if (!contentArea || !contentArea.dataset.initialTouchY) return;

    const isAtTop = contentArea.scrollTop === 0;
    const currentTouchY = e.touches[0].clientY;
    const initialTouchY = parseFloat(contentArea.dataset.initialTouchY);
    const deltaY = currentTouchY - initialTouchY;

    // If we're at the top and user is pulling down significantly, only prevent browser refresh
    // but allow bottom sheet to handle the gesture
    if (isAtTop && deltaY > 20) {
      // Only prevent default to stop browser pull-to-refresh, but don't stop propagation
      // This allows the bottom sheet touch handlers to still work
      e.preventDefault();
    }
  }, []);

  const handleContentTouchEnd = useCallback(() => {
    const contentArea = contentAreaRef.current;
    if (contentArea) {
      if (contentArea.dataset.initialTouchY) {
        delete contentArea.dataset.initialTouchY;
      }
      if (contentArea.dataset.allowBottomSheetDrag) {
        delete contentArea.dataset.allowBottomSheetDrag;
      }
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!isOpen || !isMobile) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Add content area listeners to prevent pull-to-refresh
    const contentArea = contentAreaRef.current;
    if (contentArea) {
      contentArea.addEventListener('touchstart', handleContentTouchStart, { passive: false });
      contentArea.addEventListener('touchmove', handleContentTouchMove, { passive: false });
      contentArea.addEventListener('touchend', handleContentTouchEnd, { passive: false });
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);

      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Clean up content area listeners
      if (contentArea) {
        contentArea.removeEventListener('touchstart', handleContentTouchStart);
        contentArea.removeEventListener('touchmove', handleContentTouchMove);
        contentArea.removeEventListener('touchend', handleContentTouchEnd);
      }
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
    handleContentTouchStart,
    handleContentTouchMove,
    handleContentTouchEnd,
  ]);

  // Initialize position when opened or when always visible (only once)
  useEffect(() => {
    if ((isOpen || alwaysVisible) && isMobile && !isInitializedRef.current) {
      snapToPoint(initialSnap);
      isInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]); // Only depend on isMobile, not the changing props

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
            zIndex: 1200,
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
          zIndex: 1250,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '95vh',
          overflow: 'hidden',
          overscrollBehaviorY: 'none', // Only prevent vertical overscroll/pull-to-refresh
          touchAction: 'auto', // Allow all touch interactions
          transform: `translateY(${getTransform(currentSnapIndex)}px)`, // Start at current position instead of off-screen
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
            overscrollBehaviorY: 'none', // Prevent vertical overscroll/pull-to-refresh
            touchAction: 'pan-y pinch-zoom', // Allow vertical scrolling and pinch zoom
          }}
        >
          {/* Draggable Content Area */}
          {draggableContent && (
            <Box
              ref={draggableAreaRef}
              sx={{
                touchAction: 'auto', // Allow normal touch interactions
                position: 'relative',
                zIndex: 1,
              }}
            >
              {draggableContent}
            </Box>
          )}

          {/* Regular Content */}
          <Box
            ref={contentAreaRef}
            sx={{
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overscrollBehaviorY: 'none', // Prevent vertical overscroll/pull-to-refresh only
              touchAction: 'auto', // Allow all touch interactions including dragging
            }}
          >
            {children}
          </Box>
        </Box>
      </Paper>
    </>
  );
};

export default BottomSheet;
