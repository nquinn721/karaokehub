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
  useTheme,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import { userStore } from '../stores';
import { Avatar } from '../stores/UserStore';
import CustomModal from './CustomModal';

interface AvatarSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onAvatarSelect?: (avatarId: string) => void;
}

const AvatarSelectorModal: React.FC<AvatarSelectorModalProps> = observer(
  ({ open, onClose, onAvatarSelect }) => {
    const theme = useTheme();
    const [selectedAvatar, setSelectedAvatar] = useState<string>('avatar_1');
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [availableAvatars, setAvailableAvatars] = useState<Avatar[]>([]);
    const [isLoadingAvatars, setIsLoadingAvatars] = useState<boolean>(false);

    // Load available avatars when modal opens
    useEffect(() => {
      if (open) {
        loadAvailableAvatars();
      }
    }, [open]);

    const loadAvailableAvatars = async () => {
      setIsLoadingAvatars(true);
      try {
        const avatars = await userStore.getAvailableAvatars();
        setAvailableAvatars(avatars);

        // Set currently equipped avatar as selected
        const equippedAvatar = userStore.getEquippedAvatar();
        if (equippedAvatar) {
          setSelectedAvatar(equippedAvatar.avatarId);
        } else if (avatars.length > 0) {
          setSelectedAvatar(avatars[0].id);
        }
      } catch (error) {
        console.error('Failed to load available avatars:', error);
      } finally {
        setIsLoadingAvatars(false);
      }
    };

    const handleAvatarSelect = useCallback((avatarId: string) => {
      setSelectedAvatar(avatarId);
    }, []);

    const handleSaveAvatar = useCallback(async () => {
      setIsSaving(true);
      try {
        const success = await userStore.updateEquippedAvatar(selectedAvatar);

        if (success) {
          onAvatarSelect?.(selectedAvatar);
          onClose();
        }
      } catch (error) {
        console.error('Failed to update avatar:', error);
      } finally {
        setIsSaving(false);
      }
    }, [selectedAvatar, onAvatarSelect, onClose]);

    const isLoading = userStore.isLoading || isSaving || isLoadingAvatars;

    return (
      <CustomModal
        open={open}
        onClose={onClose}
        title="Choose Your Avatar"
        icon={<FontAwesomeIcon icon={faUser} />}
        maxWidth="lg"
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="body1" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
            Select an avatar that represents you in the karaoke community!
          </Typography>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Avatar Grid */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {availableAvatars.map((avatar) => {
                  const isSelected = selectedAvatar === avatar.id;
                  const equippedAvatar = userStore.getEquippedAvatar();
                  const isCurrentlyEquipped = equippedAvatar?.avatarId === avatar.id;

                  return (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={avatar.id}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          border: isSelected
                            ? `2px solid ${theme.palette.primary.main}`
                            : '2px solid transparent',
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: 4,
                          },
                          position: 'relative',
                        }}
                        onClick={() => handleAvatarSelect(avatar.id)}
                      >
                        <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                          {/* Currently Equipped Badge */}
                          {isCurrentlyEquipped && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                backgroundColor: theme.palette.success.main,
                                color: 'white',
                                borderRadius: '50%',
                                width: 20,
                                height: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                              }}
                            >
                              ✓
                            </Box>
                          )}

                          {/* Avatar Image */}
                          <Box
                            sx={{
                              width: 60,
                              height: 60,
                              mx: 'auto',
                              mb: 1,
                              borderRadius: 2,
                              overflow: 'hidden',
                              backgroundColor: 'background.default',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {avatar.imageUrl ? (
                              <img
                                src={avatar.imageUrl}
                                alt={avatar.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                                onError={(e) => {
                                  console.error(`Failed to load avatar image: ${avatar.imageUrl}`);
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <FontAwesomeIcon icon={faUser} color={theme.palette.text.secondary} />
                            )}
                          </Box>

                          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                            {avatar.name}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              {/* No avatars message */}
              {availableAvatars.length === 0 && !isLoadingAvatars && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No avatars available. Please try refreshing the page.
                  </Typography>
                </Box>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Button variant="outlined" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveAvatar}
                  disabled={isLoading || !selectedAvatar}
                  startIcon={isSaving ? <CircularProgress size={16} /> : undefined}
                >
                  {isSaving ? 'Saving...' : 'Save Avatar'}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </CustomModal>
    );
  },
);

export default AvatarSelectorModal;
