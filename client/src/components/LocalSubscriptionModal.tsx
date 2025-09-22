import {
  faCheck,
  faCreditCard,
  faExclamationTriangle,
  faMobileAlt,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import { localSubscriptionStore } from '@stores/LocalSubscriptionStore';
import { uiStore } from '@stores/index';
import React, { useState } from 'react';

interface LocalSubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  feature: 'favorites' | 'ad_removal' | 'music_preview';
  featureDescription?: string;
}

interface LocalPlan {
  id: 'ad_free' | 'premium';
  name: string;
  price: number;
  originalPrice?: number;
  features: string[];
  recommended?: boolean;
}

export const LocalSubscriptionModal: React.FC<LocalSubscriptionModalProps> = ({
  open,
  onClose,
  feature,
  featureDescription,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'ad_free' | 'premium'>('premium');

  const plans: LocalPlan[] = [
    {
      id: 'ad_free',
      name: 'Ad-Free (Local)',
      price: 0.99,
      features: [
        'Remove all ads on this device',
        'Clean browsing experience',
        'No account required',
        'Valid for 30 days',
      ],
    },
    {
      id: 'premium',
      name: 'Premium (Local)',
      price: 1.99,
      originalPrice: 2.99,
      features: [
        'All Ad-Free features',
        'Favorite songs & shows',
        'Advanced features',
        'No account required',
        'Valid for 30 days',
      ],
      recommended: feature !== 'ad_removal',
    },
  ];

  const handlePurchase = () => {
    // Simulate local subscription purchase
    // In a real implementation, this would integrate with a payment processor
    localSubscriptionStore.setLocalSubscription(selectedPlan, 30);

    // Show success and close modal
    uiStore.addNotification(
      `Successfully activated ${selectedPlan === 'ad_free' ? 'Ad-Free' : 'Premium'} subscription on this device!`,
      'success',
    );
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon icon={faMobileAlt} />
          Device Subscription
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: 8 }} />
            <strong>Device-only subscription:</strong> This subscription is tied to this device
            only. Create an account to sync across all your devices and get better value.
          </Typography>
        </Alert>

        {featureDescription && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">{featureDescription}</Typography>
          </Alert>
        )}

        <Box
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}
        >
          {plans.map((plan) => (
            <Card
              key={plan.id}
              sx={{
                cursor: 'pointer',
                border: selectedPlan === plan.id ? 2 : 1,
                borderColor: selectedPlan === plan.id ? 'primary.main' : 'grey.300',
                position: 'relative',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  transform: 'translateY(-2px)',
                  boxShadow: 2,
                },
              }}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.recommended && (
                <Chip
                  label="Recommended"
                  color="primary"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -10,
                    right: 16,
                    zIndex: 1,
                  }}
                />
              )}

              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" component="h3">
                    {plan.name}
                  </Typography>
                  {selectedPlan === plan.id && (
                    <FontAwesomeIcon icon={faCheck} style={{ color: '#1976d2' }} />
                  )}
                </Box>

                <Box sx={{ mb: 2 }}>
                  {plan.originalPrice && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textDecoration: 'line-through' }}
                    >
                      ${plan.originalPrice.toFixed(2)}
                    </Typography>
                  )}
                  <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                    ${plan.price.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    per month (device only)
                  </Typography>
                </Box>

                <List dense>
                  {plan.features.map((feature, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <FontAwesomeIcon icon={faCheck} size="sm" style={{ color: '#4caf50' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Want to save money?</strong> Create an account to get full-featured
            subscriptions that work across all your devices at better prices.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handlePurchase}
          startIcon={<FontAwesomeIcon icon={faCreditCard} />}
          size="large"
        >
          Get {selectedPlan === 'ad_free' ? 'Ad-Free' : 'Premium'} for $
          {plans.find((p) => p.id === selectedPlan)?.price.toFixed(2)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
