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
import CustomModal from '../components/CustomModal';
import { apiStore, authStore, uiStore } from '../stores';

const SettingsPage: React.FC = observer(() => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    plan: 'free' | 'ad_free';
    message: string;
  } | null>(null);

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
      uiStore.addNotification('Subscription status synced successfully!', 'success');
    } catch (error) {
      console.error('Error syncing subscription:', error);
      uiStore.addNotification('Error syncing subscription. Please try again.', 'error');
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
      uiStore.addNotification('Error opening billing portal. Please try again.', 'error');
    }
  };

  const upgradeToSubscription = async (plan: 'ad_free' | 'premium') => {
    try {
      const response = await apiStore.post('/subscription/create-checkout-session', { plan });
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      uiStore.addNotification('Error starting upgrade process. Please try again.', 'error');
    }
  };

  const handleDowngrade = async (plan: 'free' | 'ad_free') => {
    const confirmMessage =
      plan === 'free'
        ? 'Are you sure you want to cancel your subscription and downgrade to the free plan? This will take effect at the end of your current billing period.'
        : 'Are you sure you want to downgrade to the Ad-Free plan? This will take effect immediately and you will be charged a prorated amount.';

    // Show confirmation modal instead of native confirm
    setPendingAction({ plan, message: confirmMessage });
    setConfirmModalOpen(true);
  };

  const executeDowngrade = async () => {
    if (!pendingAction) return;

    try {
      setLoading(true);
      setConfirmModalOpen(false);

      if (pendingAction.plan === 'free') {
        // Cancel subscription (will downgrade to free at period end)
        await apiStore.post('/subscription/cancel', { immediately: false });
        uiStore.addNotification(
          'Your subscription has been cancelled and will end at the end of your current billing period.',
          'success',
        );
      } else {
        // Change to ad_free plan
        await apiStore.post('/subscription/change-plan', { plan: pendingAction.plan });
        uiStore.addNotification('Your subscription has been changed to Ad-Free.', 'success');
      }

      await loadSubscriptionStatus(); // Reload status
    } catch (error) {
      console.error('Error changing subscription:', error);
      uiStore.addNotification(
        'Error changing subscription. Please try again or contact support.',
        'error',
      );
    } finally {
      setLoading(false);
      setPendingAction(null);
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

                    <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                      <Button variant="outlined" onClick={openBillingPortal}>
                        Manage Billing
                      </Button>
                      <Button variant="outlined" onClick={syncSubscription} disabled={syncing}>
                        {syncing ? <CircularProgress size={20} /> : 'Sync Status'}
                      </Button>
                      {subscriptionStatus.subscription.plan !== 'PREMIUM' &&
                        subscriptionStatus.subscription.plan !== 'premium' && (
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => upgradeToSubscription('premium')}
                            size="small"
                          >
                            {subscriptionStatus.subscription.plan === 'AD_FREE' ||
                            subscriptionStatus.subscription.plan === 'ad_free'
                              ? 'Upgrade to Premium'
                              : 'Upgrade to Premium ($1.99/mo)'}
                          </Button>
                        )}
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

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                      <Button variant="outlined" onClick={syncSubscription} disabled={syncing}>
                        {syncing ? <CircularProgress size={20} /> : 'Check for Subscription'}
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => upgradeToSubscription('ad_free')}
                        sx={{ minWidth: 140 }}
                      >
                        Upgrade to Ad-Free ($0.99/mo)
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => upgradeToSubscription('premium')}
                        sx={{ minWidth: 140 }}
                      >
                        Upgrade to Premium ($1.99/mo)
                      </Button>
                    </Box>
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

        {/* Plan Comparison */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Available Plans
            </Typography>

            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
              {/* Free Plan */}
              <Box
                sx={{ flex: 1, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
              >
                <Typography variant="h6" gutterBottom>
                  Free
                </Typography>
                <Typography variant="h4" gutterBottom>
                  $0
                  <Typography component="span" variant="body2">
                    /month
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  • Basic music search
                  <br />
                  • View karaoke shows
                  <br />
                  • Ads included
                  <br />
                  • 5 song favorites
                  <br />• 10 song previews
                </Typography>
                {!subscriptionStatus?.subscription ||
                subscriptionStatus?.subscription?.plan === 'free' ? (
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                    Current Plan
                  </Typography>
                ) : (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => handleDowngrade('free')}
                    size="small"
                    color="warning"
                  >
                    Downgrade to Free
                  </Button>
                )}
              </Box>

              {/* Ad-Free Plan */}
              <Box
                sx={{ flex: 1, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
              >
                <Typography variant="h6" gutterBottom>
                  Ad-Free
                </Typography>
                <Typography variant="h4" gutterBottom>
                  $0.99
                  <Typography component="span" variant="body2">
                    /month
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  • All free features
                  <br />
                  • No advertisements
                  <br />
                  • Clean browsing experience
                  <br />• Support development
                </Typography>
                {subscriptionStatus?.subscription?.plan === 'AD_FREE' ||
                subscriptionStatus?.subscription?.plan === 'ad_free' ? (
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                    Current Plan
                  </Typography>
                ) : subscriptionStatus?.subscription?.plan === 'PREMIUM' ||
                  subscriptionStatus?.subscription?.plan === 'premium' ? (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => handleDowngrade('ad_free')}
                    size="small"
                    color="warning"
                  >
                    Downgrade to Ad-Free
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => upgradeToSubscription('ad_free')}
                    size="small"
                  >
                    Upgrade
                  </Button>
                )}
              </Box>

              {/* Premium Plan */}
              <Box
                sx={{
                  flex: 1,
                  p: 2,
                  border: '2px solid',
                  borderColor: 'secondary.main',
                  borderRadius: 1,
                  position: 'relative',
                }}
              >
                <Chip
                  label="Most Popular"
                  color="secondary"
                  size="small"
                  sx={{ position: 'absolute', top: -8, right: 8 }}
                />
                <Typography variant="h6" gutterBottom>
                  Premium
                </Typography>
                <Typography variant="h4" gutterBottom>
                  $1.99
                  <Typography component="span" variant="body2">
                    /month
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  • All ad-free features
                  <br />
                  • Unlimited song favorites
                  <br />
                  • Unlimited show favorites
                  <br />
                  • Unlimited song previews
                  <br />• Priority support
                </Typography>
                {subscriptionStatus?.subscription?.plan === 'PREMIUM' ||
                subscriptionStatus?.subscription?.plan === 'premium' ? (
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                    Current Plan
                  </Typography>
                ) : subscriptionStatus?.subscription ? (
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onClick={() => upgradeToSubscription('premium')}
                    size="small"
                  >
                    Upgrade
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onClick={() => upgradeToSubscription('premium')}
                    size="small"
                  >
                    Upgrade
                  </Button>
                )}
              </Box>
            </Box>
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

      {/* Confirmation Modal */}
      <CustomModal
        open={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setPendingAction(null);
        }}
        title="Confirm Subscription Change"
        maxWidth="sm"
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {pendingAction?.message}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => {
                setConfirmModalOpen(false);
                setPendingAction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={executeDowngrade}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Confirm'}
            </Button>
          </Box>
        </Box>
      </CustomModal>
    </Container>
  );
});

export default SettingsPage;
