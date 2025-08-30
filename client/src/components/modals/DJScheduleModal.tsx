import { faCalendarAlt, faMapMarkerAlt, faTimes, faUser } from '@fortawesome/free-solid-svg-icons';
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
  Typography,
  useTheme,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Show, showStore } from '../../stores/ShowStore';

interface DJScheduleModalProps {
  open: boolean;
  onClose: () => void;
  djId: string;
  djName: string;
}

export const DJScheduleModal: React.FC<DJScheduleModalProps> = observer(
  ({ open, onClose, djId, djName }) => {
    const theme = useTheme();
    const [djShows, setDjShows] = useState<Show[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (open && djId) {
        loadDJSchedule();
      }
    }, [open, djId]);

    const loadDJSchedule = async () => {
      setLoading(true);
      try {
        const shows = await showStore.getDJWeeklySchedule(djId);
        setDjShows(shows);
      } catch (error) {
        console.error('Error loading DJ schedule:', error);
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

    const groupedShows = groupShowsByDay(djShows);

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '80vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FontAwesomeIcon
              icon={faUser}
              style={{ color: theme.palette.primary.main, fontSize: '20px' }}
            />
            <Typography variant="h6" component="div">
              {djName}'s Weekly Schedule
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <FontAwesomeIcon icon={faTimes} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
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
          ) : djShows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No shows found for {djName}
              </Typography>
            </Box>
          ) : (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {djShows.length} shows this week
                </Typography>
              </Box>

              {Object.entries(groupedShows).map(([day, shows]) =>
                shows.length > 0 ? (
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
                                  {(show.venue && typeof show.venue === 'object' ? show.venue.name : show.venue) || 'Unknown Venue'}
                                </Typography>
                                <Chip
                                  label={`${formatTime(show.startTime)} - ${formatTime(show.endTime)}`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </Box>

                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                <FontAwesomeIcon
                                  icon={faMapMarkerAlt}
                                  style={{
                                    fontSize: '12px',
                                    color: theme.palette.text.secondary,
                                  }}
                                />
                                <Typography variant="body2" color="text.secondary">
                                  {show.venue && typeof show.venue === 'object' ? show.venue.address : null}
                                </Typography>
                              </Box>

                              {show.venue && typeof show.venue === 'object' && (show.venue.city || show.venue.state) && (
                                <Typography variant="caption" color="text.secondary">
                                  {[show.venue.city, show.venue.state].filter(Boolean).join(', ')}
                                </Typography>
                              )}

                              {show.dj?.vendor?.name && (
                                <Box sx={{ mt: 1 }}>
                                  <Chip
                                    label={show.dj.vendor.name}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                </Box>
                              )}
                            </Box>
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : null,
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    );
  },
);
