import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Fab, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface FloatingAddShowButtonProps {
  position?: 'fixed' | 'absolute';
  size?: 'small' | 'medium' | 'large';
}

const FloatingAddShowButton: React.FC<FloatingAddShowButtonProps> = ({
  position = 'fixed',
  size = 'medium',
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const [bottomPosition, setBottomPosition] = useState(24);

  // Check if we're already on the submit show page
  const isSubmitPage = location.pathname === '/submit';

  // Hide the button if we're already on the submit page
  if (isSubmitPage) {
    return null;
  }

  // Check if we're on shows page where bottom sheet might interfere
  const isShowsPage = location.pathname === '/shows';

  // Adjust bottom position based on device and page
  // On the shows page, position the FAB above the bottom sheet to ensure it's always accessible
  const calculateBottomPosition = () => {
    if (isMobile) {
      if (isShowsPage) {
        // Calculate position above bottom sheet
        // Bottom sheet snap points: [0.3, 0.6, 1.0] (30%, 60%, 100%)
        // We'll position above the minimum visible height (30% snap point)
        // with extra spacing for better visual separation
        const screenHeight = window.innerHeight;
        const bottomSheetMinHeight = screenHeight * 0.3; // 30% snap point
        const extraSpacing = 24; // Additional spacing above the sheet

        // Ensure the button is always visible and accessible
        const minBottomPosition = 80; // Minimum distance from bottom
        const calculatedPosition = bottomSheetMinHeight + extraSpacing;

        return Math.max(calculatedPosition, minBottomPosition);
      }
      return 24; // Standard mobile bottom position
    }
    return 24; // Standard desktop bottom position
  };

  // Update position when relevant conditions change
  useEffect(() => {
    const newPosition = calculateBottomPosition();
    setBottomPosition(newPosition);
  }, [isMobile, isShowsPage]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isMobile && isShowsPage) {
        const newPosition = calculateBottomPosition();
        setBottomPosition(newPosition);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, isShowsPage]);

  const handleClick = () => {
    navigate('/submit');
  };

  return (
    <Tooltip title="Add a Show" placement="right">
      <Fab
        color="primary"
        size={size}
        onClick={handleClick}
        sx={{
          position: position,
          bottom: bottomPosition,
          left: 24,
          zIndex: 1000,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          boxShadow: `0 8px 32px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1), bottom 0.3s ease-in-out',
          '&:hover': {
            background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
            transform: 'translateY(-4px)',
            boxShadow: `0 12px 40px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.25)'}`,
          },
          '&:active': {
            transform: 'translateY(-2px)',
          },
        }}
      >
        <FontAwesomeIcon icon={faPlus} />
      </Fab>
    </Tooltip>
  );
};

export default FloatingAddShowButton;
