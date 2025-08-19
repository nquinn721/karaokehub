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
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { apiStore, showStore } from '../stores';
import { mapStore } from '../stores/MapStore';

// Popup content component for InfoWindow
const PopupContent: React.FC<{
  show: any;
}> = ({ show }) => {
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
            {show.venue || show.vendor?.name || 'Unknown Venue'}
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
                    fontWeight: 500,
                  }}
                >
                  {show.djName || show.dj?.name}
                </Typography>
              </Box>
            )}

            {/* Address */}
            {show.address && (
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
                    }}
                  >
                    {show.address}
                  </Typography>
                  {(show.city || show.state) && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                        lineHeight: 1.2,
                        opacity: 0.8,
                      }}
                    >
                      {[show.city, show.state, show.zip].filter(Boolean).join(', ')}
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
    </Box>
  );
};

const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: '#1b1b1b' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry',
    stylers: [{ color: '#4e4e4e' }],
  },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

const SimpleMapNew: React.FC = observer(() => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Current state
  const currentZoom = mapStore.currentZoom;
  const isZoomedOut = currentZoom <= 9;
  const shows = showStore.shows;
  const citySummaries = showStore.citySummaries;

  console.log('🗺️ SimpleMapNew render:', {
    currentZoom,
    isZoomedOut,
    showsCount: shows.length,
    citySummariesCount: citySummaries.length,
    selectedDay: showStore.selectedDay,
    useDayFilter: showStore.useDayFilter,
    isDarkMode: isDarkMode,
    darkMapStyles: darkMapStyles.length,
  });

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
    if (isZoomedOut || shows.length === 0) return null;

    console.log(`📍 Rendering ${shows.length} show markers`);

    return shows.map((show: any) => {
      if (!show.lat || !show.lng) return null;

      const lat = typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat;
      const lng = typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng;

      return (
        <Marker
          key={show.id}
          position={{ lat, lng }}
          onClick={() => mapStore.handleMarkerClick(show)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: theme.palette.primary.main,
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
          }}
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
          icon={{
            url: `data:image/svg+xml,${encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="${theme.palette.primary.main}" stroke="white" stroke-width="2"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="10" font-weight="bold">${city.showCount}</text>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
          }}
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
          styles={isDarkMode ? darkMapStyles : undefined}
          onCameraChanged={(ev) => {
            if (ev.map && !map) {
              console.log('🗺️ Map loaded, setting map instance');
              console.log(
                '🎨 Dark mode:',
                isDarkMode,
                'Styles applied:',
                isDarkMode ? 'dark' : 'none',
              );
              setMap(ev.map);
            }
          }}
        >
          {renderShowMarkers()}
          {renderCityMarkers()}

          {/* InfoWindow for selected show */}
          {mapStore.selectedShow && (
            <InfoWindow
              position={{
                lat:
                  typeof mapStore.selectedShow.lat === 'string'
                    ? parseFloat(mapStore.selectedShow.lat)
                    : mapStore.selectedShow.lat,
                lng:
                  typeof mapStore.selectedShow.lng === 'string'
                    ? parseFloat(mapStore.selectedShow.lng)
                    : mapStore.selectedShow.lng,
              }}
              onCloseClick={() => mapStore.clearSelectedShow()}
              pixelOffset={[0, -10]}
              maxWidth={400}
            >
              <PopupContent show={mapStore.selectedShow} />
            </InfoWindow>
          )}
        </Map>
      </Box>
    </APIProvider>
  );
});

export default SimpleMapNew;
