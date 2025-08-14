import { DayOfWeek, DayPicker } from '@components/DayPicker';
import { faLocationDot, faMicrophone } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';
import { apiStore, mapStore, showStore } from '@stores/index';
import { APIProvider, InfoWindow, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { observer } from 'mobx-react-lite';
import React, { useRef } from 'react';

export const MapComponent: React.FC = observer(() => {
  const theme = useTheme();
  const showListRef = useRef<HTMLDivElement>(null);

  // Google Maps API key from server config
  const API_KEY = apiStore.googleMapsApiKey;

  // Initialize stores when component mounts - this will only run once per component lifecycle
  React.useMemo(() => {
    const initializeStores = async () => {
      if (!mapStore.isInitialized) {
        await mapStore.initialize().catch((error) => {
          console.error('Failed to initialize map store:', error);
        });
      }
      
      // Fetch shows if we haven't already
      if (showStore.shows.length === 0 && !showStore.isLoading) {
        await showStore.fetchShows().catch((error) => {
          console.error('Failed to fetch shows:', error);
        });
      }
    };
    
    initializeStores();
  }, []);

  if (!apiStore.configLoaded) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading configuration...</Typography>
      </Box>
    );
  }

  if (!API_KEY) {
    console.error('Google Maps API key not found in server configuration');
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Google Maps API key is not configured. Please contact the administrator.
        </Alert>
      </Box>
    );
  }

  const handleDayChange = (day: DayOfWeek) => {
    showStore.setSelectedDay(day);
  };

  const handleMarkerClick = (show: any) => {
    mapStore.handleMarkerClick(show);

    // Scroll to show in list
    if (showListRef.current) {
      const showElement = showListRef.current.querySelector(`[data-show-id="${show.id}"]`);
      if (showElement) {
        showElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleShowClick = (show: any) => {
    mapStore.panToShow(show);
  };

  // MapContent component that has access to the map instance
  const MapContent: React.FC<{
    theme: any;
    handleMarkerClick: (show: any) => void;
    formatTime: (time: string) => string;
    onMapLoad: (map: google.maps.Map) => void;
  }> = observer(({ theme, handleMarkerClick, formatTime, onMapLoad }) => {
    const map = useMap();

    // Call onMapLoad immediately when map is available
    if (map && onMapLoad) {
      onMapLoad(map);
    }

    return (
      <>
        {/* User Location Marker */}
        {mapStore.userLocation && (
          <Marker
            position={mapStore.userLocation}
            icon={`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <circle cx="12" cy="12" r="8" fill="${theme.palette.info.main}" stroke="#fff" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" fill="#fff"/>
            </svg>
          `)}`}
            title="Your Location"
          />
        )}

        {/* Show Markers with Microphone Icons */}
        {showStore.showsWithCoordinates.map((show: any) => (
          <Marker
            key={show.id}
            position={{ lat: show.lat!, lng: show.lng! }}
            onClick={() => handleMarkerClick(show)}
            title={show.venue || show.vendor?.name || 'Karaoke Show'}
            icon={createMicrophoneIcon(mapStore.selectedMarkerId === show.id, theme)}
          />
        ))}

        {/* Info Window for Selected Show */}
        {mapStore.selectedMarkerId && showStore.selectedShow && (
          <InfoWindow
            position={{
              lat: showStore.selectedShow.lat!,
              lng: showStore.selectedShow.lng!,
            }}
            onCloseClick={() => {
              mapStore.closeInfoWindow();
            }}
          >
            <Box
              sx={{
                maxWidth: 280,
                p: 1,
                backgroundColor: theme.palette.background.paper,
                borderRadius: 1,
                boxShadow: theme.shadows[3],
              }}
            >
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                }}
              >
                {showStore.selectedShow.venue || showStore.selectedShow.vendor?.name}
              </Typography>
              {showStore.selectedShow.venue && showStore.selectedShow.vendor?.name && (
                <Typography
                  variant="body2"
                  gutterBottom
                  sx={{
                    color: theme.palette.text.secondary,
                    fontStyle: 'italic',
                    mb: 1,
                  }}
                >
                  by {showStore.selectedShow.vendor.name}
                </Typography>
              )}
              <Typography
                variant="body2"
                gutterBottom
                sx={{
                  color: theme.palette.text.secondary,
                  mb: 1.5,
                }}
              >
                {showStore.selectedShow.address}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FontAwesomeIcon
                  icon={faMicrophone}
                  style={{
                    fontSize: '14px',
                    color: theme.palette.primary.main,
                  }}
                />
                <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                  Host: {showStore.selectedShow.dj?.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FontAwesomeIcon
                  icon={faLocationDot}
                  style={{
                    fontSize: '14px',
                    color: theme.palette.secondary.main,
                  }}
                />
                <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                  {formatTime(showStore.selectedShow.startTime)} -{' '}
                  {formatTime(showStore.selectedShow.endTime)}
                </Typography>
              </Box>
              {showStore.selectedShow.description && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    color: theme.palette.text.secondary,
                    fontStyle: 'italic',
                  }}
                >
                  {showStore.selectedShow.description}
                </Typography>
              )}
            </Box>
          </InfoWindow>
        )}
      </>
    );
  });

  // Create microphone marker icon
  const createMicrophoneIcon = (isSelected = false, theme: any) => {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="${isSelected ? theme.palette.secondary.main : theme.palette.primary.main}" stroke="#fff" stroke-width="2"/>
      <path d="M16 20c2.21 0 3.98-1.79 3.98-4L20 10c0-2.21-1.79-4-4-4s-4 1.79-4 4v6c0 2.21 1.79 4 4 4zm6.6-4c0 4-3.4 6.8-6.6 6.8s-6.6-2.8-6.6-6.8H8c0 4.55 3.62 8.31 8 8.96V28h2v-3.04c4.38-.65 8-4.41 8-8.96h-1.4z" fill="#fff"/>
    </svg>
  `)}`;
  };

  const formatTime = (time: string) => {
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
    <Box>
      {/* Day Picker */}
      <DayPicker selectedDay={showStore.selectedDay} onDayChange={handleDayChange} />

      {/* Map and List Layout */}
      <Box sx={{ display: 'flex', gap: 3, height: '600px' }}>
        {/* Map Section */}
        <Box sx={{ flex: 2, borderRadius: 2, overflow: 'hidden' }}>
          {API_KEY ? (
            <APIProvider apiKey={API_KEY}>
              <Map
                style={{ width: '100%', height: '100%' }}
                defaultCenter={mapStore.currentCenter}
                defaultZoom={mapStore.currentZoom}
                gestureHandling={'greedy'}
                disableDefaultUI={false}
                clickableIcons={true}
                streetViewControl={false}
                fullscreenControl={true}
                zoomControl={true}
                mapTypeControl={false}
                scaleControl={false}
                rotateControl={false}
              >
                <MapContent
                  theme={theme}
                  handleMarkerClick={handleMarkerClick}
                  formatTime={formatTime}
                  onMapLoad={mapStore.setMapInstance}
                />
              </Map>
            </APIProvider>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100',
                borderRadius: 2,
              }}
            >
              <Alert severity="warning">Google Maps API key is not configured</Alert>
            </Box>
          )}
        </Box>

        {/* Show List Section */}
        <Box sx={{ flex: 1 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ height: '100%', p: 0 }}>
              <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="h6">Shows for {showStore.selectedDay}</Typography>
                {showStore.isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {showStore.showsForSelectedDay.length} show(s) found
                  </Typography>
                )}
              </Box>

              <Box
                ref={showListRef}
                sx={{
                  height: 'calc(100% - 80px)',
                  overflow: 'auto',
                  p: 0,
                }}
              >
                {showStore.isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : showStore.showsForSelectedDay.length === 0 ? (
                  <Box sx={{ textAlign: 'center', p: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No shows found for {showStore.selectedDay}
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {showStore.showsForSelectedDay.map((show, index) => (
                      <React.Fragment key={show.id}>
                        <ListItem sx={{ p: 0 }}>
                          <ListItemButton
                            data-show-id={show.id}
                            onClick={() => handleShowClick(show)}
                            selected={showStore.selectedShow?.id === show.id}
                            sx={{ p: 2 }}
                          >
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <FontAwesomeIcon
                                    icon={faMicrophone}
                                    style={{
                                      fontSize: '14px',
                                      color: theme.palette.primary.main,
                                    }}
                                  />
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {show.venue || show.vendor?.name || 'Unknown Venue'}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  {show.venue && show.vendor?.name && (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ fontStyle: 'italic', mb: 0.5 }}
                                    >
                                      by {show.vendor.name}
                                    </Typography>
                                  )}
                                  <Typography variant="body2" color="text.secondary">
                                    {show.address}
                                  </Typography>
                                  <Box
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}
                                  >
                                    <Typography variant="body2" color="text.secondary">
                                      {formatTime(show.startTime)} - {formatTime(show.endTime)}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" color="text.secondary">
                                    Host: {show.dj?.name || 'Unknown'}
                                  </Typography>
                                  {show.description && (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{
                                        mt: 0.5,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                      }}
                                    >
                                      {show.description}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItemButton>
                        </ListItem>
                        {index < showStore.showsForSelectedDay.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
});
