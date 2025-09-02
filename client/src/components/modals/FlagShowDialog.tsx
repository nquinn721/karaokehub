import { faFlag } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Button, Typography } from '@mui/material';
import React from 'react';
import { Show } from '../../stores/ShowStore';
import CustomModal from '../CustomModal';

interface FlagShowDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  show: Show | null;
  loading?: boolean;
}

export const FlagShowDialog: React.FC<FlagShowDialogProps> = ({
  open,
  onClose,
  onConfirm,
  show,
  loading = false,
}) => {
  if (!show) return null;

  return (
    <CustomModal
      open={open}
      onClose={onClose}
      title="Flag Show as Non-Existent"
      icon={<FontAwesomeIcon icon={faFlag} style={{ color: '#ff9800' }} />}
      maxWidth="sm"
    >
      <Typography variant="body1" sx={{ mb: 2 }}>
        Are you sure this show doesn't exist? This will mark the show as flagged and help us improve
        our data quality.
      </Typography>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Show Details:
      </Typography>

      <Typography variant="body2" sx={{ mb: 0.5 }}>
        <strong>Venue:</strong>{' '}
        {(show.venue && typeof show.venue === 'object' ? show.venue.name : show.venue) ||
          'Unknown Venue'}
      </Typography>

      <Typography variant="body2" sx={{ mb: 0.5 }}>
        <strong>DJ/Host:</strong> {show.dj?.name || 'Unknown Host'}
      </Typography>

      <Typography variant="body2" sx={{ mb: 0.5 }}>
        <strong>Location:</strong>{' '}
        {show.venue && typeof show.venue === 'object' ? show.venue.address : null}
      </Typography>

      {show.venue && typeof show.venue === 'object' && (show.venue.city || show.venue.state) && (
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>City:</strong> {[show.venue.city, show.venue.state].filter(Boolean).join(', ')}
        </Typography>
      )}

      <Typography variant="body2" sx={{ mb: 3 }}>
        <strong>Time:</strong> {show.startTime} - {show.endTime}
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="warning"
          variant="contained"
          disabled={loading}
          startIcon={<FontAwesomeIcon icon={faFlag} style={{ fontSize: '14px' }} />}
        >
          {loading ? 'Flagging...' : 'Flag Show'}
        </Button>
      </Box>
    </CustomModal>
  );
};
