/**
 * NearbyShowsModal Component
 * Modal for showing available live shows near user's location
 */

import { faClock, faMapMarkerAlt, faMicrophone, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { LocationError, NearbyShow, locationService } from '../../services/LocationService';
import { CustomModal } from '../common/CustomModal';
import { ErrorHandler } from '../ErrorHandler';

interface NearbyShowsModalProps {
  open: boolean;
  onClose: () => void;
  shows: NearbyShow[];
  onJoinShow: (showId: string, userLat: number, userLng: number) => Promise<void>;
  loading?: boolean;
  error?: string | LocationError;
  onRetryLoadShows?: () => void;
}

export const NearbyShowsModal: React.FC<NearbyShowsModalProps> = ({
  open,
  onClose,
  shows,
  onJoinShow,
  loading = false,
  error,
  onRetryLoadShows,
}) => {
  const [joiningShow, setJoiningShow] = useState<string | null>(null);

  const handleJoinShow = async (show: NearbyShow) => {
    const userLocation = locationService.getCachedLocation();
    if (!userLocation) {
      console.error('User location not available');
      return;
    }

    try {
      setJoiningShow(show.show.id);
      await onJoinShow(show.show.id, userLocation.latitude, userLocation.longitude);
      onClose(); // Close modal after successful join
    } catch (error) {
      console.error('Failed to join show:', error);
    } finally {
      setJoiningShow(null);
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

  const getModalTitle = () => {
    if (shows.length === 0) {
      return 'No Live Shows Nearby';
    }
    return shows.length === 1 ? 'Live Show Available!' : 'Multiple Live Shows Available!';
  };

  const getModalMessage = () => {
    if (shows.length === 0) {
      return 'There are currently no active live shows within 30 meters of your location.';
    }
    if (shows.length === 1) {
      return 'We found a live show happening near you! Would you like to join?';
    }
    return "We found multiple live shows near you! Choose which one you'd like to join:";
  };

  return (
    <CustomModal open={open} onClose={onClose} title={getModalTitle()} maxWidth={500}>
      <Box>
        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2, color: 'rgba(255, 255, 255, 0.8)' }}>
              Finding live shows near you...
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              color: '#fff',
              border: '1px solid rgba(244, 67, 54, 0.3)',
            }}
          >
            <ErrorHandler
              error={typeof error === 'string' ? new Error(error) : error}
              onRetry={onRetryLoadShows}
              onDismiss={() => {}}
            />
          </Alert>
        )}

        {/* Message */}
        {!loading && !error && (
          <Typography
            sx={{
              mb: 3,
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            {getModalMessage()}
          </Typography>
        )}

        {/* No Shows State */}
        {!loading && !error && shows.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <FontAwesomeIcon
              icon={faMicrophone}
              style={{
                fontSize: '3rem',
                color: 'rgba(255, 255, 255, 0.3)',
                marginBottom: '16px',
              }}
            />
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3 }}>
              Check back later or explore other venues!
            </Typography>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
              }}
            >
              Close
            </Button>
          </Box>
        )}

        {/* Shows List */}
        {!loading && !error && shows.length > 0 && (
          <Box>
            {shows.map((nearbyShow) => (
              <Card
                key={nearbyShow.show.id}
                sx={{
                  mb: 2,
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          color: '#fff',
                          fontWeight: 600,
                          mb: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <FontAwesomeIcon icon={faMicrophone} size="sm" />
                        {nearbyShow.show.name}
                      </Typography>

                      {nearbyShow.venue && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <FontAwesomeIcon icon={faMapMarkerAlt} size="sm" />
                          {nearbyShow.venue.name} • {nearbyShow.venue.address}
                        </Typography>
                      )}
                    </Box>

                    <Chip
                      label={formatDistance(nearbyShow.distanceMeters)}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(0, 212, 255, 0.2)',
                        color: '#00d4ff',
                        border: '1px solid rgba(0, 212, 255, 0.3)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    {nearbyShow.show.djName && (
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        DJ: {nearbyShow.show.djName}
                      </Typography>
                    )}

                    <Typography
                      variant="caption"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.6)',
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
                        color: 'rgba(255, 255, 255, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <FontAwesomeIcon icon={faUsers} size="sm" />
                      {nearbyShow.show.participants.length} participants
                    </Typography>
                  </Box>

                  {nearbyShow.show.description && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        mb: 2,
                        fontStyle: 'italic',
                      }}
                    >
                      {nearbyShow.show.description}
                    </Typography>
                  )}

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleJoinShow(nearbyShow)}
                    disabled={joiningShow === nearbyShow.show.id}
                    sx={{
                      backgroundColor: '#00d4ff',
                      color: '#1a1a2e',
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: '#00b8d4',
                      },
                      '&:disabled': {
                        backgroundColor: 'rgba(0, 212, 255, 0.3)',
                        color: 'rgba(255, 255, 255, 0.5)',
                      },
                    }}
                  >
                    {joiningShow === nearbyShow.show.id ? (
                      <>
                        <CircularProgress size={16} sx={{ mr: 1, color: 'inherit' }} />
                        Joining...
                      </>
                    ) : (
                      'Join Live Show'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}

            {/* Close button for when there are shows */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={onClose}
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                }}
              >
                Maybe Later
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </CustomModal>
  );
};
