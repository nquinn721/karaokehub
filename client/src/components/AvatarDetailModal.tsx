import { faCoins, faShoppingCart, faStar, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  alpha,
  Box,
  Button,
  CardMedia,
  Chip,
  CircularProgress,
  DialogActions,
  Divider,
  Grid,
  Typography,
  useTheme,
} from '@mui/material';
import { Avatar } from '@stores/StoreStore';
import { formatNumber, toNumber } from '@utils/numberUtils';
import React from 'react';
import CustomModal from './CustomModal';

interface AvatarDetailModalProps {
  open: boolean;
  onClose: () => void;
  avatar: Avatar | null;
  userCoins: number;
  isLoading: boolean;
  onPurchase: (avatarId: string) => void;
  isOwned: boolean;
}

const AvatarDetailModal: React.FC<AvatarDetailModalProps> = ({
  open,
  onClose,
  avatar,
  userCoins,
  isLoading,
  onPurchase,
  isOwned,
}) => {
  const theme = useTheme();

  if (!avatar) return null;

  const canAfford = userCoins >= toNumber(avatar.coinPrice);

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return '#FFD700'; // Gold
      case 'epic':
        return '#9C27B0'; // Purple
      case 'rare':
        return '#2196F3'; // Blue
      case 'uncommon':
        return '#4CAF50'; // Green
      default:
        return '#9E9E9E'; // Grey
    }
  };

  const getRarityStars = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return 5;
      case 'epic':
        return 4;
      case 'rare':
        return 3;
      case 'uncommon':
        return 2;
      default:
        return 1;
    }
  };

  const handlePurchaseClick = () => {
    if (avatar && !isOwned && canAfford) {
      onPurchase(avatar.id);
    }
  };

  return (
    <CustomModal
      open={open}
      onClose={onClose}
      title={avatar.name}
      icon={<FontAwesomeIcon icon={faUser} />}
      maxWidth="md"
    >
      <Box sx={{ p: 0 }}>
        <Grid container spacing={3}>
          {/* Image Section */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                position: 'relative',
                height: 400,
                borderRadius: 2,
                overflow: 'hidden',
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${alpha(getRarityColor(avatar.rarity), 0.3)}`,
                boxShadow: `0 0 20px ${alpha(getRarityColor(avatar.rarity), 0.2)}`,
              }}
            >
              {isOwned && (
                <Chip
                  label="Owned"
                  color="success"
                  size="medium"
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 1,
                    fontWeight: 'bold',
                  }}
                />
              )}
              <CardMedia
                component="img"
                image={avatar.imageUrl}
                alt={avatar.name}
                sx={{
                  width: '85%',
                  height: '85%',
                  objectFit: 'contain',
                  filter: isOwned ? 'grayscale(0.3)' : 'none',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              />
            </Box>
          </Grid>

          {/* Details Section */}
          <Grid item xs={12} md={6}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Rarity */}
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={avatar.rarity}
                  sx={{
                    backgroundColor: alpha(getRarityColor(avatar.rarity), 0.1),
                    color: getRarityColor(avatar.rarity),
                    border: `1px solid ${alpha(getRarityColor(avatar.rarity), 0.3)}`,
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    fontSize: '0.875rem',
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <FontAwesomeIcon
                      key={index}
                      icon={faStar}
                      style={{
                        color:
                          index < getRarityStars(avatar.rarity)
                            ? getRarityColor(avatar.rarity)
                            : '#E0E0E0',
                        fontSize: '16px',
                        marginRight: '2px',
                      }}
                    />
                  ))}
                  <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                    {getRarityStars(avatar.rarity)}/5 stars
                  </Typography>
                </Box>
              </Box>

              {/* Description */}
              <Box sx={{ mb: 3, flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Description
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {avatar.description || 'A unique avatar to represent your karaoke personality.'}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Price Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Price
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon icon={faCoins} style={{ color: '#FFD700', fontSize: '24px' }} />
                  <Typography
                    variant="h4"
                    component="span"
                    sx={{ fontWeight: 'bold', color: 'primary.main' }}
                  >
                    {formatNumber(avatar.coinPrice)}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    coins
                  </Typography>
                </Box>
              </Box>

              {/* User Coins Display */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Your coins:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon icon={faCoins} style={{ color: '#FFD700', fontSize: '16px' }} />
                  <Typography
                    variant="h6"
                    component="span"
                    sx={{
                      fontWeight: 'bold',
                      color: canAfford ? 'success.main' : 'error.main',
                    }}
                  >
                    {formatNumber(userCoins)}
                  </Typography>
                </Box>
                {!canAfford && !isOwned && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    You need {formatNumber(toNumber(avatar.coinPrice) - userCoins)} more coins
                  </Typography>
                )}
              </Box>

              {/* Insufficient Coins Warning */}
              {!canAfford && !isOwned && (
                <Box
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                  }}
                >
                  <Typography variant="body2" color="error" sx={{ fontWeight: 'bold' }}>
                    Insufficient coins to purchase this avatar.
                  </Typography>
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    Visit the Coin Packages tab to purchase more coins.
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <DialogActions sx={{ px: 0, pt: 3, gap: 2 }}>
          <Button onClick={onClose} variant="outlined" size="large">
            Close
          </Button>
          {!isOwned && (
            <Button
              onClick={handlePurchaseClick}
              variant="contained"
              size="large"
              disabled={!canAfford || isLoading}
              startIcon={
                isLoading ? (
                  <CircularProgress size={16} />
                ) : (
                  <FontAwesomeIcon icon={faShoppingCart} />
                )
              }
              sx={{
                minWidth: 150,
                fontWeight: 'bold',
                background: canAfford ? 'linear-gradient(45deg, #2196F3, #21CBF3)' : undefined,
                '&:hover': {
                  background: canAfford ? 'linear-gradient(45deg, #1976D2, #0288D1)' : undefined,
                },
              }}
            >
              {isLoading ? 'Purchasing...' : canAfford ? 'Purchase' : 'Insufficient Coins'}
            </Button>
          )}
          {isOwned && (
            <Button
              variant="contained"
              size="large"
              disabled
              sx={{
                minWidth: 150,
                fontWeight: 'bold',
              }}
            >
              Owned
            </Button>
          )}
        </DialogActions>
      </Box>
    </CustomModal>
  );
};

export default AvatarDetailModal;
