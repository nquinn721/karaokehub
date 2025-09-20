import {
  faArrowDown,
  faArrowUp,
  faCoins,
  faEdit,
  faEye,
  faFilter,
  faPlus,
  faRefresh,
  faSearch,
  faTimes,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
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
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { transactionStore } from '@stores/TransactionStore';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

const TransactionManagement: React.FC = observer(() => {
  const theme = useTheme();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addCoinsDialogOpen, setAddCoinsDialogOpen] = useState(false);
  const [setCoinsDialogOpen, setSetCoinsDialogOpen] = useState(false);
  const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  
  // Form states
  const [coinAmount, setCoinAmount] = useState<number>(0);
  const [description, setDescription] = useState('');

  useEffect(() => {
    transactionStore.fetchTransactions();
    transactionStore.fetchTransactionStatistics();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    transactionStore.setFilters({ [key]: value });
    if (key !== 'search') {
      transactionStore.fetchTransactions(1);
    }
  };

  const handleSearchSubmit = () => {
    transactionStore.fetchTransactions(1);
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    transactionStore.fetchTransactions(newPage + 1);
  };

  const handleAddCoins = async () => {
    if (!selectedUserId || coinAmount <= 0) return;
    
    try {
      await transactionStore.addCoinsToUser(selectedUserId, coinAmount, description);
      setAddCoinsDialogOpen(false);
      setCoinAmount(0);
      setDescription('');
      setSelectedUserId('');
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleSetCoins = async () => {
    if (!selectedUserId || coinAmount < 0) return;
    
    try {
      await transactionStore.updateUserCoins(selectedUserId, coinAmount, description);
      setSetCoinsDialogOpen(false);
      setCoinAmount(0);
      setDescription('');
      setSelectedUserId('');
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleViewUserDetails = async (userId: string) => {
    setSelectedUserId(userId);
    await transactionStore.fetchUserTransactions(userId);
    setUserDetailsDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Transaction Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<FontAwesomeIcon icon={faPlus} />}
            onClick={() => setAddCoinsDialogOpen(true)}
          >
            Add Coins
          </Button>
          <Button
            variant="outlined"
            startIcon={<FontAwesomeIcon icon={faEdit} />}
            onClick={() => setSetCoinsDialogOpen(true)}
          >
            Set Coins
          </Button>
          <IconButton
            onClick={() => {
              transactionStore.fetchTransactions();
              transactionStore.fetchTransactionStatistics();
            }}
          >
            <FontAwesomeIcon icon={faRefresh} />
          </IconButton>
        </Box>
      </Box>

      {transactionStore.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {transactionStore.error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {transactionStore.statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="overline">
                      Total Transactions
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {transactionStore.statistics.totalTransactions.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    📊
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="overline">
                      Coins Distributed
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {transactionStore.statistics.totalCoinsDistributed.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, #FFD700, #FFA500)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <FontAwesomeIcon icon={faCoins} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="overline">
                      Coins Spent
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {transactionStore.statistics.totalCoinsSpent.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, #FF6B6B, #FF8E53)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    🛒
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="overline">
                      Pending
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {transactionStore.statistics.pendingTransactions.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    ⏳
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FontAwesomeIcon icon={faFilter} />
          <Typography variant="h6">Filters</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search transactions..."
              value={transactionStore.filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faSearch} />
                  </InputAdornment>
                ),
                endAdornment: transactionStore.filters.search && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => handleFilterChange('search', '')}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={transactionStore.filters.type}
                label="Type"
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="coin_purchase">Coin Purchase</MenuItem>
                <MenuItem value="microphone_purchase">Microphone Purchase</MenuItem>
                <MenuItem value="reward">Reward</MenuItem>
                <MenuItem value="refund">Refund</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={transactionStore.filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="refunded">Refunded</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={transactionStore.filters.sortBy}
                label="Sort By"
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <MenuItem value="createdAt">Date</MenuItem>
                <MenuItem value="coinAmount">Amount</MenuItem>
                <MenuItem value="type">Type</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Order</InputLabel>
              <Select
                value={transactionStore.filters.sortOrder}
                label="Order"
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              >
                <MenuItem value="DESC">Newest First</MenuItem>
                <MenuItem value="ASC">Oldest First</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<FontAwesomeIcon icon={faSearch} />}
            onClick={handleSearchSubmit}
          >
            Search
          </Button>
        </Box>
      </Paper>

      {/* Transactions Table */}
      <Paper elevation={1}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={transactionStore.filters.sortBy === 'createdAt'}
                    direction={transactionStore.filters.sortOrder.toLowerCase() as any}
                  >
                    Date
                  </TableSortLabel>
                </TableCell>
                <TableCell>User</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={transactionStore.filters.sortBy === 'type'}
                    direction={transactionStore.filters.sortOrder.toLowerCase() as any}
                  >
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={transactionStore.filters.sortBy === 'status'}
                    direction={transactionStore.filters.sortOrder.toLowerCase() as any}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={transactionStore.filters.sortBy === 'coinAmount'}
                    direction={transactionStore.filters.sortOrder.toLowerCase() as any}
                  >
                    Coins
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">USD</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactionStore.isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : transactionStore.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary">No transactions found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                transactionStore.transactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(transaction.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {transaction.user ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {transaction.user.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {transaction.user.email}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          User ID: {transaction.userId}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<span>{transactionStore.getTransactionTypeIcon(transaction.type)}</span>}
                        label={transaction.type.replace('_', ' ').toUpperCase()}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.status.toUpperCase()}
                        size="small"
                        color={transactionStore.getTransactionStatusColor(transaction.status) as any}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <FontAwesomeIcon 
                          icon={transaction.coinAmount >= 0 ? faArrowUp : faArrowDown}
                          color={transaction.coinAmount >= 0 ? 'green' : 'red'}
                          size="sm"
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: transaction.coinAmount >= 0 ? 'success.main' : 'error.main',
                          }}
                        >
                          {transactionStore.formatCoinAmount(transaction.coinAmount)}
                        </Typography>
                        <FontAwesomeIcon icon={faCoins} style={{ color: '#FFD700', fontSize: '14px' }} />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {transaction.priceUSD ? formatCurrency(transaction.priceUSD) : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }}>
                        {transaction.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View User Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewUserDetails(transaction.userId)}
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {transactionStore.transactions.length > 0 && (
          <TablePagination
            component="div"
            count={transactionStore.totalTransactions}
            page={transactionStore.currentPage - 1}
            onPageChange={handlePageChange}
            rowsPerPage={25}
            rowsPerPageOptions={[25]}
          />
        )}
      </Paper>

      {/* Add Coins Dialog */}
      <Dialog open={addCoinsDialogOpen} onClose={() => setAddCoinsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Coins to User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="User ID"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              placeholder="Enter user ID"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faUser} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Coin Amount"
              type="number"
              value={coinAmount}
              onChange={(e) => setCoinAmount(Number(e.target.value))}
              inputProps={{ min: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faCoins} style={{ color: '#FFD700' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reason for adding coins"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCoinsDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAddCoins}
            disabled={!selectedUserId || coinAmount <= 0 || transactionStore.isLoading}
          >
            {transactionStore.isLoading ? <CircularProgress size={20} /> : 'Add Coins'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Set Coins Dialog */}
      <Dialog open={setCoinsDialogOpen} onClose={() => setSetCoinsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set User Coin Balance</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="User ID"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              placeholder="Enter user ID"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faUser} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="New Coin Balance"
              type="number"
              value={coinAmount}
              onChange={(e) => setCoinAmount(Number(e.target.value))}
              inputProps={{ min: 0 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faCoins} style={{ color: '#FFD700' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reason for setting coins"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSetCoinsDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSetCoins}
            disabled={!selectedUserId || coinAmount < 0 || transactionStore.isLoading}
          >
            {transactionStore.isLoading ? <CircularProgress size={20} /> : 'Set Balance'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog 
        open={userDetailsDialogOpen} 
        onClose={() => setUserDetailsDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>User Transaction Details</DialogTitle>
        <DialogContent>
          {transactionStore.userTransactionData && (
            <Box sx={{ pt: 1 }}>
              {/* User Info */}
              <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>User Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Name</Typography>
                    <Typography variant="body1">{transactionStore.userTransactionData.user.name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Email</Typography>
                    <Typography variant="body1">{transactionStore.userTransactionData.user.email}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Current Balance</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {transactionStore.userTransactionData.user.coins.toLocaleString()}
                      </Typography>
                      <FontAwesomeIcon icon={faCoins} style={{ color: '#FFD700' }} />
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Account Status</Typography>
                    <Chip
                      label={transactionStore.userTransactionData.user.isActive ? 'Active' : 'Inactive'}
                      color={transactionStore.userTransactionData.user.isActive ? 'success' : 'error'}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Recent Transactions */}
              <Typography variant="h6" gutterBottom>Recent Transactions</Typography>
              <TableContainer component={Paper} elevation={1}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Coins</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactionStore.userTransactionData.transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary">No transactions found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactionStore.userTransactionData.transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(transaction.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<span>{transactionStore.getTransactionTypeIcon(transaction.type)}</span>}
                              label={transaction.type.replace('_', ' ')}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={transaction.status}
                              size="small"
                              color={transactionStore.getTransactionStatusColor(transaction.status) as any}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                              <FontAwesomeIcon 
                                icon={transaction.coinAmount >= 0 ? faArrowUp : faArrowDown}
                                color={transaction.coinAmount >= 0 ? 'green' : 'red'}
                                size="sm"
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  color: transaction.coinAmount >= 0 ? 'success.main' : 'error.main',
                                }}
                              >
                                {transactionStore.formatCoinAmount(transaction.coinAmount)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 200 }}>
                              {transaction.description || '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default TransactionManagement;