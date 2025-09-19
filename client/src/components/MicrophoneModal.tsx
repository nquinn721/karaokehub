import {
  faCoins,
  faCrown,
  faLock,
  faMicrophone,
  faShoppingCart,
  faStar,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import { storeStore } from '@stores/StoreStore';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

interface MicrophoneModalProps {
  open: boolean;
  onClose: () => void;
}

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
      id={`microphone-tabpanel-${index}`}
      aria-labelledby={`microphone-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export const MicrophoneModal: React.FC<MicrophoneModalProps> = observer(({ open, onClose }) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Fetch data when modal opens
      storeStore.fetchUserMicrophones();
      storeStore.fetchStoreMicrophones();
      storeStore.fetchUserCoins();
    }
  }, [open]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handlePurchase = async (microphoneId: string) => {
    setPurchasingId(microphoneId);
    try {
      const success = await storeStore.purchaseMicrophone(microphoneId);
      if (success) {
        // Switch to owned tab to see new microphone
        setTabValue(0);
      }
    } finally {
      setPurchasingId(null);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common':
        return '#9E9E9E';
      case 'uncommon':
        return '#4CAF50';
      case 'rare':
        return '#2196F3';
      case 'epic':
        return '#9C27B0';
      case 'legendary':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return faCrown;
      case 'epic':
        return faStar;
      default:
        return faMicrophone;
    }
  };

  const formatCoinPrice = (price: number): string => {
    if (price >= 1000) {
      return `${(price / 1000).toFixed(1)}K`;
    }
    return price.toString();
  };

  const ownedMicrophoneIds = storeStore.getOwnedMicrophoneIds();
  const availableForPurchase = storeStore.storeMicrophones.filter(
    (mic) => !ownedMicrophoneIds.includes(mic.id),
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '500px',
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon icon={faMicrophone} color={theme.palette.primary.main} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Microphone Collection
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <FontAwesomeIcon icon={faTimes} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon icon={faMicrophone} />
                  <span>Owned ({storeStore.userMicrophones.length})</span>
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon icon={faShoppingCart} />
                  <span>Store ({availableForPurchase.length})</span>
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Coin Display */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <Chip
            icon={<FontAwesomeIcon icon={faCoins} style={{ color: '#FFD700' }} />}
            label={`${storeStore.coins} Coins`}
            variant="outlined"
            sx={{
              backgroundColor: 'rgba(255, 215, 0, 0.1)',
              borderColor: '#FFD700',
              color: '#FFD700',
              fontWeight: 600,
            }}
          />
        </Box>

        {storeStore.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {storeStore.error}
          </Alert>
        )}

        <TabPanel value={tabValue} index={0}>
          {storeStore.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : storeStore.userMicrophones.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <FontAwesomeIcon
                icon={faMicrophone}
                size="3x"
                color={theme.palette.text.secondary}
                style={{ marginBottom: 16 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Microphones Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Visit the store to purchase your first microphone!
              </Typography>
              <Button
                variant="contained"
                onClick={() => setTabValue(1)}
                startIcon={<FontAwesomeIcon icon={faShoppingCart} />}
              >
                Browse Store
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {storeStore.userMicrophones.map((userMic) => (
                <Grid item xs={12} sm={6} md={4} key={userMic.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: userMic.isEquipped
                        ? `2px solid ${theme.palette.primary.main}`
                        : '1px solid',
                      borderColor: userMic.isEquipped ? theme.palette.primary.main : 'divider',
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="120"
                      image={userMic.microphone.imageUrl}
                      alt={userMic.microphone.name}
                      sx={{ objectFit: 'contain', p: 1 }}
                    />
                    <CardContent sx={{ flexGrow: 1, pt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <FontAwesomeIcon
                          icon={getRarityIcon(userMic.microphone.rarity)}
                          style={{ color: getRarityColor(userMic.microphone.rarity) }}
                        />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {userMic.microphone.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {userMic.microphone.description}
                      </Typography>
                      <Chip
                        label={userMic.microphone.rarity}
                        size="small"
                        sx={{
                          backgroundColor: `${getRarityColor(userMic.microphone.rarity)}20`,
                          color: getRarityColor(userMic.microphone.rarity),
                          textTransform: 'capitalize',
                        }}
                      />
                      {userMic.isEquipped && (
                        <Chip label="Equipped" size="small" color="primary" sx={{ ml: 1 }} />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {storeStore.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : availableForPurchase.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <FontAwesomeIcon
                icon={faShoppingCart}
                size="3x"
                color={theme.palette.text.secondary}
                style={{ marginBottom: 16 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                All Microphones Owned!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You have collected all available microphones. Check back later for new additions!
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {availableForPurchase.map((microphone) => (
                <Grid item xs={12} sm={6} md={4} key={microphone.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardMedia
                      component="img"
                      height="120"
                      image={microphone.imageUrl}
                      alt={microphone.name}
                      sx={{ objectFit: 'contain', p: 1 }}
                    />
                    <CardContent sx={{ flexGrow: 1, pt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <FontAwesomeIcon
                          icon={getRarityIcon(microphone.rarity)}
                          style={{ color: getRarityColor(microphone.rarity) }}
                        />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {microphone.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {microphone.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Chip
                          label={microphone.rarity}
                          size="small"
                          sx={{
                            backgroundColor: `${getRarityColor(microphone.rarity)}20`,
                            color: getRarityColor(microphone.rarity),
                            textTransform: 'capitalize',
                          }}
                        />
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <FontAwesomeIcon
                            icon={faCoins}
                            style={{ color: '#FFD700', fontSize: '14px' }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCoinPrice(microphone.coinPrice)}
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handlePurchase(microphone.id)}
                          disabled={
                            storeStore.coins < microphone.coinPrice ||
                            purchasingId === microphone.id ||
                            storeStore.isLoading
                          }
                          startIcon={
                            purchasingId === microphone.id ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : storeStore.coins < microphone.coinPrice ? (
                              <FontAwesomeIcon icon={faLock} />
                            ) : (
                              <FontAwesomeIcon icon={faShoppingCart} />
                            )
                          }
                        >
                          {storeStore.coins < microphone.coinPrice ? 'Not Enough' : 'Buy'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
});
