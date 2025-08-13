import { faLocationDot, faMicrophone, faStar, faTime } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
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
  const API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;

  if (!API_KEY) {
    console.error('Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file');
  }

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
  const createMicrophoneIcon = (isSelected = false) => ({
    path: "M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z",
    fillColor: isSelected ? theme.palette.secondary.main : theme.palette.primary.main,
    fillOpacity: 1,
    strokeColor: theme.palette.background.paper,
    strokeWeight: 2,
    scale: 1.5,
    anchor: { x: 12, y: 12 },
  });

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
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 8,
                      fillColor: theme.palette.info.main,
                      fillOpacity: 1,
                      strokeColor: theme.palette.background.paper,
                      strokeWeight: 2,
                    }}
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
                        <FontAwesomeIcon icon={faTime} style={{ marginRight: '4px', fontSize: '12px' }} />
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
                              icon={faTime} 
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

  // Enhanced mock karaoke venues - in a real app, this would come from your backend
  const mockVenues: Location[] = [
    {
      lat: 40.7128,
      lng: -74.006,
      name: 'Karaoke Star NYC',
      address: '123 Broadway, New York, NY 10001',
      type: 'karaoke',
      rating: 4.5,
      priceLevel: 2,
      openNow: true,
      phone: '(212) 555-0123',
      website: 'https://karaokestarnyc.com',
      image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
      description:
        'Premier karaoke venue with private rooms and professional sound system. Open mic nights every Thursday!',
    },
    {
      lat: 40.7589,
      lng: -73.9851,
      name: 'Sing & Swing Times Square',
      address: '456 Times Square, New York, NY 10036',
      type: 'karaoke',
      rating: 4.2,
      priceLevel: 3,
      openNow: false,
      phone: '(212) 555-0456',
      website: 'https://singswing.com',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
      description:
        'Heart of Times Square karaoke experience with state-of-the-art lighting and extensive song library.',
    },
    {
      lat: 40.6892,
      lng: -74.0445,
      name: 'Voice Box Brooklyn',
      address: '789 Brooklyn Ave, Brooklyn, NY 11201',
      type: 'karaoke',
      rating: 4.7,
      priceLevel: 2,
      openNow: true,
      phone: '(718) 555-0789',
      website: 'https://voiceboxbklyn.com',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=300&fit=crop',
      description:
        'Trendy Brooklyn karaoke spot with craft cocktails and a relaxed atmosphere. Perfect for groups!',
    },
    {
      lat: 40.7282,
      lng: -73.7949,
      name: 'Queens Melody Lounge',
      address: '321 Queens Blvd, Elmhurst, NY 11373',
      type: 'karaoke',
      rating: 4.0,
      priceLevel: 1,
      openNow: true,
      phone: '(718) 555-0321',
      website: 'https://queensmelody.com',
      image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300&fit=crop',
      description:
        'Family-friendly karaoke with multilingual song selection and affordable prices.',
    },
  ];

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    setIsLoading(true);
    setError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });
          setMapCenter({ lat, lng });
          // In a real app, you'd search for nearby venues here
          setSearchResults(mockVenues);
          setIsLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Using default location.');
          setSearchResults(mockVenues);
          setIsLoading(false);
        },
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      setSearchResults(mockVenues);
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // In a real app, you would make an API call to search for venues
      // For now, we'll filter mock venues
      const filtered = mockVenues.filter(
        (venue) =>
          venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          venue.address.toLowerCase().includes(searchQuery.toLowerCase()),
      );

      setSearchResults(filtered);

      // Update map center to show first result
      if (filtered.length > 0) {
        setMapCenter({ lat: filtered[0].lat, lng: filtered[0].lng });
      }
    } catch (err) {
      setError('Error searching for venues. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    // Center map on selected venue
    setMapCenter({ lat: location.lat, lng: location.lng });
    setSelectedVenue(location);
  };

  const getPriceLevelDisplay = (level?: number) => {
    if (!level) return '';
    return '$'.repeat(level);
  };

  const getStatusChip = (openNow?: boolean) => {
    if (openNow === undefined) return null;
    return (
      <Chip
        size="small"
        label={openNow ? 'Open Now' : 'Closed'}
        color={openNow ? 'success' : 'error'}
        variant="filled"
        sx={{
          fontWeight: 'bold',
          fontSize: '0.7rem',
          height: '20px',
        }}
      />
    );
  };

  return (
    <Grid container spacing={3} sx={{ height: '600px' }}>
      {/* Venue List Panel */}
      <Grid item xs={12} md={4}>
        <Paper
          elevation={3}
          sx={{
            height: '100%',
            borderRadius: 3,
            overflow: 'hidden',
            background:
              theme.palette.mode === 'dark'
                ? `linear-gradient(145deg, ${theme.palette.background.paper}, ${theme.palette.grey[900]})`
                : `linear-gradient(145deg, ${theme.palette.background.paper}, ${theme.palette.grey[50]})`,
          }}
        >
          {/* Search Header */}
          <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontWeight: 700,
                color: theme.palette.primary.main,
              }}
            >
              <FontAwesomeIcon icon={faMicrophone} />
              Find Karaoke Venues
            </Typography>

            <TextField
              fullWidth
              size="small"
              placeholder="Search venues, neighborhoods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon
                      icon={faSearch}
                      style={{ color: theme.palette.text.secondary }}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleSearch}
                      disabled={isLoading}
                      sx={{
                        color: theme.palette.primary.main,
                        '&:hover': { backgroundColor: theme.palette.primary.main + '20' },
                      }}
                    >
                      {isLoading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <FontAwesomeIcon icon={faSearch} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                      borderWidth: '2px',
                    },
                  },
                  '&.Mui-focused': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                      borderWidth: '2px',
                    },
                  },
                },
              }}
            />

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={getCurrentLocation}
                disabled={isLoading}
                startIcon={<FontAwesomeIcon icon={faLocationDot} />}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: theme.shadows[4],
                  },
                }}
              >
                My Location
              </Button>
              <Chip
                label={`${searchResults.length} venues`}
                color="primary"
                variant="outlined"
                size="small"
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                }}
              />
            </Box>
          </Box>

          {/* Error Alert */}
          {error && (
            <Fade in={!!error}>
              <Alert
                severity="warning"
                sx={{
                  m: 2,
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    color: theme.palette.warning.main,
                  },
                }}
              >
                {error}
              </Alert>
            </Fade>
          )}

          {/* Venue List */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {searchResults.length > 0 ? (
              <List sx={{ p: 0 }}>
                {searchResults.map((venue, index) => (
                  <Slide in={true} timeout={300 + index * 100} key={venue.name} direction="right">
                    <Card
                      sx={{
                        mb: 2,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: selectedVenue?.name === venue.name ? 'scale(1.02)' : 'scale(1)',
                        border:
                          selectedVenue?.name === venue.name
                            ? `2px solid ${theme.palette.primary.main}`
                            : `1px solid ${theme.palette.divider}`,
                        boxShadow:
                          selectedVenue?.name === venue.name
                            ? `0 8px 25px ${theme.palette.primary.main}40`
                            : theme.shadows[2],
                        background:
                          selectedVenue?.name === venue.name
                            ? `linear-gradient(135deg, ${theme.palette.primary.main}08, ${theme.palette.secondary.main}08)`
                            : theme.palette.background.paper,
                        '&:hover': {
                          transform: 'scale(1.02) translateY(-2px)',
                          boxShadow: `0 12px 25px ${theme.palette.primary.main}20`,
                        },
                      }}
                      onClick={() => handleLocationSelect(venue)}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          {venue.image && (
                            <Avatar
                              src={venue.image}
                              sx={{
                                width: 60,
                                height: 60,
                                borderRadius: 2,
                                border: `2px solid ${theme.palette.primary.main}40`,
                              }}
                              variant="rounded"
                            />
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography
                                variant="h6"
                                component="h3"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '1rem',
                                  color: theme.palette.text.primary,
                                  lineHeight: 1.2,
                                }}
                                noWrap
                              >
                                {venue.name}
                              </Typography>
                              {getStatusChip(venue.openNow)}
                            </Box>

                            {venue.rating && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Rating
                                  value={venue.rating}
                                  readOnly
                                  size="small"
                                  precision={0.1}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={600}
                                >
                                  {venue.rating}
                                </Typography>
                                {venue.priceLevel && (
                                  <>
                                    <Typography variant="caption" color="text.secondary">
                                      •
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      fontWeight={600}
                                    >
                                      {getPriceLevelDisplay(venue.priceLevel)}
                                    </Typography>
                                  </>
                                )}
                              </Box>
                            )}

                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                fontSize: '0.75rem',
                                lineHeight: 1.3,
                                mb: 1,
                              }}
                            >
                              {venue.address}
                            </Typography>

                            {venue.description && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  fontSize: '0.7rem',
                                  lineHeight: 1.3,
                                  fontStyle: 'italic',
                                }}
                              >
                                {venue.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </CardContent>

                      <CardActions sx={{ px: 2, py: 1, pt: 0 }}>
                        <Button
                          size="small"
                          startIcon={<FontAwesomeIcon icon={faRoute} />}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: theme.palette.primary.main,
                          }}
                        >
                          Get Directions
                        </Button>
                        {venue.phone && (
                          <Button
                            size="small"
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: theme.palette.text.secondary,
                            }}
                          >
                            Call
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  </Slide>
                ))}
              </List>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  textAlign: 'center',
                  p: 3,
                }}
              >
                <FontAwesomeIcon
                  icon={faMicrophone}
                  style={{
                    fontSize: '3rem',
                    color: theme.palette.text.secondary,
                    marginBottom: '16px',
                    opacity: 0.5,
                  }}
                />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No venues found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try searching for a different area or use your current location.
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Grid>

      {/* Map Panel */}
      <Grid item xs={12} md={8}>
        <Paper
          elevation={3}
          sx={{
            height: '100%',
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <APIProvider apiKey={API_KEY}>
            <Map
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              gestureHandling={'greedy'}
              disableDefaultUI={false}
              mapTypeControl={false}
              streetViewControl={false}
            >
              {userLocation && (
                <Marker position={userLocation} onClick={() => setSelectedVenue(null)} />
              )}

              {searchResults.map((venue, index) => (
                <Marker
                  key={index}
                  position={{ lat: venue.lat, lng: venue.lng }}
                  onClick={() => setSelectedVenue(venue)}
                />
              ))}

              {selectedVenue && (
                <InfoWindow
                  position={{ lat: selectedVenue.lat, lng: selectedVenue.lng }}
                  onCloseClick={() => setSelectedVenue(null)}
                >
                  <Card sx={{ minWidth: 280, maxWidth: 320, m: 0 }}>
                    {selectedVenue.image && (
                      <Box
                        component="img"
                        src={selectedVenue.image}
                        alt={selectedVenue.name}
                        sx={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                        }}
                      />
                    )}
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                          {selectedVenue.name}
                        </Typography>
                        {getStatusChip(selectedVenue.openNow)}
                      </Box>

                      {selectedVenue.rating && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Rating
                            value={selectedVenue.rating}
                            readOnly
                            size="small"
                            precision={0.1}
                          />
                          <Typography variant="caption" fontWeight={600}>
                            {selectedVenue.rating}
                          </Typography>
                          {selectedVenue.priceLevel && (
                            <>
                              <Typography variant="caption">•</Typography>
                              <Typography variant="caption" fontWeight={600}>
                                {getPriceLevelDisplay(selectedVenue.priceLevel)}
                              </Typography>
                            </>
                          )}
                        </Box>
                      )}

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {selectedVenue.address}
                      </Typography>

                      {selectedVenue.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontStyle: 'italic' }}
                        >
                          {selectedVenue.description}
                        </Typography>
                      )}
                    </CardContent>

                    <CardActions sx={{ px: 2, py: 1 }}>
                      <Button
                        size="small"
                        startIcon={<FontAwesomeIcon icon={faRoute} />}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        Directions
                      </Button>
                      {selectedVenue.phone && (
                        <Button size="small" sx={{ textTransform: 'none', fontWeight: 600 }}>
                          Call
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </InfoWindow>
              )}

              {userLocation && selectedVenue === null && (
                <InfoWindow position={userLocation} onCloseClick={() => {}}>
                  <Box sx={{ minWidth: 200, p: 1, textAlign: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      📍 Your Location
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Lat: {userLocation.lat.toFixed(4)}, Lng: {userLocation.lng.toFixed(4)}
                    </Typography>
                  </Box>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        </Paper>
      </Grid>
    </Grid>
  );
};
