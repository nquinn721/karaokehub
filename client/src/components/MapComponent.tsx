import { DayOfWeek, DayPicker } from '@components/DayPicker';
import { PaywallModal } from '@components/PaywallModal';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import {
  faClock,
  faHeart,
  faLocationDot,
  faMapMarkerAlt,
  faMicrophone,
  faMusic,
  faUser,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Typography,
  useTheme,
} from '@mui/material';
import {
  apiStore,
  authStore,
  favoriteStore,
  mapStore,
  showStore,
  subscriptionStore,
} from '@stores/index';
import { APIProvider, InfoWindow, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { observer } from 'mobx-react-lite';
import React, { useRef, useState } from 'react';

export const MapComponent: React.FC = observer(() => {
  const theme = useTheme();
  const showListRef = useRef<HTMLDivElement>(null);

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<'favorites' | 'friends' | 'ad_removal'>(
    'favorites',
  );
  const [pendingFavoriteAction, setPendingFavoriteAction] = useState<{
    showId: string;
    day: string;
    action: 'add' | 'remove';
  } | null>(null);

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

      // Fetch favorites if user is authenticated
      if (
        authStore.isAuthenticated &&
        favoriteStore.favorites.length === 0 &&
        !favoriteStore.isLoading
      ) {
        await favoriteStore.fetchMyFavorites().catch((error) => {
          console.error('Failed to fetch favorites:', error);
        });
      }
    };

    initializeStores();
  }, []);

  // Watch for subscription changes and execute pending actions
  React.useEffect(() => {
    if (pendingFavoriteAction && subscriptionStore.isSubscribed) {
      const executePendingAction = async () => {
        const { showId, day, action } = pendingFavoriteAction;

        if (action === 'add') {
          const result = await favoriteStore.addFavorite({ showId, day });
          if (!result.success) {
            console.error('Failed to add favorite after subscription:', result.error);
          }
        } else if (action === 'remove') {
          const result = await favoriteStore.removeFavoriteByShow(showId);
          if (!result.success) {
            console.error('Failed to remove favorite after subscription:', result.error);
          }
        }

        setPendingFavoriteAction(null);
        setShowPaywall(false);
      };

      executePendingAction();
    }
  }, [subscriptionStore.isSubscribed, pendingFavoriteAction]);

  // Favorite handling functions
  const handleFavorite = async (showId: string, day: string) => {
    if (!authStore.isAuthenticated) {
      // Handle unauthenticated user
      console.log('User not authenticated - redirect to login');
      return;
    }

    // Check if paywall should be shown
    if (subscriptionStore.shouldShowPaywall('favorites')) {
      setPendingFavoriteAction({ showId, day, action: 'add' });
      setPaywallFeature('favorites');
      setShowPaywall(true);
      return;
    }

    // User has access, add favorite directly
    const result = await favoriteStore.addFavorite({ showId, day });
    if (!result.success) {
      console.error('Failed to add favorite:', result.error);
    }
  };

  const handleUnfavorite = async (showId: string, day: string) => {
    if (!authStore.isAuthenticated) {
      return;
    }

    // Check if paywall should be shown
    if (subscriptionStore.shouldShowPaywall('favorites')) {
      setPendingFavoriteAction({ showId, day, action: 'remove' });
      setPaywallFeature('favorites');
      setShowPaywall(true);
      return;
    }

    // User has access, remove favorite directly
    const result = await favoriteStore.removeFavoriteByShow(showId);
    if (!result.success) {
      console.error('Failed to remove favorite:', result.error);
    }
  };

  const handlePaywallClose = () => {
    setShowPaywall(false);
    setPendingFavoriteAction(null);
  };

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
            icon={createMicrophoneIcon(mapStore.selectedMarkerId === show.id)}
          />
        ))}

        {/* Info Window for Selected Show */}
        {mapStore.selectedMarkerId && showStore.selectedShow && (
          <InfoWindow
            position={{
              lat: showStore.selectedShow.lat!,
              lng: showStore.selectedShow.lng!,
            }}
            pixelOffset={[0, -40]} // Offset to avoid covering marker
            onCloseClick={() => {
              mapStore.closeInfoWindow();
            }}
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
                onClick={() => mapStore.closeInfoWindow()}
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
                  {showStore.selectedShow.venue || showStore.selectedShow.vendor?.name}
                </Typography>

                {/* Favorite button next to title */}
                {authStore.isAuthenticated && showStore.selectedShow && (
                  <IconButton
                    size="small"
                    onClick={() => {
                      const selectedShow = showStore.selectedShow;
                      if (!selectedShow) return;

                      const isFav = favoriteStore.isFavorite(selectedShow.id);
                      if (isFav) {
                        handleUnfavorite(selectedShow.id, showStore.selectedDay);
                      } else {
                        handleFavorite(selectedShow.id, showStore.selectedDay);
                      }
                    }}
                    sx={{
                      color: favoriteStore.isFavorite(showStore.selectedShow.id)
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
                        favoriteStore.isFavorite(showStore.selectedShow.id)
                          ? faHeart
                          : faHeartRegular
                      }
                      style={{ fontSize: '14px' }}
                    />
                  </IconButton>
                )}
              </Box>
              {showStore.selectedShow.venue && showStore.selectedShow.vendor?.name && (
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
                  by {showStore.selectedShow.vendor.name}
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
                {showStore.selectedShow.address}
              </Typography>
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
                  Host: {showStore.selectedShow.dj?.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FontAwesomeIcon
                  icon={faLocationDot}
                  style={{
                    fontSize: '12px',
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
  const createMicrophoneIcon = (isSelected = false) => {
    const iconColor = isSelected ? '#d32f2f' : '#f44336'; // Red colors - darker when selected, lighter when not
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="${iconColor}" stroke="#fff" stroke-width="2"/>
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

      {/* Map and List Layout - Responsive */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' }, // Stack vertically on mobile
          gap: { xs: 2, md: 3 },
          height: { xs: 'auto', md: '600px' }, // Auto height on mobile
        }}
      >
        {/* Map Section */}
        <Box
          sx={{
            flex: { xs: 'none', md: 2 },
            height: { xs: '300px', sm: '400px', md: '100%' }, // Responsive height
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
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
        <Box sx={{ flex: { xs: 'none', md: 1 } }}>
          <Card
            sx={{
              height: { xs: 'auto', md: '100%' },
              minHeight: { xs: '200px', md: '100%' },
            }}
          >
            <CardContent sx={{ height: '100%', p: 0 }}>
              <Box
                sx={{
                  p: { xs: 1.5, md: 2 },
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
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
                  height: { xs: 'auto', md: 'calc(100% - 80px)' },
                  maxHeight: { xs: '320px', md: 'none' }, // Further reduce height on mobile
                  overflow: 'auto',
                  p: 0,
                  // Custom scrollbar styling
                  '&::-webkit-scrollbar': {
                    width: { xs: '6px', md: '8px' },
                  },
                  '&::-webkit-scrollbar-track': {
                    background: theme.palette.action.hover,
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: theme.palette.primary.main,
                    borderRadius: '4px',
                    '&:hover': {
                      background: theme.palette.primary.dark,
                    },
                  },
                }}
              >
                {showStore.isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : showStore.showsForSelectedDay.length === 0 ? (
                  <Box sx={{ textAlign: 'center', p: { xs: 3, md: 4 } }}>
                    <Typography variant="body2" color="text.secondary">
                      No shows found for {showStore.selectedDay}
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0, m: '5px', pr: '10px' }}>
                    {showStore.showsForSelectedDay.map((show, index) => (
                      <React.Fragment key={show.id}>
                        <ListItem
                          sx={{ p: 0, mb: { xs: 0.25, md: 0.75 }, mx: { xs: 0.25, md: 0.75 } }}
                        >
                          <ListItemButton
                            data-show-id={show.id}
                            onClick={() => handleShowClick(show)}
                            selected={showStore.selectedShow?.id === show.id}
                            sx={{
                              p: { xs: 1.5, md: 2.5 },
                              borderRadius: 2,
                              transition: 'all 0.2s ease',
                              border: `1px solid ${theme.palette.divider}`,
                              backgroundColor: theme.palette.background.paper,
                              minHeight: { xs: '105px', md: '130px' }, // Slightly taller to accommodate address on separate line
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
                                  {/* Venue name and time */}
                                  <Box
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
                                  >
                                    <Typography
                                      variant="subtitle1"
                                      fontWeight={600}
                                      sx={{
                                        fontSize: { xs: '0.95rem', md: '1.1rem' },
                                        lineHeight: 1.2,
                                        flex: 1,
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
                                        backgroundColor: theme.palette.primary.main + '15',
                                        border: `1px solid ${theme.palette.primary.main + '30'}`,
                                        borderRadius: 1,
                                        px: { xs: 0.75, md: 1 },
                                        py: 0.25,
                                        minWidth: 'fit-content',
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
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {formatTime(show.startTime)} - {formatTime(show.endTime)}
                                      </Typography>
                                    </Box>
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
                                          marginTop: '2px', // Align with first line of text
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
                                      const isFav = favoriteStore.isFavorite(show.id);
                                      if (isFav) {
                                        handleUnfavorite(show.id, showStore.selectedDay);
                                      } else {
                                        handleFavorite(show.id, showStore.selectedDay);
                                      }
                                    }}
                                    sx={{
                                      color: favoriteStore.isFavorite(show.id)
                                        ? theme.palette.error.main
                                        : theme.palette.text.disabled,
                                      width: { xs: '36px', md: '40px' },
                                      height: { xs: '36px', md: '40px' },
                                      '&:hover': {
                                        color: theme.palette.error.main,
                                        backgroundColor: theme.palette.error.main + '10',
                                      },
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={
                                        favoriteStore.isFavorite(show.id) ? faHeart : faHeartRegular
                                      }
                                      style={{ fontSize: '16px' }}
                                    />
                                  </IconButton>
                                )}
                              </Box>
                            </Box>
                          </ListItemButton>
                        </ListItem>
                        {index < showStore.showsForSelectedDay.length - 1 && (
                          <Divider sx={{ mx: { xs: 1.5, md: 2 } }} />
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Paywall Modal */}
      <PaywallModal open={showPaywall} onClose={handlePaywallClose} feature={paywallFeature} />
    </Box>
  );
});
