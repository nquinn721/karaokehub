import {
  faBuilding,
  faCalendarAlt,
  faClock,
  faMapMarkerAlt,
  faTimes,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Show, showStore } from '../../stores/ShowStore';

interface CombinedScheduleModalProps {
  open: boolean;
  onClose: () => void;
  show: Show | null;
}

export const CombinedScheduleModal: React.FC<CombinedScheduleModalProps> = observer(
  ({ open, onClose, show }) => {
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState(0);
    const [venueShows, setVenueShows] = useState<Show[]>([]);
    const [djShows, setDjShows] = useState<Show[]>([]);
    const [loadingVenue, setLoadingVenue] = useState(false);
    const [loadingDJ, setLoadingDJ] = useState(false);

    useEffect(() => {
      if (open && show) {
        if (show.venue) {
          loadVenueSchedule(show.venue);
        }
        if (show.dj?.id) {
          loadDJSchedule(show.dj.id);
        }
      }
    }, [open, show]);

    const loadVenueSchedule = async (venueName: string) => {
      setLoadingVenue(true);
      try {
        console.log('🏢 Loading venue schedule for:', venueName);
        const shows = await showStore.getVenueWeeklySchedule(venueName);
        console.log('🏢 Venue shows received:', shows);
        setVenueShows(shows);
      } catch (error) {
        console.error('Error loading venue schedule:', error);
      } finally {
        setLoadingVenue(false);
      }
    };

    const loadDJSchedule = async (djId: string) => {
      setLoadingDJ(true);
      try {
        console.log('🎤 Loading DJ schedule for:', djId);
        const shows = await showStore.getDJWeeklySchedule(djId);
        console.log('🎤 DJ shows received:', shows);
        setDjShows(shows);
      } catch (error) {
        console.error('Error loading DJ schedule:', error);
      } finally {
        setLoadingDJ(false);
      }
    };

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
      setActiveTab(newValue);
    };

    const formatTime = (time: string): string => {
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

    const formatDay = (day: string): string => {
      return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
    };

    if (!show) return null;

    const renderShowList = (shows: Show[], loading: boolean, emptyMessage: string) => {
      // Sort shows by day of week and then by start time
      const dayOrder = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ];
      const sortedShows = [...shows].sort((a, b) => {
        const dayA = dayOrder.indexOf(a.day.toLowerCase());
        const dayB = dayOrder.indexOf(b.day.toLowerCase());

        if (dayA !== dayB) {
          return dayA - dayB;
        }

        // If same day, sort by start time
        const timeA = a.startTime || '00:00:00';
        const timeB = b.startTime || '00:00:00';
        return timeA.localeCompare(timeB);
      });

      if (loading) {
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={40} />
          </Box>
        );
      }

      if (shows.length === 0) {
        return (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              px: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <FontAwesomeIcon
              icon={faCalendarAlt}
              style={{
                fontSize: '48px',
                color: theme.palette.text.disabled,
                opacity: 0.5,
              }}
            />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No Shows Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
              {emptyMessage}
            </Typography>
          </Box>
        );
      }

      return (
        <List sx={{ p: 0 }}>
          {sortedShows.map((show) => (
            <ListItem key={show.id} disablePadding>
              <ListItemButton
                sx={{
                  p: 3,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                  '&:last-child': {
                    borderBottom: 'none',
                  },
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Chip
                      label={formatDay(show.day)}
                      size="small"
                      sx={{
                        backgroundColor: theme.palette.primary.main + '15',
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FontAwesomeIcon
                        icon={faClock}
                        style={{ fontSize: '12px', color: theme.palette.primary.main }}
                      />
                      <Typography variant="body2" color="primary.main" fontWeight={600}>
                        {formatTime(show.startTime)} - {formatTime(show.endTime)}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                    {show.venue || 'Unknown Venue'}
                  </Typography>

                  {show.dj?.name && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <FontAwesomeIcon
                        icon={faUser}
                        style={{ fontSize: '12px', color: theme.palette.text.secondary }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        DJ: {show.dj.name}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <FontAwesomeIcon
                      icon={faMapMarkerAlt}
                      style={{
                        fontSize: '12px',
                        color: theme.palette.text.secondary,
                        marginTop: '2px',
                      }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                      {show.address}
                      {(show.city || show.state) && (
                        <Box
                          component="span"
                          sx={{ display: 'block', fontSize: '0.85em', opacity: 0.8 }}
                        >
                          {[show.city, show.state].filter(Boolean).join(', ')}
                        </Box>
                      )}
                    </Typography>
                  </Box>
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      );
    };

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            minHeight: '60vh',
            maxHeight: '90vh',
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 2,
            px: 3,
            pt: 3,
            borderBottom: `1px solid ${theme.palette.divider}`,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}10 0%, transparent 100%)`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                backgroundColor: theme.palette.primary.main + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesomeIcon
                icon={faCalendarAlt}
                style={{ color: theme.palette.primary.main, fontSize: '20px' }}
              />
            </Box>
            <Box>
              <Typography variant="h5" component="div" fontWeight={600}>
                Weekly Schedule
              </Typography>
              <Typography variant="body2" component="div" color="text.secondary">
                View all shows for this venue and DJ
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              backgroundColor: theme.palette.action.hover,
              '&:hover': {
                backgroundColor: theme.palette.action.selected,
              },
            }}
          >
            <FontAwesomeIcon icon={faTimes} style={{ fontSize: '16px' }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 3,
              pt: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                minHeight: 48,
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTabs-scrollButtons': {
                color: theme.palette.text.secondary,
                '&.Mui-disabled': {
                  opacity: 0.3,
                },
              },
            }}
          >
            <Tab
              icon={<FontAwesomeIcon icon={faBuilding} style={{ fontSize: '16px' }} />}
              iconPosition="start"
              label={show.venue || 'Unknown Venue'}
              sx={{
                gap: 1.5,
                px: 2,
                '& .MuiTab-iconWrapper': {
                  marginBottom: '0 !important',
                },
              }}
            />
            <Tab
              icon={<FontAwesomeIcon icon={faUser} style={{ fontSize: '16px' }} />}
              iconPosition="start"
              label={show.dj?.name || (show as any).djName || 'Unknown DJ'}
              sx={{
                gap: 1.5,
                px: 2,
                '& .MuiTab-iconWrapper': {
                  marginBottom: '0 !important',
                },
              }}
            />
          </Tabs>

          <Box
            sx={{
              minHeight: '400px',
              maxHeight: '500px',
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: theme.palette.action.hover,
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.action.selected,
                borderRadius: 4,
              },
            }}
          >
            {activeTab === 0 && (
              <Box
                sx={{
                  opacity: loadingVenue ? 0.7 : 1,
                  transition: 'opacity 0.3s ease',
                }}
              >
                {renderShowList(
                  venueShows,
                  loadingVenue,
                  `We couldn't find any scheduled shows for "${show.venue || 'this venue'}". This could mean there are no other shows at this location, or the venue name might be stored differently in our database.`,
                )}
              </Box>
            )}
            {activeTab === 1 && (
              <Box
                sx={{
                  opacity: loadingDJ ? 0.7 : 1,
                  transition: 'opacity 0.3s ease',
                }}
              >
                {renderShowList(
                  djShows,
                  loadingDJ,
                  `We couldn't find any other scheduled shows for DJ "${show.dj?.name || 'this DJ'}". They might only have this one show scheduled, or there could be variations in how their name is stored.`,
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    );
  },
);

export default CombinedScheduleModal;
