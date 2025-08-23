import {
  faCalendarDay,
  faClock,
  faLocationDot,
  faMapMarkerAlt,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import React from 'react';
import { VenueProximity } from '../services/GeolocationService';

interface VenueDetectionModalProps {
  open: boolean;
  onClose: () => void;
  venueProximity: VenueProximity;
  onConfirm: (showId: string) => void;
  onDismiss: () => void;
}

export const VenueDetectionModal: React.FC<VenueDetectionModalProps> = ({
  open,
  onClose,
  venueProximity,
  onConfirm,
  onDismiss,
}) => {
  const { show, distance, isAtVenue } = venueProximity;

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m away`;
    }
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  const getLocationStatusText = (): string => {
    if (isAtVenue) {
      return 'You appear to be at this venue!';
    }
    return `You're near this venue (${formatDistance(distance)})`;
  };

  const getLocationStatusColor = (): 'success' | 'info' => {
    return isAtVenue ? 'success' : 'info';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FontAwesomeIcon
              icon={faLocationDot}
              style={{
                color: isAtVenue ? '#4caf50' : '#2196f3',
                fontSize: '24px',
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Venue Detected
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <FontAwesomeIcon icon={faTimes} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Box sx={{ mb: 3 }}>
          <Chip
            icon={<FontAwesomeIcon icon={faMapMarkerAlt} />}
            label={getLocationStatusText()}
            color={getLocationStatusColor()}
            variant="outlined"
            sx={{ mb: 2 }}
          />
        </Box>

        <Paper
          elevation={2}
          sx={{
            p: 3,
            mb: 3,
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            {show.venue || 'Karaoke Show'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <FontAwesomeIcon icon={faLocationDot} style={{ fontSize: '14px', opacity: 0.7 }} />
            <Typography variant="body2" color="text.secondary">
              {show.address}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={faCalendarDay} style={{ fontSize: '14px', opacity: 0.7 }} />
              <Typography variant="body2">
                {show.day.charAt(0).toUpperCase() + show.day.slice(1)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={faClock} style={{ fontSize: '14px', opacity: 0.7 }} />
              <Typography variant="body2">
                {show.startTime} - {show.endTime}
              </Typography>
            </Box>
          </Box>

          {show.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {show.description}
            </Typography>
          )}
        </Paper>

        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          We detected you're {isAtVenue ? 'at' : 'near'} this venue based on your location.
          {isAtVenue ? ' Are you attending this show?' : ' Are you heading to this show?'}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onDismiss} variant="outlined" sx={{ minWidth: 100 }}>
          Not Me
        </Button>
        <Button
          onClick={() => onConfirm(show.id)}
          variant="contained"
          sx={{
            minWidth: 120,
            background: 'linear-gradient(135deg, #64b5f6 0%, #1976d2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #42a5f5 0%, #1565c0 100%)',
            },
          }}
        >
          {isAtVenue ? "I'm Here!" : "That's Me!"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VenueDetectionModal;
