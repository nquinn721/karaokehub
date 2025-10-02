/**
 * DashboardLiveShowPrompt Component
 * Shows available nearby shows on the dashboard when user hasn't joined from modal
 */

import {
  faClock,
  faMapMarkerAlt,
  faMicrophone,
  faTimes,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Box, Button, Chip, IconButton, Typography } from '@mui/material';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { locationService } from '../../services/LocationService';
import { liveShowStore } from '../../stores/LiveShowStore';

export const DashboardLiveShowPrompt: React.FC = observer(() => {
  const handleJoinShow = async (showId: string) => {
    const userLocation = locationService.getCachedLocation();
    if (!userLocation) {
      console.error('User location not available');
      return;
    }

    try {
      await liveShowStore.joinShowWithLocation(
        showId,
        userLocation.latitude,
        userLocation.longitude,
      );
    } catch (error) {
      console.error('Failed to join show:', error);
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m away`;
    }
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  const formatTime = (timeString: string): string => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  if (!liveShowStore.shouldShowDashboardPrompt) {
    return null;
  }

  const nearbyShow = liveShowStore.nearbyShows[0]; // Show the closest one

  return (
    <Alert
      severity="info"
      sx={{
        mb: 3,
        background:
          'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 188, 212, 0.1) 100%)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        color: '#fff',
        '& .MuiAlert-icon': {
          color: '#00d4ff',
        },
      }}
      action={
        <IconButton
          size="small"
          onClick={liveShowStore.dismissDashboardPrompt}
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <FontAwesomeIcon icon={faTimes} />
        </IconButton>
      }
    >
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FontAwesomeIcon icon={faMicrophone} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Live Show Nearby!
          </Typography>
          <Chip
            label={formatDistance(nearbyShow.distanceMeters)}
            size="small"
            sx={{
              backgroundColor: 'rgba(0, 212, 255, 0.3)',
              color: '#00d4ff',
              border: '1px solid rgba(0, 212, 255, 0.5)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
            {nearbyShow.show.name}
          </Typography>

          {nearbyShow.venue && (
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                mb: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <FontAwesomeIcon icon={faMapMarkerAlt} size="sm" />
              {nearbyShow.venue.name} • {nearbyShow.venue.address}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {nearbyShow.show.djName && (
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                DJ: {nearbyShow.show.djName}
              </Typography>
            )}

            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <FontAwesomeIcon icon={faClock} size="sm" />
              {formatTime(nearbyShow.show.startTime)}
              {nearbyShow.show.endTime && ` - ${formatTime(nearbyShow.show.endTime)}`}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <FontAwesomeIcon icon={faUsers} size="sm" />
              {nearbyShow.show.participants.length} participants
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => handleJoinShow(nearbyShow.show.id)}
            disabled={liveShowStore.isJoining}
            sx={{
              backgroundColor: '#00d4ff',
              color: '#1a1a2e',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#00b8d4',
              },
            }}
          >
            {liveShowStore.isJoining ? 'Joining...' : 'Join Live Show'}
          </Button>

          {liveShowStore.nearbyShows.length > 1 && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                liveShowStore.showNearbyModal = true;
              }}
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
              }}
            >
              View All ({liveShowStore.nearbyShows.length})
            </Button>
          )}
        </Box>
      </Box>
    </Alert>
  );
});
