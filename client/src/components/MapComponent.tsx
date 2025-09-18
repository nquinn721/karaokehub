import {
  faClock,
  faGlobe,
  faMapMarkerAlt,
  faMicrophone,
  faPhone,
  faRoute,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { MyLocationRounded } from '@mui/icons-material';
import {
  Box,
  CircularProgress,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { APIProvider, InfoWindow, Map, Marker } from '@vis.gl/react-google-maps';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { apiStore, showStore } from '../stores';
import { mapStore } from '../stores/MapStore';

interface MapComponentProps {
  onScheduleModalOpen?: (show: any) => void;
}

// Popup content component for InfoWindow
const PopupContent: React.FC<{
  show: any;
  onScheduleModalOpen?: (show: any) => void;
}> = ({ show, onScheduleModalOpen }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const formatTime = (time: string): string => {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return time;
    }
  };

  const openDirections = () => {
    // Get the venue address and coordinates
    const address =
      show.address || (show.venue && typeof show.venue === 'object' && show.venue.address);

    const lat = show.latitude || show.lat;
    const lng = show.longitude || show.lng;

    // Build the destination for maps
    let destination = '';
    if (lat && lng) {
      destination = `${lat},${lng}`;
    } else if (address) {
      destination = encodeURIComponent(address);
    } else {
      // Fallback to venue name
      const venueName = showStore.getVenueName(show);
      destination = encodeURIComponent(venueName);
    }

    // Detect device and open appropriate maps app
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let mapsUrl = '';

    if (isIOS) {
      // Open Apple Maps on iOS
      mapsUrl = `maps://?daddr=${destination}`;
    } else if (isAndroid) {
      // Open Google Maps on Android
      mapsUrl = `google.navigation:q=${destination}`;
    } else {
      // Fallback to Google Maps web on desktop
      mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    }

    // Try to open native app, fallback to Google Maps web
    const link = document.createElement('a');
    link.href = mapsUrl;
    link.target = '_blank';

    // For mobile devices, try to open native app
    if (isIOS || isAndroid) {
      link.click();

      // Fallback to Google Maps web if native app doesn't open
      setTimeout(() => {
        const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
        window.open(fallbackUrl, '_blank');
      }, 1000);
    } else {
      // Desktop - open Google Maps web directly
      link.click();
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : theme.palette.background.paper,
        color: 'text.primary',
        p: isMobile ? 1.5 : 2,
        minWidth: isMobile ? 200 : 280,
        maxWidth: isMobile ? 280 : 340,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[4],
      }}
    >
      {/* Main content layout similar to show cards */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: isMobile ? 1.5 : 2,
        }}
      >
        {/* Icon column */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
            minWidth: isMobile ? '24px' : '28px',
          }}
        >
          <FontAwesomeIcon
            icon={faMicrophone}
            style={{
              fontSize: '16px',
              color: theme.palette.primary.main,
            }}
          />
          <Box
            sx={{
              width: '2px',
              height: isMobile ? '20px' : '30px',
              backgroundColor: theme.palette.primary.main,
              opacity: 0.3,
              borderRadius: '1px',
            }}
          />
        </Box>

        {/* Main content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Venue Header */}
          <Typography
            variant={isMobile ? 'subtitle2' : 'subtitle1'}
            fontWeight={600}
            sx={{
              fontSize: isMobile ? '0.95rem' : '1.1rem',
              lineHeight: 1.2,
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {showStore.getVenueName(show)}
          </Typography>

          {/* Time Information */}
          {(show.startTime || show.time) && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                mb: 0.5,
              }}
            >
              <FontAwesomeIcon
                icon={faClock}
                style={{
                  fontSize: '10px',
                  color: theme.palette.primary.main,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  fontSize: isMobile ? '0.7rem' : '0.75rem',
                  color: theme.palette.primary.main,
                }}
              >
                {show.startTime && show.endTime
                  ? `${formatTime(show.startTime)} - ${formatTime(show.endTime)}`
                  : show.time}
              </Typography>
            </Box>
          )}

          {/* Compact info rows */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* DJ Information */}
            {(show.djName || show.dj?.name) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FontAwesomeIcon
                  icon={faMicrophone}
                  style={{
                    fontSize: '11px',
                    color: theme.palette.text.secondary,
                  }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: isMobile ? '0.75rem' : '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  DJ: {show.djName || show.dj?.name}
                </Typography>
              </Box>
            )}

            {/* Host Information */}
            {(show.hostName || show.host?.name || show.organizer) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FontAwesomeIcon
                  icon={faMicrophone}
                  style={{
                    fontSize: '11px',
                    color: theme.palette.primary.main,
                  }}
                />
                <Typography
                  variant="body2"
                  color="primary.main"
                  sx={{
                    fontSize: isMobile ? '0.75rem' : '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  Host: {show.hostName || show.host?.name || show.organizer}
                </Typography>
              </Box>
            )}

            {/* Address */}
            {(show.address ||
              (show.venue && typeof show.venue === 'object' && show.venue.address)) && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                <FontAwesomeIcon
                  icon={faMapMarkerAlt}
                  style={{
                    fontSize: '11px',
                    color: theme.palette.text.secondary,
                    marginTop: '2px',
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontSize: isMobile ? '0.75rem' : '0.8rem',
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                      fontWeight: 500,
                    }}
                  >
                    {show.address ||
                      (show.venue && typeof show.venue === 'object' ? show.venue.address : null)}
                  </Typography>
                  {((show.venue && typeof show.venue === 'object' && show.venue.city) ||
                    (show.venue && typeof show.venue === 'object' && show.venue.state) ||
                    show.city ||
                    show.state) && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                        lineHeight: 1.2,
                        opacity: 0.8,
                      }}
                    >
                      {[
                        show.city ||
                          (show.venue && typeof show.venue === 'object' ? show.venue.city : null),
                        show.state ||
                          (show.venue && typeof show.venue === 'object' ? show.venue.state : null),
                        show.zip,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Contact Information - Desktop Only */}
            {!isMobile && (
              <>
                {show.venuePhone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FontAwesomeIcon
                      icon={faPhone}
                      style={{
                        fontSize: '11px',
                        color: theme.palette.text.secondary,
                      }}
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: '0.75rem',
                      }}
                    >
                      {show.venuePhone}
                    </Typography>
                  </Box>
                )}

                {show.venueWebsite && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FontAwesomeIcon
                      icon={faGlobe}
                      style={{
                        fontSize: '11px',
                        color: theme.palette.text.secondary,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.75rem',
                        color: 'primary.main',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                      onClick={() => window.open(show.venueWebsite, '_blank')}
                    >
                      Visit Website
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Description - if available */}
      {show.description && (
        <Typography
          variant="body2"
          sx={{
            fontSize: isMobile ? '0.75rem' : '0.8rem',
            color: 'text.secondary',
            fontStyle: 'italic',
            lineHeight: 1.3,
            mt: 0.5,
            display: '-webkit-box',
            WebkitLineClamp: isMobile ? 2 : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {show.description}
        </Typography>
      )}

      {/* Action Buttons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 1,
          mt: 1,
          pt: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Directions Button */}
        <IconButton
          size="small"
          onClick={openDirections}
          sx={{
            color: theme.palette.success.main,
            backgroundColor: theme.palette.success.main + '10',
            '&:hover': {
              backgroundColor: theme.palette.success.main + '20',
            },
          }}
          title="Get Directions"
        >
          <FontAwesomeIcon icon={faRoute} style={{ fontSize: '14px' }} />
        </IconButton>

        {/* Schedule Button */}
        {onScheduleModalOpen && (
          <IconButton
            size="small"
            onClick={() => onScheduleModalOpen(show)}
            sx={{
              color: theme.palette.primary.main,
              backgroundColor: theme.palette.primary.main + '10',
              '&:hover': {
                backgroundColor: theme.palette.primary.main + '20',
              },
            }}
            title="View Schedule"
          >
            <FontAwesomeIcon icon={faClock} style={{ fontSize: '14px' }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

const MapComponent: React.FC<MapComponentProps> = observer(({ onScheduleModalOpen }) => {
  const theme = useTheme();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  // Current state
  const currentZoom = mapStore.currentZoom;
  const isZoomedOut = currentZoom <= 6; // Temporarily lower threshold for debugging
  const shows = showStore.shows;

  // Initialize stores only (no API calls in component)
  useEffect(() => {
    const initializeStores = async () => {
      if (!mapStore.isInitialized) {
        await mapStore.initialize();
      }
    };

    initializeStores();
  }, []);

  // Set map instance
  useEffect(() => {
    if (map) {
      mapStore.setMapInstance(map);
    }
  }, [map]);

  // Render individual show markers
  const renderShowMarkers = () => {
    if (shows.length === 0) return null;

    // Log a sample of the first few shows to check data structure

    return shows.map((show: any) => {
      // Try multiple ways to get coordinates
      let lat, lng;

      // First try venue coordinates
      if (show.venue && typeof show.venue === 'object' && show.venue.lat && show.venue.lng) {
        lat = typeof show.venue.lat === 'string' ? parseFloat(show.venue.lat) : show.venue.lat;
        lng = typeof show.venue.lng === 'string' ? parseFloat(show.venue.lng) : show.venue.lng;
      }
      // Fallback to direct show coordinates
      else if (show.lat && show.lng) {
        lat = typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat;
        lng = typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng;
      }

      // Skip if no valid coordinates
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        return null;
      }

      return (
        <Marker
          key={show.id}
          position={{ lat, lng }}
          onClick={() => mapStore.handleMarkerClick(show)}
        />
      );
    });
  };

  // Show loading state while waiting for API key
  const apiKey = apiStore.googleMapsApiKey;

  if (!apiKey) {
    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.palette.background.default,
          gap: 2,
        }}
      >
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          Loading map...
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {apiStore.configLoaded
            ? 'Config loaded - checking API key...'
            : 'Loading config from server...'}
        </Typography>
        {apiStore.configLoaded && !apiKey && (
          <Typography variant="caption" color="error">
            Google Maps API key not available. Check server configuration.
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Zoom indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 1000,
            backgroundColor: theme.palette.background.paper,
            padding: '4px 8px',
            borderRadius: 1,
            boxShadow: theme.shadows[2],
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="caption" color="textSecondary">
            Zoom: {currentZoom} {isZoomedOut ? '(Cities)' : '(Shows)'}
          </Typography>
        </Box>

        {/* Current location button */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <IconButton
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude } = position.coords;
                    mapStore.goToCurrentLocation();
                    if (map) {
                      map.setCenter({ lat: latitude, lng: longitude });
                      map.setZoom(12);
                    }
                  },
                  (error) => {
                    console.error('Error getting current location:', error);
                  },
                );
              }
            }}
            size="small"
            sx={{
              backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#2a2a2a' : '#f5f5f5'),
              color: '#1a73e8',
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 2px 8px rgba(0,0,0,0.5)'
                  : '0 2px 8px rgba(0,0,0,0.15)',
              '&:hover': {
                backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#2a2a2a' : '#f5f5f5'),
                color: '#1a73e8',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 2px 8px rgba(0,0,0,0.5)'
                    : '0 2px 8px rgba(0,0,0,0.15)',
              },
            }}
          >
            <MyLocationRounded fontSize="small" />
          </IconButton>
        </Box>

        {/* Map */}
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={mapStore.userLocation || { lat: 39.8283, lng: -98.5795 }}
          defaultZoom={11}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          colorScheme="DARK"
          styles={undefined} // Use standard Google Maps styling for better venue visibility
          onCameraChanged={(ev) => {
            if (ev.map) {
              // Always update zoom level when camera changes
              const currentMapZoom = ev.map.getZoom() || 11;
              if (currentMapZoom !== mapStore.currentZoom) {
                // Use runInAction to ensure MobX observability
                runInAction(() => {
                  mapStore.currentZoom = currentMapZoom;
                });
              }

              // Set map instance if not already set
              if (!map) {
                setMap(ev.map);
              }
            }
          }}
        >
          {renderShowMarkers()}

          {/* InfoWindow for selected show */}
          {mapStore.selectedShow &&
            (() => {
              const show = mapStore.selectedShow;
              let lat, lng;

              // Use same coordinate extraction logic as markers
              if (
                show.venue &&
                typeof show.venue === 'object' &&
                show.venue.lat &&
                show.venue.lng
              ) {
                lat =
                  typeof show.venue.lat === 'string' ? parseFloat(show.venue.lat) : show.venue.lat;
                lng =
                  typeof show.venue.lng === 'string' ? parseFloat(show.venue.lng) : show.venue.lng;
              } else if (show.lat && show.lng) {
                lat = typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat;
                lng = typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng;
              }

              // Only render InfoWindow if we have valid coordinates
              if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                return null;
              }

              return (
                <InfoWindow
                  position={{ lat, lng }}
                  onCloseClick={() => mapStore.clearSelectedShow()}
                  pixelOffset={[0, -10]}
                  maxWidth={400}
                >
                  <PopupContent show={show} onScheduleModalOpen={onScheduleModalOpen} />
                </InfoWindow>
              );
            })()}
        </Map>
      </Box>
    </APIProvider>
  );
});

export default MapComponent;
