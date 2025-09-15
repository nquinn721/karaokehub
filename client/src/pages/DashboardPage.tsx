import { NativeBannerAd, SquareAd } from '@components/AdsterraAd';
import FriendsList from '@components/FriendsList';
import MobileBanner from '@components/MobileBanner';
import { PaywallModal } from '@components/PaywallModal';
import { SEO, seoConfigs } from '@components/SEO';
import {
  faArrowRight,
  faCalendar,
  faChartLine,
  faClock,
  faHeart as faHeartSolid,
  faMapMarkerAlt,
  faMicrophone,
  faMusic,
  faPause,
  faPlay,
  faPlus,
  faStar,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import {
  audioStore,
  authStore,
  songFavoriteStore,
  subscriptionStore,
  uiStore,
} from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { favoriteStore } from '../stores';

const DashboardPage: React.FC = observer(() => {
  const [loading, setLoading] = useState(false);
  const [showStats, setShowStats] = useState({
    todayCount: 0,
    weekCount: 0,
    upcomingCount: 0,
    songFavoriteCount: 0,
  });
  const [activeTab, setActiveTab] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<
    'favorites' | 'ad_removal' | 'music_preview'
  >('music_preview');
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    if (authStore.isAuthenticated) {
      loadDashboardData();
    }
  }, [authStore.isAuthenticated]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        favoriteStore.fetchMyFavorites(),
        songFavoriteStore.fetchMySongFavorites(),
        subscriptionStore.fetchSubscriptionStatus(),
        loadShowStats(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadShowStats = async () => {
    try {
      const favorites = favoriteStore.favorites;
      const today = new Date().getDay();
      const dayNames = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      const todayName = dayNames[today];

      const todayCount = favorites.filter((fav) => fav.day.toLowerCase() === todayName).length;

      const weekCount = favorites.length;
      const upcomingCount = favorites.filter((fav) => {
        const favDay = dayNames.indexOf(fav.day.toLowerCase());
        return favDay >= today;
      }).length;

      const songFavoriteCount = songFavoriteStore.getSongFavoriteCount();

      setShowStats({ todayCount, weekCount, upcomingCount, songFavoriteCount });
    } catch (error) {
      console.error('Error calculating show stats:', error);
    }
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const StatCard = ({
    icon,
    title,
    value,
    subtitle,
    color = 'primary',
    trending,
  }: {
    icon: any;
    title: string;
    value: number | string;
    subtitle: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    trending?: 'up' | 'down' | 'neutral';
  }) => (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, 
          ${alpha(theme.palette[color].main, 0.12)} 0%, 
          ${alpha(theme.palette[color].main, 0.08)} 50%,
          ${alpha(theme.palette[color].main, 0.04)} 100%)`,
        border: `1px solid ${alpha(theme.palette[color].main, 0.25)}`,
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px) scale(1.02)',
          boxShadow: `0 12px 24px ${alpha(theme.palette[color].main, 0.15)}`,
          border: `1px solid ${alpha(theme.palette[color].main, 0.4)}`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${theme.palette[color].main}, ${theme.palette[color].light})`,
        },
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              color="text.secondary"
              gutterBottom
              variant="body2"
              fontWeight={500}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              component="div"
              fontWeight={700}
              color={color}
              sx={{
                mb: 0.5,
                background: `linear-gradient(135deg, ${theme.palette[color].main}, ${theme.palette[color].dark})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {value}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {subtitle}
              </Typography>
              {trending && (
                <Chip
                  size="small"
                  label={trending === 'up' ? '↗️' : trending === 'down' ? '↘️' : '→'}
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    backgroundColor:
                      trending === 'up'
                        ? alpha(theme.palette.success.main, 0.1)
                        : trending === 'down'
                          ? alpha(theme.palette.error.main, 0.1)
                          : alpha(theme.palette.grey[500], 0.1),
                    color:
                      trending === 'up'
                        ? theme.palette.success.main
                        : trending === 'down'
                          ? theme.palette.error.main
                          : theme.palette.grey[600],
                  }}
                />
              )}
            </Box>
          </Box>
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette[color].main}, ${theme.palette[color].dark})`,
              borderRadius: '16px',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${alpha(theme.palette[color].main, 0.3)}`,
              minWidth: 56,
              minHeight: 56,
            }}
          >
            <FontAwesomeIcon icon={icon} size="lg" color="white" />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Compact stats component for mobile
  const CompactStatsCard = () => (
    <Card
      sx={{
        background: `linear-gradient(135deg, 
          ${alpha(theme.palette.primary.main, 0.08)} 0%, 
          ${alpha(theme.palette.secondary.main, 0.05)} 50%,
          ${alpha(theme.palette.success.main, 0.03)} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.success.main})`,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            textAlign: 'center',
            fontWeight: 600,
            mb: { xs: 2, sm: 3 },
            color: theme.palette.text.primary,
            fontSize: { xs: '1.1rem', sm: '1.25rem' },
          }}
        >
          Quick Stats
        </Typography>

        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {/* Today's Shows */}
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center', px: { xs: 0.5, sm: 1 } }}>
              <Box
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                  borderRadius: '12px',
                  p: { xs: 1, sm: 1.5 },
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                  boxShadow: `0 2px 8px ${alpha(theme.palette.success.main, 0.3)}`,
                  minWidth: { xs: 36, sm: 44 },
                  minHeight: { xs: 36, sm: 44 },
                }}
              >
                <FontAwesomeIcon icon={faCalendar} size="sm" color="white" />
              </Box>
              <Typography
                variant="h5"
                fontWeight={700}
                color="success.main"
                sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
              >
                {showStats.todayCount}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight: 500,
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  display: 'block',
                  lineHeight: 1.2,
                }}
              >
                Today's Shows
              </Typography>
            </Box>
          </Grid>

          {/* Favorite Shows */}
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center', px: { xs: 0.5, sm: 1 } }}>
              <Box
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  borderRadius: '12px',
                  p: { xs: 1, sm: 1.5 },
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                  boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                  minWidth: { xs: 36, sm: 44 },
                  minHeight: { xs: 36, sm: 44 },
                }}
              >
                <FontAwesomeIcon icon={faHeartSolid} size="sm" color="white" />
              </Box>
              <Typography
                variant="h5"
                fontWeight={700}
                color="primary.main"
                sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
              >
                {showStats.weekCount}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight: 500,
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  display: 'block',
                  lineHeight: 1.2,
                }}
              >
                Favorite Shows
              </Typography>
            </Box>
          </Grid>

          {/* Favorite Songs */}
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center', px: { xs: 0.5, sm: 1 } }}>
              <Box
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
                  borderRadius: '12px',
                  p: { xs: 1, sm: 1.5 },
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                  boxShadow: `0 2px 8px ${alpha(theme.palette.secondary.main, 0.3)}`,
                  minWidth: { xs: 36, sm: 44 },
                  minHeight: { xs: 36, sm: 44 },
                }}
              >
                <FontAwesomeIcon icon={faMusic} size="sm" color="white" />
              </Box>
              <Typography
                variant="h5"
                fontWeight={700}
                color="secondary.main"
                sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
              >
                {showStats.songFavoriteCount}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight: 500,
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  display: 'block',
                  lineHeight: 1.2,
                }}
              >
                Favorite Songs
              </Typography>
            </Box>
          </Grid>

          {/* Subscription */}
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center', px: { xs: 0.5, sm: 1 } }}>
              <Box
                sx={{
                  background: `linear-gradient(135deg, ${
                    subscriptionStore.hasAdFreeAccess
                      ? theme.palette.success.main
                      : theme.palette.warning.main
                  }, ${
                    subscriptionStore.hasAdFreeAccess
                      ? theme.palette.success.dark
                      : theme.palette.warning.dark
                  })`,
                  borderRadius: '12px',
                  p: { xs: 1, sm: 1.5 },
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                  boxShadow: `0 2px 8px ${alpha(
                    subscriptionStore.hasAdFreeAccess
                      ? theme.palette.success.main
                      : theme.palette.warning.main,
                    0.3,
                  )}`,
                  minWidth: { xs: 36, sm: 44 },
                  minHeight: { xs: 36, sm: 44 },
                }}
              >
                <FontAwesomeIcon icon={faTrophy} size="sm" color="white" />
              </Box>
              <Typography
                variant="h6"
                fontWeight={700}
                color={subscriptionStore.hasAdFreeAccess ? 'success.main' : 'warning.main'}
                sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}
              >
                {subscriptionStore.hasAdFreeAccess ? 'Pro' : 'Free'}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight: 500,
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  display: 'block',
                  lineHeight: 1.2,
                }}
              >
                Subscription
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const FavoriteShowCard = ({ favorite }: { favorite: any }) => (
    <Card
      sx={{
        mb: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateX(4px)',
          boxShadow: theme.shadows[4],
        },
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      }}
    >
      <CardActionArea>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: theme.palette.primary.main,
                  }}
                >
                  <FontAwesomeIcon icon={faMicrophone} size="sm" />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {favorite.show?.vendor?.name || 'Unknown Venue'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {favorite.show?.venue || 'Karaoke Night'}
                  </Typography>
                </Box>
              </Box>

              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip label={favorite.day} size="small" color="primary" variant="outlined" />
                {favorite.show?.startTime && (
                  <Chip
                    icon={<FontAwesomeIcon icon={faClock} size="xs" />}
                    label={`${formatTime(favorite.show.startTime)}${
                      favorite.show?.endTime ? ` - ${formatTime(favorite.show.endTime)}` : ''
                    }`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>

              {favorite.show?.address && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon
                    icon={faMapMarkerAlt}
                    size="sm"
                    color={theme.palette.text.secondary}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {favorite.show.address}
                  </Typography>
                </Box>
              )}
            </Box>

            <IconButton size="small" color="primary">
              <FontAwesomeIcon icon={faArrowRight} />
            </IconButton>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );

  const FavoriteSongCard = ({ songFavorite }: { songFavorite: any }) => {
    const handlePreviewPlay = async () => {
      // Check if user can use song previews
      if (!subscriptionStore.canUseSongPreview()) {
        setPaywallFeature('music_preview');
        setPaywallOpen(true);
        return;
      }

      console.log('🎵 Dashboard preview play:', {
        songId: songFavorite.song?.id,
        title: songFavorite.song?.title,
        previewUrl: songFavorite.song?.previewUrl,
        hasPreviewUrl: !!songFavorite.song?.previewUrl,
      });

      // Check if we have a preview URL (from iTunes API when the song was favorited)
      if (!songFavorite.song?.previewUrl) {
        console.warn('❌ No preview URL available for favorited song');
        uiStore.addNotification(
          'Preview not available for this favorited song. Try re-adding it to get the latest preview data.',
          'warning',
        );
        return;
      }

      // Use the song preview (this will increment the counter)
      subscriptionStore.useSongPreview();

      // Create a song object for the audio store with the stored preview URL
      const songForAudio = {
        id: songFavorite.song.id,
        title: songFavorite.song.title,
        artist: songFavorite.song.artist,
        previewUrl: songFavorite.song.previewUrl,
      };

      // Use the global audio store
      await audioStore.playPreview(songForAudio);
    };

    const handleFavorite = async () => {
      try {
        await songFavoriteStore.removeSongFavorite(songFavorite.song.id);
      } catch (error) {
        console.error('Error removing favorite:', error);
      }
    };

    // Use stored album art from the database
    const albumArtUrl =
      songFavorite.song?.albumArtSmall ||
      songFavorite.song?.albumArtMedium ||
      songFavorite.song?.albumArtLarge;

    const formatDuration = (duration?: number): string => {
      if (!duration) return '';
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
      <ListItem key={songFavorite.id} disablePadding>
        <ListItemButton
          sx={{
            py: 1,
            px: 2,
            borderRadius: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.04),
            },
            transition: 'all 0.2s ease-in-out',
            mb: 0.5,
          }}
        >
          <ListItemIcon sx={{ mr: 2, minWidth: 'auto' }}>
            {albumArtUrl ? (
              <img
                src={albumArtUrl}
                alt={`${songFavorite.song?.album || 'Album'} cover`}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '4px',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '4px',
                  bgcolor: theme.palette.grey[300],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FontAwesomeIcon
                  icon={faMusic}
                  style={{
                    fontSize: '20px',
                    color: theme.palette.grey[500],
                  }}
                />
              </Box>
            )}
          </ListItemIcon>

          {/* Song Info - Music player layout */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
              <Typography
                variant="body1"
                component="span"
                fontWeight={500}
                sx={{
                  fontSize: '1rem',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '300px',
                }}
              >
                {songFavorite.song?.title || 'Unknown Title'}
              </Typography>
              {songFavorite.song?.previewUrl && (
                <Chip
                  icon={<FontAwesomeIcon icon={faPlay} style={{ fontSize: '10px' }} />}
                  label="Preview"
                  size="small"
                  variant="outlined"
                  sx={{
                    height: '20px',
                    fontSize: '0.65rem',
                    color: theme.palette.info.main,
                    borderColor: theme.palette.info.main,
                    '& .MuiChip-icon': {
                      fontSize: '10px',
                    },
                  }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '250px',
                }}
              >
                {songFavorite.song?.artist || 'Unknown Artist'}
              </Typography>
            </Box>
          </Box>

          {/* Album Info */}
          <Box sx={{ flex: 1, minWidth: 0, display: { xs: 'none', md: 'block' } }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: '0.875rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {songFavorite.song?.album || '—'}
            </Typography>
          </Box>

          {/* Duration and Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {songFavorite.song?.duration && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: '0.875rem',
                  minWidth: '40px',
                  textAlign: 'right',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                {formatDuration(songFavorite.song.duration)}
              </Typography>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {/* Favorite Button */}
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFavorite();
                }}
                sx={{
                  color: theme.palette.success.main, // Always green since it's favorited
                  '&:hover': {
                    color: theme.palette.success.dark,
                  },
                }}
              >
                <FontAwesomeIcon icon={faHeartSolid} style={{ fontSize: '16px' }} />
              </IconButton>

              {/* Play Preview Button */}
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreviewPlay();
                }}
                disabled={!songFavorite.song?.previewUrl}
                sx={{
                  color:
                    audioStore.currentlyPlaying === songFavorite.song?.id && audioStore.isPlaying
                      ? theme.palette.success.main
                      : theme.palette.grey[600],
                  '&:hover': {
                    color: theme.palette.primary.main,
                  },
                  '&:disabled': {
                    color: theme.palette.grey[400],
                  },
                }}
              >
                <FontAwesomeIcon
                  icon={
                    audioStore.currentlyPlaying === songFavorite.song?.id && audioStore.isPlaying
                      ? faPause
                      : faPlay
                  }
                  style={{ fontSize: '14px' }}
                />
              </IconButton>
            </Box>
          </Box>
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <>
      <SEO {...seoConfigs.dashboard} />
      <Box
        sx={{
          minHeight: '100vh',
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.primary.main, 0.1)} 0%, 
            ${alpha(theme.palette.secondary.main, 0.05)} 50%, 
            ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%)`,
            pointerEvents: 'none',
          },
        }}
      >
        <Box
          sx={{
            maxWidth: { xs: '100%', sm: '95%', md: '1200px', xl: '1400px' },
            mx: 'auto',
            py: { xs: 3, sm: 4, md: 6 },
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
            {/* Enhanced Welcome Header */}
            <Box sx={{ mb: { xs: 3, sm: 4, md: 5 }, textAlign: 'center' }}>
              <Box
                sx={{
                  display: 'inline-block',
                  p: { xs: 2, sm: 2.5, md: 3 },
                  borderRadius: '24px',
                  background: `linear-gradient(135deg, 
                  ${alpha(theme.palette.primary.main, 0.08)}, 
                  ${alpha(theme.palette.secondary.main, 0.08)})`,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                  backdropFilter: 'blur(10px)',
                  mb: 2,
                  width: { xs: '95%', sm: 'auto' },
                  maxWidth: '800px',
                }}
              >
                <Typography
                  variant="h2"
                  component="h1"
                  fontWeight={800}
                  sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    mb: 1,
                    textShadow: `0 2px 4px ${alpha(theme.palette.primary.main, 0.1)}`,
                    fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' },
                  }}
                >
                  {getGreeting()},{' '}
                  {authStore.user?.stageName || authStore.user?.name || 'Karaoke Star'}! 🎤
                </Typography>
                <Typography
                  variant="h5"
                  color="text.secondary"
                  fontWeight={400}
                  sx={{
                    maxWidth: '600px',
                    mx: 'auto',
                    lineHeight: 1.4,
                    fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
                  }}
                >
                  Ready to rock the stage? Here's what's happening in your karaoke world.
                </Typography>
              </Box>
            </Box>

            {/* Ad placement after welcome section */}
            <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
              <MobileBanner position="between" variant="banner" />
            </Box>

            {/* Enhanced Stats Cards */}
            {/* Mobile: Compact Stats Card */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, mb: { xs: 3, sm: 4 } }}>
              <CompactStatsCard />
            </Box>

            {/* Desktop: Individual Stats Cards */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Grid
                container
                spacing={{ xs: 2, sm: 3, md: 4 }}
                sx={{ mb: { xs: 3, sm: 4, md: 5 } }}
              >
                <Grid item xs={12} sm={6} lg={3}>
                  <StatCard
                    icon={faCalendar}
                    title="Today's Shows"
                    value={showStats.todayCount}
                    subtitle="Shows you've favorited today"
                    color="success"
                    trending="neutral"
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <StatCard
                    icon={faHeartSolid}
                    title="Favorite Shows"
                    value={showStats.weekCount}
                    subtitle="Total shows in your favorites"
                    color="primary"
                    trending="up"
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <StatCard
                    icon={faMusic}
                    title="Favorite Songs"
                    value={showStats.songFavoriteCount}
                    subtitle="Songs saved to your library"
                    color="secondary"
                    trending="up"
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <StatCard
                    icon={faTrophy}
                    title="Subscription"
                    value={subscriptionStore.hasAdFreeAccess ? 'Pro' : 'Free'}
                    subtitle={
                      subscriptionStore.hasAdFreeAccess ? 'Premium features' : 'Upgrade available'
                    }
                    color={subscriptionStore.hasAdFreeAccess ? 'success' : 'warning'}
                    trending={subscriptionStore.hasAdFreeAccess ? 'up' : 'neutral'}
                  />
                </Grid>
              </Grid>
            </Box>

            <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
              {/* Main Content - Favorite Shows and Songs */}
              <Grid item xs={12} lg={8}>
                <Card
                  sx={{
                    mb: { xs: 2, sm: 3 },
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    borderRadius: '16px',
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        justifyContent: 'space-between',
                        mb: 3,
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 2, sm: 0 },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            backgroundColor: theme.palette.primary.main,
                            borderRadius: '12px',
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '48px',
                            minHeight: '48px',
                          }}
                        >
                          <FontAwesomeIcon icon={faHeartSolid} color="white" size="lg" />
                        </Box>
                        <Box>
                          <Typography
                            variant="h5"
                            component="h2"
                            fontWeight={600}
                            sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                          >
                            Your Favorites
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Shows and songs you've saved for easy access
                          </Typography>
                        </Box>
                      </Box>

                      <Button
                        variant="outlined"
                        startIcon={<FontAwesomeIcon icon={faPlus} />}
                        onClick={() => navigate('/map')}
                        sx={{ borderRadius: '8px' }}
                      >
                        Find More
                      </Button>
                    </Box>

                    {!authStore.isAuthenticated ? (
                      <Alert
                        severity="info"
                        sx={{
                          borderRadius: '12px',
                          '& .MuiAlert-message': { width: '100%' },
                        }}
                      >
                        <Typography variant="body1" fontWeight={500}>
                          Please log in to view your favorites
                        </Typography>
                        <Typography variant="body2">
                          Save your favorite karaoke venues and songs!
                        </Typography>
                      </Alert>
                    ) : loading ? (
                      <Box sx={{ p: 4 }}>
                        {[...Array(3)].map((_, index) => (
                          <Box key={index} sx={{ mb: 2 }}>
                            <Skeleton
                              variant="rectangular"
                              height={100}
                              sx={{ borderRadius: '12px', mb: 1 }}
                            />
                          </Box>
                        ))}
                      </Box>
                    ) : favoriteStore.favorites.length === 0 &&
                      songFavoriteStore.songFavorites.length === 0 ? (
                      <Paper
                        sx={{
                          p: 4,
                          textAlign: 'center',
                          backgroundColor: alpha(theme.palette.primary.main, 0.02),
                          border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
                          borderRadius: '16px',
                        }}
                      >
                        <Box sx={{ mb: 2 }}>
                          <FontAwesomeIcon
                            icon={faMusic}
                            size="3x"
                            color={theme.palette.text.secondary}
                          />
                        </Box>
                        <Typography variant="h6" gutterBottom fontWeight={600}>
                          No favorites yet!
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                          Start exploring karaoke venues and music to build your favorites
                          collection.
                        </Typography>
                        <Stack direction="row" spacing={2} justifyContent="center">
                          <Button
                            variant="contained"
                            startIcon={<FontAwesomeIcon icon={faMapMarkerAlt} />}
                            onClick={() => navigate('/map')}
                            sx={{ borderRadius: '8px' }}
                          >
                            Explore Shows
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<FontAwesomeIcon icon={faMusic} />}
                            onClick={() => navigate('/music')}
                            sx={{ borderRadius: '8px' }}
                          >
                            Browse Songs
                          </Button>
                        </Stack>
                      </Paper>
                    ) : (
                      <Box>
                        <Tabs
                          value={activeTab}
                          onChange={handleTabChange}
                          sx={{ mb: 3 }}
                          variant="fullWidth"
                        >
                          <Tab
                            icon={<FontAwesomeIcon icon={faMicrophone} />}
                            label={`Shows (${favoriteStore.favorites.length})`}
                          />
                          <Tab
                            icon={<FontAwesomeIcon icon={faMusic} />}
                            label={`Songs (${songFavoriteStore.songFavorites.length})`}
                          />
                        </Tabs>

                        {activeTab === 0 && (
                          <Box>
                            {favoriteStore.favorites.length === 0 ? (
                              <Typography
                                variant="body1"
                                color="text.secondary"
                                textAlign="center"
                                py={4}
                              >
                                No favorite shows yet. Start by exploring venues near you!
                              </Typography>
                            ) : (
                              favoriteStore.favorites
                                .slice(0, 5)
                                .map((favorite) => (
                                  <FavoriteShowCard key={favorite.id} favorite={favorite} />
                                ))
                            )}

                            {favoriteStore.favorites.length > 5 && (
                              <Button
                                variant="outlined"
                                fullWidth
                                endIcon={<FontAwesomeIcon icon={faArrowRight} />}
                                sx={{
                                  mt: 2,
                                  borderRadius: '12px',
                                  py: 1.5,
                                  borderStyle: 'dashed',
                                }}
                              >
                                View All {favoriteStore.favorites.length} Favorite Shows
                              </Button>
                            )}
                          </Box>
                        )}

                        {activeTab === 1 && (
                          <Box>
                            {songFavoriteStore.songFavorites.length === 0 ? (
                              <Typography
                                variant="body1"
                                color="text.secondary"
                                textAlign="center"
                                py={4}
                              >
                                No favorite songs yet. Start building your music library!
                              </Typography>
                            ) : (
                              <List sx={{ p: 0 }}>
                                {songFavoriteStore.songFavorites.slice(0, 5).map((songFavorite) => (
                                  <FavoriteSongCard
                                    key={songFavorite.id}
                                    songFavorite={songFavorite}
                                  />
                                ))}
                              </List>
                            )}

                            {songFavoriteStore.songFavorites.length > 5 && (
                              <Button
                                variant="outlined"
                                fullWidth
                                endIcon={<FontAwesomeIcon icon={faArrowRight} />}
                                sx={{
                                  mt: 2,
                                  borderRadius: '12px',
                                  py: 1.5,
                                  borderStyle: 'dashed',
                                }}
                              >
                                View All {songFavoriteStore.songFavorites.length} Favorite Songs
                              </Button>
                            )}
                          </Box>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Native Banner between sections */}
              <Grid item xs={12}>
                <Box sx={{ my: 3, display: 'flex', justifyContent: 'center' }}>
                  <NativeBannerAd />
                </Box>
              </Grid>

              {/* Right Sidebar */}
              <Grid item xs={12} lg={4}>
                <Stack spacing={{ xs: 2, sm: 3 }}>
                  {/* Friends List */}
                  <FriendsList onUserSelect={(userId) => console.log('Selected user:', userId)} />

                  {/* Performance Stats */}
                  <Card
                    sx={{
                      borderRadius: '16px',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <FontAwesomeIcon icon={faChartLine} color={theme.palette.primary.main} />
                        <Typography
                          variant="h6"
                          fontWeight={600}
                          sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                        >
                          Your Progress
                        </Typography>
                      </Box>
                      <Stack spacing={2}>
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Shows Attended</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              0
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={0}
                            sx={{ borderRadius: '4px', height: '6px' }}
                          />
                        </Box>
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Songs Performed</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              0
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={0}
                            sx={{ borderRadius: '4px', height: '6px' }}
                          />
                        </Box>
                        <Divider />
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                          Start attending shows to track your karaoke journey! 🎤
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>

                  {/* Upcoming Features */}
                  <Card
                    sx={{
                      background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                      border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <FontAwesomeIcon icon={faStar} color={theme.palette.secondary.main} />
                        <Typography variant="h6" fontWeight={600}>
                          Coming Soon
                        </Typography>
                      </Box>
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          🎵 Personal song recommendations
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          🏆 Karaoke achievements & badges
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          👥 Connect with fellow singers
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          📊 Performance analytics
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>

                  {/* Square Ad in Sidebar */}
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <SquareAd />
                  </Box>
                </Stack>
              </Grid>
            </Grid>

            {/* Ad placement at bottom */}
            <Box sx={{ mt: 4, mb: 2 }}>
              <MobileBanner position="between" variant="banner" />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Paywall Modal */}
      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature={paywallFeature}
        featureDescription={
          paywallFeature === 'music_preview'
            ? 'Listen to 30-second song previews to help you prepare for karaoke night! Premium subscription required for unlimited previews.'
            : undefined
        }
      />
    </>
  );
});

export default DashboardPage;
