import CustomModal from '@components/CustomModal';
import { LoadingButton } from '@components/LoadingButton';
import {
  faExclamationTriangle,
  faMicrophone,
  faMusic,
  faUser,
  faUserTag,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { apiStore, authStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserDisplayName, getUserSecondaryName } from '../utils/userUtils';

const ProfilePage: React.FC = observer(() => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [name, setName] = useState(authStore.user?.name || '');
  const [stageName, setStageName] = useState(authStore.user?.stageName || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // DJ Registration states
  const [djSearchQuery, setDjSearchQuery] = useState('');
  const [djSearchResults, setDjSearchResults] = useState<any[]>([]);
  const [selectedDj, setSelectedDj] = useState<any>(null);
  const [djStatus, setDjStatus] = useState<any>(null);
  const [djError, setDjError] = useState('');
  const [djLoading, setDjLoading] = useState(false);

  // Sync form state when authStore.user changes
  useEffect(() => {
    if (authStore.user) {
      setName(authStore.user.name || '');
      setStageName(authStore.user.stageName || '');
    }
  }, [authStore.user?.name, authStore.user?.stageName]);

  // Debounced DJ search
  useEffect(() => {
    if (!djSearchQuery || djSearchQuery.length < 2) {
      setDjSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setDjLoading(true);
      setDjError('');

      try {
        const response = await apiStore.get(apiStore.endpoints.djs.search(djSearchQuery, 10));

        // Handle different response formats from apiStore
        const results = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

        setDjSearchResults(results);
      } catch (error: any) {
        console.error('DJ search error:', error);
        const errorMessage =
          error.response?.data?.message || 'Failed to search DJs. Please try again.';
        setDjError(errorMessage);
        setDjSearchResults([]);
      } finally {
        setDjLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [djSearchQuery]);

  // Function to fetch DJ status - can be called from anywhere in component
  const fetchDjStatus = useCallback(async () => {
    try {
      const response = await apiStore.get(apiStore.endpoints.djRegistration.status);
      setDjStatus(response.data || response);
    } catch (error) {
      console.error('Error fetching DJ status:', error);
      // Don't set error state for status fetch failure - just assume not a DJ
      setDjStatus({ isDjSubscriptionActive: false });
    }
  }, []);

  // Fetch DJ status on component mount
  useEffect(() => {
    if (authStore.user) {
      fetchDjStatus();
    }
  }, [authStore.user, fetchDjStatus]);

  // Handle DJ subscription success/cancellation from Stripe checkout
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const djSuccess = urlParams.get('dj_success');
    const djCancelled = urlParams.get('dj_cancelled');

    if (djSuccess === 'true') {
      // Refresh user profile and DJ status to get updated subscription status
      const refreshData = async () => {
        try {
          await authStore.refreshProfile();
          // Add a small delay to ensure backend has processed the subscription
          await new Promise((resolve) => setTimeout(resolve, 1000));
          // Also refresh DJ status using our reusable function
          await fetchDjStatus();
          // Force a re-render by clearing and refetching
          setDjStatus(null);
          setTimeout(async () => {
            await fetchDjStatus();
          }, 500);
        } catch (error) {
          console.error('Error refreshing DJ data:', error);
        }
      };

      refreshData();
      setSuccess('DJ subscription activated successfully! You can now manage shows.');
      // Remove the URL parameter to prevent repeated messages
      navigate('/profile', { replace: true });
    } else if (djCancelled === 'true') {
      setDjError('DJ subscription was cancelled. You can try again anytime.');
      // Remove the URL parameter to prevent repeated messages
      navigate('/profile', { replace: true });
    }
  }, [location.search, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await authStore.updateProfile({
        name: name.trim(),
        stageName: stageName.trim() || undefined, // Convert empty string to undefined
      });
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!authStore.user) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Profile
          </Typography>
          <Alert severity="error">You must be logged in to view this page.</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Box
        sx={{
          minHeight: '100vh',
          background:
            'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(51, 51, 51, 0.9) 100%)',
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 99, 132, 0.3) 0%, transparent 50%)
          `,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ py: 6 }}>
            {/* Header Section */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: 'primary.main',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <FontAwesomeIcon icon={faUser} style={{ fontSize: 30 }} />
              </Avatar>
              <Typography
                variant="h3"
                component="h1"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                Profile Settings
              </Typography>
            </Box>

            <Grid container spacing={4}>
              {/* Profile Info Card */}
              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    height: '100%',
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                  }}
                >
                  <CardContent
                    sx={{
                      textAlign: 'center',
                      p: 4,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <Avatar
                      src={authStore.getAvatarUrl()}
                      sx={{
                        width: 100,
                        height: 100,
                        mx: 'auto',
                        mb: 2,
                        fontSize: '2rem',
                      }}
                    >
                      <FontAwesomeIcon icon={faUser} />
                    </Avatar>
                    <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                      {getUserDisplayName(authStore.user)}
                    </Typography>
                    {getUserSecondaryName(authStore.user) && (
                      <Typography
                        variant="body2"
                        sx={{ color: 'rgba(255,255,255,0.7)' }}
                        gutterBottom
                      >
                        Real name: {getUserSecondaryName(authStore.user)}
                      </Typography>
                    )}{' '}
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      {authStore.user.email}
                    </Typography>
                    {authStore.user.isAdmin && (
                      <Box sx={{ mt: 2 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            px: 2,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                          }}
                        >
                          Admin
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Edit Form Card */}
              <Grid item xs={12} md={8}>
                <Card
                  sx={{
                    height: '100%',
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                  }}
                >
                  <CardContent
                    sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          width: 48,
                          height: 48,
                        }}
                      >
                        <FontAwesomeIcon icon={faUserTag} />
                      </Avatar>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 600,
                          color: 'white',
                        }}
                      >
                        Edit Profile
                      </Typography>
                    </Box>

                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <form
                        onSubmit={handleSubmit}
                        style={{
                          flexGrow: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ mb: 3 }}>
                          <TextField
                            fullWidth
                            label="Real Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            variant="outlined"
                          />
                        </Box>

                        <Box sx={{ mb: 3 }}>
                          <TextField
                            fullWidth
                            label="Stage Name"
                            value={stageName}
                            onChange={(e) => setStageName(e.target.value)}
                            variant="outlined"
                            helperText="Karaoke stage name (will be displayed instead of real name if provided)"
                            placeholder="Enter your karaoke stage name..."
                          />
                        </Box>

                        {error && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                          </Alert>
                        )}

                        {success && (
                          <Alert severity="success" sx={{ mb: 2 }}>
                            {success}
                          </Alert>
                        )}

                        <LoadingButton
                          type="submit"
                          variant="contained"
                          loading={isLoading}
                          size="large"
                          sx={{ mt: 2 }}
                        >
                          Update Profile
                        </LoadingButton>
                      </form>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* DJ Registration Section */}
              <Grid item xs={12}>
                <Card
                  sx={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100%',
                    minHeight: 400,
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      opacity: 0.15,
                      fontSize: '140px',
                      color: '#00d4ff',
                      transform: 'rotate(-15deg)',
                    }}
                  >
                    <FontAwesomeIcon icon={faMicrophone} />
                  </Box>
                  <CardContent sx={{ position: 'relative', zIndex: 1, p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                      <Box
                        sx={{
                          backgroundColor: '#00d4ff',
                          borderRadius: '50%',
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                          color: '#1a1a2e',
                        }}
                      >
                        <FontAwesomeIcon icon={faMusic} style={{ fontSize: '18px' }} />
                      </Box>
                      <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                        DJ Account
                      </Typography>
                    </Box>

                    {djStatus?.isDjSubscriptionActive ? (
                      <Box>
                        <Alert
                          severity="success"
                          sx={{
                            mb: 2,
                            backgroundColor: 'rgba(0, 212, 255, 0.15)',
                            borderColor: '#00d4ff',
                            border: '1px solid #00d4ff',
                            '& .MuiAlert-icon': {
                              color: '#00d4ff',
                            },
                          }}
                        >
                          <Typography variant="h6" sx={{ color: '#00d4ff', fontWeight: 600 }}>
                            {djStatus.isCancelled ? 'DJ Account (Cancelling)' : 'Active DJ Account'}
                          </Typography>
                          <Typography sx={{ color: 'white' }}>
                            DJ Name: {djStatus.dj?.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            Status: {djStatus.isDjSubscriptionActive ? 'Active' : 'Inactive'}
                          </Typography>
                          {djStatus.isCancelled && djStatus.expiresAt && (
                            <Typography
                              variant="body2"
                              sx={{ color: 'rgba(255, 200, 100, 0.9)', mt: 1 }}
                            >
                              ⚠️ Subscription will end on{' '}
                              {new Date(djStatus.expiresAt).toLocaleDateString()}
                            </Typography>
                          )}
                        </Alert>
                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                          <Button
                            variant="contained"
                            href="/manage-shows"
                            sx={{
                              flex: 1,
                              backgroundColor: '#00d4ff',
                              color: '#1a1a2e',
                              fontWeight: 600,
                              '&:hover': {
                                backgroundColor: '#00b8e6',
                                transform: 'translateY(-2px)',
                              },
                              transition: 'all 0.2s ease-in-out',
                            }}
                          >
                            Manage My Shows
                          </Button>
                          {djStatus.isCancelled ? (
                            <Button
                              variant="outlined"
                              sx={{
                                borderColor: 'rgba(0, 212, 255, 0.5)',
                                color: 'rgba(0, 212, 255, 0.8)',
                                '&:hover': {
                                  borderColor: '#00d4ff',
                                  backgroundColor: 'rgba(0, 212, 255, 0.1)',
                                  color: '#00d4ff',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                              onClick={() => {
                                // TODO: Implement reactivation
                                alert('Reactivation feature coming soon');
                              }}
                            >
                              Reactivate Subscription
                            </Button>
                          ) : (
                            <Button
                              variant="outlined"
                              sx={{
                                borderColor: 'rgba(255, 99, 132, 0.5)',
                                color: 'rgba(255, 99, 132, 0.8)',
                                '&:hover': {
                                  borderColor: '#ff6384',
                                  backgroundColor: 'rgba(255, 99, 132, 0.1)',
                                  color: '#ff6384',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                              onClick={() => setShowCancelModal(true)}
                            >
                              Cancel Subscription
                            </Button>
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Box>
                        <Typography
                          variant="body1"
                          sx={{ mb: 4, opacity: 0.95, lineHeight: 1.7, fontSize: '1.1rem' }}
                        >
                          Join as a DJ to manage your shows and connect with venues. Search for your
                          DJ profile and subscribe for $20/month.
                        </Typography>

                        <Box sx={{ mb: 4 }}>
                          <Autocomplete
                            options={djSearchResults}
                            getOptionLabel={(option) =>
                              `${option.name} - ${option.vendor?.name || 'No Venue'}`
                            }
                            renderOption={(props, option) => (
                              <Box component="li" {...props}>
                                <Box>
                                  <Typography variant="body1">{option.name}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {option.vendor?.name || 'No Venue'}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Search for your DJ name"
                                placeholder="Type your DJ name..."
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    backdropFilter: 'blur(10px)',
                                    '& fieldset': { borderColor: 'rgba(0, 212, 255, 0.3)' },
                                    '&:hover fieldset': { borderColor: 'rgba(0, 212, 255, 0.6)' },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#00d4ff',
                                      borderWidth: 2,
                                    },
                                  },
                                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.8)' },
                                  '& .MuiInputBase-input': { color: 'white' },
                                }}
                              />
                            )}
                            value={selectedDj}
                            onChange={(_, newValue) => setSelectedDj(newValue)}
                            onInputChange={(_, newInputValue) => {
                              setDjSearchQuery(newInputValue);
                            }}
                            loading={djLoading}
                            noOptionsText="No DJs found. Try a different search term."
                          />
                        </Box>

                        {selectedDj && (
                          <Box
                            sx={{
                              mb: 4,
                              p: 3,
                              backgroundColor: 'rgba(0, 212, 255, 0.1)',
                              borderRadius: 2,
                              border: '1px solid rgba(0, 212, 255, 0.3)',
                              backdropFilter: 'blur(10px)',
                            }}
                          >
                            <Typography variant="h6" sx={{ color: '#00d4ff', fontWeight: 600 }}>
                              {selectedDj.name}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                              Venue: {selectedDj.vendor?.name || 'No Venue'}
                            </Typography>
                            <Chip
                              label="$20/month"
                              sx={{
                                backgroundColor: '#00d4ff',
                                color: '#1a1a2e',
                                fontWeight: 600,
                              }}
                            />
                          </Box>
                        )}

                        {djError && (
                          <Alert severity="error" sx={{ mb: 4 }}>
                            {djError}
                          </Alert>
                        )}

                        <LoadingButton
                          variant="contained"
                          loading={djLoading}
                          disabled={!selectedDj}
                          onClick={async () => {
                            if (!selectedDj) return;

                            setDjLoading(true);
                            setDjError('');

                            try {
                              console.log('Creating DJ checkout session for:', selectedDj);
                              const response = await apiStore.post(
                                apiStore.endpoints.djRegistration.checkoutSession,
                                { djId: selectedDj.id },
                              );

                              if (response.url) {
                                // Redirect to Stripe checkout
                                window.location.href = response.url;
                              } else {
                                throw new Error('No checkout URL received');
                              }
                            } catch (error: any) {
                              console.error('DJ registration error:', error);
                              const errorMessage =
                                error.response?.data?.message ||
                                error.message ||
                                'Failed to create checkout session';
                              setDjError(errorMessage);
                              setDjLoading(false);
                            }
                          }}
                          size="large"
                          fullWidth
                          sx={{
                            backgroundColor: '#00d4ff',
                            color: '#1a1a2e',
                            fontWeight: 600,
                            py: 2,
                            fontSize: '1.1rem',
                            borderRadius: 2,
                            '&:hover': {
                              backgroundColor: '#00b8e6',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 8px 25px rgba(0, 212, 255, 0.3)',
                            },
                            '&:disabled': {
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              color: 'rgba(255, 255, 255, 0.3)',
                            },
                            transition: 'all 0.2s ease-in-out',
                          }}
                        >
                          Register as DJ - $20/month
                        </LoadingButton>

                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 3,
                            opacity: 0.7,
                            textAlign: 'center',
                            fontSize: '0.9rem',
                          }}
                        >
                          Secure payment processed by Stripe. Cancel anytime.
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* Cancel Subscription Confirmation Modal */}
      <CustomModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel DJ Subscription"
        icon={<FontAwesomeIcon icon={faExclamationTriangle} />}
        maxWidth="sm"
      >
        <Box sx={{ py: 2 }}>
          <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
            Are you sure you want to cancel your DJ subscription? This will take effect at the end
            of your current billing period.
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            You will continue to have access to all DJ features until your current billing period
            ends.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => setShowCancelModal(false)}
              sx={{ minWidth: 100 }}
            >
              Keep Subscription
            </Button>
            <LoadingButton
              variant="contained"
              color="error"
              onClick={async () => {
                try {
                  // Use DJ-specific cancellation endpoint
                  await apiStore.delete(apiStore.endpoints.djRegistration.cancel);
                  setSuccess(
                    'DJ subscription cancelled successfully. It will remain active until the end of your current billing period.',
                  );
                  setError('');
                  setShowCancelModal(false);
                  // Refresh DJ status
                  await fetchDjStatus();
                } catch (error) {
                  console.error('Failed to cancel DJ subscription:', error);
                  setError(
                    'Failed to cancel DJ subscription. Please try again or contact support.',
                  );
                  setSuccess('');
                  setShowCancelModal(false);
                }
              }}
              sx={{ minWidth: 100 }}
            >
              Cancel Subscription
            </LoadingButton>
          </Box>
        </Box>
      </CustomModal>
    </>
  );
});

export default ProfilePage;
