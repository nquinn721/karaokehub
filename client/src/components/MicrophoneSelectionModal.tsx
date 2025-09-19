import { CoinDisplay } from '@components/CoinDisplay';
import CustomModal from '@components/CustomModal';
import { faCoins, faMicrophone } from '@fortawesome/free-solid-svg-icons';
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
import { Microphone, userStore } from '@stores/UserStore';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface MicrophoneSelectionModalProps {
  open: boolean;
  onClose: () => void;
}

export const MicrophoneSelectionModal: React.FC<MicrophoneSelectionModalProps> = observer(
  ({ open, onClose }) => {
    const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [availableMicrophones, setAvailableMicrophones] = useState<Microphone[]>([]);
    const [isLoadingMicrophones, setIsLoadingMicrophones] = useState<boolean>(false);
    const theme = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
      if (open) {
        console.log('🎤 MicrophoneSelectionModal: Modal opened, fetching data...');

        // Fetch user's coins and available microphones
        storeStore.fetchUserCoins();
        loadAvailableMicrophones();
      }
    }, [open]);

    const loadAvailableMicrophones = async () => {
      setIsLoadingMicrophones(true);
      try {
        console.log('🎤 MicrophoneSelectionModal: Calling getAvailableMicrophones...');
        const microphones = await userStore.getAvailableMicrophones();
        setAvailableMicrophones(microphones);
        console.log('🎤 MicrophoneSelectionModal: Available microphones:', microphones);
        console.log(
          '🎤 MicrophoneSelectionModal: Available microphones count:',
          microphones.length,
        );

        // Set the currently equipped microphone as selected
        const equipped = userStore.getEquippedMicrophone();
        console.log('🎤 MicrophoneSelectionModal: equipped microphone:', equipped);
        if (equipped) {
          setSelectedMicrophone(equipped.microphoneId);
        } else if (microphones.length > 0) {
          setSelectedMicrophone(microphones[0].id);
        }
      } catch (error) {
        console.error('🎤 MicrophoneSelectionModal: Error loading available microphones:', error);
      } finally {
        setIsLoadingMicrophones(false);
      }
    };

    const handleMicrophoneSelect = (microphoneId: string) => {
      setSelectedMicrophone(microphoneId);
    };

    const handleSaveMicrophone = async () => {
      setIsSaving(true);
      try {
        const success = await userStore.updateEquippedMicrophone(selectedMicrophone);
        if (success) {
          console.log('Successfully equipped microphone:', selectedMicrophone);
          onClose();
        } else {
          // Revert selection if failed
          const equipped = userStore.getEquippedMicrophone();
          if (equipped) {
            setSelectedMicrophone(equipped.microphoneId);
          }
        }
      } catch (error) {
        console.error('Error saving microphone:', error);
        // Revert selection if failed
        const equipped = userStore.getEquippedMicrophone();
        if (equipped) {
          setSelectedMicrophone(equipped.microphoneId);
        }
      } finally {
        setIsSaving(false);
      }
    };

    const handleCoinsClick = () => {
      onClose();
      navigate('/store');
    };

    return (
      <CustomModal
        open={open}
        onClose={onClose}
        title="Choose Your Microphone"
        icon={<FontAwesomeIcon icon={faMicrophone} />}
        maxWidth="md"
      >
        <Box sx={{ p: 2 }}>
          {/* Coin Display Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              p: 2,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Select your preferred microphone
            </Typography>
            <Box
              onClick={handleCoinsClick}
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            >
              <CoinDisplay size="medium" />
            </Box>
          </Box>

          {/* Info Text */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            Choose from your collection of microphones. All basic microphones are included for free!
          </Typography>

          {/* Loading State */}
          {isLoadingMicrophones ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Debug info */}
              {(() => {
                console.log(
                  '🎤 MicrophoneSelectionModal: Rendering, userMicrophones:',
                  userStore.userMicrophones,
                );
                console.log(
                  '🎤 MicrophoneSelectionModal: isLoadingMicrophones:',
                  isLoadingMicrophones,
                );
                console.log('🎤 MicrophoneSelectionModal: error:', userStore.error);
                return null;
              })()}

              {/* Show error if any */}
              {userStore.error && (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'error.main',
                    color: 'error.contrastText',
                    borderRadius: 1,
                    mb: 2,
                  }}
                >
                  <Typography variant="body2">Error: {userStore.error}</Typography>
                </Box>
              )}

              {/* Show debug count */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Found {availableMicrophones.length} microphones in collection
              </Typography>

              {/* Microphone Grid */}
              <Grid container spacing={2}>
                {availableMicrophones.map((mic) => {
                  const isSelected = selectedMicrophone === mic.id;
                  const equippedMicrophone = userStore.getEquippedMicrophone();
                  const isCurrentlyEquipped = equippedMicrophone?.microphoneId === mic.id;
                  return (
                    <Grid item xs={6} sm={3} key={mic.id}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          border: isSelected
                            ? `2px solid ${theme.palette.primary.main}`
                            : isCurrentlyEquipped
                              ? `2px solid ${theme.palette.success.main}`
                              : '2px solid transparent',
                          background: isSelected
                            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.main, 0.05)})`
                            : isCurrentlyEquipped
                              ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)}, ${alpha(theme.palette.success.main, 0.05)})`
                              : 'background.paper',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: theme.shadows[8],
                            border: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                          },
                        }}
                        onClick={() => handleMicrophoneSelect(mic.id)}
                      >
                        <Box
                          sx={{
                            height: 120,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.5)}, ${alpha(theme.palette.background.paper, 0.5)})`,
                            position: 'relative',
                          }}
                        >
                          {(isSelected || isCurrentlyEquipped) && (
                            <Chip
                              label={isCurrentlyEquipped ? 'Equipped' : 'Selected'}
                              color={isCurrentlyEquipped ? 'success' : 'primary'}
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                fontWeight: 'bold',
                                fontSize: '0.7rem',
                              }}
                            />
                          )}
                          <Box
                            component="img"
                            src={mic.imageUrl}
                            alt={mic.name}
                            sx={{
                              width: '70%',
                              height: '70%',
                              objectFit: 'contain',
                              filter: isSelected ? 'none' : 'grayscale(0.2)',
                              transition: 'filter 0.3s ease',
                            }}
                          />
                        </Box>
                        <CardContent sx={{ p: 2, textAlign: 'center' }}>
                          <Typography
                            variant="h6"
                            component="h3"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              mb: 0.5,
                              color: isSelected ? 'primary.main' : 'text.primary',
                            }}
                          >
                            {mic.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontSize: '0.8rem', mb: 1 }}
                          >
                            {mic.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 3, mb: 2 }}>
                <Button variant="outlined" onClick={onClose} disabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveMicrophone}
                  disabled={isSaving || !selectedMicrophone}
                  startIcon={isSaving ? <CircularProgress size={16} /> : undefined}
                >
                  {isSaving ? 'Saving...' : 'Save Microphone'}
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
              Want More Microphones?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Visit our store to discover premium microphones with unique designs and rarities!
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

export default MicrophoneSelectionModal;
