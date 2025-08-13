import { faClock, faLocationDot, faMicrophone } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import { APIProvider, InfoWindow, Map, Marker } from '@vis.gl/react-google-maps';
import { DayPicker, DayOfWeek } from '@components/DayPicker';
import { showStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import type { Show } from '@stores/ShowStore';

export const MapComponent: React.FC = observer(() => {
  const theme = useTheme();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 40.7128,
    lng: -74.006,
  }); // Default to NYC
  const showListRef = useRef<HTMLDivElement>(null);

  // Google Maps API key from environment variable
  const API_KEY =
    (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCJgu_sx8VjMTj7iphIekriBeTjeKjHuiY';

  // Load shows when component mounts
  useEffect(() => {
    showStore.fetchShows(showStore.selectedDay);
  }, []);

  // Update center when user location is found
  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
    }
  }, [userLocation]);

  // Get user's current location
  const getCurrentLocation = () => {
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
          console.warn('Error getting location:', error);
        }
      );
    }
  };

  // Handle day change from DayPicker
  const handleDayChange = (day: DayOfWeek) => {
    showStore.setSelectedDay(day);
    setSelectedShow(null);
  };

  // Handle marker click
  const handleMarkerClick = (show: Show) => {
    setSelectedShow(show);
    showStore.setSelectedShow(show);
    
    // Scroll to show in list
    if (showListRef.current) {
      const showElement = showListRef.current.querySelector(`[data-show-id="${show.id}"]`);
      if (showElement) {
        showElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Handle show list item click
  const handleShowClick = (show: Show) => {
    setSelectedShow(show);
    showStore.setSelectedShow(show);
    
    // Center map on show location
    if (show.lat && show.lng) {
      setMapCenter({ lat: show.lat, lng: show.lng });
    }
  };

  // Create microphone marker icon
  const createMicrophoneIcon = (isSelected = false) => {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
        <circle cx="12" cy="12" r="11" fill="${isSelected ? theme.palette.secondary.main : theme.palette.primary.main}" stroke="#fff" stroke-width="2"/>
        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" fill="#fff"/>
      </svg>
    `)}`;
  };

  return (
    <Box>
      {/* Day Picker */}
      <DayPicker 
        selectedDay={showStore.selectedDay} 
        onDayChange={handleDayChange}
      />

      <Grid container spacing={3}>
        {/* Map */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: 600, position: 'relative' }}>
            {showStore.isLoading && (
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1000,
                }}
              >
                <CircularProgress />
              </Box>
            )}
            
            <APIProvider apiKey={API_KEY}>
              <Map
                style={{ width: '100%', height: '100%' }}
                defaultCenter={mapCenter}
                center={mapCenter}
                defaultZoom={13}
                gestureHandling={'greedy'}
                disableDefaultUI={false}
              >
                {/* User location marker */}
                {userLocation && (
                  <Marker
                    position={userLocation}
                    icon={`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                        <circle cx="12" cy="12" r="8" fill="${theme.palette.info.main}" stroke="#fff" stroke-width="2"/>
                      </svg>
                    `)}`}
                  />
                )}

                {/* Show markers */}
                {showStore.showsWithCoordinates.map((show) => (
                  <Marker
                    key={show.id}
                    position={{ lat: show.lat!, lng: show.lng! }}
                    onClick={() => handleMarkerClick(show)}
                    icon={createMicrophoneIcon(selectedShow?.id === show.id)}
                  />
                ))}

                {/* Info window for selected show */}
                {selectedShow && selectedShow.lat && selectedShow.lng && (
                  <InfoWindow
                    position={{ lat: selectedShow.lat, lng: selectedShow.lng }}
                    onCloseClick={() => setSelectedShow(null)}
                  >
                    <Box sx={{ maxWidth: 250 }}>
                      <Typography variant="h6" gutterBottom>
                        {selectedShow.vendor?.name || 'Karaoke Show'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {selectedShow.address}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FontAwesomeIcon icon={faClock} style={{ marginRight: '4px', fontSize: '12px' }} />
                        <Typography variant="body2">
                          {selectedShow.startTime} - {selectedShow.endTime}
                        </Typography>
                      </Box>
                      <Typography variant="body2" gutterBottom>
                        KJ: {selectedShow.kj?.name || 'TBA'}
                      </Typography>
                      {selectedShow.description && (
                        <Typography variant="body2" color="text.secondary">
                          {selectedShow.description}
                        </Typography>
                      )}
                    </Box>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>

            {/* Get Location Button */}
            <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
              <Button
                variant="contained"
                size="small"
                onClick={getCurrentLocation}
                startIcon={<FontAwesomeIcon icon={faLocationDot} />}
              >
                My Location
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Show List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: 600, overflow: 'auto' }} ref={showListRef}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Shows for {showStore.selectedDay.charAt(0).toUpperCase() + showStore.selectedDay.slice(1)}
              </Typography>
              
              {showStore.isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : showStore.showsForSelectedDay.length === 0 ? (
                <Alert severity="info">
                  No karaoke shows found for this day.
                </Alert>
              ) : (
                <List disablePadding>
                  {showStore.showsForSelectedDay.map((show) => (
                    <ListItem key={show.id} disablePadding data-show-id={show.id}>
                      <ListItemButton
                        selected={selectedShow?.id === show.id}
                        onClick={() => handleShowClick(show)}
                        sx={{
                          border: selectedShow?.id === show.id ? 
                            `2px solid ${theme.palette.primary.main}` : 
                            `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          mb: 1,
                          p: 2,
                        }}
                      >
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <FontAwesomeIcon 
                              icon={faMicrophone} 
                              style={{ 
                                marginRight: '8px', 
                                color: theme.palette.primary.main,
                                fontSize: '16px' 
                              }} 
                            />
                            <Typography variant="subtitle1" fontWeight={600}>
                              {show.vendor?.name || 'Karaoke Venue'}
                            </Typography>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {show.address}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <FontAwesomeIcon 
                              icon={faClock} 
                              style={{ 
                                marginRight: '4px', 
                                fontSize: '12px',
                                color: theme.palette.text.secondary 
                              }} 
                            />
                            <Typography variant="body2" color="text.secondary">
                              {show.startTime} - {show.endTime}
                            </Typography>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            KJ: {show.kj?.name || 'TBA'}
                          </Typography>
                          
                          {show.description && (
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                mt: 1,
                              }}
                            >
                              {show.description}
                            </Typography>
                          )}
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
});
