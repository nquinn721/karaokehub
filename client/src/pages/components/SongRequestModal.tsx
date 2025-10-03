import { faHeart, faMusic, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { musicStore, songFavoriteStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

interface SongRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (songRequest: string) => void;
  isForQueue?: boolean; // true if requesting to join queue, false if requesting from DJ
}

const SongRequestModal: React.FC<SongRequestModalProps> = observer(
  ({ open, onClose, onSubmit, isForQueue = true }) => {
    const theme = useTheme();
    const [songRequest, setSongRequest] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentTab, setCurrentTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    // Load favorites when modal opens
    useEffect(() => {
      if (open && currentTab === 1) {
        songFavoriteStore.fetchMySongFavorites();
      }
    }, [open, currentTab]);

    // Search songs when query changes
    useEffect(() => {
      if (searchQuery.trim() && currentTab === 2) {
        const delayedSearch = setTimeout(() => {
          musicStore.searchSongs(searchQuery);
        }, 300);
        return () => clearTimeout(delayedSearch);
      }
    }, [searchQuery, currentTab]);

    const handleSubmit = async () => {
      if (!songRequest.trim()) return;

      setIsSubmitting(true);
      try {
        onSubmit(songRequest.trim());
        setSongRequest('');
        onClose();
      } catch (error) {
        console.error('Error submitting song request:', error);
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleClose = () => {
      setSongRequest('');
      setSearchQuery('');
      setCurrentTab(0);
      onClose();
    };

    const handleSongSelect = (song: any) => {
      const songText = `${song.title} - ${song.artist}`;
      setSongRequest(songText);
      setCurrentTab(0); // Switch back to manual entry tab
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
      setCurrentTab(newValue);
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    };

    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background:
              theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${theme.palette.background.paper}F0 0%, ${theme.palette.primary.main}20 100%)`
                : `linear-gradient(135deg, ${theme.palette.background.paper}F5 0%, ${theme.palette.primary.main}15 100%)`,
            border: `1px solid ${theme.palette.primary.main}40`,
            boxShadow: `0 8px 32px ${theme.palette.primary.main}25`,
            backdropFilter: 'blur(10px)',
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesomeIcon icon={faMusic} style={{ color: 'white', fontSize: '1.2rem' }} />
            </Box>
            <Typography variant="h6" fontWeight={600}>
              {isForQueue ? 'Song Request' : 'Request Song from DJ'}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <FontAwesomeIcon icon={faTimes} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pb: 2 }}>
          <Typography variant="body2" component="div" color="text.secondary" sx={{ mb: 2 }}>
            {isForQueue
              ? 'What song would you like to sing?'
              : 'What song would you like to request from the DJ?'}
          </Typography>

          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Manual Entry" />
            <Tab label="My Favorites" />
            <Tab label="Search Songs" />
          </Tabs>

          {currentTab === 0 && (
            <Box>
              <TextField
                autoFocus
                fullWidth
                multiline
                maxRows={3}
                value={songRequest}
                onChange={(e) => setSongRequest(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isForQueue ? 'Enter the song you want to sing...' : 'Enter your song request...'
                }
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <Typography
                variant="caption"
                component="div"
                color="text.secondary"
                sx={{ mt: 1, display: 'block' }}
              >
                Press Enter to submit or Shift+Enter for new line
              </Typography>
            </Box>
          )}

          {currentTab === 1 && (
            <Box>
              {songFavoriteStore.isLoading ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography>Loading your favorites...</Typography>
                </Box>
              ) : songFavoriteStore.songFavorites.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <FontAwesomeIcon
                    icon={faHeart}
                    style={{
                      fontSize: '2rem',
                      color: theme.palette.text.secondary,
                      marginBottom: 8,
                    }}
                  />
                  <Typography color="text.secondary">
                    You haven't favorited any songs yet. Visit the Music page to add favorites!
                  </Typography>
                </Box>
              ) : (
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {songFavoriteStore.songFavorites.map((favorite) => (
                    <ListItem key={favorite.id} disablePadding>
                      <ListItemButton
                        onClick={() => handleSongSelect(favorite.song)}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemText
                          primary={favorite.song?.title || 'Unknown Title'}
                          secondary={favorite.song?.artist || 'Unknown Artist'}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          {currentTab === 2 && (
            <Box>
              <TextField
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for songs..."
                variant="outlined"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, color: 'text.secondary' }}>
                      <FontAwesomeIcon icon={faSearch} />
                    </Box>
                  ),
                }}
              />

              {musicStore.isLoading ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography>Searching songs...</Typography>
                </Box>
              ) : musicStore.songs.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography color="text.secondary">
                    {searchQuery
                      ? 'No songs found. Try a different search term.'
                      : 'Start typing to search for songs...'}
                  </Typography>
                </Box>
              ) : (
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {musicStore.songs.slice(0, 20).map((song) => (
                    <ListItem key={song.id} disablePadding>
                      <ListItemButton
                        onClick={() => handleSongSelect(song)}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemText
                          primary={song.title}
                          secondary={song.artist || 'Unknown Artist'}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!songRequest.trim() || isSubmitting}
            startIcon={<FontAwesomeIcon icon={faMusic} />}
            sx={{
              borderRadius: 2,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
              },
            }}
          >
            {isSubmitting ? 'Submitting...' : isForQueue ? 'Join Queue' : 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

export default SongRequestModal;
