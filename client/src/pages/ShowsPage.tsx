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
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { DayOfWeek } from '../components/DayPicker/DayPicker';
import { SEO } from '../components/SEO';
import { SimpleMap } from '../components/SimpleMap';
import { Show } from '../stores/ShowStore';
import { authStore, favoriteStore, mapStore, showStore } from '../stores/index';

const ShowsPage: React.FC = observer(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Initialize stores
  useEffect(() => {
    // Initialize MapStore if needed and request user location
    const initializeMap = async () => {
      if (!mapStore.isInitialized) {
        await mapStore.initialize();
      }
      // Request user location for centering map
      await mapStore.requestUserLocation();
    };

    initializeMap();

    // Set initial sidebar state based on device
    showStore.setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Load shows when filters change
  useEffect(() => {
    const loadShows = async () => {
      console.log('Loading shows (filter change):', {
        selectedDay: showStore.selectedDay,
        useDayFilter: showStore.useDayFilter,
      });

      if (showStore.useDayFilter) {
        await showStore.fetchShows(showStore.selectedDay);
      } else {
        await showStore.fetchShows();
      }

      console.log('Shows loaded (filter change):', showStore.shows.length);
    };

    loadShows();
  }, [showStore.selectedDay, showStore.useDayFilter]);

  // Watch for map position changes and refetch shows
  useEffect(() => {
    const loadShowsForMapPosition = async () => {
      console.log('Loading shows (map position):', {
        selectedDay: showStore.selectedDay,
        useDayFilter: showStore.useDayFilter,
        searchCenter: mapStore.searchCenter,
      });

      if (showStore.useDayFilter) {
        await showStore.fetchShows(showStore.selectedDay);
      } else {
        await showStore.fetchShows();
      }

      console.log('Shows loaded (map position):', showStore.shows.length);
    };

    // Only load if we have a search center
    if (mapStore.searchCenter) {
      loadShowsForMapPosition();
    }
  }, [mapStore.searchCenter, showStore.selectedDay, showStore.useDayFilter]);

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
          <SimpleMap />

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
                onClick={() => showStore.toggleSidebar()}
                sx={{
                  backgroundColor: 'background.paper',
                  border: `1px solid ${theme.palette.divider}`,
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                title={showStore.sidebarOpen ? 'Hide filters and shows' : 'Show filters and shows'}
              >
                <FontAwesomeIcon icon={showStore.sidebarOpen ? faXmark : faBars} />
              </Fab>
            </Box>
          )}
        </Box>

        {/* Bottom Sheet / Sidebar for Shows and Filters */}
        {isMobile ? (
          <BottomSheet
            isOpen={showStore.sidebarOpen}
            onToggle={() => showStore.toggleSidebar()}
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
                      const isSelected = showStore.selectedDay === day;
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
                          onClick={() => showStore.setSelectedDay(day)}
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
                      const isSelected = showStore.selectedDay === day;
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
                          onClick={() => showStore.setSelectedDay(day)}
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
                  Radius: {showStore.radiusFilter} miles
                </Typography>
                <Slider
                  value={showStore.radiusFilter}
                  onChange={(_, value) => showStore.setRadiusFilter(value as number)}
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
                  options={showStore.uniqueVendors}
                  value={showStore.vendorFilter}
                  onChange={(_, value) => showStore.setVendorFilter(value || null)}
                  renderInput={(params) => (
                    <TextField {...params} label="Filter by vendor" variant="outlined" />
                  )}
                  clearOnEscape
                />
              </Box>
            </Box>

            {/* Shows List */}
            <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
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
                  Shows ({showStore.filteredShows.length}) | Markers (
                  {showStore.filteredShows.length}) | Zoom ({8})
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
                ) : showStore.filteredShows.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No shows found for the selected filters.
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0, pb: { xs: 4, md: 1 } }}>
                    {showStore.filteredShows.map((show: Show) => {
                      const isFavorited = authStore.isAuthenticated
                        ? show.favorites?.some((fav: any) => fav.userId === authStore.user?.id)
                        : false;

                      return (
                        <React.Fragment key={show.id}>
                          <ListItem disablePadding>
                            <ListItemButton
                              onClick={() => showStore.handleMarkerClick(show.id)}
                              selected={showStore.selectedMarkerId === show.id}
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
                                      showStore.handleFavoriteToggle(show);
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
                      const isSelected = showStore.selectedDay === day;
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
                          onClick={() => showStore.setSelectedDay(day)}
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
                      const isSelected = showStore.selectedDay === day;
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
                          onClick={() => showStore.setSelectedDay(day)}
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
                  Radius: {showStore.radiusFilter} miles
                </Typography>
                <Slider
                  value={showStore.radiusFilter}
                  onChange={(_, value) => showStore.setRadiusFilter(value as number)}
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
                  options={showStore.uniqueVendors}
                  value={showStore.vendorFilter}
                  onChange={(_, value) => showStore.setVendorFilter(value || null)}
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
                <Typography variant="h6">
                  Shows ({showStore.filteredShows.length}) | Markers (
                  {showStore.filteredShows.length}) | Zoom ({8})
                </Typography>
              </Box>

              {showStore.isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : showStore.filteredShows.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}
                >
                  No shows found for the selected filters.
                </Typography>
              ) : (
                <List sx={{ p: 0, pb: 2 }}>
                  {showStore.filteredShows.map((show: Show) => {
                    return (
                      <React.Fragment key={show.id}>
                        <ListItem
                          sx={{ p: 0, mb: { xs: 0.25, md: 0.75 }, mx: { xs: 0.25, md: 0.75 } }}
                        >
                          <ListItemButton
                            onClick={() => showStore.handleMarkerClick(show.id)}
                            selected={showStore.selectedMarkerId === show.id}
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
                                      showStore.handleFavoriteToggle(show);
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
