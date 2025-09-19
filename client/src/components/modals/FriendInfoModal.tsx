import {
  faCalendarAlt,
  faClock,
  faHeart,
  faMapMarkerAlt,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { apiStore } from '../../stores/ApiStore';
import AvatarDisplay from '../AvatarDisplay';
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
  userAvatar?: {
    baseAvatarId: string;
    microphone?: any;
    outfit?: any;
    shoes?: any;
  } | null;
}

interface FriendInfoModalProps {
  open: boolean;
  onClose: () => void;
  friend: FriendUser;
}

export const FriendInfoModal: React.FC<FriendInfoModalProps> = ({ open, onClose, friend }) => {
  const theme = useTheme();
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
      title={`${friendDisplayName}'s Info`}
      icon={<FontAwesomeIcon icon={faUser} color="#6366f1" />}
      maxWidth="md"
      fullWidth
    >
      <Box sx={{ mt: 1 }}>
        <Grid container spacing={2} sx={{ height: '400px' }}>
          {/* Left Column - Full Height Avatar */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                borderRadius: '16px',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: 'white',
                height: '100%',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                gap: 2,
              }}
            >
              <AvatarDisplay
                userAvatar={friend.userAvatar}
                size={160}
                sx={{
                  border: 'none',
                  background: 'transparent',
                }}
              />
              
              {/* Friend's Microphone Display */}
              {friend.userAvatar?.microphone && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '2px solid rgba(255,255,255,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <img
                      src={`/images/avatar/parts/microphones/${friend.userAvatar.microphone.imagePath || 'mic_basic_1.png'}`}
                      alt={friend.userAvatar.microphone.name || 'Microphone'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/avatar/parts/microphones/mic_basic_1.png';
                      }}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255,255,255,0.9)',
                      textAlign: 'center',
                      fontSize: '0.75rem',
                    }}
                  >
                    {friend.userAvatar.microphone.name || 'Basic Mic'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>

          {/* Right Column - Friend Info and Favorite Shows */}
          <Grid item xs={12} md={8}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Friend Info Section */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {friend?.stageName && (
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>
                        StageName:
                      </Box>
                      {friend.stageName}
                    </Typography>
                  )}
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>
                      Name:
                    </Box>
                    {friend?.name || friendDisplayName}
                  </Typography>
                </Box>
                {favorites.length > 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block' }}
                  >
                    {favorites.length} favorite show{favorites.length !== 1 ? 's' : ''}
                  </Typography>
                )}
              </Box>

              {/* Favorite Shows Section */}
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                  Favorite Shows
                </Typography>
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
                                      <FontAwesomeIcon
                                        icon={faMapMarkerAlt}
                                        size="sm"
                                        color="#666"
                                      />
                                      <Typography variant="body2" color="text.secondary">
                                        {(() => {
                                          const venue = favorite.show.venue;
                                          return venue && typeof venue === 'object'
                                            ? (venue as any).name
                                            : venue;
                                        })()}
                                      </Typography>
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                      {(() => {
                                        const venue = favorite.show.venue;
                                        if (venue && typeof venue === 'object') {
                                          const v = venue as any;
                                          return `${v.address || ''}, ${v.city || ''}, ${v.state || ''}`
                                            .replace(/^,\s*|,\s*$/g, '')
                                            .replace(/,\s*,/g, ',');
                                        }
                                        return 'Address not available';
                                      })()}
                                    </Typography>

                                    {favorite.show.dj && (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        gutterBottom
                                      >
                                        DJ: {favorite.show.dj.name}
                                      </Typography>
                                    )}

                                    {favorite.show.description && (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        gutterBottom
                                      >
                                        {favorite.show.description}
                                      </Typography>
                                    )}

                                    <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                                      {favorite.day && (
                                        <Chip
                                          label={
                                            favorite.day.charAt(0).toUpperCase() +
                                            favorite.day.slice(1)
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
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </CustomModal>
  );
};
