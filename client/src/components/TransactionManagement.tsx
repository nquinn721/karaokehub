import CustomModal from '@components/CustomModal';
import {
  faCoins,
  faFilter,
  faGift,
  faPlus,
  faRefresh,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
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
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { transactionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

// Fuzzy search utility function
const fuzzySearch = (query: string, text: string): { score: number; match: boolean } => {
  if (!query) return { score: 0, match: true };

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match gets highest score
  if (textLower.includes(queryLower)) {
    const index = textLower.indexOf(queryLower);
    return { score: 100 - index, match: true };
  }

  // Character-by-character fuzzy matching
  let queryIndex = 0;
  let matches = 0;
  const queryChars = queryLower.split('');

  for (let i = 0; i < textLower.length && queryIndex < queryChars.length; i++) {
    if (textLower[i] === queryChars[queryIndex]) {
      matches++;
      queryIndex++;
    }
  }

  if (queryIndex === queryChars.length) {
    // All query characters found in order
    const score = (matches / query.length) * 50; // Max 50 for fuzzy matches
    return { score, match: true };
  }

  return { score: 0, match: false };
};

const fuzzySearchUsers = (users: any[], query: string) => {
  if (!query) return users;

  return users
    .map((user) => {
      const nameResult = fuzzySearch(query, user.name);
      const emailResult = fuzzySearch(query, user.email);
      const bestScore = Math.max(nameResult.score, emailResult.score);

      return {
        ...user,
        fuzzyScore: bestScore,
        fuzzyMatch: nameResult.match || emailResult.match,
      };
    })
    .filter((user) => user.fuzzyMatch)
    .sort((a, b) => b.fuzzyScore - a.fuzzyScore);
};

interface AddCoinsDialogProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
}

const AddCoinsDialog = observer(({ open, onClose, userId, userName }: AddCoinsDialogProps) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!userId || !amount) return;

    setLoading(true);
    try {
      await transactionStore.addCoinsToUser(userId, parseInt(amount), description);
      onClose();
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Failed to add coins:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Coins to {userName}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Reason for adding coins..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!amount || loading}
          startIcon={<FontAwesomeIcon icon={faCoins} />}
        >
          Add Coins
        </Button>
      </DialogActions>
    </Dialog>
  );
});

interface AddRewardDialogProps {
  open: boolean;
  onClose: () => void;
}

