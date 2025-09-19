import { faCoins, faMicrophone, faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  alpha,
  Box,
  Button,
  CardMedia,
  Chip,
  DialogActions,
  Divider,
  Typography,
  useTheme,
} from '@mui/material';
import { Microphone } from '@stores/StoreStore';
import { formatNumber, safeSubtract, toNumber } from '@utils/numberUtils';
import React from 'react';
import CustomModal from './CustomModal';

interface MicrophonePurchaseModalProps {
  open: boolean;
  onClose: () => void;
  microphone: Microphone | null;
  userCoins: number;
  isLoading: boolean;
  onConfirmPurchase: () => void;
}

const MicrophonePurchaseModal: React.FC<MicrophonePurchaseModalProps> = ({
  open,
  onClose,
  microphone,
  userCoins,
  isLoading,
  onConfirmPurchase,
}) => {
  const theme = useTheme();

  if (!microphone) return null;

  const canAfford = userCoins >= toNumber(microphone.coinPrice);
  const remainingCoins = safeSubtract(userCoins, microphone.coinPrice);

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return theme.palette.warning.main;
      case 'epic':
        return theme.palette.secondary.main;
      case 'rare':
        return theme.palette.primary.main;
      case 'uncommon':
        return theme.palette.info.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  return (
    <CustomModal
      open={open}
      onClose={onClose}
      title="Confirm Purchase"
      maxWidth="sm"
      icon={<FontAwesomeIcon icon={faShoppingCart} />}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Microphone Preview */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            p: 2,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: 2,
              overflow: 'hidden',
              background: theme.palette.background.paper,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <CardMedia
              component="img"
              image={microphone.imageUrl}
              alt={microphone.name}
              sx={{
                width: '80%',
                height: '80%',
                objectFit: 'contain',
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="h3" gutterBottom>
              {microphone.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {microphone.description}
            </Typography>
            <Chip
              label={microphone.rarity}
              size="small"
              sx={{
                backgroundColor: alpha(getRarityColor(microphone.rarity), 0.1),
                color: getRarityColor(microphone.rarity),
                fontWeight: 'bold',
                textTransform: 'capitalize',
              }}
            />
          </Box>
        </Box>

        <Divider />

        {/* Purchase Details */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography
            variant="h6"
            component="h4"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <FontAwesomeIcon icon={faMicrophone} style={{ color: theme.palette.primary.main }} />
            Purchase Summary
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1">Item Price:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={faCoins} style={{ color: '#FFD700', fontSize: '16px' }} />
              <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
                {formatNumber(microphone.coinPrice)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1">Your Current Coins:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={faCoins} style={{ color: '#FFD700', fontSize: '16px' }} />
              <Typography variant="body1" component="span">
                {userCoins}
              </Typography>
            </Box>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              Remaining After Purchase:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={faCoins} style={{ color: '#FFD700', fontSize: '16px' }} />
              <Typography
                variant="h6"
                component="span"
                sx={{
                  fontWeight: 'bold',
                  color: canAfford ? theme.palette.success.main : theme.palette.error.main,
                }}
              >
                {canAfford ? remainingCoins : 'Insufficient Coins'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {!canAfford && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            }}
          >
            <Typography variant="body2" color="error" sx={{ fontWeight: 'bold' }}>
              You need {safeSubtract(microphone.coinPrice, userCoins)} more coins to purchase this
              microphone.
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              Visit the Coin Packages tab to purchase more coins.
            </Typography>
          </Box>
        )}

        {/* Action Buttons */}
        <DialogActions sx={{ px: 0, pt: 2 }}>
          <Button onClick={onClose} variant="outlined" size="large">
            Cancel
          </Button>
          <Button
            onClick={onConfirmPurchase}
            variant="contained"
            size="large"
            disabled={!canAfford || isLoading}
            sx={{
              minWidth: 120,
              background: canAfford ? 'linear-gradient(45deg, #2196F3, #21CBF3)' : undefined,
            }}
          >
            {isLoading ? 'Purchasing...' : canAfford ? 'Confirm Purchase' : 'Insufficient Coins'}
          </Button>
        </DialogActions>
      </Box>
    </CustomModal>
  );
};

export default MicrophonePurchaseModal;
