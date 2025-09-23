import {
  faCoins,
  faCrown,
  faMicrophone,
  faSearch,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { adminStore } from '@stores/AdminStore';
import { formatPrice } from '@utils/numberUtils';
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
      id={`store-management-tabpanel-${index}`}
      aria-labelledby={`store-management-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
  loading: boolean;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  itemName,
  itemType,
  loading,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: 'error.main' }}>
        <FontAwesomeIcon icon={faTrash} /> Delete {itemType}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete "{itemName}"? This action will:
        </DialogContentText>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ color: 'error.main', mb: 1 }}>
            • Permanently delete the database record
          </Typography>
          <Typography variant="body2" sx={{ color: 'error.main', mb: 1 }}>
            • Delete the associated image file from the server
          </Typography>
          <Typography variant="body2" sx={{ color: 'warning.main' }}>
            • This action cannot be undone
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <FontAwesomeIcon icon={faTrash} />}
        >
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const StoreManagement: React.FC = observer(() => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [searchTerms, setSearchTerms] = useState({
    avatars: '',
    microphones: '',
    coinPackages: '',
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    item: any;
    type: 'avatar' | 'microphone' | 'coinPackage';
  }>({
    open: false,
    item: null,
    type: 'avatar',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    // Load store items when component mounts
    adminStore.fetchStoreAvatars();
    adminStore.fetchStoreMicrophones();
    adminStore.fetchStoreCoinPackages();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearch = (type: 'avatars' | 'microphones' | 'coinPackages') => {
    const searchTerm = searchTerms[type];
    switch (type) {
      case 'avatars':
        adminStore.fetchStoreAvatars(1, 50, searchTerm);
        break;
      case 'microphones':
        adminStore.fetchStoreMicrophones(1, 50, searchTerm);
        break;
      case 'coinPackages':
        adminStore.fetchStoreCoinPackages(1, 50, searchTerm);
        break;
    }
  };

  const handleDelete = (item: any, type: 'avatar' | 'microphone' | 'coinPackage') => {
    setDeleteDialog({
      open: true,
      item,
      type,
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.item) return;

    setDeleteLoading(true);

    // Clear any previous errors
    adminStore.setTableError(null);

    try {
      console.log(`🗑️ Confirming delete for ${deleteDialog.type}:`, deleteDialog.item);

      switch (deleteDialog.type) {
        case 'avatar':
          await adminStore.deleteStoreAvatar(deleteDialog.item.id);
          break;
        case 'microphone':
          await adminStore.deleteStoreMicrophone(deleteDialog.item.id);
          break;
        case 'coinPackage':
          await adminStore.deleteStoreCoinPackage(deleteDialog.item.id);
          break;
      }

      console.log(`✅ Successfully deleted ${deleteDialog.type}: ${deleteDialog.item.name}`);
      setDeleteDialog({ open: false, item: null, type: 'avatar' });
    } catch (error: any) {
      console.error('Delete error in component:', error);
      // Error will be shown via adminStore.tableError
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderAvatarCard = (avatar: any) => (
    <Grid item xs={12} sm={6} md={4} lg={3} key={avatar.id}>
      <Card
        elevation={0}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          background: `linear-gradient(135deg, 
            ${theme.palette.background.paper} 0%, 
            ${theme.palette.background.default} 100%)`,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 32px ${theme.palette.primary.main}20`,
            border: `1px solid ${theme.palette.primary.main}40`,
          },
        }}
      >
        <CardMedia
          component="img"
          height="200"
          image={avatar.imageUrl}
          alt={avatar.name}
          sx={{ objectFit: 'contain', backgroundColor: 'grey.100' }}
        />
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom>
            {avatar.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {avatar.description || 'No description'}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Chip
              size="small"
              label={avatar.rarity}
              color={avatar.rarity === 'legendary' ? 'warning' : 'default'}
              sx={{ mr: 1 }}
            />
            <Chip
              size="small"
              label={avatar.isFree ? 'Free' : formatPrice(avatar.price)}
              color={avatar.isFree ? 'success' : 'primary'}
            />
          </Box>
        </CardContent>
        <CardActions>
          <IconButton size="small" color="error" onClick={() => handleDelete(avatar, 'avatar')}>
            <FontAwesomeIcon icon={faTrash} />
          </IconButton>
        </CardActions>
      </Card>
    </Grid>
  );

  const renderMicrophoneCard = (microphone: any) => (
    <Grid item xs={12} sm={6} md={4} lg={3} key={microphone.id}>
      <Card
        elevation={0}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          background: `linear-gradient(135deg, 
            ${theme.palette.background.paper} 0%, 
            ${theme.palette.background.default} 100%)`,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 32px ${theme.palette.primary.main}20`,
            border: `1px solid ${theme.palette.primary.main}40`,
          },
        }}
      >
        <CardMedia
          component="img"
          height="200"
          image={microphone.imageUrl}
          alt={microphone.name}
          sx={{ objectFit: 'contain', backgroundColor: 'grey.100' }}
        />
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom>
            {microphone.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {microphone.description || 'No description'}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Chip
              size="small"
              label={microphone.rarity}
              color={microphone.rarity === 'legendary' ? 'warning' : 'default'}
              sx={{ mr: 1 }}
            />
            <Chip
              size="small"
              label={microphone.isFree ? 'Free' : `${microphone.coinPrice} coins`}
              color={microphone.isFree ? 'success' : 'primary'}
            />
          </Box>
        </CardContent>
        <CardActions>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(microphone, 'microphone')}
          >
            <FontAwesomeIcon icon={faTrash} />
          </IconButton>
        </CardActions>
      </Card>
    </Grid>
  );

  const renderCoinPackageRow = (coinPackage: any) => (
    <TableRow key={coinPackage.id}>
      <TableCell>{coinPackage.name}</TableCell>
      <TableCell>{coinPackage.description || 'No description'}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FontAwesomeIcon
            icon={faCoins}
            style={{ marginRight: 8, color: theme.palette.warning.main }}
          />
          {coinPackage.coinAmount}
        </Box>
      </TableCell>
      <TableCell>{formatPrice(coinPackage.price)}</TableCell>
      <TableCell>
        <Chip
          size="small"
          label={coinPackage.isAvailable ? 'Available' : 'Unavailable'}
          color={coinPackage.isAvailable ? 'success' : 'error'}
        />
      </TableCell>
      <TableCell>
        <IconButton
          size="small"
          color="error"
          onClick={() => handleDelete(coinPackage, 'coinPackage')}
        >
          <FontAwesomeIcon icon={faTrash} />
        </IconButton>
      </TableCell>
    </TableRow>
  );

  return (
    <Box sx={{ width: '100%' }}>
      {adminStore.tableError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {adminStore.tableError}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          width: '100%',
          mb: 2,
          background: `linear-gradient(135deg, 
            ${theme.palette.background.paper} 0%, 
            ${theme.palette.background.default} 100%)`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            background: `linear-gradient(90deg, 
              ${theme.palette.background.paper} 0%, 
              ${theme.palette.background.default} 100%)`,
            '& .MuiTab-root': {
              fontWeight: 600,
              minHeight: 64,
              '&.Mui-selected': {
                color: theme.palette.primary.main,
                fontWeight: 700,
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            },
          }}
        >
          <Tab
            icon={<FontAwesomeIcon icon={faCrown} />}
            label={`Avatars (${adminStore.storeItems.avatars?.total || 0})`}
          />
          <Tab
            icon={<FontAwesomeIcon icon={faMicrophone} />}
            label={`Microphones (${adminStore.storeItems.microphones?.total || 0})`}
          />
          <Tab
            icon={<FontAwesomeIcon icon={faCoins} />}
            label={`Coin Packages (${adminStore.storeItems.coinPackages?.total || 0})`}
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2 }}>
            <TextField
              placeholder="Search avatars..."
              value={searchTerms.avatars}
              onChange={(e) => setSearchTerms({ ...searchTerms, avatars: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch('avatars')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faSearch} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={() => handleSearch('avatars')}>Search</Button>
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 400 }}
            />
          </Box>

          {adminStore.isLoadingTable ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {adminStore.storeItems.avatars?.items?.map(renderAvatarCard) || []}
              {adminStore.storeItems.avatars?.items?.length === 0 && (
                <Grid item xs={12}>
                  <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                    No avatars found
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2 }}>
            <TextField
              placeholder="Search microphones..."
              value={searchTerms.microphones}
              onChange={(e) => setSearchTerms({ ...searchTerms, microphones: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch('microphones')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faSearch} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={() => handleSearch('microphones')}>Search</Button>
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 400 }}
            />
          </Box>

          {adminStore.isLoadingTable ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {adminStore.storeItems.microphones?.items?.map(renderMicrophoneCard) || []}
              {adminStore.storeItems.microphones?.items?.length === 0 && (
                <Grid item xs={12}>
                  <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                    No microphones found
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2 }}>
            <TextField
              placeholder="Search coin packages..."
              value={searchTerms.coinPackages}
              onChange={(e) => setSearchTerms({ ...searchTerms, coinPackages: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch('coinPackages')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faSearch} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={() => handleSearch('coinPackages')}>Search</Button>
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 400 }}
            />
          </Box>

          {adminStore.isLoadingTable ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                background: `linear-gradient(135deg, 
                  ${theme.palette.background.paper} 0%, 
                  ${theme.palette.background.default} 100%)`,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Coin Amount</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adminStore.storeItems.coinPackages?.items?.map(renderCoinPackageRow) || []}
                  {adminStore.storeItems.coinPackages?.items?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                          No coin packages found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, item: null, type: 'avatar' })}
        onConfirm={confirmDelete}
        itemName={deleteDialog.item?.name || ''}
        itemType={deleteDialog.type}
        loading={deleteLoading}
      />
    </Box>
  );
});

export default StoreManagement;
