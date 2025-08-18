import {
  faBars,
  faClock,
  faExternalLinkAlt,
  faHeart,
  faMapMarkerAlt,
  faMicrophone,
  faMusic,
  faPhone,
  faUser,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Slider,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { APIProvider, InfoWindow, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { DayOfWeek } from '../components/DayPicker/DayPicker';
import { SEO } from '../components/SEO';
import { Show } from '../stores/ShowStore';
import { apiStore, authStore, favoriteStore, mapStore, showStore } from '../stores/index';

// Create microphone marker icon
const createMicrophoneIcon = (isSelected = false) => {
  const iconColor = isSelected ? '#d32f2f' : '#f44336'; // Red colors - darker when selected, lighter when not
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="${iconColor}" stroke="#fff" stroke-width="2"/>
      <path d="M16 20c2.21 0 3.98-1.79 3.98-4L20 10c0-2.21-1.79-4-4-4s-4 1.79-4 4v6c0 2.21 1.79 4 4 4zm6.6-4c0 4-3.4 6.8-6.6 6.8s-6.6-2.8-6.6-6.8H8c0 4.55 3.62 8.31 8 8.96V28h2v-3.04c4.38-.65 8-4.41 8-8.96h-1.4z" fill="#fff"/>
    </svg>
  `)}`;
};

const ShowsPage: React.FC = observer(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State for filters
  const [radiusFilter, setRadiusFilter] = useState<number>(25); // Changed default to 25 miles
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(DayOfWeek.MONDAY);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [shouldRecenterMap, setShouldRecenterMap] = useState(false);
  const [useDayFilter] = useState<boolean>(true); // Always enabled for compact design
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(!isMobile); // Default closed on mobile

  // Get unique vendors for autocomplete
  const uniqueVendors = Array.from(
    new Set(showStore.shows.map((show) => show.vendor?.name).filter(Boolean)),
  );

  // Helper function to calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter shows based on current filters
  const filteredShows = showStore.shows.filter((show) => {
    // Vendor filter
    if (vendorFilter && show.vendor?.name !== vendorFilter) {
      return false;
    }

    // Radius filter (if show has coordinates and map center)
    if (show.lat && show.lng && mapStore.searchCenter) {
      const distance = calculateDistance(
        mapStore.searchCenter.lat,
        mapStore.searchCenter.lng,
        show.lat,
        show.lng,
      );
      if (distance > radiusFilter) {
        return false;
      }
    }

    return true;
  });

  // Load shows when filters change
  useEffect(() => {
    const loadShows = async () => {
      // Use the same approach as MapComponent - load all shows for the day without proximity filtering
      if (useDayFilter) {
        await showStore.fetchShows(selectedDay);
      } else {
        await showStore.fetchShows();
      }
    };

    loadShows();
  }, [selectedDay, useDayFilter]);

  // Watch for map position changes and refetch shows - same as MapComponent behavior
  useEffect(() => {
    const loadShowsForMapPosition = async () => {
      // Use the same approach as MapComponent - load all shows for the day without proximity filtering
      if (useDayFilter) {
        await showStore.fetchShows(selectedDay);
      } else {
        await showStore.fetchShows();
      }
    };

    // Only load if we have a search center
    if (mapStore.searchCenter) {
      loadShowsForMapPosition();
    }
  }, [mapStore.searchCenter, selectedDay, useDayFilter]);

  // Initialize map and location - always re-center on city when visiting Shows page
  useEffect(() => {
    const initialize = async () => {
      // Initialize MapStore if needed
      if (!mapStore.isInitialized) {
        await mapStore.initialize();
      }

      // Always request user location and center on nearest city when visiting Shows page
      console.log('ShowsPage: Requesting user location for centering...');
      await mapStore.requestUserLocation();

      // Give a moment for location to be processed
      setTimeout(() => {
        console.log('ShowsPage: User location after request:', mapStore.userLocation);
        console.log('ShowsPage: User city center after request:', mapStore.userCityCenter);
      }, 1000);

      // Load initial shows if none are loaded
      if (showStore.shows.length === 0 && !showStore.isLoading) {
        const mapCenter =
          mapStore.userCityCenter ||
          mapStore.userLocation ||
          mapStore.searchCenter ||
          mapStore.currentCenter;
        const searchParams = {
          lat: mapCenter.lat,
          lng: mapCenter.lng,
          radius: radiusFilter,
        };

        if (useDayFilter) {
          await showStore.fetchShows(selectedDay, searchParams);
        } else {
          await showStore.fetchShows(undefined, searchParams);
        }
      }
    };

    initialize();
  }, []); // Only run on mount

  // Handle adding/removing favorites
  const handleFavoriteToggle = async (show: Show) => {
    if (!authStore.isAuthenticated) return;

    const isFavorited = show.favorites?.some((fav: any) => fav.userId === authStore.user?.id);

    if (isFavorited) {
      const favorite = show.favorites?.find((fav: any) => fav.userId === authStore.user?.id);
      if (favorite) {
        await favoriteStore.removeFavorite(favorite.id);
      }
    } else {
      await favoriteStore.addFavorite({
        showId: show.id,
        day: show.day,
      });
    }

    // Refresh shows to update favorites
    const mapCenter = {
      lat: mapStore.searchCenter?.lat || mapStore.currentCenter.lat,
      lng: mapStore.searchCenter?.lng || mapStore.currentCenter.lng,
      radius: radiusFilter,
    };

    if (useDayFilter) {
      await showStore.fetchShows(selectedDay, mapCenter);
    } else {
      await showStore.fetchShows(undefined, mapCenter);
    }
  };

  const handleMarkerClick = (showId: string) => {
    setSelectedMarkerId(selectedMarkerId === showId ? null : showId);
  };

  const selectedShow = selectedMarkerId
    ? filteredShows.find((show) => show.id === selectedMarkerId)
    : null;

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

  // MapContent component to handle map instance
  const MapContent: React.FC = observer(() => {
    const map = useMap();

    // Set map instance when map is available
    useEffect(() => {
      if (map && !mapStore.mapInstance) {
        mapStore.setMapInstance(map);
      }
    }, [map]);

    return (
      <>
        {/* Show markers */}
        {(() => {
          const showsWithCoords = filteredShows.filter((show) => {
            const lat = typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat;
            const lng = typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng;
            return lat && lng && !isNaN(lat) && !isNaN(lng);
          });
          console.log('ShowsPage - Filtered shows with coordinates:', showsWithCoords.length);
          console.log('ShowsPage - Sample shows:', showsWithCoords.slice(0, 3).map(s => ({
            id: s.id,
            venue: s.venue,
            lat: s.lat,
            lng: s.lng,
            latType: typeof s.lat,
            lngType: typeof s.lng
          })));
          
          return showsWithCoords.map((show) => {
            const lat = typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat!;
            const lng = typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng!;
            
            return (
              <Marker
                key={show.id}
                position={{ lat, lng }}
                onClick={() => handleMarkerClick(show.id)}
                title={show.venue || show.address || 'Karaoke Show'}
                icon={createMicrophoneIcon(selectedMarkerId === show.id)}
              />
            );
          });
        })()}

        {/* Info window for selected marker */}
        {selectedShow && selectedShow.lat && selectedShow.lng && (
          <InfoWindow
            position={{ 
              lat: typeof selectedShow.lat === 'string' ? parseFloat(selectedShow.lat) : selectedShow.lat,
              lng: typeof selectedShow.lng === 'string' ? parseFloat(selectedShow.lng) : selectedShow.lng
            }}
            pixelOffset={[0, -40]}
            onCloseClick={() => setSelectedMarkerId(null)}
          >
            <Box
              sx={{
                maxWidth: { xs: '280px', sm: '320px' },
                minWidth: { xs: '250px', sm: '280px' },
                p: { xs: 1.5, sm: 2 },
                backgroundColor: theme.palette.background.paper,
                borderRadius: 2,
                boxShadow: theme.shadows[8],
                position: 'relative',
                maxHeight: { xs: '320px', sm: 'auto' },
                overflow: 'auto',
                border: `1px solid ${theme.palette.divider}`,
                // Custom scrollbar styling
                '&::-webkit-scrollbar': {
                  width: '4px',
                },
                '&::-webkit-scrollbar-track': {
                  background: theme.palette.action.hover,
                },
                '&::-webkit-scrollbar-thumb': {
                  background: theme.palette.primary.main,
                  borderRadius: '2px',
                },
              }}
            >
              {/* Close button in top right corner */}
              <IconButton
                size="small"
                onClick={() => setSelectedMarkerId(null)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: theme.palette.text.secondary,
                  backgroundColor: theme.palette.background.default,
                  border: `1px solid ${theme.palette.divider}`,
                  width: 28,
                  height: 28,
                  '&:hover': {
                    color: theme.palette.text.primary,
                    backgroundColor: theme.palette.action.hover,
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.2s ease',
                  zIndex: 1,
                }}
              >
                <FontAwesomeIcon icon={faXmark} style={{ fontSize: '12px' }} />
              </IconButton>

              {/* Title and heart in same row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pr: 3 }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: theme.palette.text.primary,
                    fontWeight: 600,
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                    lineHeight: 1.2,
                    flex: 1,
                  }}
                >
                  {selectedShow.venue || selectedShow.vendor?.name}
                </Typography>

                {/* Favorite button next to title */}
                {authStore.isAuthenticated && (
                  <IconButton
                    size="small"
                    onClick={() => handleFavoriteToggle(selectedShow)}
                    sx={{
                      color: selectedShow.favorites?.some((fav: any) => fav.userId === authStore.user?.id)
                        ? theme.palette.error.main
                        : theme.palette.text.secondary,
                      '&:hover': {
                        color: theme.palette.error.main,
                        backgroundColor: theme.palette.error.main + '10',
                      },
                      p: 0.5,
                    }}
                  >
                    <FontAwesomeIcon
                      icon={
                        selectedShow.favorites?.some((fav: any) => fav.userId === authStore.user?.id)
                          ? faHeart
                          : faHeartRegular
                      }
                      style={{ fontSize: '14px' }}
                    />
                  </IconButton>
                )}
              </Box>

              {selectedShow.venue && selectedShow.vendor?.name && (
                <Typography
                  variant="body2"
                  gutterBottom
                  sx={{
                    color: theme.palette.text.secondary,
                    fontStyle: 'italic',
                    mb: 1,
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  }}
                >
                  by {selectedShow.vendor.name}
                </Typography>
              )}

              <Typography
                variant="body2"
                gutterBottom
                sx={{
                  color: theme.palette.text.secondary,
                  mb: 1.5,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  lineHeight: 1.3,
                }}
              >
                {selectedShow.address}
              </Typography>

              {selectedShow.dj && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <FontAwesomeIcon
                    icon={faMicrophone}
                    style={{
                      fontSize: '12px',
                      color: theme.palette.primary.main,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.primary,
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    }}
                  >
                    Host: {selectedShow.dj.name}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FontAwesomeIcon
                  icon={faClock}
                  style={{
                    fontSize: '12px',
                    color: theme.palette.secondary.main,
                  }}
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: theme.palette.text.primary,
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  }}
                >
                  {formatTime(selectedShow.startTime)} - {formatTime(selectedShow.endTime)}
                </Typography>
              </Box>

              {/* Contact Information */}
              {selectedShow.venuePhone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <FontAwesomeIcon
                    icon={faPhone}
                    style={{
                      fontSize: '12px',
                      color: theme.palette.success.main,
                    }}
                  />
                  <Typography
                    component="a"
                    href={`tel:${selectedShow.venuePhone}`}
                    variant="body2"
                    sx={{
                      color: theme.palette.text.primary,
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      textDecoration: 'none',
                      '&:hover': {
                        color: theme.palette.success.main,
                      },
                    }}
                  >
                    {selectedShow.venuePhone}
                  </Typography>
                </Box>
              )}

              {selectedShow.venueWebsite && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <FontAwesomeIcon
                    icon={faExternalLinkAlt}
                    style={{
                      fontSize: '12px',
                      color: theme.palette.info.main,
                    }}
                  />
                  <Typography
                    component="a"
                    href={
                      selectedShow.venueWebsite.startsWith('http')
                        ? selectedShow.venueWebsite
                        : `https://${selectedShow.venueWebsite}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    sx={{
                      color: theme.palette.info.main,
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Visit Website
                  </Typography>
                </Box>
              )}

              {selectedShow.vendor && (
                <Chip 
                  label={selectedShow.vendor.name} 
                  size="small" 
                  sx={{ 
                    mt: 1,
                    backgroundColor: theme.palette.primary.main + '20',
                    color: theme.palette.primary.main,
                  }} 
                />
              )}

              {selectedShow.description && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    color: theme.palette.text.secondary,
                    fontStyle: 'italic',
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  }}
                >
                  {selectedShow.description}
                </Typography>
              )}
            </Box>
          </InfoWindow>
        )}
      </>
    );
  });

  return (
    <>
      <SEO
        title="Shows | KaraokePal"
        description="Find karaoke shows near you with our interactive map and advanced filtering options."
      />

      <Box 
        sx={{ 
          display: 'flex', 
          height: { xs: 'calc(100vh - 60px)', md: 'calc(100vh - 80px)' }, 
          overflow: 'hidden' 
        }} 
        data-showspage
      >
        {/* Map Section - Full width */}
        <Box
          sx={{
            flex: 1,
            position: 'relative',
          }}
        >
          <APIProvider apiKey={apiStore.googleMapsApiKey || ''}>
            <Map
              style={{
                width: '100%',
                height: '100%',
              }}
              defaultCenter={
                mapStore.userCityCenter || mapStore.userLocation || mapStore.currentCenter
              }
              defaultZoom={mapStore.userCityCenter || mapStore.userLocation ? 12 : mapStore.initialZoom}
              gestureHandling="auto"
              disableDefaultUI={false}
              zoomControl={true}
              mapTypeControl={false}
              scaleControl={true}
              streetViewControl={false}
              rotateControl={false}
              fullscreenControl={false}
              onCenterChanged={() => {
                // Reset recenter flag when user manually moves the map
                if (shouldRecenterMap) {
                  setShouldRecenterMap(false);
                }
              }}
            >
              <MapContent />

            </Map>
          </APIProvider>

          {/* Buttons - Top Right */}
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {/* Toggle Sidebar Button - Mobile Only */}
            {isMobile && (
              <Fab
                color="secondary"
                size="small"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                sx={{
                  backgroundColor: 'background.paper',
                  border: `1px solid ${theme.palette.divider}`,
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                title={sidebarOpen ? 'Hide filters and shows' : 'Show filters and shows'}
              >
                <FontAwesomeIcon icon={sidebarOpen ? faXmark : faBars} />
              </Fab>
            )}
          </Box>
        </Box>

        {/* Sidebar - Show list and filters */}
        <Box
          sx={{
            width: isMobile ? '100%' : 400,
            height: '100%',
            borderLeft: `1px solid ${theme.palette.divider}`,
            display: !isMobile || sidebarOpen ? 'flex' : 'none',
            flexDirection: 'column',
            position: isMobile ? 'absolute' : 'relative',
            right: 0,
            top: 0,
            bgcolor: 'background.paper',
            zIndex: isMobile ? 1000 : 'auto',
          }}
        >
          {/* Filters Section */}
          <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Filters
            </Typography>

            {/* Day Picker - Compact */}
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 1,
                  mb: 1,
                }}
              >
                {Object.values(DayOfWeek)
                  .slice(0, 4)
                  .map((day) => {
                    const isSelected = selectedDay === day;
                    const dayLabels = {
                      [DayOfWeek.MONDAY]: 'Mon',
                      [DayOfWeek.TUESDAY]: 'Tue',
                      [DayOfWeek.WEDNESDAY]: 'Wed',
                      [DayOfWeek.THURSDAY]: 'Thu',
                      [DayOfWeek.FRIDAY]: 'Fri',
                      [DayOfWeek.SATURDAY]: 'Sat',
                      [DayOfWeek.SUNDAY]: 'Sun',
                    };
                    return (
                      <Box
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          py: 1,
                          px: 1,
                          borderRadius: 2,
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          transition: 'all 0.2s',
                          ...(isSelected
                            ? {
                                backgroundColor: theme.palette.primary.main,
                                color: theme.palette.primary.contrastText,
                              }
                            : {
                                backgroundColor: theme.palette.action.hover,
                                color: theme.palette.text.secondary,
                                '&:hover': {
                                  backgroundColor: theme.palette.action.selected,
                                },
                              }),
                        }}
                      >
                        {dayLabels[day]}
                      </Box>
                    );
                  })}
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 1,
                  justifyContent: 'center',
                }}
              >
                {Object.values(DayOfWeek)
                  .slice(4)
                  .map((day) => {
                    const isSelected = selectedDay === day;
                    const dayLabels = {
                      [DayOfWeek.MONDAY]: 'Mon',
                      [DayOfWeek.TUESDAY]: 'Tue',
                      [DayOfWeek.WEDNESDAY]: 'Wed',
                      [DayOfWeek.THURSDAY]: 'Thu',
                      [DayOfWeek.FRIDAY]: 'Fri',
                      [DayOfWeek.SATURDAY]: 'Sat',
                      [DayOfWeek.SUNDAY]: 'Sun',
                    };
                    return (
                      <Box
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          py: 1,
                          px: 1,
                          borderRadius: 2,
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          transition: 'all 0.2s',
                          ...(isSelected
                            ? {
                                backgroundColor: theme.palette.primary.main,
                                color: theme.palette.primary.contrastText,
                              }
                            : {
                                backgroundColor: theme.palette.action.hover,
                                color: theme.palette.text.secondary,
                                '&:hover': {
                                  backgroundColor: theme.palette.action.selected,
                                },
                              }),
                        }}
                      >
                        {dayLabels[day]}
                      </Box>
                    );
                  })}
              </Box>
            </Box>

            {/* Radius Filter */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Radius: {radiusFilter} miles
              </Typography>
              <Slider
                value={radiusFilter}
                onChange={(_, value) => setRadiusFilter(value as number)}
                min={25}
                max={100}
                step={5}
                marks={[
                  { value: 25, label: '25mi' },
                  { value: 50, label: '50mi' },
                  { value: 100, label: '100mi' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>

            {/* Vendor Filter */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Vendor
              </Typography>
              <Autocomplete
                value={vendorFilter}
                onChange={(_, value: string | null | undefined) => setVendorFilter(value || null)}
                options={uniqueVendors}
                size="small"
                renderInput={(params) => <TextField {...params} placeholder="Select vendor..." />}
              />
            </Box>
          </Box>

          {/* Shows List Section */}
          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6">Shows ({filteredShows.length})</Typography>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {showStore.isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : filteredShows.length === 0 ? (
                <Box sx={{ p: 3 }}>
                  <Alert severity="info">
                    No shows found matching your filters. Try adjusting your search criteria.
                  </Alert>
                </Box>
              ) : (
                <List sx={{ p: 0, m: '5px', pr: '10px' }}>
                  {filteredShows.map((show) => {
                    const isFavorited =
                      authStore.isAuthenticated &&
                      show.favorites?.some((fav: any) => fav.userId === authStore.user?.id);

                    return (
                      <React.Fragment key={show.id}>
                        <ListItem
                          sx={{ p: 0, mb: { xs: 0.25, md: 0.75 }, mx: { xs: 0.25, md: 0.75 } }}
                        >
                          <ListItemButton
                            onClick={() => handleMarkerClick(show.id)}
                            selected={selectedMarkerId === show.id}
                            sx={{
                              p: { xs: 1.5, md: 2.5 },
                              borderRadius: 2,
                              transition: 'all 0.2s ease',
                              border: `1px solid ${theme.palette.divider}`,
                              backgroundColor: theme.palette.background.paper,
                              minHeight: { xs: '105px', md: '130px' },
                              '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                                border: `1px solid ${theme.palette.primary.main}`,
                                transform: 'translateY(-2px)',
                                boxShadow: theme.shadows[4],
                              },
                              '&.Mui-selected': {
                                backgroundColor: theme.palette.primary.main + '15',
                                border: `2px solid ${theme.palette.primary.main}`,
                                '&:hover': {
                                  backgroundColor: theme.palette.primary.main + '20',
                                },
                              },
                            }}
                          >
                            {/* Custom layout instead of ListItemText to avoid div-in-p nesting */}
                            <Box sx={{ py: { xs: 0.5, md: 1 }, px: 0, width: '100%' }}>
                              {/* Primary content - Compact mobile layout */}
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: { xs: 1.5, md: 2 },
                                  mb: { xs: 0.5, md: 0.5 },
                                }}
                              >
                                {/* Icon column */}
                                <Box
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    minWidth: { xs: '24px', md: '28px' },
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
                                      height: { xs: '20px', md: '30px' },
                                      backgroundColor: theme.palette.primary.main,
                                      opacity: 0.3,
                                      borderRadius: '1px',
                                    }}
                                  />
                                </Box>

                                {/* Main content */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  {/* Venue name */}
                                  <Typography
                                    variant="subtitle1"
                                    fontWeight={600}
                                    sx={{
                                      fontSize: { xs: '0.95rem', md: '1.1rem' },
                                      lineHeight: 1.2,
                                      mb: 0.5,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {show.venue || show.vendor?.name || 'Unknown Venue'}
                                  </Typography>
                                  {/* Time badge */}
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
                                        fontSize: { xs: '0.7rem', md: '0.75rem' },
                                        color: theme.palette.primary.main,
                                      }}
                                    >
                                      {formatTime(show.startTime)} - {formatTime(show.endTime)}
                                    </Typography>
                                  </Box>
                                  {/* Compact info rows */}
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    {/* DJ/Host info */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <FontAwesomeIcon
                                        icon={faUser}
                                        style={{
                                          fontSize: '11px',
                                          color: theme.palette.text.secondary,
                                        }}
                                      />
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                          fontSize: { xs: '0.75rem', md: '0.8rem' },
                                          fontWeight: 500,
                                        }}
                                      >
                                        {show.dj?.name || 'Unknown Host'}
                                      </Typography>
                                    </Box>

                                    {/* Location info on separate line */}
                                    <Box
                                      sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}
                                    >
                                      <FontAwesomeIcon
                                        icon={faMapMarkerAlt}
                                        style={{
                                          fontSize: '11px',
                                          color: theme.palette.text.secondary,
                                          marginTop: '2px',
                                        }}
                                      />
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                          fontSize: { xs: '0.75rem', md: '0.8rem' },
                                          lineHeight: 1.3,
                                          wordBreak: 'break-word',
                                        }}
                                      >
                                        {show.address}
                                      </Typography>
                                    </Box>

                                    {/* Contact info */}
                                    {((show as any).venuePhone || (show as any).venueWebsite) && (
                                      <Box
                                        sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}
                                      >
                                        {(show as any).venuePhone && (
                                          <Box
                                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                          >
                                            <FontAwesomeIcon
                                              icon={faPhone}
                                              style={{
                                                fontSize: '10px',
                                                color: theme.palette.text.secondary,
                                              }}
                                            />
                                            <Typography
                                              variant="body2"
                                              color="text.secondary"
                                              sx={{
                                                fontSize: { xs: '0.7rem', md: '0.75rem' },
                                              }}
                                            >
                                              {(show as any).venuePhone}
                                            </Typography>
                                          </Box>
                                        )}
                                        {(show as any).venueWebsite && (
                                          <Box
                                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                          >
                                            <FontAwesomeIcon
                                              icon={faExternalLinkAlt}
                                              style={{
                                                fontSize: '10px',
                                                color: theme.palette.text.secondary,
                                              }}
                                            />
                                            <Typography
                                              component="a"
                                              href={
                                                (show as any).venueWebsite.startsWith('http')
                                                  ? (show as any).venueWebsite
                                                  : `https://${(show as any).venueWebsite}`
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              variant="body2"
                                              sx={{
                                                fontSize: { xs: '0.7rem', md: '0.75rem' },
                                                color: theme.palette.primary.main,
                                                textDecoration: 'none',
                                                '&:hover': {
                                                  textDecoration: 'underline',
                                                },
                                              }}
                                            >
                                              Website
                                            </Typography>
                                          </Box>
                                        )}
                                      </Box>
                                    )}

                                  </Box>
                                  {/* Badges section */}
                                  <Box
                                    sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}
                                  >
                                    {/* Vendor chip */}
                                    {show.vendor?.name && (
                                      <Chip
                                        label={show.vendor.name}
                                        size="small"
                                        sx={{
                                          height: '22px',
                                          fontSize: { xs: '0.65rem', md: '0.7rem' },
                                          fontWeight: 500,
                                          backgroundColor: theme.palette.info.main + '15',
                                          color: theme.palette.info.main,
                                          border: `1px solid ${theme.palette.info.main + '30'}`,
                                          '& .MuiChip-label': {
                                            px: 0.75,
                                          },
                                        }}
                                      />
                                    )}

                                    {/* Show type badge */}
                                    <Box
                                      sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        backgroundColor: theme.palette.secondary.main + '15',
                                        color: theme.palette.secondary.main,
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 0.75,
                                        fontSize: { xs: '0.7rem', md: '0.75rem' },
                                        fontWeight: 500,
                                      }}
                                    >
                                      <FontAwesomeIcon
                                        icon={faMusic}
                                        style={{
                                          fontSize: '10px',
                                        }}
                                      />
                                      Karaoke
                                    </Box>
                                  </Box>
                                </Box>

                                {/* Favorite button */}
                                {authStore.isAuthenticated && (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFavoriteToggle(show);
                                    }}
                                    sx={{
                                      color: isFavorited ? 'error.main' : 'text.secondary',
                                      '&:hover': {
                                        backgroundColor: isFavorited
                                          ? 'error.main' + '15'
                                          : 'action.hover',
                                      },
                                    }}
                                  >
                                    {isFavorited ? (
                                      <FavoriteIcon fontSize="small" />
                                    ) : (
                                      <FavoriteBorderIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                )}
                              </Box>
                            </Box>
                          </ListItemButton>
                        </ListItem>
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
});

export default ShowsPage;
