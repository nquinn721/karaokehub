import { faCheck, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Grid,
  Typography,
  useTheme,
} from '@mui/material';
import { adminStore, uiStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import CustomModal from './CustomModal';

interface AvatarData {
  id: string;
  name: string;
  description?: string;
  type: string;
  rarity: string;
  imageUrl: string;
  coinPrice: number;
  isFree: boolean;
  isAvailable: boolean;
}

interface AvatarSelectionModalProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
}

const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = observer(
  ({ open, onClose, user }) => {
    const theme = useTheme();
    const [avatars, setAvatars] = useState<AvatarData[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
      if (open) {
        loadAvatars();
      }
    }, [open]);

    const loadAvatars = async () => {
      try {
        setLoading(true);
        const avatarData = await adminStore.getAvailableAvatars();
        setAvatars(avatarData);
      } catch (error) {
        console.error('Failed to load avatars:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleAssignAvatar = async () => {
      if (!selectedAvatar || !user) return;

      try {
        setAssigning(true);
        await adminStore.assignAvatarToUser(user.id, selectedAvatar);
        uiStore.addNotification('Avatar assigned successfully!', 'success');
        onClose();
      } catch (error) {
        console.error('Failed to assign avatar:', error);
        uiStore.addNotification('Failed to assign avatar. Please try again.', 'error');
      } finally {
        setAssigning(false);
      }
    };

    const getRarityColor = (rarity: string) => {
      switch (rarity.toLowerCase()) {
        case 'common':
          return theme.palette.grey[500];
        case 'uncommon':
          return theme.palette.success.main;
        case 'rare':
          return theme.palette.info.main;
        case 'epic':
          return theme.palette.secondary.main;
        case 'legendary':
          return theme.palette.warning.main;
        default:
          return theme.palette.grey[500];
      }
    };

    return (
      <CustomModal
        open={open}
        onClose={onClose}
        title={`Change Avatar for ${user?.name || 'User'}`}
        icon={<FontAwesomeIcon icon={faUser} />}
        maxWidth="md"
      >
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {avatars.map((avatar) => (
                <Grid item xs={6} sm={4} md={3} key={avatar.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      border:
                        selectedAvatar === avatar.id
                          ? `2px solid ${theme.palette.primary.main}`
                          : '2px solid transparent',
                      transform: selectedAvatar === avatar.id ? 'scale(1.02)' : 'scale(1)',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: theme.shadows[8],
                      },
                    }}
                    onClick={() => setSelectedAvatar(avatar.id)}
                  >
                    <CardMedia
                      component="img"
                      height="120"
                      image={avatar.imageUrl}
                      alt={avatar.name}
                      sx={{
                        objectFit: 'contain',
                        backgroundColor: theme.palette.grey[50],
                      }}
                    />
                    <CardContent sx={{ p: 1.5, pb: '12px !important' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {avatar.name}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: getRarityColor(avatar.rarity),
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          {avatar.rarity}
                        </Typography>
                        {avatar.isFree ? (
                          <Typography
                            variant="caption"
                            color="success.main"
                            sx={{ fontWeight: 600 }}
                          >
                            FREE
                          </Typography>
                        ) : (
                          <Typography
                            variant="caption"
                            color="warning.main"
                            sx={{ fontWeight: 600 }}
                          >
                            {avatar.coinPrice} 🪙
                          </Typography>
                        )}
                      </Box>
                      {avatar.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {avatar.description.length > 50
                            ? `${avatar.description.substring(0, 47)}...`
                            : avatar.description}
                        </Typography>
                      )}
                    </CardContent>
                    {selectedAvatar === avatar.id && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: theme.palette.primary.main,
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                        }}
                      >
                        <FontAwesomeIcon icon={faCheck} size="xs" />
                      </Box>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 2,
                pt: 2,
                borderTop: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Button onClick={onClose} variant="outlined">
                Cancel
              </Button>
              <Button
                onClick={handleAssignAvatar}
                variant="contained"
                disabled={!selectedAvatar || assigning}
                startIcon={assigning ? <CircularProgress size={16} /> : undefined}
              >
                {assigning ? 'Assigning...' : 'Assign Avatar'}
              </Button>
            </Box>
          </>
        )}
      </CustomModal>
    );
  },
);

export default AvatarSelectionModal;
