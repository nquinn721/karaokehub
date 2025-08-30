import { faFlag } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material';
import React from 'react';
import { Show } from '../../stores/ShowStore';

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
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="flag-show-dialog-title"
      aria-describedby="flag-show-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        id="flag-show-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 1,
        }}
      >
        <FontAwesomeIcon icon={faFlag} style={{ fontSize: '20px', color: '#ff9800' }} />
        Flag Show as Non-Existent
      </DialogTitle>

      <DialogContent>
        <DialogContentText id="flag-show-dialog-description" sx={{ mb: 2 }}>
          Are you sure this show doesn't exist? This will mark the show as flagged and help us
          improve our data quality.
        </DialogContentText>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Show Details:
        </Typography>

        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>Venue:</strong> {(show.venue && typeof show.venue === 'object' ? show.venue.name : show.venue) || 'Unknown Venue'}
        </Typography>

        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>DJ/Host:</strong> {show.dj?.name || 'Unknown Host'}
        </Typography>

        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>Location:</strong> {show.venue && typeof show.venue === 'object' ? show.venue.address : null}
        </Typography>

        {show.venue && typeof show.venue === 'object' && (show.venue.city || show.venue.state) && (
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>City:</strong> {[show.venue.city, show.venue.state].filter(Boolean).join(', ')}
          </Typography>
        )}

        <Typography variant="body2">
          <strong>Time:</strong> {show.startTime} - {show.endTime}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
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
      </DialogActions>
    </Dialog>
  );
};
