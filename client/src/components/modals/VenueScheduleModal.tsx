import { faBuilding, faCalendarAlt, faClock, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  Typography,
  useTheme,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Show, showStore } from '../../stores/ShowStore';
import CustomModal from '../CustomModal';

interface VenueScheduleModalProps {
  open: boolean;
  onClose: () => void;
  venueName: string;
}

export const VenueScheduleModal: React.FC<VenueScheduleModalProps> = observer(
  ({ open, onClose, venueName }) => {
    const theme = useTheme();
    const [venueShows, setVenueShows] = useState<Show[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (open && venueName) {
        loadVenueSchedule();
      }
    }, [open, venueName]);

    const loadVenueSchedule = async () => {
      setLoading(true);
      try {
        const shows = await showStore.getVenueWeeklySchedule(venueName);
        setVenueShows(shows);
      } catch (error) {
        console.error('Error loading venue schedule:', error);
      } finally {
        setLoading(false);
      }
    };

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

    const groupShowsByDay = (shows: Show[]) => {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const grouped: { [key: string]: Show[] } = {};

      days.forEach((day) => {
        grouped[day] = shows.filter((show) => show.day.toLowerCase() === day.toLowerCase());
      });

      return grouped;
    };

    const dayLabels = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    };

    const groupedShows = groupShowsByDay(venueShows);

    return (
      <CustomModal
        open={open}
        onClose={onClose}
        title={`${venueName} - Weekly Schedule`}
        icon={<FontAwesomeIcon icon={faBuilding} />}
        maxWidth="md"
      >
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 4,
            }}
          >
            <CircularProgress />
          </Box>
        ) : venueShows.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No shows found for {venueName}
            </Typography>
          </Box>
        ) : (
          <Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {venueShows.length} shows this week at {venueName}
              </Typography>
            </Box>

            {Object.keys(dayLabels).map((day) => {
              const shows = groupedShows[day] || [];
              return shows.length > 0 ? (
                <Box key={day} sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <FontAwesomeIcon
                      icon={faCalendarAlt}
                      style={{ fontSize: '14px', color: theme.palette.primary.main }}
                    />
                    {dayLabels[day as keyof typeof dayLabels]}
                  </Typography>

                  <List sx={{ p: 0 }}>
                    {shows.map((show) => (
                      <ListItem key={show.id} sx={{ p: 0, mb: 1 }}>
                        <ListItemButton
                          sx={{
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1,
                            p: 2,
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            },
                          }}
                        >
                          <Box sx={{ width: '100%' }}>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                mb: 1,
                              }}
                            >
                              <Typography variant="subtitle2" fontWeight={600}>
                                Karaoke Night
                              </Typography>
                              <Chip
                                label={`${formatTime(show.startTime)} - ${formatTime(show.endTime)}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                icon={
                                  <FontAwesomeIcon icon={faClock} style={{ fontSize: '12px' }} />
                                }
                              />
                            </Box>

                            {show.dj?.name && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                <FontAwesomeIcon
                                  icon={faUser}
                                  style={{
                                    fontSize: '12px',
                                    color: theme.palette.text.secondary,
                                  }}
                                />
                                <Typography variant="body2" color="text.secondary">
                                  Hosted by {show.dj.name}
                                </Typography>
                              </Box>
                            )}

                            {show.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {show.description}
                              </Typography>
                            )}

                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {show.dj?.vendor?.name && (
                                <Chip
                                  label={show.dj.vendor.name}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}

                              {show.dj?.name && (
                                <Chip
                                  label={`DJ: ${show.dj.name}`}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          </Box>
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : null;
            })}
          </Box>
        )}
      </CustomModal>
    );
  },
);
