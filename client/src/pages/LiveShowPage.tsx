import {
  faBars,
  faCrown,
  faMicrophone,
  faMusic,
  faTimes,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Drawer,
  Grid,
  IconButton,
  Paper,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import { apiStore, authStore, liveShowStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { AnnouncementDisplay } from './components/AnnouncementDisplay';
import { ChatSystem } from './components/ChatSystem';
import { CurrentSingerDisplay } from './components/CurrentSingerDisplay';
import DJRotationManagement from './components/DJRotationManagement';
import { ParticipantsList } from './components/ParticipantsList';
import { QueueManagement } from './components/QueueManagement';
import SongRequestModal from './components/SongRequestModal';

// DJ Song Request Button Component
const DJSongRequestButton: React.FC<{
  isDJ: boolean;
  hasDJ: boolean;
  onRequestSong: (songRequest: string) => void;
}> = ({ isDJ, hasDJ, onRequestSong }) => {
  const theme = useTheme();
  const [modalOpen, setModalOpen] = useState(false);

  // Don't show if user is DJ or there's no DJ
  if (isDJ || !hasDJ) {
    return null;
  }

  return (
    <>
      <Paper sx={{ mt: 2, p: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" component="div" sx={{ mb: 2 }}>
            Request Song from DJ
          </Typography>
          <Button
            variant="outlined"
            startIcon={<FontAwesomeIcon icon={faMusic} />}
            onClick={() => setModalOpen(true)}
            sx={{
              borderColor: theme.palette.secondary.main,
              color: theme.palette.secondary.main,
              '&:hover': {
                borderColor: theme.palette.secondary.dark,
                backgroundColor: `${theme.palette.secondary.main}10`,
              },
            }}
          >
            Request Song
          </Button>
        </Box>
      </Paper>

      <SongRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onRequestSong}
        isForQueue={false}
      />
    </>
  );
};

const LiveShowPage: React.FC = observer(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showId } = useParams<{ showId: string }>();
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!showId) {
      navigate('/dashboard');
      return;
    }

    // Connect to socket and join show if not already connected
    if (!liveShowStore.isConnected) {
      liveShowStore.connect();
    }

    // Auto-join show if not already in it
    if (!liveShowStore.currentShow || liveShowStore.currentShow.id !== showId) {
      handleJoinShow();
    }

    return () => {
      // Don't auto-leave on unmount - user might be refreshing
    };
  }, [showId]);

  const handleJoinShow = async () => {
    if (!showId || !authStore.user) return;

    setIsJoining(true);
    try {
      // For test shows, automatically populate with test users
      if (authStore.user.isAdmin) {
        try {
          await apiStore.post(`/live-shows/${showId}/populate-test-users`);
          console.log('✅ Populated show with test users');
        } catch (populateError) {
          console.log('Test users already exist or populate failed:', populateError);
        }
      }

      const success = await liveShowStore.joinShowDirectly(
        showId,
        authStore.user.equippedAvatar?.id,
        undefined, // TODO: Add equipped microphone to AuthStore User interface
      );

      if (!success) {
        console.error('Failed to join show:', liveShowStore.error);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error joining show:', error);
      navigate('/dashboard');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveShow = async () => {
    await liveShowStore.leaveShow();
    navigate('/dashboard');
  };

  // Loading states
  if (isJoining || liveShowStore.isLoading) {
    return (
      <Container maxWidth="lg">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="60vh"
          gap={3}
        >
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            {isJoining ? 'Joining live show...' : 'Loading...'}
          </Typography>
        </Box>
      </Container>
    );
  }

  // Error state
  if (liveShowStore.error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            }
          >
            {liveShowStore.error}
          </Alert>
        </Box>
      </Container>
    );
  }

  // No show state
  if (!liveShowStore.currentShow) {
    return (
      <Container maxWidth="lg">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="60vh"
          gap={3}
        >
          <FontAwesomeIcon
            icon={faMicrophone}
            style={{ fontSize: '4rem', color: theme.palette.text.secondary }}
          />
          <Typography variant="h5" color="text.secondary">
            Show not found or no longer active
          </Typography>
          <Button variant="contained" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  const { currentShow, currentUserRole, uiState } = liveShowStore;
  const isDJ = currentUserRole === 'dj';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.primary.main}05 50%, ${theme.palette.secondary.main}05 100%)`
            : `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.primary.main}02 50%, ${theme.palette.secondary.main}02 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.02) 1px, transparent 1px), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          pointerEvents: 'none',
        },
      }}
    >
      {/* Mobile Header */}
      <AppBar
        position="sticky"
        sx={{
          display: { xs: 'block', md: 'none' },
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <IconButton color="inherit" onClick={() => liveShowStore.toggleSidebar()} sx={{ mr: 2 }}>
            <FontAwesomeIcon icon={faBars} />
          </IconButton>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" noWrap>
              {currentShow.name}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {liveShowStore.onlineParticipantCount} participants
              {isDJ && <Chip label="DJ" size="small" sx={{ ml: 1 }} />}
            </Typography>
          </Box>

          <IconButton color="inherit" onClick={handleLeaveShow}>
            <FontAwesomeIcon icon={faTimes} />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Announcement Display */}
      {liveShowStore.currentAnnouncement && (
        <AnnouncementDisplay
          announcement={liveShowStore.currentAnnouncement}
          isDJ={liveShowStore.currentUserRole === 'dj'}
          onSendAnnouncement={liveShowStore.sendAnnouncement.bind(liveShowStore)}
          onDismissAnnouncement={() => {
            // Announcements auto-dismiss, but DJ can manually dismiss
            liveShowStore.currentAnnouncement = null;
          }}
        />
      )}

      <Container
        maxWidth="xl"
        sx={{
          py: { xs: 2, md: 4 },
          px: { xs: 1, md: 3 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Grid container spacing={{ xs: 2, md: 4 }}>
          {/* Mobile Drawer */}
          <Drawer
            anchor="left"
            open={uiState.sidebarOpen}
            onClose={() => liveShowStore.toggleSidebar()}
            sx={{ display: { xs: 'block', md: 'none' } }}
            PaperProps={{
              sx: { width: 280 },
            }}
          >
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {currentShow.name}
              </Typography>

              <ParticipantsList
                participants={currentShow.participants}
                currentUserId={authStore.user?.id || ''}
                isDJ={isDJ}
                onSendPrivateMessage={liveShowStore.openMessageDialog?.bind(liveShowStore)}
              />
            </Box>
          </Drawer>

          {/* Desktop Sidebar */}
          <Grid
            item
            md={3}
            sx={{
              display: { xs: 'none', md: 'block' },
            }}
          >
            <Paper
              sx={{
                p: 3,
                mb: 2,
                background:
                  theme.palette.mode === 'dark'
                    ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.primary.main}08 100%)`
                    : `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.primary.main}03 100%)`,
                border: `1px solid ${theme.palette.primary.main}20`,
                borderRadius: 3,
                boxShadow: `0 8px 32px ${theme.palette.primary.main}15`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <FontAwesomeIcon icon={faMusic} style={{ color: 'white', fontSize: '1.2rem' }} />
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {currentShow.name}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                {isDJ && (
                  <Chip
                    icon={<FontAwesomeIcon icon={faCrown} />}
                    label="DJ"
                    sx={{
                      background: `linear-gradient(45deg, #ffd700, #ffb700)`,
                      color: '#000',
                      fontWeight: 700,
                      '& .MuiChip-icon': {
                        color: '#000',
                      },
                    }}
                    size="small"
                  />
                )}
                <Chip
                  icon={<FontAwesomeIcon icon={faUsers} />}
                  label={`${liveShowStore.onlineParticipantCount} online`}
                  sx={{
                    backgroundColor: `${theme.palette.success.main}20`,
                    color: theme.palette.success.main,
                    fontWeight: 600,
                    '& .MuiChip-icon': {
                      color: theme.palette.success.main,
                    },
                  }}
                  size="small"
                />
              </Box>

              {currentShow.description && (
                <Typography
                  variant="body2"
                  sx={{
                    mb: 3,
                    p: 2,
                    backgroundColor: `${theme.palette.text.secondary}05`,
                    borderRadius: 2,
                    fontStyle: 'italic',
                  }}
                >
                  {currentShow.description}
                </Typography>
              )}

              {/* Test Role Switching - Only show for admin/testing */}
              {authStore.user?.isAdmin && (
                <Button
                  variant="outlined"
                  color={isDJ ? 'warning' : 'info'}
                  fullWidth
                  onClick={async () => {
                    try {
                      // First populate the show with test users if needed
                      try {
                        await apiStore.post(`/live-shows/${showId}/populate-test-users`);
                      } catch (populateError) {
                        console.log('Test users already exist or populate failed:', populateError);
                      }

                      // Switch role
                      const response = await apiStore.post(`/live-shows/${showId}/switch-role`, {
                        role: isDJ ? 'singer' : 'dj',
                      });

                      if (response.success) {
                        // Refresh the show data to see the new role
                        window.location.reload();
                      } else {
                        console.error('Failed to switch role:', response.message);
                      }
                    } catch (error) {
                      console.error('Error switching role:', error);
                    }
                  }}
                  sx={{
                    py: 1.5,
                    fontWeight: 600,
                    borderRadius: 2,
                    mb: 1,
                    '&:hover': {
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <FontAwesomeIcon
                    icon={isDJ ? faMicrophone : faCrown}
                    style={{ marginRight: '8px' }}
                  />
                  Switch to {isDJ ? 'Singer' : 'DJ'}
                </Button>
              )}

              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={handleLeaveShow}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: `${theme.palette.error.main}10`,
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Leave Show
              </Button>
            </Paper>

            <ParticipantsList
              participants={currentShow.participants}
              currentUserId={authStore.user?.id || ''}
              isDJ={isDJ}
              onSendPrivateMessage={liveShowStore.openMessageDialog?.bind(liveShowStore)}
            />
          </Grid>

          {/* Main Content */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 2, md: 4 },
                position: 'relative',
              }}
            >
              {/* Current Singer Display */}
              <Box
                sx={{
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: -16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 60,
                    height: 4,
                    background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}40, transparent)`,
                    borderRadius: 2,
                  },
                }}
              >
                <CurrentSingerDisplay
                  currentSinger={liveShowStore.currentSinger}
                  nextInQueue={liveShowStore.nextSingers}
                  isDJ={isDJ}
                  onSetSongDuration={liveShowStore.setSongDuration.bind(liveShowStore)}
                  onStartSong={liveShowStore.startSong.bind(liveShowStore)}
                />
              </Box>

              {/* Queue Management */}
              <QueueManagement
                queue={currentShow.queue}
                currentSinger={liveShowStore.currentSinger}
                isDJ={isDJ}
                currentUserId={authStore.user?.id || ''}
                isUserInQueue={liveShowStore.isUserInQueue}
                onJoinQueue={() => liveShowStore.addToQueue()}
                onLeaveQueue={() => liveShowStore.removeFromQueue()}
                onReorderQueue={liveShowStore.reorderQueue.bind(liveShowStore)}
                onRemoveFromQueue={liveShowStore.removeFromQueue.bind(liveShowStore)}
                onSetCurrentSinger={liveShowStore.setCurrentSinger.bind(liveShowStore)}
              />

              {/* DJ Rotation Management */}
              <DJRotationManagement
                queue={currentShow.queue}
                isDJ={isDJ}
                onReorderSingers={liveShowStore.reorderSingers.bind(liveShowStore)}
                onSetCurrentSinger={liveShowStore.setCurrentSinger.bind(liveShowStore)}
              />

              {/* DJ Song Request */}
              <DJSongRequestButton
                isDJ={isDJ}
                hasDJ={liveShowStore.hasDJ}
                onRequestSong={liveShowStore.requestSongFromDJ.bind(liveShowStore)}
              />
            </Box>
          </Grid>

          {/* Chat Sidebar */}
          <Grid item xs={12} md={3}>
            <ChatSystem
              messages={liveShowStore.filteredMessages}
              participants={currentShow.participants}
              currentUserId={authStore.user?.id || ''}
              isDJ={isDJ}
              onSendMessage={liveShowStore.sendMessage.bind(liveShowStore)}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
});

export default LiveShowPage;
