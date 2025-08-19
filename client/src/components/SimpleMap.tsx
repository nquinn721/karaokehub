import {
  faClock,
  faGlobe,
  faLocationCrosshairs,
  faMapMarkerAlt,
  faMicrophone,
  faPhone,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { Box, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import { APIProvider, InfoWindow, Map, Marker } from '@vis.gl/react-google-maps';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { apiStore, mapStore, showStore } from '../stores';

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

const SimpleMap: React.FC = observer(() => {
  const theme = useTheme();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const isDarkMode = theme.palette.mode === 'dark';

  // Dark mode map styles
  const darkMapStyles = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }],
    },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#1f2835' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#f3d19c' }],
    },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
    {
      featureType: 'transit.station',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }],
    },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
    { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
  ];

  const [markerClusterer, setMarkerClusterer] = useState<MarkerClusterer | null>(null);

  // Get reactive state from stores instead of local state
  const userLocation = mapStore.userLocation;
  const currentZoom = mapStore.currentZoom;
  const selectedShow = mapStore.selectedShow;

  // Use city summaries for zoom <= 9, individual shows for zoom >= 10
  const isZoomedOut = currentZoom <= 9;
  const citySummaries = showStore.citySummaries;

  console.log('🗺️ SimpleMap state:', {
    currentZoom,
    isZoomedOut,
    citySummariesLength: citySummaries.length,
    showsLength: showStore.shows.length,
    mapLoaded: !!map,
    mapInitialized: mapStore.isInitialized,
    userLocation: mapStore.userLocation,
  });

  // Initialize store references once
  useEffect(() => {
    mapStore.setStoreReferences(apiStore, showStore);
  }, []);

  // Single useEffect for map initialization only
  useEffect(() => {
    if (map && !mapStore.isInitialized) {
      console.log('🗺️ Initializing map through store');
      mapStore.initializeMapInstance(map);
    }
  }, [map]);

  // Set up marker clusterer for city view using real markers
  useEffect(() => {
    console.log('🎯 Clusterer setup effect:', {
      hasMap: !!map,
      isZoomedOut,
      currentZoom,
      citySummariesLength: citySummaries.length,
      citySummaries: citySummaries.slice(0, 3), // Log first 3 for debugging
    });

    // Clear existing clusterer when not needed
    if (!map || !isZoomedOut || citySummaries.length === 0) {
      console.log('🚫 Not creating clusterer:', {
        noMap: !map,
        notZoomedOut: !isZoomedOut,
        noCitySummaries: citySummaries.length === 0,
      });
      if (markerClusterer) {
        console.log('🧹 Clearing existing clusterer');
        markerClusterer.clearMarkers();
        setMarkerClusterer(null);
      }
      return;
    }

    // Create real markers for clustering - one marker per show in each city
    const realMarkers: google.maps.Marker[] = [];

    citySummaries.forEach((cityData) => {
      console.log('🏙️ Processing city for clustering:', {
        city: cityData.city,
        state: cityData.state,
        showCount: cityData.showCount,
        lat: cityData.lat,
        lng: cityData.lng,
      });

      // Skip if missing coordinates
      if (!cityData.lat || !cityData.lng) {
        console.warn('⚠️ Skipping city due to missing coordinates:', cityData);
        return;
      }

      // Create one real marker for each show in the city
      // Example: 15 shows in Columbus = create 15 markers at Columbus location
      for (let i = 0; i < cityData.showCount; i++) {
        // Add tiny random offset to spread markers slightly for better clustering visualization
        const offsetLat = cityData.lat + (Math.random() - 0.5) * 0.0005;
        const offsetLng = cityData.lng + (Math.random() - 0.5) * 0.0005;

        const marker = new google.maps.Marker({
          position: { lat: offsetLat, lng: offsetLng },
          map: null, // Don't add to map yet - clusterer will handle this
          // Use invisible markers - clusterer will replace with cluster icons
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0.1,
            fillColor: 'transparent',
            fillOpacity: 0,
            strokeWeight: 0,
          },
        });

        realMarkers.push(marker);
      }
    });

    if (realMarkers.length === 0) {
      console.log('⚠️ No real markers created');
      return;
    }

    console.log(`✅ Created ${realMarkers.length} real markers for clustering`);

    // Create new clusterer with real markers
    const clusterer = new MarkerClusterer({
      map,
      markers: realMarkers,
      renderer: {
        render: ({ count, position }) => {
          console.log(`📍 Rendering cluster with count: ${count} at position:`, position);

          const marker = new google.maps.Marker({
            position,
            icon: {
              url: `data:image/svg+xml,${encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" fill="#dc2626" stroke="white" stroke-width="2"/>
                  <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${count}</text>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20),
            },
            zIndex: 1000,
          });

          // Add click listener to zoom in when cluster is clicked
          marker.addListener('click', () => {
            // Clear any selected show to prevent auto-zoom interference
            mapStore.clearSelectedShow();

            map.setZoom(11);
            map.setCenter(position);

            // Fetch shows for the new location when zooming in
            const mapCenter = {
              lat: position.lat(),
              lng: position.lng(),
              radius: showStore.radiusFilter,
            };
            showStore.fetchShows(showStore.selectedDay, mapCenter);
          });

          return marker;
        },
      },
    });

    console.log('✅ Created new MarkerClusterer with', realMarkers.length, 'real markers');
    setMarkerClusterer(clusterer);

    return () => {
      console.log('🧹 Cleaning up clusterer on unmount');
      clusterer.clearMarkers();
    };
  }, [map, isZoomedOut, citySummaries]);

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      <APIProvider apiKey={apiStore.googleMapsApiKey || ''}>
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={mapStore.initialCenter}
          defaultZoom={mapStore.initialZoom}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          styles={isDarkMode ? darkMapStyles : undefined}
          onCameraChanged={(ev) => {
            if (ev.map && !map) {
              console.log('🗺️ Map loaded, setting map instance');
              setMap(ev.map);
            }
          }}
          onIdle={(ev) => {
            // Additional event handler for when map is ready
            if (ev.map && !mapStore.isInitialized) {
              console.log('🗺️ Map is idle and ready for initialization');
            }
          }}
        >
          {/* Current location marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={{
                url: `data:image/svg+xml,${encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <radialGradient id="pulse" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:#4285F4;stop-opacity:0.8"/>
                        <stop offset="70%" style="stop-color:#4285F4;stop-opacity:0.3"/>
                        <stop offset="100%" style="stop-color:#4285F4;stop-opacity:0"/>
                      </radialGradient>
                    </defs>
                    <circle cx="12" cy="12" r="10" fill="url(#pulse)">
                      <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="12" cy="12" r="6" fill="#4285F4" stroke="white" stroke-width="2"/>
                    <circle cx="12" cy="12" r="3" fill="#ffffff" opacity="0.3"/>
                  </svg>
                `)}`,
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 12),
              }}
              zIndex={1000}
            />
          )}

          {/* Individual show markers when zoomed in */}
          {!isZoomedOut &&
            showStore.shows
              .filter((show) => show.lat != null && show.lng != null)
              .map((show) => (
                <Marker
                  key={show.id}
                  position={{
                    lat: typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat!,
                    lng: typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng!,
                  }}
                  onClick={() => {
                    console.log('🖱️ Marker clicked for show:', show.id, show.venue);
                    // Use showStore to handle the click (it will call mapStore.selectShow)
                    showStore.handleMarkerClick(show.id);
                  }}
                />
              ))}

          {/* InfoWindow for selected show */}
          {selectedShow && !isZoomedOut && (
            <InfoWindow
              position={{
                lat:
                  selectedShow.venue?.coordinates?.lat ||
                  (typeof selectedShow.lat === 'string'
                    ? parseFloat(selectedShow.lat)
                    : selectedShow.lat!) + 0.0008,
                lng:
                  selectedShow.venue?.coordinates?.lng ||
                  (typeof selectedShow.lng === 'string'
                    ? parseFloat(selectedShow.lng)
                    : selectedShow.lng!),
              }}
              onCloseClick={() => {
                mapStore.clearSelectedShow();
                showStore.setSelectedMarkerId(null);
              }}
            >
              <PopupContent show={selectedShow} />
            </InfoWindow>
          )}
        </Map>

        {/* Current location button */}
        <IconButton
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  const location = { lat: latitude, lng: longitude };
                  // Use store method instead of local state
                  mapStore.requestUserLocation();

                  if (map) {
                    map.setCenter(location);
                    map.setZoom(12);
                  }
                },
                (error) => {
                  console.error('Error getting current location:', error);
                },
              );
            }
          }}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            backgroundColor: 'background.paper',
            color: '#4285F4',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 2px 8px rgba(0,0,0,0.4)'
                : '0 2px 8px rgba(0,0,0,0.15)',
            border: (theme) => `1px solid ${theme.palette.divider}`,
            width: 40,
            height: 40,
            '&:hover': {
              backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#2a2a2a' : '#f5f5f5'),
              color: '#1a73e8',
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 4px 12px rgba(0,0,0,0.6)'
                  : '0 4px 12px rgba(0,0,0,0.2)',
              transform: 'scale(1.05)',
            },
          }}
        >
          <FontAwesomeIcon icon={faLocationCrosshairs} style={{ fontSize: '18px' }} />
        </IconButton>
      </APIProvider>
    </Box>
  );
});

export default SimpleMap;
