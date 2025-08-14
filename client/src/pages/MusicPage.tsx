import { faMicrophone, faMusic, faPlay, faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
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
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { musicStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

export const MusicPage: React.FC = observer(() => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Clear any previous results when component mounts
    musicStore.clearResults();
  }, []);

  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    musicStore.setSearchQuery(searchTerm);
    await musicStore.searchCombined(searchTerm);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCategoryClick = async (categoryId: string) => {
    await musicStore.loadCategoryMusic(categoryId);
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return '';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
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
          <FontAwesomeIcon icon={faMicrophone} style={{ marginRight: '16px' }} />
          Karaoke Music Search
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
          Discover your next karaoke hit from millions of songs
        </Typography>

        {/* Search Bar */}
        <Box sx={{ maxWidth: 600, mx: 'auto', mb: 6 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search for songs, artists, or albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          <Grid container spacing={3}>
            {musicStore.featuredCategories.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
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
                      {category.queries.length} popular songs
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
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
              <ListItem key={`${song.id}-${index}`} disablePadding>
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
                    <IconButton
                      size="small"
                      sx={{
                        bgcolor: theme.palette.primary.main,
                        color: 'white',
                        '&:hover': { bgcolor: theme.palette.primary.dark },
                      }}
                    >
                      <FontAwesomeIcon icon={faPlay} size="sm" />
                    </IconButton>
                  </ListItemIcon>
                  <ListItemText
                    primary={
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
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {[
                            song.artist,
                            song.album,
                            song.duration ? formatDuration(song.duration) : null,
                            song.country,
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
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

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
    </Container>
  );
});

export default MusicPage;
