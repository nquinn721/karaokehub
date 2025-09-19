import { faCoins, faCreditCard, faCrown, faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  alpha,
  Box,
  Button,
  Chip,
  DialogActions,
  Divider,
  Typography,
  useTheme,
} from '@mui/material';
import { CoinPackage } from '@stores/StoreStore';
import { formatNumber, formatPrice, isGreaterThan, safeAdd } from '@utils/numberUtils';
import React from 'react';
import CustomModal from './CustomModal';

interface CoinPackagePurchaseModalProps {
  open: boolean;
  onClose: () => void;
  coinPackage: CoinPackage | null;
  isLoading: boolean;
  onConfirmPurchase: () => void;
}

const CoinPackagePurchaseModal: React.FC<CoinPackagePurchaseModalProps> = ({
  open,
  onClose,
  coinPackage,
  isLoading,
  onConfirmPurchase,
}) => {
  const theme = useTheme();

  if (!coinPackage) return null;

  const totalCoins = safeAdd(coinPackage.coinAmount, coinPackage.bonusCoins);
  const isPopular = coinPackage.name.toLowerCase().includes('premium');

  return (
    <CustomModal
      open={open}
      onClose={onClose}
      title="Confirm Purchase"
      maxWidth="sm"
      icon={<FontAwesomeIcon icon={faShoppingCart} />}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Package Preview */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            p: 3,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
            border: isPopular
              ? `2px solid ${theme.palette.primary.main}`
              : `1px solid ${theme.palette.divider}`,
            position: 'relative',
          }}
        >
          {isPopular && (
            <Chip
              icon={<FontAwesomeIcon icon={faCrown} />}
              label="Most Popular"
              color="primary"
              sx={{
                position: 'absolute',
                top: -10,
                right: 16,
                fontWeight: 'bold',
              }}
            />
          )}

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" component="h3" gutterBottom>
              {coinPackage.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {coinPackage.description}
            </Typography>

            <Box sx={{ my: 2 }}>
              <Typography variant="h3" component="div" color="primary" sx={{ fontWeight: 'bold' }}>
                <FontAwesomeIcon icon={faCoins} style={{ marginRight: '12px', color: '#FFD700' }} />
                {formatNumber(coinPackage.coinAmount)}
              </Typography>
              {isGreaterThan(coinPackage.bonusCoins, 0) && (
                <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold', mt: 1 }}>
                  +{formatNumber(coinPackage.bonusCoins)} bonus coins!
                </Typography>
              )}
              {isGreaterThan(coinPackage.bonusCoins, 0) && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Total: {formatNumber(totalCoins)} coins
                </Typography>
              )}
            </Box>
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
            <FontAwesomeIcon icon={faCreditCard} style={{ color: theme.palette.primary.main }} />
            Payment Summary
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1">Base Coins:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={faCoins} style={{ color: '#FFD700', fontSize: '16px' }} />
              <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
                {formatNumber(coinPackage.coinAmount)}
              </Typography>
            </Box>
          </Box>

          {isGreaterThan(coinPackage.bonusCoins, 0) && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1" color="success.main">
                Bonus Coins:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FontAwesomeIcon icon={faCoins} style={{ color: '#FFD700', fontSize: '16px' }} />
                <Typography
                  variant="h6"
                  component="span"
                  sx={{ fontWeight: 'bold', color: 'success.main' }}
                >
                  +{formatNumber(coinPackage.bonusCoins)}
                </Typography>
              </Box>
            </Box>
          )}

          <Divider />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Total Price:
            </Typography>
            <Typography
              variant="h4"
              component="span"
              sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}
            >
              ${formatPrice(coinPackage.priceUSD)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              You'll Receive:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={faCoins} style={{ color: '#FFD700', fontSize: '20px' }} />
              <Typography
                variant="h4"
                component="span"
                sx={{ fontWeight: 'bold', color: 'success.main' }}
              >
                {formatNumber(totalCoins)}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.info.main, 0.1),
            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
          }}
        >
          <Typography
            variant="body2"
            color="info.main"
            sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <FontAwesomeIcon icon={faCreditCard} />
            Secure Payment by Stripe
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Your payment information is encrypted and secure. You'll be redirected to complete your
            purchase.
          </Typography>
        </Box>

        {/* Action Buttons */}
        <DialogActions sx={{ px: 0, pt: 2 }}>
          <Button onClick={onClose} variant="outlined" size="large">
            Cancel
          </Button>
          <Button
            onClick={onConfirmPurchase}
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{
              minWidth: 140,
              background: 'linear-gradient(45deg, #2196F3, #21CBF3)',
            }}
          >
            {isLoading ? 'Processing...' : 'Continue to Payment'}
          </Button>
        </DialogActions>
      </Box>
    </CustomModal>
  );
};

export default CoinPackagePurchaseModal;
