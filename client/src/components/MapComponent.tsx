import {
  faClock,
  faGlobe,
  faMapMarkerAlt,
  faMicrophone,
  faPhone,
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

      {/* Schedule Button */}
      {onScheduleModalOpen && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mt: 1,
            pt: 1,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
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
          >
            <FontAwesomeIcon icon={faClock} style={{ fontSize: '14px' }} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

const MapComponent: React.FC<MapComponentProps> = observer(({ onScheduleModalOpen }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [map, setMap] = useState<google.maps.Map | null>(null);
  // Current state
  const currentZoom = mapStore.currentZoom;
  const isZoomedOut = currentZoom <= 6; // Temporarily lower threshold for debugging
  const shows = showStore.shows;
  const citySummaries = showStore.citySummaries;

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
      console.log('🗺️ Setting map instance');
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
        console.log(`⚠️ Show ${show.id} missing/invalid coordinates:`, {
          venueCoords: show.venue ? { lat: show.venue.lat, lng: show.venue.lng } : null,
          directCoords: { lat: (show as any).lat, lng: (show as any).lng },
        });
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

  // Render city summary markers
  const renderCityMarkers = () => {
    if (!isZoomedOut || citySummaries.length === 0) return null;

    console.log(`🏙️ Rendering ${citySummaries.length} city markers`);

    return citySummaries.map((city: any, index: number) => {
      if (!city.lat || !city.lng) return null;

      const lat = typeof city.lat === 'string' ? parseFloat(city.lat) : city.lat;
      const lng = typeof city.lng === 'string' ? parseFloat(city.lng) : city.lng;

      return (
        <Marker
          key={`${city.city}-${city.state}-${index}`}
          position={{ lat, lng }}
          onClick={() => {
            console.log(`🏙️ City clicked: ${city.city}, ${city.state} (${city.showCount} shows)`);
            // Could expand to show individual shows for this city
          }}
          title={`${city.city}, ${city.state} (${city.showCount} shows)`}
        />
      );
    });
  };

  // Show loading state while waiting for API key
  const apiKey = apiStore.googleMapsApiKey;
  console.log('🗺️ SimpleMapNew API key check:', {
    apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined',
    configLoaded: apiStore.configLoaded,
    hasClientConfig: !!apiStore.clientConfig,
  });

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
                console.log('🔍 Zoom changed:', mapStore.currentZoom, '->', currentMapZoom);
                // Use runInAction to ensure MobX observability
                runInAction(() => {
                  mapStore.currentZoom = currentMapZoom;
                });
              }

              // Set map instance if not already set
              if (!map) {
                console.log('🗺️ Map loaded, setting map instance');
                console.log(
                  '🎨 Dark mode:',
                  isDarkMode,
                  'Styles applied:',
                  isDarkMode ? 'dark' : 'none',
                );
                setMap(ev.map);
              }
            }
          }}
        >
          {renderShowMarkers()}
          {renderCityMarkers()}

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
                console.log('⚠️ InfoWindow: Invalid coordinates for selected show:', show);
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
