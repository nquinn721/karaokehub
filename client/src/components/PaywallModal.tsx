import {
  faAd,
  faCheck,
  faCrown,
  faHeart,
  faPlay,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
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
} from '@mui/material';
import { apiStore } from '@stores/index';
import React, { useState } from 'react';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature: 'favorites' | 'ad_removal' | 'music_preview';
  featureDescription?: string;
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  open,
  onClose,
  feature,
  featureDescription,
}) => {
  const [loading, setLoading] = useState(false);
  const plans: PricingPlan[] = [
    {
      id: 'ad_free',
      name: 'Ad-Free',
      price: 0.99,
      features: ['Remove all ads', 'Clean browsing experience', 'Support development'],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 1.99,
      features: [
        'All Ad-Free features',
        'Favorite songs & shows',
        'Play Music Snippets',
        'Priority support',
        'Advanced features',
      ],
    },
  ];

  const getFeatureIcon = (feature: string) => {
    switch (feature.toLowerCase()) {
      case 'favorites':
        return faHeart;
      case 'ad_removal':
        return faAd;
      case 'music_preview':
        return faPlay;
      default:
        return faCrown;
    }
  };

  const getFeatureTitle = (feature: string) => {
    switch (feature) {
      case 'favorites':
        return 'Favorite Songs & Shows';
      case 'ad_removal':
        return 'Remove Advertisements';
      case 'music_preview':
        return 'Play Song Clips';
      default:
        return 'Premium Feature';
    }
  };

  const getFeatureMessage = (feature: string) => {
    switch (feature) {
      case 'favorites':
        return 'You can save up to 5 songs as favorites. Upgrade to premium for unlimited song favorites plus show favorites!';
      case 'ad_removal':
        return 'Enjoy a clean, ad-free experience while browsing karaoke content.';
      case 'music_preview':
        return 'You have used all 10 free song previews! Upgrade to premium for unlimited 30-second song previews.';
      default:
        return 'This feature requires a premium subscription to access.';
    }
  };

  const handleSubscribe = async (planId: string) => {
    setLoading(true);
    try {
      const response = await apiStore.post(apiStore.endpoints.subscription.createCheckoutSession, {
        plan: planId,
      });

      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      // Handle error (show toast, etc.)
    } finally {
      setLoading(false);
    }
  };

  const getRecommendedPlan = () => {
    return feature === 'ad_removal' ? 'ad_free' : 'premium';
  };

  // Filter plans based on feature - only show premium for premium features
  const getAvailablePlans = () => {
    if (feature === 'favorites' || feature === 'music_preview') {
      // These are premium-only features, only show premium plan
      return plans.filter((plan) => plan.id === 'premium');
    }
    // For ad_removal, show both plans
    return plans;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={false}
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 1, sm: 2 },
          maxHeight: { xs: 'calc(100vh - 16px)', sm: 'calc(100vh - 64px)' },
          width: { xs: 'calc(100vw - 16px)', sm: 'auto' },
        },
      }}
    >
      <DialogTitle sx={{ pb: { xs: 1, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FontAwesomeIcon
            icon={getFeatureIcon(feature)}
            style={{ fontSize: '24px', color: '#f50057' }}
          />
          <Typography
            variant="h5"
            component="div"
            fontWeight={600}
            sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
          >
            {getFeatureTitle(feature)}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 1, sm: 2 } }}>
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 2, fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            {featureDescription || getFeatureMessage(feature)}
          </Typography>
        </Box>

        <Typography
          variant="h6"
          gutterBottom
          fontWeight={600}
          sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
        >
          Choose Your Plan
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: { xs: 1.5, sm: 2 },
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {getAvailablePlans().map((plan) => {
            const isRecommended = plan.id === getRecommendedPlan();
            return (
              <Card
                key={plan.id}
                sx={{
                  flex: 1,
                  position: 'relative',
                  border: isRecommended ? '2px solid #f50057' : '1px solid #e0e0e0',
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
              >
                {isRecommended && (
                  <Chip
                    label="Recommended"
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
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                    >
                      {plan.name}
                    </Typography>
                    <Typography
                      variant="h4"
                      color="primary"
                      fontWeight={700}
                      sx={{ fontSize: { xs: '1.75rem', sm: '2rem' } }}
                    >
                      ${plan.price.toFixed(2)}
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        /month
                      </Typography>
                    </Typography>
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
                    variant={isRecommended ? 'contained' : 'outlined'}
                    color="primary"
                    size="large"
                    disabled={loading}
                    onClick={() => handleSubscribe(plan.id)}
                    sx={{
                      mt: 2,
                      py: { xs: 1, sm: 1.5 },
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={24} />
                    ) : (
                      `Subscribe for $${plan.price.toFixed(2)}/mo`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Cancel anytime. No long-term commitments.
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
