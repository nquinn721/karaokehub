import { BannerAd, WideAd } from '@components/AdPlaceholder';
import { SEO, seoConfigs } from '@components/SEO';
import {
  faMicrophone,
  faMusic,
  faTrophy,
  faUsers,
  faHeart,
  faCalendar,
  faMapMarkerAlt,
  faClock,
  faStar,
  faChartLine,
  faGift,
  faPlus,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  Chip,
  Button,
  Alert,
  Paper,
  Divider,
  LinearProgress,
  IconButton,
  Stack,
  Skeleton,
  CardActionArea,
  useTheme,
  alpha,
  Avatar,
  Tabs,
  Tab,
} from '@mui/material';
import { authStore, subscriptionStore, songFavoriteStore } from '@stores/index';
import { favoriteStore } from '../stores';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = observer(() => {
  const [loading, setLoading] = useState(false);
  const [showStats, setShowStats] = useState({ 
    todayCount: 0, 
    weekCount: 0, 
    upcomingCount: 0, 
    songFavoriteCount: 0 
  });
  const [activeTab, setActiveTab] = useState(0);
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
      // Calculate some statistics from favorites
      const favorites = favoriteStore.favorites;
      const today = new Date().getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayName = dayNames[today];
      
      const todayCount = favorites.filter(fav => 
        fav.day.toLowerCase() === todayName
      ).length;
      
      const weekCount = favorites.length;
      const upcomingCount = favorites.filter(fav => {
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

  const StatCard = ({ icon, title, value, subtitle, color = 'primary' }: {
    icon: any;
    title: string;
    value: number | string;
    subtitle: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  }) => (
    <Card 
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.1)}, ${alpha(theme.palette[color].main, 0.05)})`,
        border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8],
        },
        transition: 'all 0.3s ease'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight={600} color={color}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: alpha(theme.palette[color].main, 0.2),
              borderRadius: '12px',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesomeIcon icon={icon} size="lg" color={theme.palette[color].main} />
          </Box>
        </Box>
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
                <Chip
                  label={favorite.day}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
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
                  <FontAwesomeIcon icon={faMapMarkerAlt} size="sm" color={theme.palette.text.secondary} />
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

  const FavoriteSongCard = ({ songFavorite }: { songFavorite: any }) => (
    <Card
      sx={{
        mb: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateX(4px)',
          boxShadow: theme.shadows[4],
        },
        border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
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
                    backgroundColor: theme.palette.secondary.main,
                  }}
                >
                  <FontAwesomeIcon icon={faMusic} size="sm" />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {songFavorite.song?.title || 'Unknown Title'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {songFavorite.song?.artist || 'Unknown Artist'}
                  </Typography>
                </Box>
              </Box>
              
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                {songFavorite.song?.album && (
                  <Chip
                    label={songFavorite.song.album}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                )}
                {songFavorite.song?.genre && (
                  <Chip
                    label={songFavorite.song.genre}
                    size="small"
                    variant="outlined"
                  />
                )}
                {songFavorite.song?.duration && (
                  <Chip
                    icon={<FontAwesomeIcon icon={faClock} size="xs" />}
                    label={`${Math.floor(songFavorite.song.duration / 60)}:${(songFavorite.song.duration % 60).toString().padStart(2, '0')}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
              
              {(songFavorite.song?.spotifyId || songFavorite.song?.youtubeId) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {songFavorite.song?.spotifyId && (
                    <Typography variant="caption" color="text.secondary">
                      🎵 Available on Spotify
                    </Typography>
                  )}
                  {songFavorite.song?.youtubeId && (
                    <Typography variant="caption" color="text.secondary">
                      📺 Available on YouTube
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
            
            <IconButton size="small" color="secondary">
              <FontAwesomeIcon icon={faArrowRight} />
            </IconButton>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
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
                <Chip
                  label={favorite.day}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
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
                  <FontAwesomeIcon icon={faMapMarkerAlt} size="sm" color={theme.palette.text.secondary} />
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <>
      <SEO {...seoConfigs.dashboard} />
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          {/* Welcome Header */}
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="h3" 
              component="h1" 
              fontWeight={700}
              sx={{ 
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 1,
              }}
            >
              {getGreeting()}, {authStore.user?.name || 'Karaoke Star'}! 🎤
            </Typography>
            <Typography variant="h6" color="text.secondary" fontWeight={400}>
              Ready to rock the stage? Here's what's happening in your karaoke world.
            </Typography>
          </Box>

          {/* Ad placement after welcome section - only show if not ad-free */}
          {!subscriptionStore.hasAdFreeAccess && (
            <Box sx={{ mb: 4 }}>
              <BannerAd />
            </Box>
          )}

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                icon={faCalendar}
                title="Today's Shows"
                value={showStats.todayCount}
                subtitle="Shows you've favorited today"
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                icon={faHeart}
                title="Favorite Shows"
                value={showStats.weekCount}
                subtitle="Total shows in your favorites"
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                icon={faMusic}
                title="Favorite Songs"
                value={showStats.songFavoriteCount}
                subtitle="Songs saved to your library"
                color="secondary"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                icon={faTrophy}
                title="Subscription"
                value={subscriptionStore.hasAdFreeAccess ? "Active" : "Free"}
                subtitle={subscriptionStore.hasAdFreeAccess ? "Ad-Free Plan" : "Upgrade available"}
                color={subscriptionStore.hasAdFreeAccess ? "success" : "secondary"}
              />
            </Grid>
          </Grid>

          <Grid container spacing={4}>
            {/* Main Content - Favorite Shows */}
            <Grid item xs={12} lg={8}>
              <Card 
                sx={{ 
                  mb: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          backgroundColor: theme.palette.primary.main,
                          borderRadius: '12px',
                          p: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FontAwesomeIcon icon={faHeart} color="white" size="lg" />
                      </Box>
                      <Box>
                        <Typography variant="h5" component="h2" fontWeight={600}>
                          Your Favorite Shows
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Shows you've saved for easy access
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Button
                      variant="outlined"
                      startIcon={<FontAwesomeIcon icon={faPlus} />}
                      onClick={() => navigate('/map')}
                      sx={{ borderRadius: '8px' }}
                    >
                      Find Shows
                    </Button>
                  </Box>

                  {!authStore.isAuthenticated ? (
                    <Alert 
                      severity="info" 
                      sx={{ 
                        borderRadius: '12px',
                        '& .MuiAlert-message': { width: '100%' }
                      }}
                    >
                      <Typography variant="body1" fontWeight={500}>
                        Please log in to view your favorite shows
                      </Typography>
                      <Typography variant="body2">
                        Save your favorite karaoke venues and never miss a show!
                      </Typography>
                    </Alert>
                  ) : loading ? (
                    <Box sx={{ p: 4 }}>
                      {[...Array(3)].map((_, index) => (
                        <Box key={index} sx={{ mb: 2 }}>
                          <Skeleton variant="rectangular" height={100} sx={{ borderRadius: '12px', mb: 1 }} />
                        </Box>
                      ))}
                    </Box>
                  ) : favoriteStore.favorites.length === 0 && songFavoriteStore.songFavorites.length === 0 ? (
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
                        <FontAwesomeIcon icon={faMusic} size="3x" color={theme.palette.text.secondary} />
                      </Box>
                      <Typography variant="h6" gutterBottom fontWeight={600}>
                        No favorites yet!
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        Start exploring karaoke venues and music to build your favorites collection.
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
                            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
                              No favorite shows yet. Start by exploring venues near you!
                            </Typography>
                          ) : (
                            favoriteStore.favorites.slice(0, 5).map((favorite) => (
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
                            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
                              No favorite songs yet. Start building your music library!
                            </Typography>
                          ) : (
                            songFavoriteStore.songFavorites.slice(0, 5).map((songFavorite) => (
                              <FavoriteSongCard key={songFavorite.id} songFavorite={songFavorite} />
                            ))
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

            {/* Right Sidebar */}
            <Grid item xs={12} lg={4}>
              <Stack spacing={3}>
                {/* Quick Actions */}
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Quick Actions
                    </Typography>
                    <Stack spacing={2}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<FontAwesomeIcon icon={faMapMarkerAlt} />}
                        onClick={() => navigate('/map')}
                        sx={{ 
                          borderRadius: '8px',
                          py: 1.5,
                          justifyContent: 'flex-start',
                        }}
                      >
                        Find Karaoke Shows
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<FontAwesomeIcon icon={faMusic} />}
                        onClick={() => navigate('/music')}
                        sx={{ 
                          borderRadius: '8px',
                          py: 1.5,
                          justifyContent: 'flex-start',
                        }}
                      >
                        Browse Music Library
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<FontAwesomeIcon icon={faUsers} />}
                        sx={{ 
                          borderRadius: '8px',
                          py: 1.5,
                          justifyContent: 'flex-start',
                        }}
                        disabled
                      >
                        Connect with Friends
                        <Chip label="Soon" size="small" sx={{ ml: 'auto' }} />
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Performance Stats */}
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <FontAwesomeIcon icon={faChartLine} color={theme.palette.primary.main} />
                      <Typography variant="h6" fontWeight={600}>
                        Your Progress
                      </Typography>
                    </Box>
                    <Stack spacing={2}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Shows Attended</Typography>
                          <Typography variant="body2" fontWeight={600}>0</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={0} sx={{ borderRadius: '4px' }} />
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Songs Performed</Typography>
                          <Typography variant="body2" fontWeight={600}>0</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={0} sx={{ borderRadius: '4px' }} />
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
              </Stack>
            </Grid>
          </Grid>

          {/* Ad placement at bottom - only show if not ad-free */}
          {!subscriptionStore.hasAdFreeAccess && (
            <Box sx={{ mt: 4, mb: 2 }}>
              <WideAd />
            </Box>
          )}
        </Box>
      </Container>
    </>
  );
});

export default DashboardPage;
