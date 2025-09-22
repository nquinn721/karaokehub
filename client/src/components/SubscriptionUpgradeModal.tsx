import { faCheck, faCrown, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';
import { apiStore, uiStore } from '@stores/index';
import React, { useState } from 'react';
import CustomModal from './CustomModal';

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
      uiStore.addNotification(
        `Upgrade Error: ${error.response?.data?.message || error.message || 'Failed to start upgrade process'}`,
        'error',
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
      <CustomModal
        open={open}
        onClose={onClose}
        title="Premium Member"
        icon={<FontAwesomeIcon icon={faCrown} />}
        maxWidth="sm"
      >
        <Typography variant="body1" color="text.secondary">
          You're already on the highest tier! Thank you for being a premium member.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button onClick={onClose}>Close</Button>
        </Box>
      </CustomModal>
    );
  }

  return (
    <CustomModal
      open={open}
      onClose={onClose}
      title={title}
      icon={<FontAwesomeIcon icon={faCrown} />}
      maxWidth="lg"
    >
      {/* Welcome Message */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.success.main}15 0%, ${theme.palette.primary.main}10 100%)`,
          borderRadius: 2,
          p: 2,
          mb: 3,
          border: `1px solid ${theme.palette.success.main}30`,
        }}
      >
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          {description}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ready to rock the stage? Here's what's happening in your karaoke world.
        </Typography>
      </Box>

      {/* Current Plan Display */}
      {currentPlan === 'free' && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Typography component="span" sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
              SUBSCRIPTION
            </Typography>
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              background: theme.palette.background.paper,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ color: theme.palette.warning.main, fontWeight: 600 }}>
                Free
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upgrade available
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Upgrade Plans */}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          flexDirection: { xs: 'column', md: 'row' },
          mb: 3,
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
                : `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              '&:hover': {
                boxShadow: `0 8px 25px ${plan.popular ? theme.palette.secondary.main : theme.palette.primary.main}20`,
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease-in-out',
            }}
          >
            {plan.popular && (
              <Chip
                label="Most Popular"
                color="secondary"
                size="small"
                sx={{
                  position: 'absolute',
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 1,
                  fontWeight: 600,
                }}
              />
            )}

            <CardContent sx={{ p: 3 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography
                  variant="h4"
                  fontWeight={700}
                  sx={{
                    color: plan.popular ? theme.palette.secondary.main : theme.palette.primary.main,
                    mb: 1,
                  }}
                >
                  {plan.name}
                </Typography>
                <Typography variant="h2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                  ${plan.price.toFixed(2)}
                  <Typography
                    component="span"
                    variant="h6"
                    color="text.secondary"
                    sx={{ fontWeight: 400 }}
                  >
                    /month
                  </Typography>
                </Typography>
                {plan.originalPrice && (
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ textDecoration: 'line-through' }}
                  >
                    ${plan.originalPrice.toFixed(2)}/month
                  </Typography>
                )}
              </Box>

              <List dense sx={{ mb: 3 }}>
                {plan.features.map((feature, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <FontAwesomeIcon
                        icon={faCheck}
                        style={{
                          color: plan.popular
                            ? theme.palette.secondary.main
                            : theme.palette.success.main,
                          fontSize: '16px',
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={feature}
                      primaryTypographyProps={{
                        variant: 'body1',
                        fontWeight: 500,
                      }}
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
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          textAlign: 'center',
          p: 2,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Cancel anytime. No long-term commitments. 30-day money-back guarantee.
        </Typography>
        <Button
          onClick={onClose}
          startIcon={<FontAwesomeIcon icon={faTimes} />}
          variant="text"
          sx={{ mt: 1 }}
        >
          Maybe Later
        </Button>
      </Box>
    </CustomModal>
  );
};
