import { faMusic } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Fab, Tooltip, useTheme } from '@mui/material';
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import SongRequestModal from '../pages/components/SongRequestModal';

interface FloatingSongRequestButtonProps {
  position?: 'fixed' | 'absolute';
  size?: 'small' | 'medium' | 'large';
}

const FloatingSongRequestButton: React.FC<FloatingSongRequestButtonProps> = ({
  position = 'fixed',
  size = 'medium',
}) => {
  const theme = useTheme();
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);

  // Only show on live show pages
  const isLiveShowPage = location.pathname.startsWith('/live-shows/');

  const handleSongRequest = (songRequest: string) => {
    // TODO: Implement song request submission logic
    console.log('Song request submitted:', songRequest);
    // This would integrate with the live show store to submit the request
  };

  const handleClick = () => {
    setModalOpen(true);
  };

  // Hide the button if we're not on a live show page
  if (!isLiveShowPage) {
    return null;
  }

  return (
    <>
      <Tooltip title="Request Song" placement="left">
        <Fab
          color="secondary"
          size={size}
          onClick={handleClick}
          sx={{
            position: position,
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
            boxShadow: `0 8px 32px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.secondary.dark}, ${theme.palette.primary.dark})`,
              transform: 'translateY(-4px)',
              boxShadow: `0 12px 40px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.25)'}`,
            },
            '&:active': {
              transform: 'translateY(-2px)',
            },
          }}
        >
          <FontAwesomeIcon icon={faMusic} />
        </Fab>
      </Tooltip>

      <SongRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSongRequest}
        isForQueue={true}
      />
    </>
  );
};

export default FloatingSongRequestButton;
