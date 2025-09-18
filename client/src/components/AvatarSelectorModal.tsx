import { faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import { userStore } from '../stores';
import { AVAILABLE_AVATARS } from './AvatarDisplay3D';
import CustomModal from './CustomModal';

interface AvatarSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onAvatarSelect?: (avatarId: string) => void;
}

const AvatarSelectorModal: React.FC<AvatarSelectorModalProps> = ({
  open,
  onClose,
  onAvatarSelect,
}) => {
  const theme = useTheme();
  const [selectedAvatar, setSelectedAvatar] = useState<string>('avatar_1');
  const [savedAvatar, setSavedAvatar] = useState<string>('avatar_1');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Use store loading state and local loading for save operation
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const isLoading = userStore.isLoading || isSaving;

  // Load current user and avatar on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await userStore.getCurrentUser();
        if (user) {
          setCurrentUserId(user.id);

          const userAvatar = user.avatar || 'avatar_1';
          if (AVAILABLE_AVATARS.find((a) => a.id === userAvatar)) {
            setSelectedAvatar(userAvatar);
            setSavedAvatar(userAvatar);
            localStorage.setItem('selectedAvatar', userAvatar);
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('selectedAvatar');
        if (saved && AVAILABLE_AVATARS.find((a) => a.id === saved)) {
          setSelectedAvatar(saved);
          setSavedAvatar(saved);
        }
      }
    };

    loadUserData();
  }, []);

  const handleAvatarSelect = useCallback((avatarId: string) => {
    setSelectedAvatar(avatarId);
  }, []);

  const handleSaveAvatar = useCallback(async () => {
    if (!currentUserId) {
      // Fallback to localStorage only
      localStorage.setItem('selectedAvatar', selectedAvatar);
      setSavedAvatar(selectedAvatar);
      onAvatarSelect?.(selectedAvatar);
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      // Update avatar in database
      await userStore.updateAvatar(currentUserId, selectedAvatar);

      // Update local state
      localStorage.setItem('selectedAvatar', selectedAvatar);
      setSavedAvatar(selectedAvatar);
      onAvatarSelect?.(selectedAvatar);
      onClose();
    } catch (error) {
      console.error('Failed to update avatar:', error);
      // Still update localStorage as fallback
      localStorage.setItem('selectedAvatar', selectedAvatar);
      setSavedAvatar(selectedAvatar);
      onAvatarSelect?.(selectedAvatar);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [selectedAvatar, currentUserId, onAvatarSelect, onClose]);

  const selectedAvatarData = AVAILABLE_AVATARS.find((a) => a.id === selectedAvatar);

  return (
    <CustomModal
      open={open}
      onClose={onClose}
      title="Choose Your Avatar"
      icon={<FontAwesomeIcon icon={faUser} />}
      maxWidth="lg"
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
          Select an avatar that represents you in the karaoke community!
        </Typography>

        <Grid container spacing={3}>
          {/* Avatar Preview */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: 'white',
                height: '100%',
                minHeight: 400,
              }}
            >
              <CardContent
                sx={{
                  textAlign: 'center',
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Current Selection
                </Typography>

                {/* Large Avatar Preview */}
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 160,
                      height: 200,
                      position: 'relative',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Box
                      component="img"
                      src={selectedAvatarData?.imagePath || '/avatar/avatar_1.png'}
                      alt="Avatar Preview"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        imageRendering: 'auto',
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== '/avatar/avatar_1.png') {
                          target.src = '/avatar/avatar_1.png';
                        }
                      }}
                    />
                  </Box>
                </Box>

                {selectedAvatarData && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {selectedAvatarData.name}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {selectedAvatarData.description}
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSaveAvatar}
                  disabled={selectedAvatar === savedAvatar || isLoading}
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontWeight: 'bold',
                    py: 1.5,
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
                    '&:disabled': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)',
                    },
                  }}
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
                >
                  {isLoading
                    ? 'Saving...'
                    : selectedAvatar === savedAvatar
                      ? 'Current Avatar'
                      : 'Select This Avatar'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Avatar Grid */}
          <Grid item xs={12} md={8}>
            <Box
              sx={{
                height: 400,
                overflowY: 'auto',
                p: 1,
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: alpha(theme.palette.text.primary, 0.05),
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: alpha(theme.palette.text.primary, 0.2),
                  borderRadius: '4px',
                  '&:hover': {
                    background: alpha(theme.palette.text.primary, 0.3),
                  },
                },
              }}
            >
              <Grid container spacing={2}>
                {AVAILABLE_AVATARS.map((avatar) => {
                  const isSelected = avatar.id === selectedAvatar;

                  return (
                    <Grid item xs={6} sm={4} md={3} key={avatar.id}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          border: '2px solid',
                          borderColor: isSelected ? theme.palette.primary.main : 'transparent',
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                          background: isSelected
                            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`
                            : 'inherit',
                          '&:hover': {
                            transform: 'scale(1.03)',
                            boxShadow: theme.shadows[8],
                            borderColor: alpha(theme.palette.primary.main, 0.5),
                          },
                        }}
                        onClick={() => handleAvatarSelect(avatar.id)}
                      >
                        <CardContent sx={{ p: 2, textAlign: 'center' }}>
                          {/* Avatar Preview */}
                          <Box
                            sx={{
                              width: 80,
                              height: 100,
                              mx: 'auto',
                              mb: 1,
                              border: '2px solid',
                              borderColor: isSelected
                                ? theme.palette.primary.main
                                : alpha(theme.palette.text.primary, 0.2),
                              borderRadius: '12px',
                              overflow: 'hidden',
                              position: 'relative',
                              background: alpha(theme.palette.background.default, 0.5),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Box
                              component="img"
                              src={avatar.imagePath}
                              alt="Avatar Preview"
                              sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                imageRendering: 'auto',
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (target.src !== '/avatar/avatar_1.png') {
                                  target.src = '/avatar/avatar_1.png';
                                }
                              }}
                            />
                          </Box>

                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 'bold',
                              color: isSelected ? theme.palette.primary.main : 'inherit',
                            }}
                          >
                            {avatar.name}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </CustomModal>
  );
};

export default observer(AvatarSelectorModal);
