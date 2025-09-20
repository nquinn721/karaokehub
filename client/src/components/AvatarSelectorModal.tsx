import { CoinDisplay } from '@components/CoinDisplay';
import { faCoins, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Typography,
  useTheme,
} from '@mui/material';
import { storeStore } from '@stores/StoreStore';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userStore } from '../stores';
import { Avatar } from '../stores/UserStore';
import AvatarDisplay3D from './AvatarDisplay3D';
import CustomModal from './CustomModal';

interface AvatarSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onAvatarSelect?: (avatarId: string) => void;
}

const AvatarSelectorModal: React.FC<AvatarSelectorModalProps> = observer(
  ({ open, onClose, onAvatarSelect }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [selectedAvatar, setSelectedAvatar] = useState<string>('alex');
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [availableAvatars, setAvailableAvatars] = useState<Avatar[]>([]);
    const [isLoadingAvatars, setIsLoadingAvatars] = useState<boolean>(false);

    // Load available avatars when modal opens
    useEffect(() => {
      if (open) {
        console.log('🎭 AvatarSelectorModal: Modal opened, fetching data...');

        // Fetch user's coins and available avatars
        storeStore.fetchUserCoins();
        loadAvailableAvatars();
      }
    }, [open]);

    const loadAvailableAvatars = async () => {
      setIsLoadingAvatars(true);
      try {
        console.log('🎭 AvatarSelectorModal: Calling getAvailableAvatars...');
        const avatars = await userStore.getAvailableAvatars();
        setAvailableAvatars(avatars);
        console.log('🎭 AvatarSelectorModal: Available avatars:', avatars);

        // Set currently equipped avatar as selected
        const equippedAvatar = userStore.getEquippedAvatar();
        console.log('🎭 AvatarSelectorModal: equipped avatar:', equippedAvatar);
        if (equippedAvatar) {
          setSelectedAvatar(equippedAvatar.avatarId);
        } else if (avatars.length > 0) {
          setSelectedAvatar(avatars[0].id);
        }
      } catch (error) {
        console.error('🎭 AvatarSelectorModal: Failed to load available avatars:', error);
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
          console.log('Successfully equipped avatar:', selectedAvatar);
          onAvatarSelect?.(selectedAvatar);
          onClose();
        } else {
          // Revert selection if failed
          const equippedAvatar = userStore.getEquippedAvatar();
          if (equippedAvatar) {
            setSelectedAvatar(equippedAvatar.avatarId);
          }
        }
      } catch (error) {
        console.error('Failed to update avatar:', error);
        // Revert selection if failed
        const equippedAvatar = userStore.getEquippedAvatar();
        if (equippedAvatar) {
          setSelectedAvatar(equippedAvatar.avatarId);
        }
      } finally {
        setIsSaving(false);
      }
    }, [selectedAvatar, onAvatarSelect, onClose]);

    const handleCoinsClick = () => {
      onClose();
      navigate('/store');
    };

    const isLoading = userStore.isLoading || isSaving || isLoadingAvatars;

    return (
      <CustomModal
        open={open}
        onClose={onClose}
        title="Choose Your Avatar"
        icon={<FontAwesomeIcon icon={faUser} />}
        maxWidth="lg"
      >
        <Box sx={{ p: 3, position: 'relative' }}>
          {/* Coin Display */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <CoinDisplay />
          </Box>

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
                  const equippedAvatar = userStore.getEquippedAvatar();
                  const isEquipped = equippedAvatar?.avatarId === avatar.id;
                  const isSelected = selectedAvatar === avatar.id;

                  return (
                    <Grid item xs={6} sm={4} md={4} lg={3} key={avatar.id}>
                      <Card
                        onClick={() => handleAvatarSelect(avatar.id)}
                        sx={{
                          cursor: 'pointer',
                          border: isSelected
                            ? `3px solid ${theme.palette.primary.main}`
                            : '2px solid transparent',
                          borderRadius: '16px',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: theme.shadows[8],
                          },
                          ...(isSelected && {
                            transform: 'translateY(-4px)',
                            boxShadow: theme.shadows[12],
                          }),
                        }}
                      >
                        <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                          {/* Avatar Display with bigger size */}
                          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                            <AvatarDisplay3D
                              width={140}
                              height={180}
                              avatarId={avatar.id}
                              show3D={true}
                              sx={{
                                borderRadius: '12px',
                                overflow: 'hidden',
                              }}
                            />
                          </Box>

                          {/* Avatar Info */}
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {avatar.name}
                          </Typography>

                          {/* Status Chips */}
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 1,
                              justifyContent: 'center',
                              flexWrap: 'wrap',
                            }}
                          >
                            {isEquipped && (
                              <Chip
                                label="Equipped"
                                size="small"
                                color="success"
                                sx={{ fontWeight: 'bold' }}
                              />
                            )}
                            {avatar.price === 0 ? (
                              <Chip label="Free" size="small" color="primary" variant="outlined" />
                            ) : (
                              <Chip
                                label={`${avatar.coinPrice} coins`}
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            )}
                            <Chip
                              label={avatar.rarity}
                              size="small"
                              variant="outlined"
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={onClose} disabled={isSaving} sx={{ px: 3 }}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveAvatar}
                  disabled={isSaving || !selectedAvatar}
                  sx={{ px: 3 }}
                >
                  {isSaving ? <CircularProgress size={20} /> : 'Save Avatar'}
                </Button>
              </Box>
            </>
          )}

          {/* Want More Section */}
          <Box
            sx={{
              mt: 4,
              p: 3,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Want More Avatars?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Visit our store to discover premium avatars with unique designs and rarities!
            </Typography>
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faCoins} />}
              onClick={handleCoinsClick}
              sx={{
                px: 3,
                py: 1,
                fontWeight: 'bold',
                borderRadius: '12px',
              }}
            >
              Browse Store
            </Button>
          </Box>

          {/* Loading Overlay */}
          {isSaving && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: alpha(theme.palette.background.paper, 0.8),
                zIndex: 10,
              }}
            >
              <CircularProgress />
            </Box>
          )}
        </Box>
      </CustomModal>
    );
  },
);

export default AvatarSelectorModal;
