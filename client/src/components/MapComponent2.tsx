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
import { APIProvider, InfoWindow, Map, Marker } from '@vis.gl/react-google-maps';
import { DayPicker, DayOfWeek } from '@components/DayPicker';
import { showStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';

export const MapComponent: React.FC = observer(() => {
  const theme = useTheme();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 40.7128,
    lng: -74.006,
  }); // Default to NYC
  const showListRef = useRef<HTMLDivElement>(null);

  // Google Maps API key from environment variable
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!API_KEY) {
    console.error('Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file');
  }

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          setMapCenter(location);
        },
        (error) => {
          console.warn('Error getting user location:', error);
        },
      );
    }
  }, []);

  const handleDayChange = (day: DayOfWeek) => {
    showStore.setSelectedDay(day);
  };

  const handleMarkerClick = (show: any) => {
    setSelectedMarkerId(show.id);
    showStore.setSelectedShow(show);
    
    // Scroll to show in list
    if (showListRef.current) {
      const showElement = showListRef.current.querySelector(`[data-show-id="${show.id}"]`);
      if (showElement) {
        showElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleShowClick = (show: any) => {
    showStore.setSelectedShow(show);
    setSelectedMarkerId(show.id);
    // Center map on the show
    if (show.lat && show.lng) {
      setMapCenter({ lat: show.lat, lng: show.lng });
    }
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch {
      return time;
    }
  };

  return (
    <Box>
      {/* Day Picker */}
      <DayPicker
        selectedDay={showStore.selectedDay}
        onDayChange={handleDayChange}
      />

      {/* Map and List Layout */}
      <Box sx={{ display: 'flex', gap: 3, height: '600px' }}>
        {/* Map Section */}
        <Box sx={{ flex: 2, borderRadius: 2, overflow: 'hidden' }}>
          {API_KEY ? (
            <APIProvider apiKey={API_KEY}>
              <Map
                style={{ width: '100%', height: '100%' }}
                defaultCenter={mapCenter}
                center={mapCenter}
                defaultZoom={13}
                zoom={13}
                gestureHandling={'greedy'}
                disableDefaultUI={false}
              >
                {/* User Location Marker */}
                {userLocation && (
                  <Marker
                    position={userLocation}
                  />
                )}

                {/* Show Markers with Microphone Icons */}
                {showStore.showsWithCoordinates.map((show) => (
                  <Marker
                    key={show.id}
                    position={{ lat: show.lat!, lng: show.lng! }}
                    onClick={() => handleMarkerClick(show)}
                    title={show.vendor?.name || 'Karaoke Show'}
                  />
                ))}

                {/* Info Window for Selected Show */}
                {selectedMarkerId && showStore.selectedShow && (
                  <InfoWindow
                    position={{ 
                      lat: showStore.selectedShow.lat!, 
                      lng: showStore.selectedShow.lng! 
                    }}
                    onCloseClick={() => {
                      setSelectedMarkerId(null);
                      showStore.setSelectedShow(null);
                    }}
                  >
                    <Box sx={{ maxWidth: 250 }}>
                      <Typography variant="h6" gutterBottom>
                        {showStore.selectedShow.vendor?.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {showStore.selectedShow.address}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <FontAwesomeIcon icon={faMicrophone} style={{ fontSize: '12px' }} />
                        <Typography variant="body2">
                          Host: {showStore.selectedShow.kj?.name}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <FontAwesomeIcon icon={faLocationDot} style={{ fontSize: '12px' }} />
                        <Typography variant="body2">
                          {formatTime(showStore.selectedShow.startTime)} - {formatTime(showStore.selectedShow.endTime)}
                        </Typography>
                      </Box>
                      {showStore.selectedShow.description && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {showStore.selectedShow.description}
                        </Typography>
                      )}
                    </Box>
                  </InfoWindow>
                )}
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
              <Alert severity="warning">
                Google Maps API key is not configured
              </Alert>
            </Box>
          )}
        </Box>

        {/* Show List Section */}
        <Box sx={{ flex: 1 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ height: '100%', p: 0 }}>
              <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="h6">
                  Shows for {showStore.selectedDay}
                </Typography>
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
                  p: 0
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
                                      color: theme.palette.primary.main 
                                    }} 
                                  />
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {show.vendor?.name || 'Unknown Venue'}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {show.address}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      {formatTime(show.startTime)} - {formatTime(show.endTime)}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" color="text.secondary">
                                    Host: {show.kj?.name || 'Unknown'}
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
