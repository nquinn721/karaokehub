import { WideAdWithUpgrade } from '@components/AdWithUpgrade';
import { NativeBannerAd, SidebarAd } from '@components/AdsterraAd';
import MobileBanner from '@components/MobileBanner';
import { ThumbnailAlbumArt } from '@components/OptimizedAlbumArt';
import { PaywallModal } from '@components/PaywallModal';
import { SEO, seoConfigs } from '@components/SEO';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import {
  faBookmark,
  faChevronRight,
  faCompactDisc,
  faHeart as faHeartSolid,
  faHome,
  faMusic,
  faPause,
  faPlay,
  faSearch,
  faTimes,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  alpha,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Link,
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
import {
  audioStore,
  authStore,
  musicStore,
  songFavoriteStore,
  subscriptionStore,
  uiStore,
} from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

export const MusicPage: React.FC = observer(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Get search query from URL params
  const urlSearchQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<
    'favorites' | 'ad_removal' | 'music_preview'
  >('favorites');
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Determine current view based on route
  const getCurrentView = () => {
    const path = location.pathname;
    if (path.includes('/category/')) return 'category';
    if (path.includes('/artist/')) return 'artist';
    if (path.includes('/song/')) return 'song';
    if (path.includes('/search') || urlSearchQuery) return 'search';
    return 'home';
  };

  const currentView = getCurrentView();

  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      audioStore.stopAudio();
    };
  }, []);

  // Stop music when navigating within the music section
  useEffect(() => {
    audioStore.stopAudio();
  }, [location.pathname, location.search]); // React to route changes

  // Load user's song favorites when authenticated
  useEffect(() => {
    if (authStore.isAuthenticated) {
      songFavoriteStore.fetchMySongFavorites();
    }
  }, [authStore.isAuthenticated]);

  useEffect(() => {
    // Fetch subscription status if user is logged in
    subscriptionStore.fetchSubscriptionStatus();

    // Handle initial load based on route
    if (currentView === 'search' && urlSearchQuery) {
      // Clear previous results for search
      musicStore.clearResults();
      setSearchQuery(urlSearchQuery);
      musicStore.searchSongs(urlSearchQuery);
    } else if (currentView === 'category' && params.categoryId) {
      // Clear previous results for category
      musicStore.clearResults();
      // Scroll to top immediately when loading category
      window.scrollTo(0, 0);
      musicStore.loadCategoryMusicProgressive(params.categoryId);
    } else {
      // Only clear results when showing home view
      musicStore.clearResults();
    }
  }, [currentView, urlSearchQuery, params.categoryId]);

  // Scroll detection for infinite loading with proper debouncing
  useEffect(() => {
    let scrollTimeout: number | null = null;
    let lastScrollY = 0;

    const handleScroll = () => {
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

      // Only trigger when scrolling down
      if (currentScrollY <= lastScrollY) {
        lastScrollY = currentScrollY;
        return;
      }
      lastScrollY = currentScrollY;

      // Clear any existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      // Debounce the scroll event with a longer delay
      scrollTimeout = window.setTimeout(() => {
        // More robust checks
        if (
          musicStore.songs.length === 0 ||
          !musicStore.hasMoreSongs ||
          musicStore.isLoadingMore ||
          musicStore.isLoading
        ) {
          return;
        }

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;

        // Load more when user scrolls to 85% of the page (more conservative threshold)
        if (scrollTop + clientHeight >= scrollHeight * 0.85) {
          musicStore.loadMore();
        }
      }, 500); // Increased debounce delay to 500ms to prevent rapid firing
    };

    // Use passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [
    musicStore.songs.length,
    musicStore.hasMoreSongs,
    musicStore.isLoadingMore,
    musicStore.isLoading,
  ]);

  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    // Update URL with search query
    navigate(`/music/search?q=${encodeURIComponent(searchTerm)}`);

    musicStore.setSearchQuery(searchTerm);
    musicStore.setShowSuggestions(false); // Hide suggestions when searching
    await musicStore.searchCombined(searchTerm);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);

    musicStore.setSearchQuery(value);

    if (value.trim().length >= 2) {
      // Get suggestions for autocomplete
      musicStore.getSuggestions(value);
    } else {
      // Clear suggestions if input is too short
      musicStore.setSuggestions([]);
      musicStore.setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleInputFocus = () => {
    if (searchQuery.trim() && searchQuery.length >= 2) {
      // Get fresh suggestions when focusing
      musicStore.getSuggestions(searchQuery);
    } else if (searchQuery.trim() && musicStore.suggestions.length > 0) {
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
      musicStore.setShowSuggestions(false); // Close autocomplete
      handleSearch();
    } else if (event.key === 'Escape') {
      musicStore.setShowSuggestions(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/music/category/${categoryId}`);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    musicStore.setSearchQuery('');
    musicStore.setSuggestions([]);
    musicStore.setShowSuggestions(false);
    musicStore.clearResults();
  };

  // Generate breadcrumbs based on current route
  const generateBreadcrumbs = () => {
    const breadcrumbs = [
      { label: 'Home', href: '/', icon: faHome },
      { label: 'Music', href: '/music', icon: faMusic },
    ];

    if (currentView === 'search') {
      breadcrumbs.push({ label: `Search: "${urlSearchQuery}"`, href: '', icon: faSearch });
    } else if (currentView === 'category' && params.categoryId) {
      const category = musicStore.featuredCategories.find((c) => c.id === params.categoryId);
      breadcrumbs.push({
        label: category?.title || 'Category',
        href: '',
        icon: faCompactDisc,
      });
    } else if (currentView === 'artist' && params.artistId) {
      breadcrumbs.push({ label: 'Artist', href: '', icon: faUser });
    }

    return breadcrumbs;
  };

  const handleFavorite = async (song: any) => {
    const isFavorited = isSongFavorited(song.id);

    // If trying to add a favorite, check paywall limits
    if (!isFavorited) {
      const currentFavoriteCount = songFavoriteStore.getSongFavoriteCount();
      if (!subscriptionStore.canFavoriteSongs(currentFavoriteCount)) {
        setPaywallFeature('favorites');
        setPaywallOpen(true);
        return;
      }
    }

    try {
      if (isFavorited) {
        await songFavoriteStore.removeSongFavorite(
          song.id,
          musicStore.selectedCategory !== 'all' ? musicStore.selectedCategory : undefined,
        );
      } else {
        // Pass song data to create the song in the database if it doesn't exist
        const songData = {
          title: song.title,
          artist: song.artist,
          album: song.album,
          genre: song.tags?.[0],
          duration: song.duration,
          previewUrl: song.previewUrl,
          albumArtSmall: song.albumArt?.small,
          albumArtMedium: song.albumArt?.medium,
          albumArtLarge: song.albumArt?.large,
        };
        await songFavoriteStore.addSongFavorite(
          song.id,
          songData,
          musicStore.selectedCategory !== 'all' ? musicStore.selectedCategory : undefined,
        );
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
    }
  };

  const isSongFavorited = (songId: string): boolean => {
    return songFavoriteStore.songFavorites.some((fav) => {
      // Check if the favorite matches by songId (internal ID)
      if (fav.songId === songId) return true;

      return false;
    });
  };

  const handlePreviewPlay = async (song: any) => {
    // Check if user can use song previews
    if (!subscriptionStore.canUseSongPreview()) {
      setPaywallFeature('music_preview');
      setPaywallOpen(true);
      return;
    }

    // Use the previewUrl from the song data (should come from iTunes API)
    if (!song.previewUrl) {
      console.warn('❌ No preview URL available for song:', {
        id: song.id,
        title: song.title,
        artist: song.artist,
        fullSong: song,
      });
      // Show a user-friendly message via snackbar
      uiStore.addNotification(
        'Preview not available for this song. Try searching for a different version or artist.',
        'warning',
      );
      return;
    }

    // Use the song preview (this will increment the counter)
    subscriptionStore.useSongPreview();

    // Use the global audio store with the actual preview URL
    await audioStore.playPreview(song);
  };

  return (
    <>
      <SEO {...seoConfigs.music} />
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
        <Box sx={{ maxWidth: '1200px', mx: 'auto', py: 6, position: 'relative', zIndex: 1 }}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            separator={<FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '12px' }} />}
            sx={{ mb: 4, px: 3 }}
          >
            {generateBreadcrumbs().map((crumb: any, index: number) =>
              crumb.href ? (
                <Link
                  key={index}
                  component={RouterLink}
                  to={crumb.href}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    textDecoration: 'none',
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                >
                  <FontAwesomeIcon icon={crumb.icon} style={{ fontSize: '14px' }} />
                  {crumb.label}
                </Link>
              ) : (
                <Typography
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: 'text.primary',
                    fontWeight: 500,
                  }}
                >
                  <FontAwesomeIcon icon={crumb.icon} style={{ fontSize: '14px' }} />
                  {crumb.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>

          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 6, px: 3 }}>
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
              Discover your perfect karaoke song from our massive collection featuring hits from
              every genre and decade
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
                  endAdornment: (
                    <InputAdornment position="end">
                      {searchQuery && (
                        <IconButton
                          size="small"
                          onClick={handleClearSearch}
                          sx={{
                            mr: musicStore.isLoading ? 1 : 0,
                            color: 'text.secondary',
                            '&:hover': {
                              color: 'text.primary',
                              backgroundColor: 'action.hover',
                            },
                          }}
                          aria-label="Clear search"
                        >
                          <FontAwesomeIcon icon={faTimes} style={{ fontSize: '14px' }} />
                        </IconButton>
                      )}
                      {musicStore.isLoading && <CircularProgress size={20} />}
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
          {(() => {
            const shouldShowFeatured =
              currentView === 'home' && musicStore.songs.length === 0 && !musicStore.isLoading;
            return shouldShowFeatured;
          })() && (
            <Box sx={{ mb: 6, px: 3 }}>
              <Typography
                variant="h4"
                gutterBottom
                sx={{ textAlign: 'center', mb: 4, fontWeight: 600 }}
              >
                Featured Categories
              </Typography>

              {/* Ad placement right below Featured Categories heading - only show if not ad-free */}
              {!subscriptionStore.hasAdFreeAccess && (
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                  <MobileBanner position="between" variant="banner" />
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
                        <img
                          src={category.image}
                          alt={category.title}
                          style={{
                            width: '100%',
                            height: 200,
                            objectFit: 'cover',
                            backgroundColor: 'rgba(0,0,0,0.05)',
                          }}
                          loading="lazy"
                        />
                        <CardContent>
                          <Typography variant="h6" component="h3" gutterBottom fontWeight={600}>
                            {category.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Discover amazing {category.title.toLowerCase()} songs
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Ad between rows - show after second row (6 categories) if not ad-free */}
                    {!subscriptionStore.hasAdFreeAccess && index === 5 && (
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                          <MobileBanner position="between" variant="banner" />
                        </Box>
                      </Grid>
                    )}
                  </React.Fragment>
                ))}
              </Grid>

              {/* Bottom banner ad - only show if not ad-free */}
              {!subscriptionStore.hasAdFreeAccess && (
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                  <MobileBanner position="between" variant="banner" />
                </Box>
              )}
            </Box>
          )}

          {/* Search Results */}
          {musicStore.sortedSongs.length > 0 && (
            <Box sx={{ px: 3 }}>
              <Grid container spacing={3}>
                {/* Main Content Area */}
                <Grid item xs={12} lg={subscriptionStore.hasAdFreeAccess ? 12 : 9}>
                  {/* Quick Start Guide */}
                  <Box
                    sx={{
                      mb: 3,
                      p: 3,
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      boxShadow: theme.shadows[2],
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 2,
                        fontWeight: 600,
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                        }}
                      >
                        <FontAwesomeIcon icon={faMusic} style={{ fontSize: '14px' }} />
                      </Box>
                      Quick Start Guide
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Play Button Instruction */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            border: `2px solid ${theme.palette.success.main}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            mt: 0.2,
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faPlay}
                            style={{
                              fontSize: '10px',
                              color: theme.palette.success.main,
                              marginLeft: '1px', // Slight offset for visual balance
                            }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Listen to Previews:</strong> Click the play button to hear a
                          30-second preview of any song. Free users get 10 previews, then premium
                          subscription required for unlimited music previews.
                          {authStore.isAuthenticated && !subscriptionStore.isSubscribed && (
                            <span
                              style={{
                                marginLeft: '8px',
                                fontWeight: 'bold',
                                color: theme.palette.primary.main,
                              }}
                            >
                              ({subscriptionStore.getRemainingPreviews()} remaining)
                            </span>
                          )}
                        </Typography>
                      </Box>

                      {/* Save Songs Instruction */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            border: `2px solid ${theme.palette.error.main}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            mt: 0.2,
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faBookmark}
                            style={{
                              fontSize: '10px',
                              color: theme.palette.error.main,
                            }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Save Favorites:</strong> Save songs to your favorites for quick
                          access. Free users can save up to 5 songs, premium subscribers get
                          unlimited favorites.
                          {authStore.isAuthenticated && !subscriptionStore.isSubscribed && (
                            <span
                              style={{
                                marginLeft: '8px',
                                fontWeight: 'bold',
                                color: theme.palette.primary.main,
                              }}
                            >
                              ({songFavoriteStore.getSongFavoriteCount()}/5 saved)
                            </span>
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Native Banner - Content-style ad integration */}
                  {!subscriptionStore.hasAdFreeAccess && (
                    <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
                      <NativeBannerAd />
                    </Box>
                  )}

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 3,
                    }}
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

                  <List
                    sx={{
                      bgcolor: theme.palette.mode === 'dark' ? '#2a2a2a' : '#f5f5f5',
                      borderRadius: 2,
                      p: 1,
                      '& .MuiListItem-root': {
                        mb: 1,
                        '&:last-child': {
                          mb: 0,
                        },
                      },
                    }}
                  >
                    {musicStore.sortedSongs.map((song, index) => {
                      // Create a more explicit check for the currently playing song
                      const isThisSongPlaying =
                        audioStore.currentlyPlaying === song.id && audioStore.isPlaying;

                      return (
                        <React.Fragment key={`${song.id}-${index}`}>
                          <ListItem disablePadding>
                            <ListItemButton
                              onClick={() => musicStore.setSelectedSong(song)}
                              selected={musicStore.selectedSong?.id === song.id}
                              sx={{
                                py: 1.5,
                                px: 2,
                                borderRadius: '8px',
                                backgroundColor: '#222',
                                border: `1px solid ${theme.palette.divider}`,
                                '&.Mui-selected': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                  borderColor: theme.palette.primary.main,
                                },
                                '&:hover': {
                                  backgroundColor: '#333',
                                  borderColor: theme.palette.primary.main,
                                },
                                transition: 'all 0.2s ease-in-out',
                                mb: 0.5,
                              }}
                            >
                              <ListItemIcon sx={{ mr: 2, minWidth: 'auto' }}>
                                <ThumbnailAlbumArt
                                  albumArt={song.albumArt}
                                  alt={`${song.album} cover`}
                                />
                              </ListItemIcon>

                              {/* Song Info - Music player layout */}
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box
                                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}
                                >
                                  <Typography
                                    variant="body1"
                                    component="span"
                                    fontWeight={500}
                                    sx={{
                                      fontSize: '1rem',
                                      lineHeight: 1.4,
                                      color: theme.palette.text.primary,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '300px',
                                    }}
                                  >
                                    {song.title}
                                  </Typography>
                                  {song.previewUrl && (
                                    <Chip
                                      icon={
                                        <FontAwesomeIcon
                                          icon={faPlay}
                                          style={{ fontSize: '10px' }}
                                        />
                                      }
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
                                  {isSongFavorited(song.id) && (
                                    <FontAwesomeIcon
                                      icon={faHeartSolid}
                                      style={{
                                        color: theme.palette.success.main,
                                        fontSize: '14px',
                                      }}
                                    />
                                  )}
                                </Box>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    fontSize: '0.875rem',
                                    lineHeight: 1.3,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '250px',
                                  }}
                                >
                                  {song.artist}
                                </Typography>
                              </Box>

                              {/* Album Info */}
                              <Box
                                sx={{ flex: 1, minWidth: 0, display: { xs: 'none', md: 'block' } }}
                              >
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
                                  {song.album || '—'}
                                </Typography>
                              </Box>

                              {/* Duration and Actions */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {song.year && (
                                  <Chip
                                    label={song.year}
                                    size="small"
                                    variant="filled"
                                    sx={{
                                      fontSize: '0.75rem',
                                      height: '24px',
                                      fontWeight: 600,
                                      backgroundColor:
                                        theme.palette.mode === 'dark'
                                          ? 'rgba(255, 255, 255, 0.1)'
                                          : 'rgba(0, 0, 0, 0.08)',
                                      color: theme.palette.text.secondary,
                                      display: { xs: 'none', sm: 'flex' },
                                      '&:hover': {
                                        backgroundColor:
                                          theme.palette.mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.15)'
                                            : 'rgba(0, 0, 0, 0.12)',
                                      },
                                    }}
                                  />
                                )}
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
                                  {song.duration
                                    ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}`
                                    : ''}
                                </Typography>

                                {/* Action Buttons */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {/* Favorite Button */}
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFavorite(song);
                                    }}
                                    sx={{
                                      color: isSongFavorited(song.id)
                                        ? theme.palette.success.main
                                        : theme.palette.grey[500],
                                      '&:hover': {
                                        color: theme.palette.success.main,
                                      },
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={
                                        isSongFavorited(song.id) ? faHeartSolid : faHeartRegular
                                      }
                                      style={{ fontSize: '16px' }}
                                    />
                                  </IconButton>

                                  {/* Play Preview Button */}
                                  <IconButton
                                    size="small"
                                    // disabled={!song.previewUrl} // Temporarily removed to test clicking
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (song.previewUrl) {
                                        handlePreviewPlay(song);
                                      } else {
                                        console.warn(
                                          '❌ Play button clicked but no preview URL available',
                                        );
                                        // Still try to call handlePreviewPlay to see what happens
                                        handlePreviewPlay(song);
                                      }
                                    }}
                                    sx={{
                                      color: !song.previewUrl
                                        ? theme.palette.grey[400]
                                        : isThisSongPlaying
                                          ? theme.palette.success.main
                                          : theme.palette.grey[600],
                                      '&:hover': song.previewUrl
                                        ? {
                                            color: theme.palette.primary.main,
                                          }
                                        : {},
                                      '&.Mui-disabled': {
                                        color: theme.palette.grey[400],
                                      },
                                    }}
                                    title={
                                      !song.previewUrl
                                        ? 'Preview not available for this song'
                                        : isThisSongPlaying
                                          ? 'Pause preview'
                                          : 'Play 30-second preview'
                                    }
                                  >
                                    <FontAwesomeIcon
                                      icon={isThisSongPlaying ? faPause : faPlay}
                                      style={{ fontSize: '14px' }}
                                    />
                                  </IconButton>
                                </Box>
                              </Box>
                            </ListItemButton>
                          </ListItem>

                          {/* Ad between songs - show after every 10th song if not ad-free */}
                          {!subscriptionStore.hasAdFreeAccess &&
                            (index + 1) % 10 === 0 &&
                            index !== musicStore.sortedSongs.length - 1 && (
                              <ListItem sx={{ px: 0, py: 1 }}>
                                <Box sx={{ width: '100%' }}>
                                  <WideAdWithUpgrade showUpgradePrompt={index === 9} />
                                </Box>
                              </ListItem>
                            )}
                        </React.Fragment>
                      );
                    })}
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
                  {!musicStore.hasMoreSongs && musicStore.sortedSongs.length > 0 && (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        That's all the songs we found! 🎵
                      </Typography>
                    </Box>
                  )}

                  {musicStore.sortedSongs.length === 0 &&
                    (musicStore.searchQuery || currentView === 'category') &&
                    !musicStore.isLoading && (
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
                          {currentView === 'category'
                            ? 'No songs found for this category. Please try another category or search for specific songs.'
                            : 'Try adjusting your search terms or browse our featured categories above.'}
                        </Typography>
                      </Box>
                    )}
                </Grid>

                {/* Sidebar with Ads - only show if not ad-free */}
                {!subscriptionStore.hasAdFreeAccess && (
                  <Grid item xs={12} lg={3}>
                    <Box sx={{ position: 'sticky', top: 20 }}>
                      <SidebarAd />
                      <Box sx={{ mt: 3 }}>
                        <MobileBanner position="between" variant="banner" />
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {/* Loading State */}
          {musicStore.isLoading && (
            <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
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

          {/* Login Required Modal */}
          <Dialog
            open={loginModalOpen}
            onClose={() => setLoginModalOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FontAwesomeIcon icon={faMusic} />
                Account Required
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                You must have an account to use music previews.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in or create an account to access this feature.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 3, gap: 2 }}>
              <Button onClick={() => setLoginModalOpen(false)} variant="outlined">
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setLoginModalOpen(false);
                  navigate('/login');
                }}
              >
                Sign In
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </>
  );
});

export default MusicPage;
