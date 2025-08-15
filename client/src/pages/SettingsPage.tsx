import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Typography,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { apiStore, authStore } from '../stores';

const SettingsPage: React.FC = observer(() => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadSubscriptionStatus = async () => {
    if (!authStore.isAuthenticated) return;

    setLoading(true);
    try {
      const response = await apiStore.get('/subscription/status');
      setSubscriptionStatus(response);
    } catch (error) {
      console.error('Error loading subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncSubscription = async () => {
    setSyncing(true);
    try {
      await apiStore.post('/subscription/sync');
      await loadSubscriptionStatus(); // Reload status after sync
      alert('Subscription status synced successfully!');
    } catch (error) {
      console.error('Error syncing subscription:', error);
      alert('Error syncing subscription. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const openBillingPortal = async () => {
    try {
      const response = await apiStore.post('/subscription/create-portal-session');
      window.location.href = response.url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert('Error opening billing portal. Please try again.');
    }
  };

  useEffect(() => {
    loadSubscriptionStatus();
  }, [authStore.isAuthenticated]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'trialing':
        return 'info';
      case 'past_due':
        return 'warning';
      case 'canceled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'AD_FREE':
        return 'Ad-Free';
      case 'PREMIUM':
        return 'Premium';
      default:
        return 'Free';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>

        {/* Subscription Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Subscription Management
            </Typography>

            {!authStore.isAuthenticated ? (
              <Alert severity="info">Please log in to view your subscription status.</Alert>
            ) : loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={24} />
                <Typography>Loading subscription status...</Typography>
              </Box>
            ) : (
              <>
                {subscriptionStatus?.subscription ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Typography variant="h6">
                        Current Plan: {getPlanName(subscriptionStatus.subscription.plan)}
                      </Typography>
                      <Chip
                        label={subscriptionStatus.subscription.status}
                        color={getStatusColor(subscriptionStatus.subscription.status) as any}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      ${subscriptionStatus.subscription.pricePerMonth}/month
                    </Typography>

                    {subscriptionStatus.subscription.currentPeriodEnd && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Next billing date:{' '}
                        {new Date(
                          subscriptionStatus.subscription.currentPeriodEnd,
                        ).toLocaleDateString()}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                      <Button variant="outlined" onClick={openBillingPortal}>
                        Manage Billing
                      </Button>
                      <Button variant="outlined" onClick={syncSubscription} disabled={syncing}>
                        {syncing ? <CircularProgress size={20} /> : 'Sync Status'}
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Current Plan: Free
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      No active subscription found.
                    </Typography>

                    <Button
                      variant="outlined"
                      onClick={syncSubscription}
                      disabled={syncing}
                      sx={{ mr: 2 }}
                    >
                      {syncing ? <CircularProgress size={20} /> : 'Check for Subscription'}
                    </Button>
                  </Box>
                )}

                {/* Features Status */}
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom>
                  Features
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2">Ad-Free Experience:</Typography>
                    <Chip
                      label={subscriptionStatus?.features?.adFree ? 'Active' : 'Not Active'}
                      color={subscriptionStatus?.features?.adFree ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2">Premium Features:</Typography>
                    <Chip
                      label={subscriptionStatus?.features?.premium ? 'Active' : 'Not Active'}
                      color={subscriptionStatus?.features?.premium ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* Other Settings */}
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Other Settings
            </Typography>
            <Typography color="text.secondary">Additional settings coming soon...</Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
});

export default SettingsPage;
