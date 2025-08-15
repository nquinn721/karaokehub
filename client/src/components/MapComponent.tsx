import { DayOfWeek, DayPicker } from '@components/DayPicker';
import { LocalSubscriptionModal } from '@components/LocalSubscriptionModal';
import { PaywallModal } from '@components/PaywallModal';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import {
  faClock,
  faExternalLinkAlt,
  faHeart,
  faLocationArrow,
  faLocationDot,
  faMapMarkerAlt,
  faMicrophone,
  faMusic,
  faPhone,
  faUser,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import React, { useEffect, useRef, useState } from 'react';

export const MapComponent: React.FC = observer(() => {
  const theme = useTheme();
  const showListRef = useRef<HTMLDivElement>(null);

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLocalSubscription, setShowLocalSubscription] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<
    'favorites' | 'ad_removal' | 'music_preview'
  >('favorites');
  const [pendingFavoriteAction, setPendingFavoriteAction] = useState<{
    showId: string;
    day: string;
    action: 'add' | 'remove';
  } | null>(null);

  // Login modal state
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Fullscreen state
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Google Maps API key from server config
  const API_KEY = apiStore.googleMapsApiKey;

  // Add a state to track if we should show the config loading
  const [showConfigLoading, setShowConfigLoading] = useState(true);

  // Hide config loading after a short delay to prevent flash
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfigLoading(false);
    }, 2000); // Give config 2 seconds to load, then show map anyway

    if (apiStore.configLoaded) {
      clearTimeout(timer);
      setShowConfigLoading(false);
    }

    return () => clearTimeout(timer);
  }, [apiStore.configLoaded]);

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

    // Cleanup when component unmounts
    return () => {
      mapStore.cleanup();
    };
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

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMapFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Favorite handling functions
  const handleFavorite = async (showId: string, day: string) => {
    if (!authStore.isAuthenticated) {
      // Show local subscription modal for unauthenticated users
      setPaywallFeature('favorites');
      setShowLocalSubscription(true);
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
      // Show local subscription modal for unauthenticated users
      setPaywallFeature('favorites');
      setShowLocalSubscription(true);
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

  if (showConfigLoading && !apiStore.configLoaded && !API_KEY) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading configuration...</Typography>
      </Box>
    );
  }

  if (!API_KEY && !showConfigLoading) {
    console.error('Google Maps API key not found in server configuration');
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Maps functionality may be limited. Please refresh the page if the map doesn't load.
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
        {mapStore.geocodedShows.map((show: any) => (
          <Marker
            key={show.id}
            position={{ lat: show.lat, lng: show.lng }}
            onClick={() => handleMarkerClick(show)}
            title={show.venue || show.vendor?.name || 'Karaoke Show'}
            icon={createMicrophoneIcon(mapStore.selectedMarkerId === show.id)}
          />
        ))}

        {/* Info Window for Selected Show */}
        {mapStore.selectedMarkerId &&
          showStore.selectedShow &&
          (() => {
            const geocodedShow = mapStore.geocodedShows.find(
              (s) => s.id === mapStore.selectedMarkerId,
            );
            if (!geocodedShow) return null;

            return (
              <InfoWindow
                position={{
                  lat: geocodedShow.lat,
                  lng: geocodedShow.lng,
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
                      {showStore.selectedShow?.venue || showStore.selectedShow?.vendor?.name}
                    </Typography>

                    {/* Favorite button next to title */}
                    <IconButton
                      size="small"
                      onClick={() => {
                        const selectedShow = showStore.selectedShow;
                        if (!selectedShow) return;

                        const isFav =
                          authStore.isAuthenticated && favoriteStore.isFavorite(selectedShow.id);
                        if (isFav) {
                          handleUnfavorite(selectedShow.id, showStore.selectedDay);
                        } else {
                          handleFavorite(selectedShow.id, showStore.selectedDay);
                        }
                      }}
                      sx={{
                        color:
                          authStore.isAuthenticated &&
                          showStore.selectedShow &&
                          favoriteStore.isFavorite(showStore.selectedShow.id)
                            ? theme.palette.error.main
                            : theme.palette.text.secondary,
                        '&:hover': {
                          color: theme.palette.error.main,
                          backgroundColor: theme.palette.error.main + '10',
                        },
                        p: 0.5,
                        opacity: authStore.isAuthenticated ? 1 : 0.6,
                      }}
                    >
                      <FontAwesomeIcon
                        icon={
                          authStore.isAuthenticated &&
                          showStore.selectedShow &&
                          favoriteStore.isFavorite(showStore.selectedShow.id)
                            ? faHeart
                            : faHeartRegular
                        }
                        style={{ fontSize: '14px' }}
                      />
                    </IconButton>
                  </Box>
                  {showStore.selectedShow?.venue && showStore.selectedShow?.vendor?.name && (
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
                    {showStore.selectedShow?.address}
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
                      Host: {showStore.selectedShow?.dj?.name}
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
                      {showStore.selectedShow?.startTime &&
                        formatTime(showStore.selectedShow.startTime)}{' '}
                      -{' '}
                      {showStore.selectedShow?.endTime &&
                        formatTime(showStore.selectedShow.endTime)}
                    </Typography>
                  </Box>

                  {/* Contact Information */}
                  {showStore.selectedShow?.venuePhone && (
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
                        href={`tel:${showStore.selectedShow.venuePhone}`}
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
                        {showStore.selectedShow.venuePhone}
                      </Typography>
                    </Box>
                  )}

                  {showStore.selectedShow?.venueWebsite && (
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
                          showStore.selectedShow.venueWebsite.startsWith('http')
                            ? showStore.selectedShow.venueWebsite
                            : `https://${showStore.selectedShow.venueWebsite}`
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

                  {showStore.selectedShow?.description && (
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
            );
          })()}
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
            position: 'relative', // For positioning the location button
          }}
        >
          {API_KEY ? (
            <>
              <APIProvider apiKey={API_KEY} region="US" language="en" version="weekly">
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

              {/* Current Location Button */}
              <IconButton
                onClick={() => mapStore.goToCurrentLocation()}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  backgroundColor: 'white',
                  boxShadow: 2,
                  '&:hover': {
                    backgroundColor: 'grey.100',
                  },
                  zIndex: 1000,
                }}
                title={
                  mapStore.hasLocationPermission()
                    ? 'Go to current location'
                    : 'Request location permission and go to current location'
                }
              >
                <FontAwesomeIcon icon={faLocationArrow} />
              </IconButton>

              {/* Location Error Alert */}
              {mapStore.locationError && (
                <Alert
                  severity="warning"
                  onClose={() => mapStore.clearLocationError()}
                  sx={{
                    position: 'absolute',
                    top: 70,
                    right: 16,
                    maxWidth: 300,
                    zIndex: 1000,
                  }}
                >
                  {mapStore.locationError}
                </Alert>
              )}
            </>
          ) : showConfigLoading ? (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.50',
                borderRadius: 2,
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={32} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Loading map...
                </Typography>
              </Box>
            </Box>
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
              <Alert severity="info">
                Map temporarily unavailable. Please refresh the page if it doesn't load shortly.
              </Alert>
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

                                    {/* Contact info */}
                                    {(show.venuePhone || show.venueWebsite) && (
                                      <Box
                                        sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}
                                      >
                                        {show.venuePhone && (
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
                                              {show.venuePhone}
                                            </Typography>
                                          </Box>
                                        )}
                                        {show.venueWebsite && (
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
                                                show.venueWebsite.startsWith('http')
                                                  ? show.venueWebsite
                                                  : `https://${show.venueWebsite}`
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
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    const isFav =
                                      authStore.isAuthenticated &&
                                      favoriteStore.isFavorite(show.id);
                                    if (isFav) {
                                      handleUnfavorite(show.id, showStore.selectedDay);
                                    } else {
                                      handleFavorite(show.id, showStore.selectedDay);
                                    }
                                  }}
                                  sx={{
                                    color:
                                      authStore.isAuthenticated && favoriteStore.isFavorite(show.id)
                                        ? theme.palette.error.main
                                        : theme.palette.text.disabled,
                                    width: { xs: '36px', md: '40px' },
                                    height: { xs: '36px', md: '40px' },
                                    opacity: authStore.isAuthenticated ? 1 : 0.6,
                                    '&:hover': {
                                      color: theme.palette.error.main,
                                      backgroundColor: theme.palette.error.main + '10',
                                    },
                                  }}
                                >
                                  <FontAwesomeIcon
                                    icon={
                                      authStore.isAuthenticated && favoriteStore.isFavorite(show.id)
                                        ? faHeart
                                        : faHeartRegular
                                    }
                                    style={{ fontSize: '16px' }}
                                  />
                                </IconButton>
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

      {/* Fullscreen Show List Overlay */}
      {isMapFullscreen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: { xs: '100%', sm: '400px' },
            height: '100vh',
            backgroundColor: theme.palette.background.paper,
            boxShadow: theme.shadows[10],
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            }}
          >
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Shows for {showStore.selectedDay}
            </Typography>
            {showStore.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                <CircularProgress size={20} sx={{ color: 'inherit' }} />
              </Box>
            ) : (
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                {showStore.showsForSelectedDay.length} show(s) found
              </Typography>
            )}
          </Box>

          {/* Show List */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: '6px',
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
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No shows found for {showStore.selectedDay}
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 1 }}>
                {showStore.showsForSelectedDay.map((show, index) => (
                  <React.Fragment key={show.id}>
                    <ListItem sx={{ p: 0, mb: 1 }}>
                      <ListItemButton
                        onClick={() => handleShowClick(show)}
                        selected={showStore.selectedShow?.id === show.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          backgroundColor: theme.palette.background.paper,
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                            border: `1px solid ${theme.palette.primary.main}`,
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
                        <Box sx={{ width: '100%' }}>
                          {/* Venue name and favorite button */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <FontAwesomeIcon
                              icon={faMicrophone}
                              style={{
                                fontSize: '14px',
                                color: theme.palette.primary.main,
                              }}
                            />
                            <Typography
                              variant="subtitle2"
                              fontWeight={600}
                              sx={{ flex: 1, fontSize: '0.9rem' }}
                            >
                              {show.venue || show.vendor?.name || 'Unknown Venue'}
                            </Typography>

                            {/* Favorite button */}
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();

                                const isFav =
                                  authStore.isAuthenticated && favoriteStore.isFavorite(show.id);
                                if (isFav) {
                                  handleUnfavorite(show.id, showStore.selectedDay);
                                } else {
                                  handleFavorite(show.id, showStore.selectedDay);
                                }
                              }}
                              sx={{
                                color:
                                  authStore.isAuthenticated && favoriteStore.isFavorite(show.id)
                                    ? theme.palette.error.main
                                    : theme.palette.text.disabled,
                                width: '32px',
                                height: '32px',
                                opacity: authStore.isAuthenticated ? 1 : 0.6,
                                '&:hover': {
                                  color: theme.palette.error.main,
                                  backgroundColor: theme.palette.error.main + '10',
                                },
                              }}
                            >
                              <FontAwesomeIcon
                                icon={
                                  authStore.isAuthenticated && favoriteStore.isFavorite(show.id)
                                    ? faHeart
                                    : faHeartRegular
                                }
                                style={{ fontSize: '14px' }}
                              />
                            </IconButton>
                          </Box>

                          {/* Time */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
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
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: theme.palette.primary.main,
                              }}
                            >
                              {formatTime(show.startTime)} - {formatTime(show.endTime)}
                            </Typography>
                          </Box>

                          {/* DJ info */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <FontAwesomeIcon
                              icon={faUser}
                              style={{
                                fontSize: '10px',
                                color: theme.palette.text.secondary,
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontSize: '0.75rem' }}
                            >
                              {show.dj?.name || 'Unknown Host'}
                            </Typography>
                          </Box>

                          {/* Address */}
                          <Box
                            sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}
                          >
                            <FontAwesomeIcon
                              icon={faMapMarkerAlt}
                              style={{
                                fontSize: '10px',
                                color: theme.palette.text.secondary,
                                marginTop: '2px',
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontSize: '0.75rem', lineHeight: 1.3 }}
                            >
                              {show.address}
                            </Typography>
                          </Box>

                          {/* Contact info */}
                          {(show.venuePhone || show.venueWebsite) && (
                            <Box
                              sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.5 }}
                            >
                              {show.venuePhone && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <FontAwesomeIcon
                                    icon={faPhone}
                                    style={{
                                      fontSize: '9px',
                                      color: theme.palette.success.main,
                                    }}
                                  />
                                  <Typography
                                    component="a"
                                    href={`tel:${show.venuePhone}`}
                                    variant="body2"
                                    sx={{
                                      fontSize: '0.7rem',
                                      color: theme.palette.success.main,
                                      textDecoration: 'none',
                                      '&:hover': {
                                        textDecoration: 'underline',
                                      },
                                    }}
                                  >
                                    {show.venuePhone}
                                  </Typography>
                                </Box>
                              )}
                              {show.venueWebsite && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <FontAwesomeIcon
                                    icon={faExternalLinkAlt}
                                    style={{
                                      fontSize: '9px',
                                      color: theme.palette.info.main,
                                    }}
                                  />
                                  <Typography
                                    component="a"
                                    href={
                                      show.venueWebsite.startsWith('http')
                                        ? show.venueWebsite
                                        : `https://${show.venueWebsite}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="body2"
                                    sx={{
                                      fontSize: '0.7rem',
                                      color: theme.palette.info.main,
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
                      </ListItemButton>
                    </ListItem>
                    {index < showStore.showsForSelectedDay.length - 1 && (
                      <Divider sx={{ my: 0.5, mx: 1 }} />
                    )}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </Box>
      )}

      {/* Paywall Modal */}
      <PaywallModal open={showPaywall} onClose={handlePaywallClose} feature={paywallFeature} />

      {/* Local Subscription Modal (for non-authenticated users) */}
      <LocalSubscriptionModal
        open={showLocalSubscription}
        onClose={() => setShowLocalSubscription(false)}
        feature={paywallFeature}
      />

      {/* Login Required Modal */}
      <Dialog
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FontAwesomeIcon icon={faHeart} />
            Account Required
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You must have an account to save shows to your favorites.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create an account or sign in to:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              Save your favorite karaoke shows
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Get notifications about your favorite venues
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Access premium features
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button onClick={() => setLoginModalOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={() => {
              setLoginModalOpen(false);
              window.open(
                `${apiStore.environmentInfo.baseURL.replace('/api', '')}/auth/google`,
                '_self',
              );
            }}
            variant="contained"
            startIcon={<FontAwesomeIcon icon={faGoogle} />}
          >
            Continue with Google
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});
