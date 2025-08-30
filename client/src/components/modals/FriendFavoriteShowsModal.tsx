import { faCalendarAlt, faClock, faHeart, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { apiStore } from '../../stores/ApiStore';
import CustomModal from '../CustomModal';

interface Favorite {
  id: string;
  userId: string;
  showId: string;
  day: string;
  createdAt: string;
  show: {
    id: string;
    title: string;
    venue: string;
    address: string;
    city: string;
    state: string;
    startTime: string;
    description?: string;
    dj?: {
      id: string;
      name: string;
    };
  };
}

interface FriendUser {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  stageName?: string;
  name?: string;
  email?: string;
}

interface FriendFavoriteShowsModalProps {
  open: boolean;
  onClose: () => void;
  friend: FriendUser;
}

export const FriendFavoriteShowsModal: React.FC<FriendFavoriteShowsModalProps> = ({
  open,
  onClose,
  friend,
}) => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFriendFavorites = async () => {
    if (!friend?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiStore.get(`/favorites/user/${friend.id}`);
      setFavorites(response || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load favorite shows');
      console.error('Error fetching friend favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && friend?.id) {
      fetchFriendFavorites();
    }
  }, [open, friend?.id]);

  const formatTime = (time: string) => {
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getDayChipColor = (day: string) => {
    const colors: {
      [key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
    } = {
      monday: 'primary',
      tuesday: 'secondary',
      wednesday: 'success',
      thursday: 'warning',
      friday: 'info',
      saturday: 'error',
      sunday: 'primary',
    };
    return colors[day.toLowerCase()] || 'default';
  };

  const friendDisplayName =
    friend?.firstName && friend?.lastName
      ? `${friend.firstName} ${friend.lastName}`
      : friend?.stageName || friend?.name || friend?.username || friend?.email || 'Friend';

  // Debug log to see what friend data we're getting
  console.log('Friend data in modal:', friend);

  return (
    <CustomModal
      open={open}
      onClose={onClose}
      title={`${friendDisplayName}'s Favorite Shows`}
      icon={<FontAwesomeIcon icon={faHeart} color="#ff6b6b" />}
      maxWidth="md"
      fullWidth
    >
      <Box sx={{ mt: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              Loading favorite shows...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : favorites.length === 0 ? (
          <Box textAlign="center" py={4}>
            <FontAwesomeIcon icon={faHeart} size="3x" color="#e0e0e0" />
            <Typography variant="h6" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              No Favorite Shows Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {friendDisplayName} hasn't added any favorite shows yet.
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {favorites.length} favorite show{favorites.length !== 1 ? 's' : ''}
            </Typography>

            <List sx={{ p: 0 }}>
              {favorites.map((favorite, index) => (
                <React.Fragment key={favorite.id}>
                  <ListItem
                    sx={{
                      px: 0,
                      py: 2,
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box width="100%" display="flex" alignItems="flex-start" gap={2}>
                      <ListItemIcon sx={{ minWidth: 'auto', mt: 0.5 }}>
                        <FontAwesomeIcon icon={faHeart} color="#ff6b6b" />
                      </ListItemIcon>

                      <Box flex={1}>
                        <ListItemText
                          primary={
                            <Typography variant="h6" component="div" gutterBottom>
                              {favorite.show.title}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <FontAwesomeIcon icon={faMapMarkerAlt} size="sm" color="#666" />
                                <Typography variant="body2" color="text.secondary">
                                  {favorite.show.venue}
                                </Typography>
                              </Box>

                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {favorite.show.address}, {favorite.show.venue && typeof show.venue === "object" ? show.venue.city : null}, {favorite.show.venue && typeof show.venue === "object" ? show.venue.state : null}
                              </Typography>

                              {favorite.show.dj && (
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  DJ: {favorite.show.dj.name}
                                </Typography>
                              )}

                              {favorite.show.description && (
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  {favorite.show.description}
                                </Typography>
                              )}

                              <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                                {favorite.day && (
                                  <Chip
                                    label={
                                      favorite.day.charAt(0).toUpperCase() + favorite.day.slice(1)
                                    }
                                    size="small"
                                    color={getDayChipColor(favorite.day)}
                                  />
                                )}

                                {favorite.show.startTime && (
                                  <Chip
                                    label={formatTime(favorite.show.startTime)}
                                    size="small"
                                    variant="outlined"
                                    icon={<FontAwesomeIcon icon={faClock} />}
                                  />
                                )}

                                <Chip
                                  label={`Added ${formatDate(favorite.createdAt)}`}
                                  size="small"
                                  variant="outlined"
                                  icon={<FontAwesomeIcon icon={faCalendarAlt} />}
                                />
                              </Box>
                            </Box>
                          }
                        />
                      </Box>
                    </Box>
                  </ListItem>

                  {index < favorites.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </Box>
    </CustomModal>
  );
};
