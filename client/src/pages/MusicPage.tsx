import { BannerAd, WideAd } from '@components/AdPlaceholder';
import { PaywallModal } from '@components/PaywallModal';
import { SEO, seoConfigs } from '@components/SEO';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { faMusic, faPause, faPlay, faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { musicStore, subscriptionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

export const MusicPage: React.FC = observer(() => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<'favorites' | 'friends' | 'ad_removal'>(
    'favorites',
  );

  useEffect(() => {
    // Clear any previous results when component mounts
    musicStore.clearResults();
    // Fetch subscription status if user is logged in
    subscriptionStore.fetchSubscriptionStatus();
  }, []);

  // Scroll detection for infinite loading
  useEffect(() => {
    const handleScroll = () => {
      if (musicStore.songs.length === 0 || !musicStore.hasMoreSongs || musicStore.isLoadingMore) {
        return;
      }

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;

      // Load more when user scrolls to 80% of the page
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        musicStore.loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    musicStore.setSearchQuery(searchTerm);
    musicStore.setShowSuggestions(false); // Hide suggestions when searching
    await musicStore.searchCombined(searchTerm);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);

    // Get suggestions for autocomplete
    if (value.trim()) {
      musicStore.getSuggestions(value);
    } else {
      musicStore.setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleInputFocus = () => {
    if (searchQuery.trim() && musicStore.suggestions.length > 0) {
      musicStore.setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      musicStore.setShowSuggestions(false);
    }, 200);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    } else if (event.key === 'Escape') {
      musicStore.setShowSuggestions(false);
    }
  };

  const handleCategoryClick = async (categoryId: string) => {
    await musicStore.loadCategoryMusic(categoryId);
  };

  const handleFavorite = async (song: any) => {
    // Check if user has premium access
    if (subscriptionStore.shouldShowPaywall('favorites')) {
      setPaywallFeature('favorites');
      setPaywallOpen(true);
      return;
    }

    // For now, just show that the feature would work
    // TODO: Implement music favorites in a separate store/system
    console.log('Would favorite song:', song.title);
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return '';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePreviewPlay = async (song: any) => {
    if (!song.previewUrl) return;

    // Stop current audio if playing
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }

    // If clicking the same song that's playing, stop it
    if (currentlyPlaying === song.id) {
      setCurrentlyPlaying(null);
      setAudioElement(null);
      return;
    }

    // Play new preview
    try {
      const audio = new Audio(song.previewUrl);
      audio.volume = 0.7; // Set volume to 70%

      audio.addEventListener('ended', () => {
        setCurrentlyPlaying(null);
        setAudioElement(null);
      });

      await audio.play();
      setCurrentlyPlaying(song.id);
      setAudioElement(audio);
    } catch (error) {
      console.error('Error playing preview:', error);
    }
  };

  return (
    <>
      <SEO {...seoConfigs.music} />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            Karaoke Songs Library - Browse Thousands of Tracks
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
            Discover your perfect karaoke song from our massive collection featuring hits from every
            genre and decade
          </Typography>

          {/* Search Bar */}
          <Box sx={{ maxWidth: 600, mx: 'auto', mb: 6, position: 'relative' }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search for songs, artists, or albums..."
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyPress={handleKeyPress}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faSearch} />
                  </InputAdornment>
                ),
                endAdornment: musicStore.isLoading && (
                  <InputAdornment position="end">
                    <CircularProgress size={20} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: theme.palette.background.paper,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                },
              }}
            />

            {/* Autocomplete Suggestions */}
            {musicStore.showSuggestions && musicStore.suggestions.length > 0 && (
              <Paper
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 1300,
                  maxHeight: 300,
                  overflow: 'auto',
                  mt: 1,
                  borderRadius: 2,
                  boxShadow: theme.shadows[8],
                }}
              >
                <List sx={{ py: 0 }}>
                  {musicStore.suggestions.map((suggestion, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemButton
                        onClick={() => handleSuggestionClick(suggestion)}
                        sx={{
                          py: 1.5,
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <FontAwesomeIcon icon={faSearch} size="sm" />
                        </ListItemIcon>
                        <ListItemText
                          primary={suggestion}
                          primaryTypographyProps={{
                            variant: 'body2',
                            noWrap: true,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
        </Box>

        {/* Featured Categories */}
        {musicStore.songs.length === 0 && !musicStore.isLoading && (
          <Box sx={{ mb: 6 }}>
            <Typography
              variant="h4"
              gutterBottom
              sx={{ textAlign: 'center', mb: 4, fontWeight: 600 }}
            >
              Featured Categories
            </Typography>

            {/* Ad placement - only show if not ad-free */}
            {!subscriptionStore.hasAdFreeAccess && <BannerAd />}

            {/* Ad removal prompt - show occasionally */}
            {!subscriptionStore.hasAdFreeAccess && Math.random() > 0.7 && (
              <Box
                sx={{
                  textAlign: 'center',
                  mb: 3,
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200',
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Enjoying KaraokeHub?
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setPaywallFeature('ad_removal');
                    setPaywallOpen(true);
                  }}
                >
                  Remove Ads for $0.99/mo
                </Button>
              </Box>
            )}

            <Grid container spacing={3}>
              {musicStore.featuredCategories.map((category, index) => (
                <React.Fragment key={category.id}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: theme.shadows[8],
                        },
                      }}
                      onClick={() => handleCategoryClick(category.id)}
                    >
                      <CardMedia
                        component="img"
                        sx={{ height: 200 }}
                        image={category.image}
                        alt={category.title}
                      />
                      <CardContent>
                        <Typography variant="h6" component="h3" gutterBottom fontWeight={600}>
                          {category.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Discover amazing songs
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Ad between categories - show after every 3rd category if not ad-free */}
                  {!subscriptionStore.hasAdFreeAccess &&
                    (index + 1) % 3 === 0 &&
                    index !== musicStore.featuredCategories.length - 1 && (
                      <Grid item xs={12}>
                        <WideAd />
                      </Grid>
                    )}
                </React.Fragment>
              ))}
            </Grid>
          </Box>
        )}

        {/* Search Results */}
        {musicStore.songs.length > 0 && (
          <Box>
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
            >
              <Typography variant="h4" gutterBottom fontWeight={600}>
                {musicStore.selectedCategory !== 'all'
                  ? musicStore.featuredCategories.find(
                      (cat) => cat.id === musicStore.selectedCategory,
                    )?.title
                  : `Search Results for "${musicStore.searchQuery}"`}
              </Typography>
              {musicStore.selectedCategory !== 'all' && (
                <Chip
                  label="Featured Category"
                  color="primary"
                  icon={<FontAwesomeIcon icon={faMusic} />}
                />
              )}
            </Box>

            <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
              {musicStore.songs.map((song, index) => (
                <React.Fragment key={`${song.id}-${index}`}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => musicStore.setSelectedSong(song)}
                      selected={musicStore.selectedSong?.id === song.id}
                      sx={{
                        py: 2,
                        borderRadius: 1,
                        mb: 1,
                        '&.Mui-selected': {
                          backgroundColor: theme.palette.primary.light + '20',
                        },
                      }}
                    >
                      <ListItemIcon>
                        {song.albumArt?.small ? (
                          <Box sx={{ position: 'relative', mr: 1 }}>
                            <img
                              src={song.albumArt.small}
                              alt={`${song.album} cover`}
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '4px',
                                objectFit: 'cover',
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent selecting the song
                                handlePreviewPlay(song);
                              }}
                              disabled={!song.previewUrl}
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                bgcolor: song.previewUrl
                                  ? 'rgba(0,0,0,0.7)'
                                  : 'rgba(128,128,128,0.7)',
                                color: 'white',
                                width: '24px',
                                height: '24px',
                                '&:hover': {
                                  bgcolor: song.previewUrl
                                    ? 'rgba(0,0,0,0.8)'
                                    : 'rgba(128,128,128,0.8)',
                                },
                              }}
                            >
                              <FontAwesomeIcon
                                icon={currentlyPlaying === song.id ? faPause : faPlay}
                                size="xs"
                              />
                            </IconButton>
                          </Box>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent selecting the song
                              handlePreviewPlay(song);
                            }}
                            disabled={!song.previewUrl}
                            sx={{
                              bgcolor: song.previewUrl
                                ? theme.palette.primary.main
                                : theme.palette.grey[400],
                              color: 'white',
                              '&:hover': {
                                bgcolor: song.previewUrl
                                  ? theme.palette.primary.dark
                                  : theme.palette.grey[500],
                              },
                              '&:disabled': {
                                bgcolor: theme.palette.grey[300],
                                color: theme.palette.grey[500],
                              },
                            }}
                          >
                            <FontAwesomeIcon
                              icon={currentlyPlaying === song.id ? faPause : faPlay}
                              size="sm"
                            />
                          </IconButton>
                        )}
                      </ListItemIcon>
                      {/* Custom layout instead of ListItemText to avoid div-in-p nesting */}
                      <Box sx={{ py: 1, px: 0, flex: 1 }}>
                        {/* Primary content */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" component="span" fontWeight={600}>
                            {song.title}
                          </Typography>
                          {song.year && (
                            <Chip
                              label={song.year}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          )}
                        </Box>
                        
                        {/* Secondary content */}
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            {[
                              song.artist,
                              song.album,
                              song.duration ? formatDuration(song.duration) : null,
                              song.country,
                              song.previewUrl ? '🎵 Preview Available' : null,
                            ]
                              .filter(Boolean)
                              .join(' • ')}
                          </Typography>
                          {song.tags && song.tags.length > 0 && (
                            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {song.tags.slice(0, 3).map((tag) => (
                                <Chip
                                  key={tag}
                                  label={tag}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem', height: '20px' }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Box>

                      {/* Heart icon for favorites */}
                      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent selecting the song
                            handleFavorite(song);
                          }}
                          sx={{
                            color: theme.palette.error.main,
                            '&:hover': {
                              backgroundColor: theme.palette.error.main + '20',
                            },
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faHeartRegular}
                            size="sm"
                            style={{
                              fontSize: '18px',
                            }}
                          />
                        </IconButton>
                      </Box>
                    </ListItemButton>
                  </ListItem>

                  {/* Ad between songs - show after every 10th song if not ad-free */}
                  {!subscriptionStore.hasAdFreeAccess &&
                    (index + 1) % 10 === 0 &&
                    index !== musicStore.songs.length - 1 && (
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <Box sx={{ width: '100%' }}>
                          <WideAd />
                        </Box>
                      </ListItem>
                    )}
                </React.Fragment>
              ))}
            </List>

            {/* Load More Indicator */}
            {musicStore.isLoadingMore && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Loading more songs...
                </Typography>
              </Box>
            )}

            {/* End of Results Indicator */}
            {!musicStore.hasMoreSongs && musicStore.songs.length > 0 && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  That's all the songs we found! 🎵
                </Typography>
              </Box>
            )}

            {musicStore.songs.length === 0 && musicStore.searchQuery && !musicStore.isLoading && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <FontAwesomeIcon
                  icon={faMusic}
                  size="4x"
                  style={{ color: theme.palette.text.disabled, marginBottom: '16px' }}
                />
                <Typography variant="h5" gutterBottom color="text.secondary">
                  No songs found
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Try adjusting your search terms or browse our featured categories above.
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Loading State */}
        {musicStore.isLoading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Searching for music...
            </Typography>
          </Box>
        )}

        {/* Paywall Modal */}
        <PaywallModal
          open={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          feature={paywallFeature}
          featureDescription={
            paywallFeature === 'favorites'
              ? 'Save your favorite songs to easily find them later! Premium subscription required.'
              : undefined
          }
        />
      </Container>
    </>
  );
});

export default MusicPage;