const AddRewardDialog = observer(({ open, onClose }: AddRewardDialogProps) => {
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Get all users initially and use client-side fuzzy search
  const loadUsers = async () => {
    setSearchLoading(true);
    try {
      const users = await transactionStore.searchUsers(''); // Get all users
      setAllUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
      setAllUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (open && allUsers.length === 0) {
      loadUsers();
    }
  }, [open]);

  // Get filtered and sorted users using fuzzy search
  const filteredUsers = fuzzySearchUsers(allUsers, userSearch);

  const handleSubmit = async () => {
    if (!selectedUser || !amount) return;

    setLoading(true);
    try {
      await transactionStore.addRewardToUser(selectedUser.id, parseInt(amount), description);
      onClose();
      handleClose();
    } catch (error) {
      console.error('Failed to add reward:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedUser(null);
    setAmount('');
    setDescription('');
    setUserSearch('');
  };

  return (
    <CustomModal
      open={open}
      onClose={handleClose}
      title="Add Reward Coins to User"
      icon={<FontAwesomeIcon icon={faGift} />}
      maxWidth="sm"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Autocomplete
          fullWidth
          options={filteredUsers}
          getOptionLabel={(option) => `${option.name} (${option.email})`}
          value={selectedUser}
          onChange={(_, newValue) => setSelectedUser(newValue)}
          inputValue={userSearch}
          onInputChange={(_, newInputValue) => setUserSearch(newInputValue)}
          loading={searchLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search for user"
              placeholder="Type name or email for fuzzy search..."
              helperText="Supports fuzzy matching - try typing partial names or emails"
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {option.name}
                  {option.fuzzyScore && (
                    <Typography
                      component="span"
                      variant="caption"
                      color="primary"
                      sx={{ ml: 1, opacity: 0.7 }}
                    >
                      ({Math.round(option.fuzzyScore)}% match)
                    </Typography>
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.email} • Balance: {option.coinBalance || 0} coins
                </Typography>
              </Box>
            </Box>
          )}
          noOptionsText={
            userSearch.length === 0
              ? 'Start typing to search users...'
              : allUsers.length === 0
                ? 'Loading users...'
                : 'No users found matching your search'
          }
        />

        <TextField
          fullWidth
          label="Reward Amount (coins)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={!selectedUser}
          inputProps={{ min: 1 }}
          helperText={selectedUser ? 'Enter the number of coins to award' : 'Select a user first'}
        />

        <TextField
          fullWidth
          label="Reward Description"
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Reason for reward (e.g., contest winner, bug report, community contribution, etc.)"
          disabled={!selectedUser}
          helperText={
            selectedUser ? 'Explain why this user is receiving the reward' : 'Select a user first'
          }
        />

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
          <Button onClick={handleClose} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!selectedUser || !amount || loading}
            startIcon={<FontAwesomeIcon icon={faGift} />}
          >
            {loading ? 'Adding Reward...' : 'Add Reward'}
          </Button>
        </Box>
      </Box>
    </CustomModal>
  );
});

const TransactionManagement = observer(() => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [addCoinsDialog, setAddCoinsDialog] = useState<{
    open: boolean;
    userId?: string;
    userName?: string;
  }>({ open: false });
  const [addRewardDialog, setAddRewardDialog] = useState(false);

  useEffect(() => {
    transactionStore.fetchTransactions();
    transactionStore.fetchStatistics();
  }, []);

  const handleRefresh = () => {
    transactionStore.fetchTransactions();
    transactionStore.fetchStatistics();
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredTransactions = transactionStore.transactions.filter((transaction) => {
    const matchesSearch =
      transaction.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.description &&
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const paginatedTransactions = filteredTransactions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'coin_purchase':
        return 'success';
      case 'microphone_purchase':
        return 'primary';
      case 'reward':
        return 'info';
      case 'refund':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'refunded':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" component="div">
                    {transactionStore.statistics?.totalTransactions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Transactions
                  </Typography>
                </Box>
                <FontAwesomeIcon icon={faCoins} color={theme.palette.primary.main} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" component="div">
                    {formatCurrency(transactionStore.statistics?.totalRevenue || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                </Box>
                <FontAwesomeIcon icon={faCoins} color={theme.palette.success.main} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" component="div">
                    {transactionStore.statistics?.pendingTransactions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                </Box>
                <FontAwesomeIcon icon={faFilter} color={theme.palette.warning.main} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" component="div">
                    {transactionStore.statistics?.failedTransactions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed
                  </Typography>
                </Box>
                <FontAwesomeIcon icon={faFilter} color={theme.palette.error.main} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <FontAwesomeIcon icon={faSearch} style={{ marginRight: 8 }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="refunded">Refunded</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="coin_purchase">Coin Purchase</MenuItem>
                <MenuItem value="microphone_purchase">Microphone Purchase</MenuItem>
                <MenuItem value="reward">Reward</MenuItem>
                <MenuItem value="refund">Refund</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleRefresh}
                startIcon={<FontAwesomeIcon icon={faRefresh} />}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                onClick={() => setAddRewardDialog(true)}
                startIcon={<FontAwesomeIcon icon={faGift} />}
              >
                Add Reward
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Transactions Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactionStore.loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.id}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {transaction.user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {transaction.user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.type}
                        color={getTypeColor(transaction.type) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        color={transaction.type === 'refund' ? 'error' : 'success'}
                        fontWeight="medium"
                      >
                        {transaction.type === 'refund' ? '-' : '+'}
                        {transaction.priceUSD
                          ? formatCurrency(transaction.priceUSD)
                          : `${transaction.coinAmount} coins`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.status}
                        color={getStatusColor(transaction.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {transaction.description || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(transaction.createdAt).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setAddCoinsDialog({
                            open: true,
                            userId: transaction.user.id,
                            userName: transaction.user.name,
                          })
                        }
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredTransactions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </TableContainer>
      </Paper>

      {/* Error Display */}
      {transactionStore.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {transactionStore.error}
        </Alert>
      )}

      {/* Add Coins Dialog */}
      <AddCoinsDialog
        open={addCoinsDialog.open}
        onClose={() => setAddCoinsDialog({ open: false })}
        userId={addCoinsDialog.userId}
        userName={addCoinsDialog.userName}
      />

      {/* Add Reward Dialog */}
      <AddRewardDialog open={addRewardDialog} onClose={() => setAddRewardDialog(false)} />
    </Box>
  );
});

export default TransactionManagement;
