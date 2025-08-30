import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import {
  faCalendarAlt,
  faClock,
  faEdit,
  faFlag,
  faHeart,
  faMapMarkerAlt,
  faMicrophone,
  faMusic,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { DayOfWeek } from '../components/DayPicker/DayPicker';
import MapComponent from '../components/MapComponent';
import { AuthRequiredModal } from '../components/modals/AuthRequiredModal';
import { CombinedScheduleModal } from '../components/modals/CombinedScheduleModal';
import { DJScheduleModal } from '../components/modals/DJScheduleModal';
import { SubmitMissingInfoModal } from '../components/modals/SubmitMissingInfoModal';
import { ShowSearch } from '../components/search/ShowSearch';
import { SEO } from '../components/SEO';
import { authStore, favoriteStore, showStore } from '../stores/index';
import { mapStore } from '../stores/MapStore';
import { Show } from '../stores/ShowStore';

const ShowsPage: React.FC = observer(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Modal states
  const [djModalOpen, setDjModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [submitInfoModalOpen, setSubmitInfoModalOpen] = useState(false);
  const [selectedDJ, setSelectedDJ] = useState<{ id: string; name: string } | null>(null);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [showToEdit, setShowToEdit] = useState<Show | null>(null);

  // Initialize stores only (no duplicate API calls)
  useEffect(() => {
    const initializeStores = async () => {
      if (!mapStore.isInitialized) {
        await mapStore.initialize();
      }
      // Request user location for centering map
      await mapStore.goToCurrentLocation();
    };

    initializeStores();

    // Set initial sidebar state based on device
    showStore.setSidebarOpen(!isMobile);
  }, [isMobile]);

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

  // Handle show selection from search
  const handleShowSelected = (show: Show) => {
    mapStore.selectShowFromSidebar(show);
  };

  // Handle DJ click to show schedule
  const handleDJClick = (event: React.MouseEvent, show: Show) => {
    event.stopPropagation();
    if (show.dj?.id && show.dj?.name) {
      setSelectedDJ({ id: show.dj.id, name: show.dj.name });
      setDjModalOpen(true);
    }
  };

  // Handle schedule button click to show combined schedule modal
  const handleScheduleClick = (show: Show) => {
    setSelectedShow(show);
    setScheduleModalOpen(true);
  };

  // Handle schedule modal opening from map popup
  const handleScheduleModalOpen = (show: Show) => {
    setSelectedShow(show);
    setScheduleModalOpen(true);
  };

  // Handle flag button click - immediate flagging
  const handleFlagClick = async (event: React.MouseEvent, show: Show) => {
    event.stopPropagation();
    if (!authStore.isAuthenticated || !authStore.user?.id) {
      setAuthModalOpen(true);
      return;
    }

    // Flag the show immediately
    await showStore.flagShow(show.id, authStore.user.id);
  };

  // Handle edit button click
  const handleEditClick = (event: React.MouseEvent, show: Show) => {
    event.stopPropagation();
    if (!authStore.isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    setShowToEdit(show);
    setSubmitInfoModalOpen(true);
  };

  // Handle close submit info modal
  const handleCloseSubmitInfoModal = () => {
    setSubmitInfoModalOpen(false);
    setShowToEdit(null);
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
          <MapComponent onScheduleModalOpen={handleScheduleModalOpen} />
        </Box>

        {/* Bottom Sheet / Sidebar for Shows and Filters */}
        {isMobile ? (
          <BottomSheet
            isOpen={true} // Always considered "open" when alwaysVisible
            onToggle={() => showStore.toggleSidebar()}
            snapPoints={[0.3, 0.6, 1.0]} // Increased by ~0.01 for +5px (was 0.29, 0.59, 0.99)
            initialSnap={0} // Start minimized
            alwaysVisible={true}
            closeOnOutsideClick={true}
            draggableContent={
              /* Filters Section - Draggable */
              <Box>
                {/* Filters Section */}
                <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
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

                  {/* Search */}
                  <Box sx={{ mb: 2 }}>
                    <ShowSearch
                      onSelectShow={handleShowSelected}
                      placeholder="Search venues, DJs, locations..."
                      size="small"
                      shows={showStore.filteredShows}
                    />
                  </Box>
                </Box>

                {/* Shows Header - Draggable */}
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
                    Shows {showStore.filteredShows.length}
                  </Typography>
                </Box>
              </Box>
            }
          >
            {/* Shows List */}
            <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  height: '500px', // Fixed height for all states
                  overflow: 'auto',
                  position: 'relative',
                }}
              >
                {showStore.isLoading ? (
                  <Box
                    sx={{
                      height: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      p: 4,
                    }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                ) : showStore.filteredShows.length === 0 ? (
                  <Box
                    sx={{
                      height: '100%',
                      p: 3,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No shows found for the selected filters.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ height: '100%', overflow: 'auto' }}>
                    <List
                      sx={{ p: 0, pb: { xs: 10, md: 1 }, mr: '15px', mt: '5px', minHeight: '100%' }}
                    >
                      {showStore.filteredShows.map((show: Show) => {
                        const isFavorited = authStore.isAuthenticated
                          ? show.favorites?.some((fav: any) => fav.userId === authStore.user?.id)
                          : false;

                        return (
                          <React.Fragment key={show.id}>
                            <ListItem disablePadding>
                              <ListItemButton
                                onClick={() => mapStore.selectShowFromSidebar(show)}
                                selected={mapStore.selectedShow?.id === show.id}
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
                                        {showStore.getVenueName(show)}
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
                                        <Box
                                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                        >
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
                                            onClick={(e) => handleDJClick(e, show)}
                                            sx={{
                                              fontSize: { xs: '0.75rem', md: '0.8rem' },
                                              fontWeight: 500,
                                              cursor: show.dj?.name ? 'pointer' : 'default',
                                              '&:hover': show.dj?.name
                                                ? {
                                                    color: theme.palette.primary.main,
                                                    textDecoration: 'underline',
                                                  }
                                                : {},
                                            }}
                                          >
                                            {show.dj?.name || 'Unknown Host'}
                                          </Typography>
                                        </Box>

                                        {/* Location info on separate line */}
                                        <Box
                                          sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 0.5,
                                          }}
                                        >
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
                                                fontSize: { xs: '0.75rem', md: '0.8rem' },
                                                lineHeight: 1.3,
                                                wordBreak: 'break-word',
                                              }}
                                            >
                                              {show.venue && typeof show.venue === "object" ? show.venue.address : null}
                                            </Typography>
                                            {(show.venue && typeof show.venue === "object" ? show.venue.city : null || show.venue && typeof show.venue === "object" ? show.venue.state : null) && (
                                              <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                  fontSize: { xs: '0.7rem', md: '0.75rem' },
                                                  lineHeight: 1.2,
                                                  opacity: 0.8,
                                                }}
                                              >
                                                {[show.venue && typeof show.venue === "object" ? show.venue.city : null, show.venue && typeof show.venue === "object" ? show.venue.state : null].filter(Boolean).join(', ')}
                                              </Typography>
                                            )}
                                          </Box>
                                        </Box>
                                      </Box>

                                      {/* Badges section */}
                                      <Box
                                        sx={{
                                          mt: 0.5,
                                          display: 'flex',
                                          gap: 0.5,
                                          flexWrap: 'wrap',
                                        }}
                                      >
                                        {/* Vendor chip */}
                                        {show.dj?.vendor?.name && (
                                          <Chip
                                            label={show.dj.vendor.name}
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

                                    {/* Action buttons */}
                                    <Box
                                      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
                                    >
                                      {/* Schedule button */}
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleScheduleClick(show);
                                        }}
                                        sx={{
                                          color: theme.palette.primary.main,
                                          width: { xs: '32px', md: '36px' },
                                          height: { xs: '32px', md: '36px' },
                                          '&:hover': {
                                            backgroundColor: theme.palette.primary.main + '10',
                                          },
                                        }}
                                      >
                                        <FontAwesomeIcon
                                          icon={faCalendarAlt}
                                          style={{ fontSize: '14px' }}
                                        />
                                      </IconButton>

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
                                          width: { xs: '32px', md: '36px' },
                                          height: { xs: '32px', md: '36px' },
                                          opacity: authStore.isAuthenticated ? 1 : 0.6,
                                          '&:hover': {
                                            color: theme.palette.error.main,
                                            backgroundColor: theme.palette.error.main + '10',
                                          },
                                        }}
                                      >
                                        <FontAwesomeIcon
                                          icon={isFavorited ? faHeart : faHeartRegular}
                                          style={{ fontSize: '14px' }}
                                        />
                                      </IconButton>

                                      {/* Flag button */}
                                      <IconButton
                                        size="small"
                                        onClick={(e) => handleFlagClick(e, show)}
                                        sx={{
                                          color: show.isFlagged
                                            ? theme.palette.warning.main
                                            : theme.palette.text.disabled,
                                          width: { xs: '32px', md: '36px' },
                                          height: { xs: '32px', md: '36px' },
                                          '&:hover': {
                                            color: theme.palette.warning.main,
                                            backgroundColor: theme.palette.warning.main + '10',
                                          },
                                        }}
                                      >
                                        <FontAwesomeIcon
                                          icon={faFlag}
                                          style={{ fontSize: '14px' }}
                                        />
                                      </IconButton>

                                      {/* Edit button */}
                                      <IconButton
                                        size="small"
                                        onClick={(e) => handleEditClick(e, show)}
                                        sx={{
                                          color: theme.palette.info.main,
                                          width: { xs: '32px', md: '36px' },
                                          height: { xs: '32px', md: '36px' },
                                          '&:hover': {
                                            color: theme.palette.info.main,
                                            backgroundColor: theme.palette.info.main + '10',
                                          },
                                        }}
                                      >
                                        <FontAwesomeIcon
                                          icon={faEdit}
                                          style={{ fontSize: '14px' }}
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
                  </Box>
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

              {/* Search */}
              <Box sx={{ mb: 2 }}>
                <ShowSearch
                  onSelectShow={handleShowSelected}
                  placeholder="Search venues, DJs, locations..."
                  size="small"
                  shows={showStore.filteredShows}
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
                <Typography variant="h6">Shows {showStore.filteredShows.length}</Typography>
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
                <List sx={{ p: 0, pb: 2, mr: '15px', mt: '5px' }}>
                  {showStore.filteredShows.map((show: Show) => {
                    return (
                      <React.Fragment key={show.id}>
                        <ListItem
                          sx={{ p: 0, mb: { xs: 0.25, md: 0.75 }, mx: { xs: 0.25, md: 0.75 } }}
                        >
                          <ListItemButton
                            onClick={() => mapStore.selectShowFromSidebar(show)}
                            selected={mapStore.selectedShow?.id === show.id}
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
                                    {showStore.getVenueName(show)}
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
                                      <Box sx={{ flex: 1 }}>
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                          sx={{
                                            fontSize: { xs: '0.75rem', md: '0.8rem' },
                                            lineHeight: 1.3,
                                            wordBreak: 'break-word',
                                          }}
                                        >
                                          {show.venue && typeof show.venue === "object" ? show.venue.address : null}
                                        </Typography>
                                        {(show.venue && typeof show.venue === "object" ? show.venue.city : null || show.venue && typeof show.venue === "object" ? show.venue.state : null) && (
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                              fontSize: { xs: '0.7rem', md: '0.75rem' },
                                              lineHeight: 1.2,
                                              opacity: 0.8,
                                            }}
                                          >
                                            {[show.venue && typeof show.venue === "object" ? show.venue.city : null, show.venue && typeof show.venue === "object" ? show.venue.state : null].filter(Boolean).join(', ')}
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  </Box>

                                  {/* Badges section */}
                                  <Box
                                    sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}
                                  >
                                    {/* Vendor chip */}
                                    {show.dj?.vendor?.name && (
                                      <Chip
                                        label={show.dj.vendor.name}
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

                                {/* Action buttons positioned at top right */}
                                <Box
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    minWidth: { xs: '32px', md: '36px' },
                                  }}
                                >
                                  {/* Schedule button */}
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleScheduleClick(show);
                                    }}
                                    sx={{
                                      color: theme.palette.primary.main,
                                      width: { xs: '28px', md: '32px' },
                                      height: { xs: '28px', md: '32px' },
                                      '&:hover': {
                                        backgroundColor: theme.palette.primary.main + '10',
                                      },
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={faCalendarAlt}
                                      style={{ fontSize: '12px' }}
                                    />
                                  </IconButton>

                                  {/* Favorite button */}
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
                                      style={{ fontSize: '12px' }}
                                    />
                                  </IconButton>

                                  {/* Flag button */}
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleFlagClick(e, show)}
                                    sx={{
                                      color: show.isFlagged
                                        ? theme.palette.warning.main
                                        : theme.palette.text.disabled,
                                      width: { xs: '28px', md: '32px' },
                                      height: { xs: '28px', md: '32px' },
                                      '&:hover': {
                                        color: theme.palette.warning.main,
                                        backgroundColor: theme.palette.warning.main + '10',
                                        transform: 'scale(1.1)',
                                      },
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    <FontAwesomeIcon icon={faFlag} style={{ fontSize: '12px' }} />
                                  </IconButton>

                                  {/* Edit button */}
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleEditClick(e, show)}
                                    sx={{
                                      color: theme.palette.info.main,
                                      width: { xs: '28px', md: '32px' },
                                      height: { xs: '28px', md: '32px' },
                                      '&:hover': {
                                        color: theme.palette.info.main,
                                        backgroundColor: theme.palette.info.main + '10',
                                        transform: 'scale(1.1)',
                                      },
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    <FontAwesomeIcon icon={faEdit} style={{ fontSize: '12px' }} />
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

      {/* Modals */}
      {selectedDJ && (
        <DJScheduleModal
          open={djModalOpen}
          onClose={() => {
            setDjModalOpen(false);
            setSelectedDJ(null);
          }}
          djId={selectedDJ.id}
          djName={selectedDJ.name}
        />
      )}

      {selectedShow && (
        <CombinedScheduleModal
          open={scheduleModalOpen}
          onClose={() => {
            setScheduleModalOpen(false);
            setSelectedShow(null);
          }}
          show={selectedShow}
        />
      )}

      <AuthRequiredModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <SubmitMissingInfoModal
        open={submitInfoModalOpen}
        onClose={handleCloseSubmitInfoModal}
        show={showToEdit}
      />
    </>
  );
});

export default ShowsPage;
