import { faCheck, faCrown, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';
import { apiStore } from '@stores/index';
import React, { useState } from 'react';

interface SubscriptionUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan?: 'free' | 'ad_free' | 'premium';
  title?: string;
  description?: string;
}

interface PricingPlan {
  id: 'ad_free' | 'premium';
  name: string;
  price: number;
  originalPrice?: number;
  features: string[];
  popular?: boolean;
}

export const SubscriptionUpgradeModal: React.FC<SubscriptionUpgradeModalProps> = ({
  open,
  onClose,
  currentPlan = 'free',
  title = 'Upgrade Your Experience',
  description = 'Choose the perfect plan to unlock premium features and enhance your karaoke experience.',
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const plans: PricingPlan[] = [
    {
      id: 'ad_free',
      name: 'Ad-Free',
      price: 0.99,
      features: [
        'Remove all advertisements',
        'Clean browsing experience',
        'Support development',
        'All free features included',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 1.99,
      popular: true,
      features: [
        'All Ad-Free features',
        'Unlimited song favorites',
        'Unlimited show favorites',
        'Unlimited song previews',
        'Priority customer support',
        'Advanced features access',
      ],
    },
  ];

  const handleUpgrade = async (planId: 'ad_free' | 'premium') => {
    setLoading(true);
    try {
      const response = await apiStore.post('/subscription/create-checkout-session', {
        plan: planId,
      });

      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error: any) {
      console.error('Upgrade error:', error);
      alert(
        `Upgrade Error: ${error.response?.data?.message || error.message || 'Failed to start upgrade process'}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const getAvailablePlans = () => {
    // Show plans higher than current plan
    if (currentPlan === 'free') {
      return plans;
    } else if (currentPlan === 'ad_free') {
      return plans.filter((plan) => plan.id === 'premium');
    }
    return []; // Already on highest plan
  };

  const availablePlans = getAvailablePlans();

  if (availablePlans.length === 0) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FontAwesomeIcon
              icon={faCrown}
              style={{ fontSize: '24px', color: theme.palette.secondary.main }}
            />
            <Typography variant="h5" component="div" fontWeight={600}>
              Premium Member
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="text.secondary">
            You're already on the highest tier! Thank you for being a premium member.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 1, sm: 2 },
          maxHeight: { xs: 'calc(100vh - 16px)', sm: 'calc(100vh - 64px)' },
          width: { xs: 'calc(100vw - 16px)', sm: 'auto' },
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FontAwesomeIcon
            icon={faCrown}
            style={{ fontSize: '24px', color: theme.palette.secondary.main }}
          />
          <Typography variant="h5" component="div" fontWeight={600}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {description}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {availablePlans.map((plan) => (
            <Card
              key={plan.id}
              sx={{
                flex: 1,
                position: 'relative',
                border: plan.popular
                  ? `2px solid ${theme.palette.secondary.main}`
                  : '1px solid #e0e0e0',
                '&:hover': {
                  boxShadow: 4,
                },
              }}
            >
              {plan.popular && (
                <Chip
                  label="Most Popular"
                  color="secondary"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: 16,
                    zIndex: 1,
                  }}
                />
              )}
              <CardContent>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="h5" fontWeight={700}>
                    {plan.name}
                  </Typography>
                  <Typography variant="h3" color="primary" fontWeight={700}>
                    ${plan.price.toFixed(2)}
                    <Typography component="span" variant="body2" color="text.secondary">
                      /month
                    </Typography>
                  </Typography>
                  {plan.originalPrice && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textDecoration: 'line-through' }}
                    >
                      ${plan.originalPrice.toFixed(2)}/month
                    </Typography>
                  )}
                </Box>

                <List dense>
                  {plan.features.map((feature, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <FontAwesomeIcon
                          icon={faCheck}
                          style={{ color: '#4caf50', fontSize: '14px' }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>

                <Button
                  fullWidth
                  variant={plan.popular ? 'contained' : 'outlined'}
                  color={plan.popular ? 'secondary' : 'primary'}
                  size="large"
                  disabled={loading}
                  onClick={() => handleUpgrade(plan.id)}
                  sx={{ mt: 2, py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : `Upgrade to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Cancel anytime. No long-term commitments. 30-day money-back guarantee.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<FontAwesomeIcon icon={faTimes} />}>
          Maybe Later
        </Button>
      </DialogActions>
    </Dialog>
  );
};
