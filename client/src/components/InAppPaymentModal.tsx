import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
  Alert,
  Chip,
} from '@mui/material';
import { Close, CreditCard, Security, Check } from '@mui/icons-material';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { uiStore } from '../stores';

interface InAppPaymentModalProps {
  open: boolean;
  onClose: () => void;
  clientSecret: string;
  plan: 'ad_free' | 'premium';
  onSuccess: () => void;
}

const InAppPaymentModal: React.FC<InAppPaymentModalProps> = ({
  open,
  onClose,
  clientSecret,
  plan,
  onSuccess,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planDetails = {
    ad_free: {
      name: 'Ad-Free',
      price: '$0.99',
      description: 'Remove ads and enjoy a clean experience',
      features: [
        'No advertisements',
        'Clean browsing experience',
        'Support development',
      ],
    },
    premium: {
      name: 'Premium',
      price: '$1.99',
      description: 'Unlock all premium features',
      features: [
        'All ad-free features',
        'Unlimited song favorites',
        'Unlimited show favorites', 
        'Unlimited song previews',
        'Priority support',
      ],
    },
  };

  const currentPlan = planDetails[plan];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'An error occurred');
      setIsProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/settings?payment=success`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      setIsProcessing(false);
    } else {
      uiStore.addNotification('Payment successful! Welcome to ' + currentPlan.name, 'success');
      setIsProcessing(false);
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(51, 51, 51, 0.9) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CreditCard sx={{ color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'white' }}>
              Upgrade to {currentPlan.name}
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={3}>
          {/* Plan Details */}
          <Box
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                {currentPlan.name} Plan
              </Typography>
              <Chip 
                label={`${currentPlan.price}/month`}
                color="primary"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
              {currentPlan.description}
            </Typography>
            <Stack spacing={1}>
              {currentPlan.features.map((feature, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Check sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    {feature}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />

          {/* Payment Form */}
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <PaymentElement />
              </Box>

              {error && (
                <Alert severity="error" sx={{ backgroundColor: 'rgba(211, 47, 47, 0.1)' }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                <Security sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Secure payment powered by Stripe
                </Typography>
              </Box>

              <Stack direction="row" spacing={2}>
                <Button
                  onClick={onClose}
                  variant="outlined"
                  fullWidth
                  sx={{ 
                    borderColor: 'rgba(255,255,255,0.3)', 
                    color: 'white',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.5)',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={!stripe || isProcessing}
                  sx={{ 
                    fontWeight: 600,
                    '&:disabled': {
                      backgroundColor: 'rgba(25, 118, 210, 0.3)',
                    }
                  }}
                >
                  {isProcessing ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      Processing...
                    </Box>
                  ) : (
                    `Pay ${currentPlan.price}/month`
                  )}
                </Button>
              </Stack>
            </Stack>
          </form>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default InAppPaymentModal;