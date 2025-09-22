import { CoinDisplay } from '@components/CoinDisplay';
import CoinPackagePurchaseModal from '@components/CoinPackagePurchaseModal';
import CustomModal from '@components/CustomModal';
import MicrophonePurchaseModal from '@components/MicrophonePurchaseModal';
import { faCoins, faCrown, faMicrophone, faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import { CoinPackage, Microphone, storeStore } from '@stores/StoreStore';
import { userStore } from '@stores/UserStore';
import { uiStore } from '@stores/index';
import { formatNumber, formatPrice, isGreaterThan, toNumber } from '@utils/numberUtils';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`store-tabpanel-${index}`}
      aria-labelledby={`store-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const StorePage: React.FC = observer(() => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedMicrophone, setSelectedMicrophone] = useState<Microphone | null>(null);
  const [coinPackageModalOpen, setCoinPackageModalOpen] = useState(false);
  const [selectedCoinPackage, setSelectedCoinPackage] = useState<CoinPackage | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const theme = useTheme();

  useEffect(() => {
    const loadStoreData = async () => {
      setLoading(true);
      try {
        // Load all store data in parallel
        await Promise.all([
          storeStore.fetchCoinPackages(),
          storeStore.fetchStoreMicrophones(),
          storeStore.fetchUserMicrophones(),
          storeStore.fetchUserCoins(),
        ]);
      } catch (error) {
        console.error('Error loading store data:', error);
      } finally {
        setLoading(false);
      }
    };

    // Check for payment success/failure from URL parameters
    const handlePaymentResult = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const transactionId = urlParams.get('transaction');

      if (paymentStatus === 'success' && transactionId) {
        console.log('Payment successful, transaction ID:', transactionId);
        // Process the successful payment
        processPaymentSuccess(transactionId);
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paymentStatus === 'cancelled') {
        console.log('Payment was cancelled');
        setSuccessMessage('Payment was cancelled. You can try again anytime!');
        setSuccessModalOpen(true);
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    loadStoreData();
    handlePaymentResult();
  }, []);

  const processPaymentSuccess = async (transactionId: string) => {
    try {
      // Call the success endpoint to finalize the transaction
      await storeStore.processPaymentSuccess(transactionId);

      // Refresh both store coins and user data to ensure UI updates everywhere
      await Promise.all([storeStore.fetchUserCoins(), userStore.getCurrentUser()]);

      // Show success modal instead of alert
      setSuccessMessage('🎉 Payment successful! Your coins have been added to your account.');
      setSuccessModalOpen(true);
    } catch (error) {
      console.error('Error processing payment success:', error);
      setSuccessMessage(
        'Payment was successful, but there was an error processing it. Please contact support.',
      );
      setSuccessModalOpen(true);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCoinPackagePurchase = (packageId: string) => {
    const coinPackage = storeStore.coinPackages.find((pkg) => pkg.id === packageId);
    if (coinPackage) {
      setSelectedCoinPackage(coinPackage);
      setCoinPackageModalOpen(true);
    }
  };

  const handleConfirmCoinPackagePurchase = async () => {
    if (!selectedCoinPackage) return;

    setLoading(true);
    try {
      const response = await storeStore.purchaseCoinPackage(selectedCoinPackage.id);
      if (response?.checkoutUrl) {
        console.log('Redirecting to Stripe checkout:', response);
        setCoinPackageModalOpen(false);
        setSelectedCoinPackage(null);

        // Redirect to Stripe checkout
        window.location.href = response.checkoutUrl;
      } else if (response?.clientSecret) {
        // Fallback for legacy payment intent flow
        console.log('Payment session created:', response);
        setCoinPackageModalOpen(false);
        setSelectedCoinPackage(null);
        uiStore.addNotification(
          'Payment integration needed. Redirecting to Stripe checkout...',
          'info',
        );
      } else {
        throw new Error('No payment URL received from server');
      }
    } catch (error) {
      console.error('Error purchasing coin package:', error);
      uiStore.addNotification('Failed to initiate coin package purchase', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCoinPackageModal = () => {
    setCoinPackageModalOpen(false);
    setSelectedCoinPackage(null);
  };

  const handleMicrophonePurchase = (microphoneId: string) => {
    const microphone = storeStore.storeMicrophones.find((mic) => mic.id === microphoneId);
    if (microphone) {
      setSelectedMicrophone(microphone);
      setPurchaseModalOpen(true);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!selectedMicrophone) return;

    setLoading(true);
    try {
      const success = await storeStore.purchaseMicrophone(selectedMicrophone.id);
      if (success) {
        // Data is already refreshed in the store method
        console.log('Microphone purchased successfully');
        setPurchaseModalOpen(false);
        setSelectedMicrophone(null);
      } else {
        console.error('Failed to purchase microphone');
      }
    } catch (error) {
      console.error('Error purchasing microphone:', error);
      // You could show an error message here
    } finally {
      setLoading(false);
    }
  };

  const handleClosePurchaseModal = () => {
    setPurchaseModalOpen(false);
    setSelectedMicrophone(null);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, 
          ${alpha(theme.palette.primary.main, 0.1)} 0%, 
          ${alpha(theme.palette.secondary.main, 0.05)} 50%, 
          ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
                       radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="lg" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #FFD700, #FFA500)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            <FontAwesomeIcon icon={faShoppingCart} style={{ marginRight: '16px' }} />
            KaraokeHub Store
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            Enhance your karaoke experience with premium microphones and more!
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <CoinDisplay size="large" />
          </Box>
        </Box>

        {/* Store Tabs */}
        <Box sx={{ width: '100%', mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="store tabs"
              centered
              sx={{
                '& .MuiTab-root': {
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  minWidth: 120,
                },
              }}
            >
              <Tab
                icon={<FontAwesomeIcon icon={faCoins} />}
                label="Coin Packages"
                id="store-tab-0"
                aria-controls="store-tabpanel-0"
                iconPosition="start"
              />
              <Tab
                icon={<FontAwesomeIcon icon={faMicrophone} />}
                label="Microphones"
                id="store-tab-1"
                aria-controls="store-tabpanel-1"
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Coin Packages Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
              Purchase Coins
            </Typography>
            <Grid container spacing={3} justifyContent="center">
              {storeStore.coinPackages.map((pkg) => (
                <Grid item xs={12} sm={6} md={3} key={pkg.id}>
                  <Card
                    sx={{
                      position: 'relative',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: pkg.name.toLowerCase().includes('premium')
                        ? `2px solid ${theme.palette.primary.main}`
                        : '1px solid',
                      borderColor: pkg.name.toLowerCase().includes('premium')
                        ? theme.palette.primary.main
                        : 'divider',
                      transform: pkg.name.toLowerCase().includes('premium')
                        ? 'scale(1.05)'
                        : 'scale(1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: pkg.name.toLowerCase().includes('premium')
                          ? 'scale(1.08)'
                          : 'scale(1.03)',
                        boxShadow: theme.shadows[8],
                      },
                    }}
                  >
                    {pkg.name.toLowerCase().includes('premium') && (
                      <Chip
                        icon={<FontAwesomeIcon icon={faCrown} />}
                        label="Most Popular"
                        color="primary"
                        sx={{
                          position: 'absolute',
                          top: -10,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 1,
                          fontWeight: 'bold',
                        }}
                      />
                    )}
                    <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {pkg.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {pkg.description}
                      </Typography>
                      <Box sx={{ my: 2 }}>
                        <Typography
                          variant="h4"
                          component="div"
                          color="primary"
                          sx={{ fontWeight: 'bold' }}
                        >
                          <FontAwesomeIcon
                            icon={faCoins}
                            style={{ marginRight: '8px', color: '#FFD700' }}
                          />
                          {formatNumber(pkg.coinAmount)}
                        </Typography>
                        {isGreaterThan(pkg.bonusCoins, 0) && (
                          <Typography
                            variant="body2"
                            color="success.main"
                            sx={{ fontWeight: 'bold' }}
                          >
                            +{formatNumber(pkg.bonusCoins)} bonus coins!
                          </Typography>
                        )}
                      </Box>
                      <Typography
                        variant="h5"
                        component="div"
                        sx={{ fontWeight: 'bold', color: 'text.primary' }}
                      >
                        ${formatPrice(pkg.priceUSD)}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                      <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={loading}
                        onClick={() => handleCoinPackagePurchase(pkg.id)}
                        sx={{
                          mx: 2,
                          py: 1.5,
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          background: pkg.name.toLowerCase().includes('premium')
                            ? 'linear-gradient(45deg, #2196F3, #21CBF3)'
                            : undefined,
                        }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Purchase'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                💳 Secure payments powered by Stripe. All transactions are encrypted and secure.
              </Typography>
            </Alert>
          </TabPanel>

          {/* Microphones Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
              Microphone Collection
            </Typography>
            {storeStore.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={50} />
              </Box>
            ) : (
              <Grid container spacing={3}>
                {storeStore.storeMicrophones.map((mic) => {
                  const isOwned = storeStore.doesUserOwnMicrophone(mic.id);
                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={mic.id}>
                      <Card
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative',
                          opacity: isOwned ? 0.7 : 1,
                          border: isOwned ? '2px solid' : '1px solid',
                          borderColor: isOwned ? 'success.main' : 'divider',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: isOwned ? 'none' : 'translateY(-4px)',
                            boxShadow: isOwned ? theme.shadows[2] : theme.shadows[8],
                          },
                        }}
                      >
                        {isOwned && (
                          <Chip
                            label="Owned"
                            color="success"
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              zIndex: 1,
                              fontWeight: 'bold',
                            }}
                          />
                        )}
                        <Box
                          sx={{
                            height: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                            position: 'relative',
                          }}
                        >
                          <Box
                            component="img"
                            src={mic.imageUrl}
                            alt={mic.name}
                            sx={{
                              width: '80%',
                              height: '80%',
                              objectFit: 'contain',
                              filter: isOwned ? 'grayscale(0.3)' : 'none',
                            }}
                          />
                        </Box>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" component="h3" gutterBottom>
                            {mic.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {mic.description}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Chip
                              label={mic.rarity}
                              size="small"
                              color={
                                mic.rarity.toLowerCase() === 'legendary'
                                  ? 'warning'
                                  : mic.rarity.toLowerCase() === 'epic'
                                    ? 'secondary'
                                    : mic.rarity.toLowerCase() === 'rare'
                                      ? 'primary'
                                      : 'default'
                              }
                              sx={{ textTransform: 'capitalize' }}
                            />
                            {!isOwned && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <FontAwesomeIcon
                                  icon={faCoins}
                                  style={{ marginRight: '4px', color: '#FFD700' }}
                                />
                                <Typography
                                  variant="h6"
                                  component="span"
                                  sx={{ fontWeight: 'bold' }}
                                >
                                  {formatNumber(mic.coinPrice)}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                          {isOwned ? (
                            <Button variant="outlined" disabled fullWidth sx={{ mx: 2 }}>
                              Owned
                            </Button>
                          ) : (
                            <Button
                              variant="contained"
                              fullWidth
                              disabled={loading || storeStore.coins < toNumber(mic.coinPrice)}
                              onClick={() => handleMicrophonePurchase(mic.id)}
                              sx={{ mx: 2 }}
                            >
                              {loading ? (
                                <CircularProgress size={20} />
                              ) : storeStore.coins < toNumber(mic.coinPrice) ? (
                                'Insufficient Coins'
                              ) : (
                                'Purchase'
                              )}
                            </Button>
                          )}
                        </CardActions>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
            {storeStore.storeMicrophones.length === 0 && !storeStore.isLoading && (
              <Alert severity="info" sx={{ textAlign: 'center' }}>
                <Typography variant="body1">
                  No microphones available at the moment. Check back soon!
                </Typography>
              </Alert>
            )}
          </TabPanel>
        </Box>
      </Container>

      {/* Purchase Confirmation Modals */}
      <MicrophonePurchaseModal
        open={purchaseModalOpen}
        onClose={handleClosePurchaseModal}
        microphone={selectedMicrophone}
        userCoins={storeStore.coins}
        isLoading={loading}
        onConfirmPurchase={handleConfirmPurchase}
      />

      <CoinPackagePurchaseModal
        open={coinPackageModalOpen}
        onClose={handleCloseCoinPackageModal}
        coinPackage={selectedCoinPackage}
        isLoading={loading}
        onConfirmPurchase={handleConfirmCoinPackagePurchase}
      />

      <CustomModal
        open={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="Payment Status"
        maxWidth="sm"
      >
        <Typography variant="body1" sx={{ textAlign: 'center', py: 2 }}>
          {successMessage}
        </Typography>
      </CustomModal>
    </Box>
  );
});

export default StorePage;
