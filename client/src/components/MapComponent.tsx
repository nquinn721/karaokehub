import {
  faCalendarAlt,
  faClock,
  faGlobe,
  faMapMarkerAlt,
  faMicrophone,
  faPhone,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
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

interface MapComponentProps {
  onScheduleModalOpen?: (show: any) => void;
}

// PopupContent component for InfoWindow
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
        backgroundColor: theme.palette.background.paper,
        color: 'text.primary',
        p: isMobile ? 1.5 : 2,
        minWidth: isMobile ? 200 : 280,
        maxWidth: isMobile ? 280 : 340,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[4],
      }}
    >
      {/* Venue Header */}
      <Typography
        variant={isMobile ? 'subtitle2' : 'subtitle1'}
        fontWeight={600}
        sx={{
          fontSize: isMobile ? '0.95rem' : '1.1rem',
          lineHeight: 1.2,
          mb: 1,
        }}
      >
        {show.venue || show.vendor?.name || 'Unknown Venue'}
      </Typography>

      {/* Time Information */}
      {(show.startTime || show.time) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <FontAwesomeIcon
            icon={faClock}
            style={{
              fontSize: '12px',
              color: theme.palette.primary.main,
            }}
          />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: theme.palette.primary.main,
            }}
          >
            {show.startTime && show.endTime
              ? `${formatTime(show.startTime)} - ${formatTime(show.endTime)}`
              : show.time}
          </Typography>
        </Box>
      )}

      {/* DJ Information */}
      {(show.djName || show.dj?.name) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <FontAwesomeIcon
            icon={faMicrophone}
            style={{
              fontSize: '12px',
              color: theme.palette.text.secondary,
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {show.djName || show.dj?.name}
          </Typography>
        </Box>
      )}

      {/* Address */}
      {show.address && (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 1 }}>
          <FontAwesomeIcon
            icon={faMapMarkerAlt}
            style={{
              fontSize: '12px',
              color: theme.palette.text.secondary,
              marginTop: '2px',
            }}
          />
          <Box>
            <Typography variant="body2" color="text.secondary">
              {show.address}
            </Typography>
            {(show.city || show.state) && (
              <Typography variant="caption" color="text.secondary">
                {[show.city, show.state, show.zip].filter(Boolean).join(', ')}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Contact Information */}
      {!isMobile && show.venuePhone && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <FontAwesomeIcon
            icon={faPhone}
            style={{
              fontSize: '12px',
              color: theme.palette.text.secondary,
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {show.venuePhone}
          </Typography>
        </Box>
      )}

      {!isMobile && show.venueWebsite && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FontAwesomeIcon
            icon={faGlobe}
            style={{
              fontSize: '12px',
              color: theme.palette.text.secondary,
            }}
          />
          <Typography
            variant="body2"
            sx={{
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

      {/* Description */}
      {show.description && (
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.8rem',
            color: 'text.secondary',
            fontStyle: 'italic',
            lineHeight: 1.3,
            mt: 1,
            mb: 1,
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
          mt: show.description ? 1 : 1.5,
          pt: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <IconButton
          size="small"
          onClick={() => {
            if (onScheduleModalOpen) {
              onScheduleModalOpen(show);
            } else {
              console.log('Schedule clicked for show:', show);
            }
          }}
          sx={{
            color: theme.palette.primary.main,
            backgroundColor: theme.palette.primary.main + '10',
            '&:hover': {
              backgroundColor: theme.palette.primary.main + '20',
            },
          }}
        >
          <FontAwesomeIcon icon={faCalendarAlt} style={{ fontSize: '14px' }} />
        </IconButton>
      </Box>
    </Box>
  );
};

const MapComponent: React.FC<MapComponentProps> = observer(({ onScheduleModalOpen }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [clusterer, setClusterer] = useState<MarkerClusterer | null>(null);

  // Wait for mapStore to be initialized
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapStore.isInitialized) {
        await mapStore.initialize();
      }

      // Get user location with mobile awareness
      await mapStore.goToCurrentLocation(isMobile);
    };

    initializeMap();
  }, [isMobile]);

  // Set map instance when map loads
  useEffect(() => {
    if (map && mapStore) {
      console.log('🗺️ Map instance ready, setting in MapStore');
      mapStore.setMapInstance(map);
    }
  }, [map]);

  // Trigger data fetch when filters change
  useEffect(() => {
    if (mapStore?.isInitialized && mapStore.mapInstance) {
      console.log('🔄 Filter changed, triggering data fetch');
      mapStore.fetchDataForCurrentView();
    }
  }, [showStore.selectedDay, showStore.vendorFilter, mapStore?.isInitialized]);

  // Set up clustering for low zoom levels
  useEffect(() => {
    if (!map || !mapStore) return;

    const zoom = mapStore.currentZoom;
    const filteredShows = showStore.filteredShows;

    // Clear existing clusterer
    if (clusterer) {
      clusterer.clearMarkers();
      setClusterer(null);
    }

    // Only cluster at zoom 9 or less
    if (zoom <= 9 && filteredShows.length > 0) {
      console.log('🎯 Setting up clustering for zoom', zoom, 'with', filteredShows.length, 'shows');

      // Create markers for clustering using filtered shows
      const markers: google.maps.Marker[] = [];

      filteredShows.forEach((show: any) => {
        if (!show.lat || !show.lng) return;

        const lat = typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat;
        const lng = typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng;

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: null, // Don't add to map yet
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0.1,
            fillOpacity: 0,
            strokeWeight: 0,
          },
        });

        markers.push(marker);
      });
      console.log('🗂️ Created', markers.length, 'markers for clustering', filteredShows);
      if (markers.length > 0) {
        const newClusterer = new MarkerClusterer({
          map,
          markers,
          renderer: {
            render: ({ count, position }) => {
              const marker = new google.maps.Marker({
                position,
                icon: {
                  url: `data:image/svg+xml,${encodeURIComponent(`
                    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="20" cy="20" r="18" fill="#f44336" stroke="white" stroke-width="2"/>
                      <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${count}</text>
                    </svg>
                  `)}`,
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20),
                },
                zIndex: 1000,
              });

              // Zoom in when cluster is clicked
              marker.addListener('click', () => {
                map.setZoom(12);
                map.setCenter(position);
              });

              return marker;
            },
          },
        });

        setClusterer(newClusterer);
      }
    }
  }, [map, mapStore?.currentZoom, showStore.filteredShows]);

  // Render individual show markers (for zoom > 9)
  const renderShowMarkers = () => {
    if (!mapStore || mapStore.currentZoom <= 9) return null;

    const shows = showStore.shows;
    console.log(`📍 Rendering ${shows.length} show markers`);

    return shows.map((show: any) => {
      if (!show.lat || !show.lng) return null;

      const lat = typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat;
      const lng = typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng;

      const isSelected = mapStore.selectedShow?.id === show.id;
      const iconColor = isSelected ? '#ff5722' : '#f44336'; // Red colors

      return (
        <Marker
          key={show.id}
          position={{ lat, lng }}
          onClick={() => mapStore.handleMarkerClick(show)}
          icon={{
            url: `data:image/svg+xml,${encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="${iconColor}" stroke="white" stroke-width="2"/>
                <!-- Microphone body -->
                <rect x="14" y="8" width="4" height="10" rx="2" fill="white"/>
                <!-- Microphone base -->
                <path d="M12 16c0 2.2 1.8 4 4 4s4-1.8 4-4" stroke="white" stroke-width="1.5" fill="none"/>
                <!-- Microphone stand -->
                <line x1="16" y1="20" x2="16" y2="24" stroke="white" stroke-width="1.5"/>
                <line x1="12" y1="24" x2="20" y2="24" stroke="white" stroke-width="1.5"/>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(isSelected ? 36 : 32, isSelected ? 36 : 32),
            anchor: new google.maps.Point(isSelected ? 18 : 16, isSelected ? 18 : 16),
          }}
        />
      );
    });
  };

  // Show loading if API key is not ready
  if (!apiStore.googleMapsApiKey) {
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
        {apiStore.configLoaded && !apiStore.googleMapsApiKey && (
          <Typography variant="caption" color="error">
            Google Maps API key not available
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <APIProvider apiKey={apiStore.googleMapsApiKey}>
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
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
            onClick={() => mapStore?.goToCurrentLocation()}
            size="small"
            sx={{
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.primary.main,
              boxShadow: theme.shadows[2],
              '&:hover': {
                backgroundColor: theme.palette.background.paper,
              },
            }}
          >
            <MyLocationRounded fontSize="small" />
          </IconButton>
        </Box>

        {/* Zoom indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 66,
            left: 16,
            zIndex: 1000,
            backgroundColor: theme.palette.background.paper,
            padding: '4px 8px',
            borderRadius: 1,
            boxShadow: theme.shadows[2],
          }}
        >
          <Typography variant="caption" color="textSecondary">
            Zoom: {mapStore?.currentZoom}
            {mapStore?.currentZoom <= 9 && ' (Clustering)'}
            {mapStore?.currentZoom > 15 && ' (Nearby)'}
          </Typography>
        </Box>

        {/* Map with built-in dark theme */}
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={mapStore?.userLocation || { lat: 39.8283, lng: -98.5795 }}
          defaultZoom={isMobile ? 10 : 11}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          colorScheme={theme.palette.mode === 'dark' ? 'DARK' : 'LIGHT'}
          onCameraChanged={(ev) => {
            if (ev.map && !map) {
              console.log('🗺️ Map loaded');
              setMap(ev.map);
            }
          }}
        >
          {renderShowMarkers()}

          {/* InfoWindow for selected show */}
          {mapStore?.selectedShow && (
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
              <PopupContent 
                show={mapStore.selectedShow} 
                onScheduleModalOpen={onScheduleModalOpen}
              />
            </InfoWindow>
          )}
        </Map>
      </Box>
    </APIProvider>
  );
});

export default MapComponent;
