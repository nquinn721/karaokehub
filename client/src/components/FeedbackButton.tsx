import { faComments } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Fab, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import FeedbackModal from './FeedbackModal';

interface FeedbackButtonProps {
  position?: 'fixed' | 'static';
  size?: 'small' | 'medium' | 'large';
}

const FeedbackButton: React.FC<FeedbackButtonProps> = ({ position = 'fixed', size = 'medium' }) => {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  
  // Check if we're on shows page where bottom sheet might interfere
  const isShowsPage = location.pathname === '/shows';
  
  // Hide completely on mobile shows page (feedback will be in drawer instead)
  if (isMobile && isShowsPage) {
    return null;
  }
  
  // Adjust bottom position based on device and page
  const getBottomPosition = () => {
    if (!isMobile) return 24; // Desktop: normal position
    if (isShowsPage) return 120; // Mobile shows page: higher to avoid bottom sheet
    return 80; // Mobile other pages: slightly higher than desktop
  };

  return (
    <>
      <Tooltip title="Send Feedback" placement="left">
        <Fab
          color="primary"
          size={size}
          onClick={() => setFeedbackOpen(true)}
          sx={
            position === 'fixed'
              ? {
                  position: 'fixed',
                  bottom: getBottomPosition(),
                  right: { xs: 16, md: 24 }, // Slightly closer to edge on mobile
                  zIndex: 1000,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    transform: 'scale(1.05)',
                  },
                  transition: 'transform 0.2s ease-in-out',
                }
              : {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  },
                }
          }
        >
          <FontAwesomeIcon icon={faComments} />
        </Fab>
      </Tooltip>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
};

export default FeedbackButton;
