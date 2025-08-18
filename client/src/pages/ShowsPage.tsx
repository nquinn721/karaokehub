import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import {
  faBars,
  faClock,
  faHeart,
  faMapMarkerAlt,
  faMicrophone,
  faMusic,
  faUser,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
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
import { BottomSheet } from '../components/BottomSheet';
import { DayOfWeek } from '../components/DayPicker/DayPicker';
import { SEO } from '../components/SEO';
import { Show } from '../stores/ShowStore';
import { apiStore, authStore, favoriteStore, mapStore, showStore } from '../stores/index';
import { clusterShows, createClusterIcon, createShowIcon, MapMarker } from '../utils/mapClustering';

const ShowsPage: React.FC = observer(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State for filters
  const [radiusFilter, setRadiusFilter] = useState<number>(25); // Changed default to 25 miles
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(DayOfWeek.MONDAY);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [useDayFilter] = useState<boolean>(true); // Always enabled for compact design
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(!isMobile); // Default open on desktop, closed on mobile

  // Debounce timer for map movement (500ms as requested)
  const [mapUpdateTimer, setMapUpdateTimer] = useState<number | null>(null);

  // Clustering state
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [clusteredMarkers, setClusteredMarkers] = useState<MapMarker[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<MapMarker | null>(null);

  // Custom debounced function for map updates with 500ms delay
  const debouncedMapUpdate = (center: { lat: number; lng: number }, zoom: number) => {
    // Clear existing timer
    if (mapUpdateTimer) {
      window.clearTimeout(mapUpdateTimer);
    }

    // Set new timer for 500ms delay
    const timer = window.setTimeout(() => {
      console.log('Map update after 500ms delay:', center, 'zoom:', zoom);
      mapStore.updateMapPosition(center, zoom);
    }, 500);

    setMapUpdateTimer(timer);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (mapUpdateTimer) {
        window.clearTimeout(mapUpdateTimer);
      }
    };
  }, [mapUpdateTimer]);

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

  // Update clustered markers when shows or zoom changes
  useEffect(() => {
    const markers = clusterShows(filteredShows, currentZoom);
    setClusteredMarkers(markers);
  }, [filteredShows, currentZoom]);

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
    setSelectedCluster(null); // Clear cluster selection when selecting individual show
  };

  const handleClusterClick = (cluster: MapMarker, map: google.maps.Map) => {
    if (cluster.isCluster) {
      if (currentZoom >= 15) {
        // At max zoom, show cluster info
        setSelectedCluster(cluster);
        setSelectedMarkerId(null); // Clear individual show selection
      } else {
        // Zoom in to expand cluster
        map.setZoom(currentZoom + 3);
        map.panTo({ lat: cluster.lat, lng: cluster.lng });
      }
    }
  };

  const selectedShow = selectedMarkerId
    ? filteredShows.find((show) => show.id === selectedMarkerId)
    : null;

  // Format time helper
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

    // Handle map center and zoom changes with debouncing
    useEffect(() => {
      if (map) {
        const handleCenterChanged = () => {
          const center = map.getCenter();
          const zoom = map.getZoom();
          if (center && zoom) {
            const centerLat = center.lat();
            const centerLng = center.lng();
            console.log('Map center changed:', { lat: centerLat, lng: centerLng }, 'zoom:', zoom);

            // Update zoom state for clustering
            setCurrentZoom(zoom);

            // Use our custom 500ms debounced update
            debouncedMapUpdate({ lat: centerLat, lng: centerLng }, zoom);
          }
        };

        const handleZoomChanged = () => {
          const zoom = map.getZoom();
          if (zoom) {
            console.log('Map zoom changed:', zoom);
            setCurrentZoom(zoom);
          }
        };

        // Add the event listeners
        const centerListener = map.addListener('center_changed', handleCenterChanged);
        const zoomListener = map.addListener('zoom_changed', handleZoomChanged);

        // Cleanup listeners on unmount
        return () => {
          if (centerListener) {
            google.maps.event.removeListener(centerListener);
          }
          if (zoomListener) {
            google.maps.event.removeListener(zoomListener);
          }
        };
      }
    }, [map]);

    return (
      <>
        {/* Clustered markers */}
        {clusteredMarkers.map((marker) => {
          if (marker.isCluster) {
            // Cluster marker
            return (
              <Marker
                key={marker.id}
                position={{ lat: marker.lat, lng: marker.lng }}
                onClick={() => handleClusterClick(marker, map!)}
                icon={{
                  url: createClusterIcon(marker.showCount, selectedCluster?.id === marker.id),
                  scaledSize: new window.google.maps.Size(50, 50),
                  anchor: new window.google.maps.Point(25, 25),
                }}
                title={`${marker.showCount} shows in this area`}
              />
            );
          } else {
            // Individual show marker
            const singleMarker = marker as any; // Type assertion for single marker
            return (
              <Marker
                key={marker.id}
                position={{ lat: marker.lat, lng: marker.lng }}
                onClick={() => handleMarkerClick(marker.id)}
                icon={{
                  url: createShowIcon(selectedMarkerId === marker.id),
                  scaledSize: new window.google.maps.Size(32, 32),
                  anchor: new window.google.maps.Point(16, 16),
                }}
                title={singleMarker.show?.venue || 'Karaoke Show'}
              />
            );
          }
        })}

        {/* Info Window for selected cluster */}
        {selectedCluster && selectedCluster.isCluster && (
          <InfoWindow
            position={{ lat: selectedCluster.lat, lng: selectedCluster.lng }}
            onCloseClick={() => setSelectedCluster(null)}
          >
            <Box
              sx={{
                p: 2,
                maxWidth: 320,
                backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
                borderRadius: 2,
                border: `1px solid ${theme.palette.mode === 'dark' ? '#00bcd4' : '#e0e0e0'}`,
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 4px 20px rgba(0, 188, 212, 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                  mb: 1.5,
                }}
              >
                {selectedCluster.showCount} Karaoke Shows in this Area
              </Typography>

              <List sx={{ p: 0, maxHeight: 200, overflow: 'auto' }}>
                {selectedCluster.shows.slice(0, 5).map((show) => (
                  <ListItem key={show.id} sx={{ px: 0, py: 0.5 }}>
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="body2" fontWeight={500}>
                        {show.venue}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(show.startTime)} • {show.dj?.name || 'Unknown Host'}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
                {selectedCluster.showCount > 5 && (
                  <Typography variant="caption" color="text.secondary" sx={{ px: 0, pt: 1 }}>
                    ... and {selectedCluster.showCount - 5} more shows
                  </Typography>
                )}
              </List>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Zoom in to see individual shows
              </Typography>
            </Box>
          </InfoWindow>
        )}

        {/* Info Window for selected show */}
        {selectedShow && selectedShow.lat && selectedShow.lng && (
          <InfoWindow
            position={{
              lat:
                typeof selectedShow.lat === 'string'
                  ? parseFloat(selectedShow.lat)
                  : selectedShow.lat,
              lng:
                typeof selectedShow.lng === 'string'
                  ? parseFloat(selectedShow.lng)
                  : selectedShow.lng,
            }}
            onCloseClick={() => setSelectedMarkerId(null)}
          >
            <Box
              sx={{
                p: 2,
                maxWidth: 280,
                backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
                borderRadius: 2,
                border: `1px solid ${theme.palette.mode === 'dark' ? '#00bcd4' : '#e0e0e0'}`,
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 4px 20px rgba(0, 188, 212, 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
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
                  {selectedShow.venue}
                </Typography>

                {/* Favorite button next to title */}
                <IconButton
                  size="small"
                  onClick={() => handleFavoriteToggle(selectedShow)}
                  sx={{
                    color:
                      authStore.isAuthenticated &&
                      selectedShow.favorites?.some((fav: any) => fav.userId === authStore.user?.id)
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
                      selectedShow.favorites?.some((fav: any) => fav.userId === authStore.user?.id)
                        ? faHeart
                        : faHeartRegular
                    }
                    style={{ fontSize: '14px' }}
                  />
                </IconButton>
              </Box>

              {/* Vendor name styled like homepage */}
              {selectedShow.vendor?.name && (
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

              {/* Address */}
              {selectedShow.address && (
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
              )}

              {/* Time */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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
                    color: theme.palette.text.primary,
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    fontWeight: 500,
                  }}
                >
                  {formatTime(selectedShow.startTime)}
                </Typography>
              </Box>

              {/* DJ */}
              {selectedShow.dj?.name && (
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
                      fontWeight: 500,
                    }}
                  >
                    {selectedShow.dj.name}
                  </Typography>
                </Box>
              )}

              {/* Description */}
              {selectedShow.description && (
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: { xs: '0.75rem', sm: '0.8rem' },
                    lineHeight: 1.4,
                    mt: 1,
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
          height: { xs: 'calc(100vh - 60px)', md: 'calc(100vh - 80px)' },
          overflow: 'hidden',
          position: 'relative',
          display: { xs: 'block', md: 'flex' },
        }}
        data-showspage
      >
        {/* Map Section */}
        <Box
          sx={{
            position: { xs: 'absolute', md: 'relative' },
            top: { xs: 0, md: 'auto' },
            left: { xs: 0, md: 'auto' },
            right: { xs: 0, md: 'auto' },
            bottom: { xs: 0, md: 'auto' },
            width: { xs: '100%', md: 'calc(100% - 400px)' },
            height: { xs: '100%', md: '100%' },
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
              defaultZoom={
                mapStore.userCityCenter || mapStore.userLocation ? 12 : mapStore.initialZoom
              }
              gestureHandling="auto"
              disableDefaultUI={false}
              zoomControl={true}
              mapTypeControl={false}
              scaleControl={true}
              streetViewControl={false}
              rotateControl={false}
              fullscreenControl={false}
            >
              <MapContent />
            </Map>
          </APIProvider>

          {/* Toggle Button - Mobile Only */}
          {isMobile && (
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 1000,
              }}
            >
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
            </Box>
          )}
        </Box>

        {/* Bottom Sheet / Sidebar for Shows and Filters */}
        {isMobile ? (
          <BottomSheet
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            snapPoints={[0.3, 0.6, 0.9]}
            initialSnap={0}
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
                            px: 0.5,
                            borderRadius: 1,
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? 'primary.contrastText' : 'text.primary',
                            bgcolor: isSelected ? 'primary.main' : 'action.hover',
                            border: `1px solid ${
                              isSelected ? theme.palette.primary.main : theme.palette.divider
                            }`,
                            '&:hover': {
                              bgcolor: isSelected ? 'primary.dark' : 'action.selected',
                            },
                          }}
                        >
                          {dayLabels[day]}
                        </Box>
                      );
                    })}
                </Box>

                {/* Second row for remaining days */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 1,
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
                            px: 0.5,
                            borderRadius: 1,
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? 'primary.contrastText' : 'text.primary',
                            bgcolor: isSelected ? 'primary.main' : 'action.hover',
                            border: `1px solid ${
                              isSelected ? theme.palette.primary.main : theme.palette.divider
                            }`,
                            '&:hover': {
                              bgcolor: isSelected ? 'primary.dark' : 'action.selected',
                            },
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
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  Radius: {radiusFilter} miles
                </Typography>
                <Slider
                  value={radiusFilter}
                  onChange={(_, value) => setRadiusFilter(value as number)}
                  min={5}
                  max={100}
                  step={5}
                  size="small"
                  sx={{
                    '& .MuiSlider-thumb': {
                      width: 16,
                      height: 16,
                    },
                  }}
                />
              </Box>

              {/* Vendor Filter */}
              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  size="small"
                  options={uniqueVendors}
                  value={vendorFilter}
                  onChange={(_, value) => setVendorFilter(value || null)}
                  renderInput={(params) => (
                    <TextField {...params} label="Filter by vendor" variant="outlined" />
                  )}
                  clearOnEscape
                />
              </Box>
            </Box>

            {/* Shows List */}
            <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                  Shows ({filteredShows.length})
                </Typography>
              </Box>

              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {showStore.isLoading ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      p: 4,
                    }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                ) : filteredShows.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No shows found for the selected filters.
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0, pb: { xs: 4, md: 1 } }}>
                    {filteredShows.map((show: Show) => {
                      const isFavorited = authStore.isAuthenticated
                        ? show.favorites?.some((fav: any) => fav.userId === authStore.user?.id)
                        : false;

                      return (
                        <React.Fragment key={show.id}>
                          <ListItem disablePadding>
                            <ListItemButton
                              onClick={() => handleMarkerClick(show.id)}
                              selected={selectedMarkerId === show.id}
                              sx={{
                                p: { xs: 1.5, md: 2.5 },
                                borderRadius: 2,
                                transition: 'all 0.2s ease',
                                border: `1px solid ${theme.palette.divider}`,
                                backgroundColor:
                                  theme.palette.mode === 'dark'
                                    ? '#1E1E1E'
                                    : theme.palette.background.paper,
                                minHeight: { xs: '105px', md: '130px' },
                                '&:hover': {
                                  backgroundColor: theme.palette.action.hover,
                                  border: `1px solid ${theme.palette.mode === 'dark' ? '#00E5FF' : theme.palette.primary.main}`,
                                  transform: 'translateY(-2px)',
                                  boxShadow: theme.shadows[4],
                                },
                                '&.Mui-selected': {
                                  backgroundColor:
                                    theme.palette.mode === 'dark'
                                      ? '#00E5FF15'
                                      : theme.palette.primary.main + '15',
                                  border: `2px solid ${theme.palette.mode === 'dark' ? '#00E5FF' : theme.palette.primary.main}`,
                                  '&:hover': {
                                    backgroundColor:
                                      theme.palette.mode === 'dark'
                                        ? '#00E5FF20'
                                        : theme.palette.primary.main + '20',
                                  },
                                },
                              }}
                            >
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
                                    <Box
                                      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
                                    >
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
                                      handleFavoriteToggle(show);
                                    }}
                                    sx={{
                                      color: isFavorited
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
                                      icon={isFavorited ? faHeart : faHeartRegular}
                                      style={{ fontSize: '16px' }}
                                    />
                                  </IconButton>
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
          </BottomSheet>
        ) : (
          /* Desktop Sidebar */
          <Box
            sx={{
              width: '400px',
              height: '100%',
              bgcolor: 'background.paper',
              borderLeft: `1px solid ${theme.palette.divider}`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
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
                            px: 0.5,
                            borderRadius: 0, // Square corners for desktop
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? 'primary.contrastText' : 'text.primary',
                            bgcolor: isSelected ? 'primary.main' : 'action.hover',
                            border: `1px solid ${
                              isSelected ? theme.palette.primary.main : theme.palette.divider
                            }`,
                            '&:hover': {
                              bgcolor: isSelected ? 'primary.dark' : 'action.selected',
                            },
                          }}
                        >
                          {dayLabels[day]}
                        </Box>
                      );
                    })}
                </Box>

                {/* Second row for remaining days */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 1,
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
                            px: 0.5,
                            borderRadius: 0, // Square corners for desktop
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? 'primary.contrastText' : 'text.primary',
                            bgcolor: isSelected ? 'primary.main' : 'action.hover',
                            border: `1px solid ${
                              isSelected ? theme.palette.primary.main : theme.palette.divider
                            }`,
                            '&:hover': {
                              bgcolor: isSelected ? 'primary.dark' : 'action.selected',
                            },
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
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  Radius: {radiusFilter} miles
                </Typography>
                <Slider
                  value={radiusFilter}
                  onChange={(_, value) => setRadiusFilter(value as number)}
                  min={5}
                  max={100}
                  step={5}
                  size="small"
                  sx={{
                    '& .MuiSlider-thumb': {
                      width: 16,
                      height: 16,
                    },
                  }}
                />
              </Box>

              {/* Vendor Filter */}
              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  size="small"
                  options={uniqueVendors}
                  value={vendorFilter}
                  onChange={(_, value) => setVendorFilter(value || null)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Filter by vendor"
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 0, // Square corners for desktop
                        },
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Typography variant="body2">{option}</Typography>
                    </Box>
                  )}
                />
              </Box>
            </Box>

            {/* Shows List */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <Box
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="h6">Shows ({filteredShows.length})</Typography>
              </Box>

              {showStore.isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : filteredShows.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}
                >
                  No shows found for the selected filters.
                </Typography>
              ) : (
                <List sx={{ p: 0, pb: 2 }}>
                  {filteredShows.map((show: Show) => {
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
                              borderRadius: 0, // Square corners for desktop
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

                                {/* Favorite heart icon positioned at top right */}
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    minWidth: { xs: '32px', md: '36px' },
                                  }}
                                >
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFavoriteToggle(show);
                                    }}
                                    sx={{
                                      color:
                                        authStore.isAuthenticated &&
                                        favoriteStore.isFavorite(show.id)
                                          ? theme.palette.error.main
                                          : theme.palette.text.disabled,
                                      width: { xs: '28px', md: '32px' },
                                      height: { xs: '28px', md: '32px' },
                                      opacity: authStore.isAuthenticated ? 1 : 0.6,
                                      '&:hover': {
                                        color: theme.palette.error.main,
                                        backgroundColor: theme.palette.error.main + '10',
                                        transform: 'scale(1.1)',
                                      },
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={
                                        authStore.isAuthenticated &&
                                        favoriteStore.isFavorite(show.id)
                                          ? faHeart
                                          : faHeartRegular
                                      }
                                      style={{ fontSize: '16px' }}
                                    />
                                  </IconButton>
                                </Box>
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
        )}
      </Box>
    </>
  );
});

export default ShowsPage;
