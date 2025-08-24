import { faLocationArrow, faMapMarkerAlt, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';
import { Show } from '@stores/ShowStore';
import { apiStore } from '@stores/index';
import { geocodingService } from '@utils/geocoding';
import React, { useCallback, useEffect, useState } from 'react';

interface LocationTrackingModalProps {
  open: boolean;
  onClose: () => void;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface ShowWithDistance extends Show {
  distance?: number;
}

export const LocationTrackingModal: React.FC<LocationTrackingModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [address, setAddress] = useState<string>('');
  const [nearbyShows, setNearbyShows] = useState<ShowWithDistance[]>([]);
  const [showsWithin100m, setShowsWithin100m] = useState<ShowWithDistance[]>([]);
  const [allShows, setAllShows] = useState<ShowWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapImageUrl, setMapImageUrl] = useState<string>('');
  const [isTracking, setIsTracking] = useState(false);

  // Get current location with fallback strategy
  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    // Try high accuracy first, then fallback to lower accuracy
    const getLocationWithOptions = async (options: PositionOptions): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });
    };

    try {
      let position: GeolocationPosition;
      
      try {
        // First attempt: High accuracy with shorter timeout
        console.log('📍 Attempting high accuracy location...');
        position = await getLocationWithOptions({
          enableHighAccuracy: true,
          timeout: 10000, // Reduced from 15000
          maximumAge: 30000, // Allow cached positions up to 30 seconds old
        });
        console.log('✅ High accuracy location successful');
      } catch (highAccuracyError) {
        console.log('📍 High accuracy failed, trying standard accuracy...');
        
        // Fallback: Standard accuracy with longer timeout
        position = await getLocationWithOptions({
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60000, // Allow older cached positions for fallback
        });
        console.log('✅ Standard accuracy location successful');
      }

      const userLocation: UserLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
      };

      setLocation(userLocation);

      // Get shows and address using backend endpoint
      const response = await apiStore.get(
        apiStore.endpoints.location.proximityCheck(
          userLocation.latitude,
          userLocation.longitude,
          10,
        ),
      );

      if (response) {
        setAddress(response.location.address);
        setNearbyShows(response.withinRadius || []);
        setShowsWithin100m(response.within100m || []);
        setAllShows(response.allShowsByDistance || []);
      }

      // Generate Google Maps static image URL
      const googleMapsApiKey = apiStore.googleMapsApiKey;
      if (googleMapsApiKey) {
        const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${userLocation.latitude},${userLocation.longitude}&zoom=18&size=400x300&maptype=roadmap&markers=color:red%7C${userLocation.latitude},${userLocation.longitude}&key=${googleMapsApiKey}`;
        setMapImageUrl(mapUrl);
      }
    } catch (err: any) {
      // Log error for debugging but don't show to user for common location issues
      console.log('📍 Location error:', err.message || err);
      
      // Only show user-facing errors for critical issues
      if (err.message && err.message.includes('not supported')) {
        setError('Geolocation is not supported by this browser');
      } else if (err.message && err.message.includes('denied')) {
        setError('Location access denied. Please enable location services.');
      } else {
        // For other errors (like accuracy issues), just log them
        console.warn('🎯 Location tracking issue (continuing in background):', err.message || err);
      }
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies to prevent recreation

  // Start tracking location every 30 seconds
  const startTracking = useCallback(() => {
    if (isTracking) return;

    setIsTracking(true);
    getCurrentLocation();

    const interval = setInterval(() => {
      getCurrentLocation();
    }, 30000); // 30 seconds

    // Store interval for cleanup
    (window as any).__locationTrackingInterval = interval;
  }, [isTracking]); // Removed getCurrentLocation dependency

  // Stop tracking
  const stopTracking = useCallback(() => {
    setIsTracking(false);

    if ((window as any).__locationTrackingInterval) {
      clearInterval((window as any).__locationTrackingInterval);
      delete (window as any).__locationTrackingInterval;
    }
  }, []);

  // Start tracking when modal opens
  useEffect(() => {
    if (open) {
      // Set the API key for geocoding service
      const googleMapsApiKey = apiStore.googleMapsApiKey;
      if (googleMapsApiKey) {
        geocodingService.setApiKey(googleMapsApiKey);
      }

      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [open]); // Removed startTracking and stopTracking from dependencies

  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(2)}km`;
    }
  };

  const formatTime = (time: string): string => {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return time;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
          px: 3,
          pt: 3,
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}10 0%, transparent 100%)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              backgroundColor: theme.palette.primary.main + '15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesomeIcon
              icon={faLocationArrow}
              style={{
                color: theme.palette.primary.main,
                fontSize: '20px',
              }}
            />
          </Box>
          <Box>
            <Typography variant="h5" component="div" fontWeight={600}>
              Location Tracking
            </Typography>
            <Typography variant="body2" component="div" color="text.secondary">
              {isTracking
                ? 'Tracking active - Updates every 30 seconds'
                : 'Real-time show proximity detection'}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            backgroundColor: theme.palette.action.hover,
            '&:hover': {
              backgroundColor: theme.palette.action.selected,
            },
          }}
        >
          <FontAwesomeIcon icon={faTimes} style={{ fontSize: '16px' }} />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          px: 3,
          py: 2,
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme.palette.action.hover,
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.action.selected,
            borderRadius: 4,
          },
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && location && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Current Location */}
            <Card variant="outlined">
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                  Current Location
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Address:</strong> {address}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Coordinates:</strong> {location.latitude.toFixed(6)},{' '}
                  {location.longitude.toFixed(6)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Accuracy:</strong> ±{Math.round(location.accuracy)}m
                </Typography>
              </CardContent>
            </Card>

            {/* Google Maps Screenshot */}
            {mapImageUrl && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Location Map (Zoomed In)
                  </Typography>
                  <Box sx={{ textAlign: 'center' }}>
                    <img
                      src={mapImageUrl}
                      alt="Current location map"
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: '8px',
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Shows within 10 meters */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Shows Within 10 Meters
                </Typography>
                {nearbyShows.length === 0 ? (
                  <Typography color="text.secondary">
                    No shows found within 10 meters of your location.
                  </Typography>
                ) : (
                  <List>
                    {nearbyShows.map((show, index) => (
                      <React.Fragment key={show.id}>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {show.venue}
                                </Typography>
                                <Typography variant="body2" color="primary">
                                  {formatDistance(show.distance || 0)}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {show.address}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  DJ: {show.dj?.name || 'Unknown'} • {formatTime(show.startTime)} -{' '}
                                  {formatTime(show.endTime || '23:59')}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < nearbyShows.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>

            {/* Shows within 100 meters */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Shows Within 100 Meters
                </Typography>
                {showsWithin100m.length === 0 ? (
                  <Typography color="text.secondary">
                    No shows found within 100 meters of your location.
                  </Typography>
                ) : (
                  <List>
                    {showsWithin100m.map((show, index) => (
                      <React.Fragment key={show.id}>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {show.venue}
                                </Typography>
                                <Typography variant="body2" color="primary">
                                  {formatDistance(show.distance || 0)}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {show.address}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  DJ: {show.dj?.name || 'Unknown'} • {formatTime(show.startTime)} -{' '}
                                  {formatTime(show.endTime || '23:59')}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < showsWithin100m.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>

            {/* All Shows By Distance */}
            <Card variant="outlined" sx={{ bgcolor: theme.palette.primary.main + '08' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  All Shows By Distance
                </Typography>
                {allShows.length === 0 ? (
                  <Typography color="text.secondary">
                    No shows found for today.
                  </Typography>
                ) : (
                  <List>
                    {allShows.map((show, index) => (
                      <React.Fragment key={show.id}>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {show.venue}
                                </Typography>
                                <Typography variant="body2" color="primary" fontWeight={600}>
                                  {formatDistance(show.distance || 0)}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {show.address}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  DJ: {show.dj?.name || 'Unknown'} • {formatTime(show.startTime)} -{' '}
                                  {formatTime(show.endTime || '23:59')}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < allShows.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>

            {/* Manual Refresh Button */}
            <Box sx={{ textAlign: 'center', pt: 2 }}>
              <Button
                variant="outlined"
                onClick={getCurrentLocation}
                disabled={loading}
                startIcon={<FontAwesomeIcon icon={faLocationArrow} />}
                sx={{ borderRadius: 2 }}
              >
                Refresh Location
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LocationTrackingModal;
