import {
  faCheck,
  faCheckCircle,
  faClipboardList,
  faComment,
  faCopy,
  faEdit,
  faExclamationTriangle,
  faEye,
  faMapMarkerAlt,
  faMicrophone,
  faMusic,
  faRefresh,
  faSearch,
  faTimes,
  faTrash,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type {
  AdminDJ,
  AdminFeedback,
  AdminShow,
  AdminShowReview,
  AdminUser,
  AdminVendor,
  AdminVenue,
} from '@stores/AdminStore';
import { adminStore, authStore, uiStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import CustomModal from './CustomModal';
import { ShowCleanupResultsModal } from './modals/ShowCleanupResultsModal';
import { UserFeatureOverrideModal } from './UserFeatureOverrideModal';

// Helper function to get venue name from AdminShow
const getAdminShowVenueName = (show: AdminShow): string => {
  if (show.venue && typeof show.venue === 'object') {
    return show.venue.name || 'Unknown Venue';
  }
  if (show.venue && typeof show.venue === 'string') {
    return show.venue;
  }
  return 'N/A';
};

// Helper function to get venue address from AdminShow
const getAdminShowVenueAddress = (show: AdminShow): string | null => {
  if (show.venue && typeof show.venue === 'object') {
    return show.venue.address || null;
  }
  return null;
};

// Helper function to get venue location (city, state, zip) from AdminShow
const getAdminShowVenueLocation = (show: AdminShow): string | null => {
  if (show.venue && typeof show.venue === 'object') {
    const parts = [show.venue.city, show.venue.state, show.venue.zip].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }
  return null;
};

// Helper function to get venue coordinates from AdminShow
const getAdminShowVenueCoordinates = (show: AdminShow): { lat: number; lng: number } | null => {
  if (show.venue && typeof show.venue === 'object' && show.venue.lat && show.venue.lng) {
    const lat = parseFloat(show.venue.lat);
    const lng = parseFloat(show.venue.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  return null;
};

// Helper function to get venue phone from AdminShow
const getAdminShowVenuePhone = (show: AdminShow): string | null => {
  if (show.venue && typeof show.venue === 'object') {
    return show.venue.phone || null;
  }
  return null;
};

// Helper function to get venue website from AdminShow
const getAdminShowVenueWebsite = (show: AdminShow): string | null => {
  if (show.venue && typeof show.venue === 'object') {
    return show.venue.website || null;
  }
  return null;
};

// Separate non-observer component for search input to prevent focus loss
// Non-observer component for stable search input
const IsolatedSearchInput = React.memo(
  ({
    table,
    placeholder,
    onSearch,
    onEnter,
    onRefresh,
  }: {
    table: string;
    placeholder: string;
    onSearch: (table: string, value: string) => void;
    onEnter: (table: string, value: string) => void;
    onRefresh: (table: string, value: string) => void;
  }) => {
    const [localValue, setLocalValue] = useState('');

    return (
      <TextField
        size="small"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => {
          const newValue = e.target.value;
          setLocalValue(newValue);
          onSearch(table, newValue);
        }}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            onEnter(table, localValue);
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <FontAwesomeIcon icon={faSearch} size="sm" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => onRefresh(table, localValue)}>
                <FontAwesomeIcon icon={faRefresh} size="xs" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 250 }}
      />
    );
  },
);

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
      id={`data-tabpanel-${index}`}
      aria-labelledby={`data-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminDataTables: React.FC = observer(() => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({
    users: '',
    venues: '',
    shows: '',
    djs: '',
    feedback: '',
    reviews: '',
  });

  // Separate state for immediate input values (prevents focus loss)
  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({
    users: '',
    venues: '',
    shows: '',
    djs: '',
    feedback: '',
    reviews: '',
  });

  const [pages, setPages] = useState<Record<string, number>>({
    users: 0,
    venues: 0,
    shows: 0,
    djs: 0,
    feedback: 0,
    reviews: 0,
  });
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting state
  const [sortBy, setSortBy] = useState<Record<string, string>>({
    users: '',
    venues: '',
    shows: '',
    djs: '',
    feedback: '',
    reviews: '',
  });

  const [sortOrder, setSortOrder] = useState<Record<string, 'ASC' | 'DESC'>>({
    users: 'ASC',
    venues: 'ASC',
    shows: 'ASC',
    djs: 'ASC',
    feedback: 'ASC',
    reviews: 'ASC',
  });

  // Edit state
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editType, setEditType] = useState<
    'venue' | 'show' | 'dj' | 'vendor' | 'feedback' | 'reviews' | null
  >(null);

  // Feedback view state
  const [viewingFeedback, setViewingFeedback] = useState<AdminFeedback | null>(null);

  // Show review states
  const [reviewingShowReview, setReviewingShowReview] = useState<AdminShowReview | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'decline' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // User image view state
  const [viewingUserImage, setViewingUserImage] = useState<{
    src: string;
    userName: string;
  } | null>(null);

  // User feature override modal state
  const [userOverrideModalOpen, setUserOverrideModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Deduplication state
  const [dedupeDialogOpen, setDedupeDialogOpen] = useState(false);
  const [dedupeType, setDedupeType] = useState<'venues' | 'shows' | 'djs' | 'vendors' | null>(null);
  const [duplicatesFound, setDuplicatesFound] = useState<any[]>([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  const [dedupeLoading, setDedupeLoading] = useState(false);

  // Deduplication results modal state
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [dedupeResults, setDedupeResults] = useState<{
    deletedCount: number;
    deletedRecords: any[];
    type: string;
  } | null>(null);

  // Deduplication error dialog state
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Show cleanup state
  const [showCleanupResults, setShowCleanupResults] = useState<any>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearch = useCallback((table: string, term: string) => {
    // Update input value immediately (this prevents focus loss)
    setSearchInputs((prev) => ({ ...prev, [table]: term }));

    // Also update search terms for immediate use but don't trigger page reset yet
    // The debounced effect will handle the actual search and page reset
  }, []);

  // Debounced search effect - updates searchTerms after 500ms delay
  useEffect(() => {
    const timeouts: Record<string, ReturnType<typeof setTimeout>> = {};

    Object.keys(searchInputs).forEach((table) => {
      timeouts[table] = setTimeout(() => {
        if (searchInputs[table] !== searchTerms[table]) {
          setSearchTerms((prev) => ({ ...prev, [table]: searchInputs[table] }));
          setPages((prev) => ({ ...prev, [table]: 0 }));
        }
      }, 500);
    });

    return () => {
      Object.values(timeouts).forEach((timeout) => clearTimeout(timeout));
    };
  }, [searchInputs]);

  // Trigger data fetch when searchTerms actually change
  useEffect(() => {
    if (!authStore.isAuthenticated || !authStore.user?.isAdmin) {
      return;
    }

    const tables = ['users', 'venues', 'shows', 'djs', 'vendors', 'feedback', 'reviews'];
    const currentTable = tables[tabValue];
    if (currentTable) {
      fetchData(currentTable, pages[currentTable] || 0, searchTerms[currentTable] || undefined);
    }
  }, [searchTerms, tabValue, pages, rowsPerPage, sortBy, sortOrder]);

  const handlePageChange = (table: string, newPage: number) => {
    setPages((prev) => ({ ...prev, [table]: newPage }));
  };

  const handleSort = (table: string, column: string) => {
    setSortBy((prev) => ({ ...prev, [table]: column }));
    setSortOrder((prev) => ({
      ...prev,
      [table]: prev[table] === 'ASC' && sortBy[table] === column ? 'DESC' : 'ASC',
    }));
    // Reset page to first when sorting
    setPages((prev) => ({ ...prev, [table]: 0 }));
  };

  const fetchData = async (table: string, page: number, search?: string) => {
    // Don't fetch if not authenticated or not admin
    if (!authStore.isAuthenticated || !authStore.user?.isAdmin) {
      return;
    }

    const currentSortBy = sortBy[table] || undefined;
    const currentSortOrder = sortOrder[table] || 'ASC';

    switch (table) {
      case 'users':
        await adminStore.fetchUsers(page + 1, rowsPerPage, search, currentSortBy, currentSortOrder);
        break;
      case 'venues':
        await adminStore.fetchVenues(
          page + 1,
          rowsPerPage,
          search,
          currentSortBy,
          currentSortOrder,
        );
        break;
      case 'shows':
        await adminStore.fetchShows(page + 1, rowsPerPage, search, currentSortBy, currentSortOrder);
        break;
      case 'djs':
        await adminStore.fetchDjs(page + 1, rowsPerPage, search, currentSortBy, currentSortOrder);
        break;
      case 'vendors':
        await adminStore.fetchVendors(page + 1, rowsPerPage, search);
        break;
      case 'feedback':
        await adminStore.fetchFeedback(page + 1, rowsPerPage, search);
        break;
      case 'reviews':
        await adminStore.fetchShowReviews(page + 1, rowsPerPage, search);
        break;
    }
  };

  // Action handlers
  const handleEdit = (item: any, type: 'venue' | 'show' | 'dj' | 'vendor' | 'feedback') => {
    setEditingItem(item);
    setEditType(type);
  };

  const handleDelete = async (item: any, type: 'venue' | 'show' | 'dj' | 'vendor' | 'feedback') => {
    try {
      // Show loading notification
      uiStore.addNotification(`Deleting ${type}...`, 'info');

      // Perform the deletion
      switch (type) {
        case 'venue':
          await adminStore.deleteVenue(item.id);
          break;
        case 'show':
          await adminStore.deleteShow(item.id);
          break;
        case 'dj':
          await adminStore.deleteDj(item.id);
          break;
        case 'vendor':
          await adminStore.deleteVendor(item.id);
          break;
        case 'feedback':
          await adminStore.deleteFeedback(item.id);
          break;
      }

      // Show success notification
      uiStore.addNotification(
        `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`,
        'success',
      );

      // Refresh statistics to update tab counts
      await adminStore.fetchStatistics();

      // Refresh the current tab's data
      const tables = ['users', 'venues', 'shows', 'djs', 'vendors', 'feedback'];
      const currentTable = tables[tabValue];
      if (currentTable) {
        fetchData(currentTable, pages[currentTable] || 0, searchTerms[currentTable] || undefined);
      }

      // If we deleted a venue, also refresh shows and djs data if they're loaded
      // since venues can have related shows and djs
      if (type === 'venue') {
        if (adminStore.shows) {
          await adminStore.fetchShows(
            adminStore.shows.page || 1,
            adminStore.shows.limit || 10,
            searchTerms.shows || undefined,
          );
        }
        if (adminStore.djs) {
          await adminStore.fetchDjs(
            adminStore.djs.page || 1,
            adminStore.djs.limit || 10,
            searchTerms.djs || undefined,
          );
        }
      }
    } catch (error) {
      console.error('Delete failed:', error);

      // Show user-friendly error notification
      let errorMessage = `Failed to delete ${type}`;
      const errorObj = error as any;
      if (errorObj?.message?.includes('Unauthorized')) {
        errorMessage = 'You are not authorized to perform this action. Please log in as an admin.';
      } else if (errorObj?.message?.includes('Internal server error')) {
        errorMessage = `Cannot delete this ${type} because it has related data. Please remove related data first.`;
      } else if (errorObj?.message) {
        errorMessage = errorObj.message;
      }

      uiStore.addNotification(errorMessage, 'error');
    }
  };

  const handleViewFeedback = (feedback: AdminFeedback) => {
    setViewingFeedback(feedback);
  };

  const handleViewUserImage = (src: string, userName: string) => {
    setViewingUserImage({ src, userName });
  };

  const handleDeleteFeedback = async (feedback: AdminFeedback) => {
    await handleDelete(feedback, 'feedback');
  };

  const handleOpenUserOverrideModal = (user: AdminUser) => {
    setSelectedUser(user);
    setUserOverrideModalOpen(true);
  };

  const handleCloseUserOverrideModal = () => {
    setUserOverrideModalOpen(false);
    setSelectedUser(null);
  };

  // Deduplication handlers
  const handleStartDeduplication = async (type: 'venues' | 'shows' | 'djs' | 'vendors') => {
    try {
      setDedupeLoading(true);
      setDedupeType(type);

      let result;
      switch (type) {
        case 'venues':
          result = await adminStore.analyzeVenueDuplicates();
          break;
        case 'shows':
          result = await adminStore.analyzeShowDuplicates();
          break;
        case 'djs':
          result = await adminStore.analyzeDjDuplicates();
          break;
        case 'vendors':
          result = await adminStore.analyzeVendorDuplicates();
          break;
      }

      if (result.duplicateGroups && result.duplicateGroups.length > 0) {
        setDuplicatesFound(result.duplicateGroups);
        setDedupeDialogOpen(true);
      } else {
        setErrorMessage('No duplicates found!');
        setErrorDialogOpen(true);
      }
    } catch (error: any) {
      setErrorMessage(`Error analyzing duplicates: ${error.message}`);
      setErrorDialogOpen(true);
    } finally {
      setDedupeLoading(false);
    }
  };

  const handleExecuteDeduplication = async () => {
    if (!dedupeType || selectedDuplicates.length === 0) return;

    // Prepare the records that will be deleted for the results
    const recordsToDelete = duplicatesFound.flatMap((group) =>
      group.records.filter((record: any) => selectedDuplicates.includes(record.id)),
    );

    try {
      setDedupeLoading(true);
      await adminStore.executeDuplicateDeletion(dedupeType, selectedDuplicates);

      // Store results for the modal
      setDedupeResults({
        deletedCount: selectedDuplicates.length,
        deletedRecords: recordsToDelete,
        type: dedupeType,
      });

      // Close the selection dialog and show results modal
      setDedupeDialogOpen(false);
      setSelectedDuplicates([]);
      setDuplicatesFound([]);
      setResultsModalOpen(true);
    } catch (error: any) {
      setErrorMessage(`Error deleting duplicates: ${error.message}`);
      setErrorDialogOpen(true);
    } finally {
      setDedupeLoading(false);
    }
  };

  const handleCloseDedupe = () => {
    setDedupeDialogOpen(false);
    setSelectedDuplicates([]);
    setDuplicatesFound([]);
    setDedupeType(null);
  };

  const handleCloseResultsModal = () => {
    setResultsModalOpen(false);
    setDedupeResults(null);
    setDedupeType(null);
  };

  const handleCloseErrorDialog = () => {
    setErrorDialogOpen(false);
    setErrorMessage('');
  };

  const handleDuplicateSelection = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedDuplicates((prev) => [...prev, id]);
    } else {
      setSelectedDuplicates((prev) => prev.filter((dupId) => dupId !== id));
    }
  };

  const handleShowCleanup = async () => {
    try {
      uiStore.addNotification('Starting show cleanup...', 'info');
      const results = await adminStore.cleanupShowsSimple();
      setShowCleanupResults(results);
      uiStore.addNotification('Show cleanup completed successfully!', 'success');
    } catch (error: any) {
      uiStore.addNotification('Error during show cleanup: ' + (error?.message || error), 'error');
    }
  };

  useEffect(() => {
    // Only fetch data if user is authenticated and is admin
    if (!authStore.isAuthenticated || !authStore.user?.isAdmin) {
      return;
    }

    // Load statistics to show counts in tabs
    if (!adminStore.statistics) {
      adminStore.fetchStatistics();
    }

    // Initial load when tab changes (without search terms initially)
    const tables = ['users', 'venues', 'shows', 'djs', 'vendors', 'feedback', 'reviews'];
    const currentTable = tables[tabValue];
    if (currentTable && !searchTerms[currentTable]) {
      fetchData(currentTable, pages[currentTable] || 0);
    }
  }, [tabValue, rowsPerPage]);

  // Create stable search field render function
  const SearchField = useCallback(
    ({ table, placeholder }: { table: string; placeholder: string }) => (
      <IsolatedSearchInput
        table={table}
        placeholder={placeholder}
        onSearch={(table, value) => handleSearch(table, value)}
        onEnter={(table, value) => {
          setSearchTerms((prev) => ({ ...prev, [table]: value }));
          setPages((prev) => ({ ...prev, [table]: 0 }));
        }}
        onRefresh={(table, value) => {
          setSearchTerms((prev) => ({ ...prev, [table]: value }));
          fetchData(table, pages[table] || 0, value || undefined);
        }}
      />
    ),
    [handleSearch, fetchData, setSearchTerms, setPages],
  );

  const DedupeButton = ({
    type,
    label,
  }: {
    type: 'venues' | 'shows' | 'djs' | 'vendors';
    label: string;
  }) => (
    <Tooltip title={`Find and remove duplicate ${label.toLowerCase()}`}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<FontAwesomeIcon icon={faCopy} />}
        onClick={() => handleStartDeduplication(type)}
        disabled={dedupeLoading}
        sx={{ ml: 1 }}
      >
        {dedupeLoading && dedupeType === type ? <CircularProgress size={16} /> : 'Dedupe'}
      </Button>
    </Tooltip>
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const PaginationControls = ({ table, data }: { table: string; data: any }) =>
    data && (
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={data.total}
        rowsPerPage={rowsPerPage}
        page={pages[table] || 0}
        onPageChange={(_event, newPage) => handlePageChange(table, newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPages((prev) => ({ ...prev, [table]: 0 }));
        }}
      />
    );

  return (
    <Box>
      {/* Enhanced Header with Tabs */}
      <Box sx={{ p: 4, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <FontAwesomeIcon icon={faUsers} size="lg" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              Data Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage users, venues, shows, DJs, and feedback
            </Typography>
          </Box>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 60,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.95rem',
              },
              '& .Mui-selected': {
                color: theme.palette.primary.main,
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              },
            }}
          >
            <Tab
              icon={<FontAwesomeIcon icon={faUsers} />}
              label={`Users${adminStore.statistics?.totalUsers ? ` (${adminStore.statistics.totalUsers})` : ''}`}
            />
            <Tab
              icon={<FontAwesomeIcon icon={faMapMarkerAlt} />}
              label={`Venues${adminStore.statistics?.totalVenues ? ` (${adminStore.statistics.totalVenues})` : ''}`}
            />
            <Tab
              icon={<FontAwesomeIcon icon={faMusic} />}
              label={`Shows${adminStore.statistics?.totalShows ? ` (${adminStore.statistics.totalShows})` : ''}`}
            />
            <Tab
              icon={<FontAwesomeIcon icon={faMicrophone} />}
              label={`DJs${adminStore.statistics?.totalDJs ? ` (${adminStore.statistics.totalDJs})` : ''}`}
            />
            <Tab
              icon={<FontAwesomeIcon icon={faUsers} />}
              label={`Vendors${adminStore.statistics?.totalVendors ? ` (${adminStore.statistics.totalVendors})` : ''}`}
            />
            <Tab
              icon={<FontAwesomeIcon icon={faComment} />}
              label={`Feedback${adminStore.statistics?.totalFeedback ? ` (${adminStore.statistics.totalFeedback})` : ''}`}
            />
            <Tab
              icon={<FontAwesomeIcon icon={faClipboardList} />}
              label={`Reviews${adminStore.statistics?.pendingShowReviews ? ` (${adminStore.statistics.pendingShowReviews})` : ''}`}
            />
          </Tabs>
        </Box>
      </Box>

      {adminStore.tableError && (
        <Alert severity="error" sx={{ mx: 4, mt: 2, borderRadius: 2 }}>
          {adminStore.tableError}
        </Alert>
      )}

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Users Management</Typography>
          <SearchField table="users" placeholder="Search users..." />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.users === 'name'}
                    direction={
                      sortBy.users === 'name'
                        ? (sortOrder.users.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('users', 'name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.users === 'stageName'}
                    direction={
                      sortBy.users === 'stageName'
                        ? (sortOrder.users.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('users', 'stageName')}
                  >
                    Stage Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.users === 'email'}
                    direction={
                      sortBy.users === 'email'
                        ? (sortOrder.users.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('users', 'email')}
                  >
                    Email
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.users === 'provider'}
                    direction={
                      sortBy.users === 'provider'
                        ? (sortOrder.users.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('users', 'provider')}
                  >
                    Provider
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.users === 'isAdmin'}
                    direction={
                      sortBy.users === 'isAdmin'
                        ? (sortOrder.users.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('users', 'isAdmin')}
                  >
                    Admin
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.users === 'isActive'}
                    direction={
                      sortBy.users === 'isActive'
                        ? (sortOrder.users.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('users', 'isActive')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.users === 'createdAt'}
                    direction={
                      sortBy.users === 'createdAt'
                        ? (sortOrder.users.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('users', 'createdAt')}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.isLoadingTable ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                adminStore.users?.items.map((user: AdminUser) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {user.avatar && (
                          <Tooltip title="Click to view larger image">
                            <Box
                              component="img"
                              src={user.avatar}
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease-in-out',
                                '&:hover': {
                                  transform: 'scale(1.1)',
                                },
                              }}
                              alt="Avatar"
                              onClick={() => handleViewUserImage(user.avatar!, user.name || 'User')}
                            />
                          </Tooltip>
                        )}
                        {user.name || 'N/A'}
                      </Box>
                    </TableCell>
                    <TableCell>{user.stageName || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.provider ? (
                        <Chip
                          label={user.provider}
                          size="small"
                          color={
                            user.provider === 'google'
                              ? 'primary'
                              : user.provider === 'facebook'
                                ? 'info'
                                : 'default'
                          }
                        />
                      ) : (
                        'Email'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isAdmin ? 'Admin' : 'User'}
                        color={user.isAdmin ? 'warning' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenUserOverrideModal(user)}
                        color="primary"
                        title="Manage Feature Overrides"
                      >
                        <FontAwesomeIcon icon={faEdit} style={{ fontSize: '14px' }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationControls table="users" data={adminStore.users} />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Venues Management</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SearchField table="venues" placeholder="Search venues..." />
            <DedupeButton type="venues" label="Venues" />
          </Box>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.venues === 'name'}
                    direction={
                      sortBy.venues === 'name'
                        ? (sortOrder.venues.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('venues', 'name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>Location</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.venues === 'website'}
                    direction={
                      sortBy.venues === 'website'
                        ? (sortOrder.venues.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('venues', 'website')}
                  >
                    Website
                  </TableSortLabel>
                </TableCell>
                <TableCell>Social</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.venues === 'showCount'}
                    direction={
                      sortBy.venues === 'showCount'
                        ? (sortOrder.venues.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('venues', 'showCount')}
                  >
                    Shows
                  </TableSortLabel>
                </TableCell>
                <TableCell>DJs</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Parsed</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.venues === 'createdAt'}
                    direction={
                      sortBy.venues === 'createdAt'
                        ? (sortOrder.venues.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('venues', 'createdAt')}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.isLoadingTable ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                adminStore.venues?.items.map((venue: AdminVenue) => (
                  <TableRow key={venue.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{venue.name}</Typography>
                        {venue.description && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', maxWidth: 200 }}
                          >
                            {venue.description.length > 50
                              ? `${venue.description.substring(0, 47)}...`
                              : venue.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {venue.lat !== null && venue.lng !== null ? (
                        <Typography variant="body2" component="div">
                          <div>{Number(venue.lat).toFixed(4)}</div>
                          <div>{Number(venue.lng).toFixed(4)}</div>
                        </Typography>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      {venue.website ? (
                        <Button
                          size="small"
                          variant="outlined"
                          href={venue.website}
                          target="_blank"
                          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          Visit
                        </Button>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {venue.instagram && (
                          <Chip label="IG" size="small" color="secondary" variant="outlined" />
                        )}
                        {venue.facebook && (
                          <Chip label="FB" size="small" color="primary" variant="outlined" />
                        )}
                        {!venue.instagram && !venue.facebook && 'N/A'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={venue.showCount || 0}
                        color={venue.showCount && venue.showCount > 0 ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={venue.djCount || 0}
                        color={venue.djCount && venue.djCount > 0 ? 'secondary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Chip
                          label={venue.isActive ? 'Active' : 'Inactive'}
                          color={venue.isActive ? 'success' : 'default'}
                          size="small"
                        />
                        {venue.requiresReview && (
                          <Chip label="Review Required" color="warning" size="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {venue.lastParsed ? (
                        <Typography variant="caption">{formatDate(venue.lastParsed)}</Typography>
                      ) : (
                        'Never'
                      )}
                    </TableCell>
                    <TableCell>{formatDate(venue.createdAt)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(venue, 'venue')}
                            color="primary"
                          >
                            <FontAwesomeIcon icon={faEdit} size="sm" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(venue, 'venue')}
                            color="error"
                          >
                            <FontAwesomeIcon icon={faTrash} size="sm" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationControls table="venues" data={adminStore.venues} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Shows Management</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchField table="shows" placeholder="Search shows..." />
            <Button variant="outlined" size="small" color="error" onClick={handleShowCleanup}>
              <FontAwesomeIcon icon={faTrash} style={{ marginRight: '4px' }} />
              Cleanup
            </Button>
          </Box>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.shows === 'vendor'}
                    direction={
                      sortBy.shows === 'vendor'
                        ? (sortOrder.shows.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('shows', 'vendor')}
                  >
                    Vendor
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.shows === 'venue'}
                    direction={
                      sortBy.shows === 'venue'
                        ? (sortOrder.shows.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('shows', 'venue')}
                  >
                    Venue
                  </TableSortLabel>
                </TableCell>
                <TableCell>Location</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.shows === 'startTime'}
                    direction={
                      sortBy.shows === 'startTime'
                        ? (sortOrder.shows.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('shows', 'startTime')}
                  >
                    Schedule
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.shows === 'dj'}
                    direction={
                      sortBy.shows === 'dj'
                        ? (sortOrder.shows.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('shows', 'dj')}
                  >
                    DJ
                  </TableSortLabel>
                </TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.shows === 'submittedBy'}
                    direction={
                      sortBy.shows === 'submittedBy'
                        ? (sortOrder.shows.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('shows', 'submittedBy')}
                  >
                    Submitted By
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.shows === 'createdAt'}
                    direction={
                      sortBy.shows === 'createdAt'
                        ? (sortOrder.shows.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('shows', 'createdAt')}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.isLoadingTable ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                adminStore.shows?.items.map((show: AdminShow) => (
                  <TableRow key={show.id}>
                    <TableCell>{show.dj?.vendor?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{getAdminShowVenueName(show)}</Typography>
                        {show.description && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block' }}
                          >
                            {show.description.length > 30
                              ? `${show.description.substring(0, 27)}...`
                              : show.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        {getAdminShowVenueAddress(show) && (
                          <Typography variant="body2" title={getAdminShowVenueAddress(show)!}>
                            {getAdminShowVenueAddress(show)!.length > 30
                              ? `${getAdminShowVenueAddress(show)!.substring(0, 27)}...`
                              : getAdminShowVenueAddress(show)}
                          </Typography>
                        )}
                        {getAdminShowVenueLocation(show) && (
                          <Typography variant="caption" color="text.secondary">
                            {getAdminShowVenueLocation(show)}
                          </Typography>
                        )}
                        {getAdminShowVenueCoordinates(show) && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block' }}
                          >
                            📍 {getAdminShowVenueCoordinates(show)!.lat.toFixed(4)},{' '}
                            {getAdminShowVenueCoordinates(show)!.lng.toFixed(4)}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        {show.day && (
                          <Chip label={show.day} size="small" color="primary" variant="outlined" />
                        )}
                        {show.startTime && show.endTime && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                            {show.startTime} - {show.endTime}
                          </Typography>
                        )}
                        {show.time && !show.startTime && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                            {show.time}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{show.dj?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Box>
                        {getAdminShowVenuePhone(show) && (
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            📞 {getAdminShowVenuePhone(show)}
                          </Typography>
                        )}
                        {getAdminShowVenueWebsite(show) && (
                          <Button
                            size="small"
                            variant="outlined"
                            href={getAdminShowVenueWebsite(show)!}
                            target="_blank"
                            sx={{ textTransform: 'none', fontSize: '0.7rem', mt: 0.5 }}
                          >
                            Website
                          </Button>
                        )}
                        {!getAdminShowVenuePhone(show) && !getAdminShowVenueWebsite(show) && 'N/A'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {show.submittedByUser?.name || show.submittedByUser?.email || 'System'}
                    </TableCell>
                    <TableCell>{new Date(show.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(show, 'show')}
                            color="primary"
                          >
                            <FontAwesomeIcon icon={faEdit} size="sm" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(show, 'show')}
                            color="error"
                          >
                            <FontAwesomeIcon icon={faTrash} size="sm" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationControls table="shows" data={adminStore.shows} />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">DJs Management</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SearchField table="djs" placeholder="Search DJs..." />
            <DedupeButton type="djs" label="DJs" />
          </Box>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.djs === 'name'}
                    direction={
                      sortBy.djs === 'name'
                        ? (sortOrder.djs.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('djs', 'name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.djs === 'vendor'}
                    direction={
                      sortBy.djs === 'vendor'
                        ? (sortOrder.djs.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('djs', 'vendor')}
                  >
                    Vendor
                  </TableSortLabel>
                </TableCell>

                <TableCell>Status</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy.djs === 'createdAt'}
                    direction={
                      sortBy.djs === 'createdAt'
                        ? (sortOrder.djs.toLowerCase() as 'asc' | 'desc')
                        : 'asc'
                    }
                    onClick={() => handleSort('djs', 'createdAt')}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.isLoadingTable ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                adminStore.djs?.items.map((dj: AdminDJ) => (
                  <TableRow key={dj.id}>
                    <TableCell>{dj.name}</TableCell>
                    <TableCell>
                      {dj.vendor ? (
                        <Chip
                          label={dj.vendor.name}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ) : (
                        'N/A'
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={dj.isActive ? 'Active' : 'Inactive'}
                        color={dj.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(dj.createdAt)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(dj, 'dj')}
                            color="primary"
                          >
                            <FontAwesomeIcon icon={faEdit} size="sm" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(dj, 'dj')}
                            color="error"
                          >
                            <FontAwesomeIcon icon={faTrash} size="sm" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationControls table="djs" data={adminStore.djs} />
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Vendor Management</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchField table="vendors" placeholder="Search Vendors..." />
            <DedupeButton type="vendors" label="Vendors" />
          </Box>
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>DJ Count</TableCell>
                <TableCell>Website</TableCell>
                <TableCell>Social Media</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.vendors?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">No vendors found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                adminStore.vendors?.items.map((vendor: AdminVendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {vendor.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={vendor.djCount || 0}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {vendor.website ? (
                        <Link
                          href={vendor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ textDecoration: 'none' }}
                        >
                          <Chip label="Website" size="small" clickable />
                        </Link>
                      ) : (
                        <Typography color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {vendor.instagram && (
                          <Link
                            href={vendor.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ textDecoration: 'none' }}
                          >
                            <Chip label="Instagram" size="small" clickable />
                          </Link>
                        )}
                        {vendor.facebook && (
                          <Link
                            href={vendor.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ textDecoration: 'none' }}
                          >
                            <Chip label="Facebook" size="small" clickable />
                          </Link>
                        )}
                        {!vendor.instagram && !vendor.facebook && (
                          <Typography color="text.secondary">-</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={vendor.isActive ? 'Active' : 'Inactive'}
                        color={vendor.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {vendor.createdAt.toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="Edit vendor">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(vendor, 'vendor')}
                            color="primary"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete vendor">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(vendor, 'vendor')}
                            color="error"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationControls table="vendors" data={adminStore.vendors} />
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Feedback Management</Typography>
          <IconButton onClick={() => adminStore.fetchFeedback()}>
            <FontAwesomeIcon icon={faRefresh} />
          </IconButton>
        </Box>

        <SearchField table="feedback" placeholder="Search feedback..." />

        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.feedback?.items.map((feedback: AdminFeedback) => (
                <TableRow key={feedback.id}>
                  <TableCell>
                    <Chip
                      label={feedback.type}
                      size="small"
                      color={
                        feedback.type === 'bug' || feedback.type === 'complaint'
                          ? 'error'
                          : feedback.type === 'feature' || feedback.type === 'improvement'
                            ? 'info'
                            : feedback.type === 'compliment'
                              ? 'success'
                              : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" noWrap sx={{ maxWidth: 150 }}>
                      {feedback.subject || 'No subject'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={feedback.message}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {feedback.message}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={feedback.status}
                      size="small"
                      color={
                        feedback.status === 'resolved'
                          ? 'success'
                          : feedback.status === 'reviewed'
                            ? 'info'
                            : 'warning'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {feedback.user?.name || feedback.name || feedback.email || 'Anonymous'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {feedback.createdAt.toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Feedback">
                        <IconButton
                          size="small"
                          onClick={() => handleViewFeedback(feedback)}
                          color="primary"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Feedback">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteFeedback(feedback)}
                          color="error"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationControls table="feedback" data={adminStore.feedback} />
      </TabPanel>

      <TabPanel value={tabValue} index={6}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Show Reviews Management</Typography>
          <IconButton onClick={() => adminStore.fetchShowReviews()}>
            <FontAwesomeIcon icon={faRefresh} />
          </IconButton>
        </Box>

        <SearchField table="reviews" placeholder="Search reviews..." />

        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Show Info</TableCell>
                <TableCell>Submitted Changes</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted By</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.showReviews?.items.map((review: AdminShowReview) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {review.show ? getAdminShowVenueName(review.show) : 'Unknown Venue'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {review.show ? getAdminShowVenueAddress(review.show) : null}
                      </Typography>
                      {review.show?.dj?.name && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          DJ: {review.show.dj.name}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ maxWidth: 300 }}>
                      {review.djName && (
                        <Typography variant="caption" display="block">
                          <strong>DJ:</strong> {review.djName}
                        </Typography>
                      )}
                      {review.vendorName && (
                        <Typography variant="caption" display="block">
                          <strong>Vendor:</strong> {review.vendorName}
                        </Typography>
                      )}
                      {review.venueName && (
                        <Typography variant="caption" display="block">
                          <strong>Venue:</strong> {review.venueName}
                        </Typography>
                      )}
                      {review.venuePhone && (
                        <Typography variant="caption" display="block">
                          <strong>Phone:</strong> {review.venuePhone}
                        </Typography>
                      )}
                      {review.venueWebsite && (
                        <Typography variant="caption" display="block">
                          <strong>Website:</strong> {review.venueWebsite}
                        </Typography>
                      )}
                      {review.description && (
                        <Typography variant="caption" display="block">
                          <strong>Description:</strong>{' '}
                          {review.description.length > 50
                            ? review.description.substring(0, 50) + '...'
                            : review.description}
                        </Typography>
                      )}
                      {review.comments && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          <strong>Comments:</strong>{' '}
                          {review.comments.length > 50
                            ? review.comments.substring(0, 50) + '...'
                            : review.comments}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={review.status}
                      size="small"
                      color={
                        review.status === 'pending'
                          ? 'warning'
                          : review.status === 'approved'
                            ? 'success'
                            : 'error'
                      }
                    />
                  </TableCell>
                  <TableCell>{review.submittedByUser?.name || 'Unknown User'}</TableCell>
                  <TableCell>{new Date(review.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {review.status === 'pending' && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Approve Review">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              setReviewingShowReview(review);
                              setReviewAction('approve');
                            }}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Decline Review">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setReviewingShowReview(review);
                              setReviewAction('decline');
                            }}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => setReviewingShowReview(review)}>
                        <FontAwesomeIcon icon={faEye} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )) || (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">No reviews found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationControls table="reviews" data={adminStore.showReviews} />
      </TabPanel>

      {/* Edit Dialog */}
      <CustomModal
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        title={`Edit ${editType && editType.charAt(0).toUpperCase() + editType.slice(1)}`}
        icon={<FontAwesomeIcon icon={faEdit} />}
        maxWidth="sm"
      >
        {editingItem && editType === 'venue' && (
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              margin="normal"
              value={editingItem.name || ''}
              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
            />
            <TextField
              label="Location"
              fullWidth
              margin="normal"
              value={editingItem.location || ''}
              onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
            />
          </Box>
        )}

        {editingItem && editType === 'show' && (
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Day"
              fullWidth
              margin="normal"
              value={editingItem.day || ''}
              onChange={(e) => setEditingItem({ ...editingItem, day: e.target.value })}
            />
            <TextField
              label="Time"
              fullWidth
              margin="normal"
              value={editingItem.time || ''}
              onChange={(e) => setEditingItem({ ...editingItem, time: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              margin="normal"
              multiline
              rows={3}
              value={editingItem.description || ''}
              onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
            />
          </Box>
        )}

        {editingItem && editType === 'dj' && (
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              margin="normal"
              value={editingItem.name || ''}
              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
            />
          </Box>
        )}

        {editingItem && editType === 'vendor' && (
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              margin="normal"
              value={editingItem.name || ''}
              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
            />
            <TextField
              label="Website"
              fullWidth
              margin="normal"
              value={editingItem.website || ''}
              onChange={(e) => setEditingItem({ ...editingItem, website: e.target.value })}
            />
            <TextField
              label="Instagram"
              fullWidth
              margin="normal"
              value={editingItem.instagram || ''}
              onChange={(e) => setEditingItem({ ...editingItem, instagram: e.target.value })}
            />
            <TextField
              label="Facebook"
              fullWidth
              margin="normal"
              value={editingItem.facebook || ''}
              onChange={(e) => setEditingItem({ ...editingItem, facebook: e.target.value })}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editingItem.isActive || false}
                  onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        )}

        {editingItem && editType === 'feedback' && (
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={editingItem.status || 'pending'}
                onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="reviewed">Reviewed</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Admin Response"
              fullWidth
              margin="normal"
              multiline
              rows={4}
              value={editingItem.response || ''}
              onChange={(e) => setEditingItem({ ...editingItem, response: e.target.value })}
              helperText="Optional response to the user's feedback"
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button onClick={() => setEditingItem(null)}>Cancel</Button>
          <Button
            onClick={async () => {
              if (!editingItem || !editType) return;

              try {
                switch (editType) {
                  case 'venue':
                    await adminStore.updateVenue(editingItem.id, {
                      name: editingItem.name,
                      location: editingItem.location,
                    });
                    break;
                  case 'show':
                    await adminStore.updateShow(editingItem.id, {
                      day: editingItem.day,
                      time: editingItem.time,
                      description: editingItem.description,
                    });
                    break;
                  case 'dj':
                    await adminStore.updateDj(editingItem.id, {
                      name: editingItem.name,
                    });
                    break;
                  case 'vendor':
                    await adminStore.updateVendor(editingItem.id, {
                      name: editingItem.name,
                      website: editingItem.website,
                      instagram: editingItem.instagram,
                      facebook: editingItem.facebook,
                      isActive: editingItem.isActive,
                    });
                    break;
                  case 'feedback':
                    await adminStore.updateFeedback(editingItem.id, {
                      status: editingItem.status,
                      response: editingItem.response,
                      responseDate: editingItem.response ? new Date() : null,
                    });
                    break;
                }

                // Refresh data
                const tables = ['users', 'venues', 'shows', 'djs', 'vendors', 'feedback'];
                const currentTable = tables[tabValue];
                if (currentTable) {
                  fetchData(
                    currentTable,
                    pages[currentTable] || 0,
                    searchTerms[currentTable] || undefined,
                  );
                }

                setEditingItem(null);
                setEditType(null);
              } catch (error) {
                console.error('Update failed:', error);
              }
            }}
            color="primary"
            variant="contained"
          >
            Save
          </Button>
        </Box>
      </CustomModal>

      {/* Feedback View Dialog */}
      <CustomModal
        open={!!viewingFeedback}
        onClose={() => setViewingFeedback(null)}
        title="Feedback Details"
        icon={<FontAwesomeIcon icon={faComment} />}
        maxWidth="md"
      >
        {viewingFeedback && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header Info */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={viewingFeedback.type}
                size="medium"
                color={
                  viewingFeedback.type === 'bug' || viewingFeedback.type === 'complaint'
                    ? 'error'
                    : viewingFeedback.type === 'feature' || viewingFeedback.type === 'improvement'
                      ? 'info'
                      : viewingFeedback.type === 'compliment'
                        ? 'success'
                        : 'default'
                }
              />
              <Chip
                label={viewingFeedback.status}
                size="medium"
                color={
                  viewingFeedback.status === 'resolved'
                    ? 'success'
                    : viewingFeedback.status === 'reviewed'
                      ? 'info'
                      : 'warning'
                }
              />
            </Box>

            {/* Subject */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Subject
              </Typography>
              <Typography variant="body1">
                {viewingFeedback.subject || 'No subject provided'}
              </Typography>
            </Box>

            {/* Message */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Message
              </Typography>
              <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {viewingFeedback.message}
                </Typography>
              </Paper>
            </Box>

            {/* User Info */}
            <Box>
              <Typography variant="h6" gutterBottom>
                User Information
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1">
                    {viewingFeedback.user?.name || viewingFeedback.name || 'Not provided'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {viewingFeedback.user?.email || viewingFeedback.email || 'Not provided'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Submitted
                  </Typography>
                  <Typography variant="body1">
                    {viewingFeedback.createdAt.toLocaleString()}
                  </Typography>
                </Box>
                {viewingFeedback.responseDate && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Responded
                    </Typography>
                    <Typography variant="body1">
                      {viewingFeedback.responseDate.toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Response (if any) */}
            {viewingFeedback.response && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Response
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: 'primary.50',
                    border: '1px solid',
                    borderColor: 'primary.200',
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {viewingFeedback.response}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button onClick={() => setViewingFeedback(null)}>Close</Button>
        </Box>
      </CustomModal>

      {/* User Image View Modal */}
      <CustomModal
        open={!!viewingUserImage}
        onClose={() => setViewingUserImage(null)}
        title={viewingUserImage ? `${viewingUserImage.userName}'s Profile Image` : ''}
      >
        {viewingUserImage && (
          <Box
            component="img"
            src={viewingUserImage.src}
            alt={`${viewingUserImage.userName}'s profile image`}
            sx={{
              width: '200px',
              height: '200px',
              objectFit: 'cover',
              borderRadius: 2,
              boxShadow: 3,
              cursor: 'pointer',
            }}
            onClick={() => setViewingUserImage(null)}
          />
        )}
      </CustomModal>

      {/* User Feature Override Modal */}
      <UserFeatureOverrideModal
        open={userOverrideModalOpen}
        onClose={handleCloseUserOverrideModal}
        user={selectedUser}
      />

      {/* Show Review Modal */}
      <CustomModal
        open={!!reviewingShowReview}
        onClose={() => {
          setReviewingShowReview(null);
          setReviewAction(null);
          setAdminNotes('');
        }}
        title={
          reviewAction
            ? `${reviewAction === 'approve' ? 'Approve' : 'Decline'} Review`
            : 'Review Details'
        }
        icon={<FontAwesomeIcon icon={faComment} />}
        maxWidth="md"
        fullWidth
      >
        {reviewingShowReview && (
          <Box>
            {/* Original Show Info */}
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
              Current Show Information:
            </Typography>
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Venue:</strong>{' '}
                {reviewingShowReview.show
                  ? getAdminShowVenueName(reviewingShowReview.show)
                  : 'Not specified'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Address:</strong>{' '}
                {reviewingShowReview.show
                  ? getAdminShowVenueAddress(reviewingShowReview.show) || 'Not specified'
                  : 'Not specified'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>DJ/Host:</strong> {reviewingShowReview.show?.dj?.name || 'Not specified'}
              </Typography>
              <Typography variant="body2">
                <strong>Vendor:</strong>{' '}
                {reviewingShowReview.show?.dj?.vendor?.name || 'Not specified'}
              </Typography>
            </Box>

            {/* Submitted Changes */}
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'secondary.main' }}>
              Submitted Changes:
            </Typography>
            <Box
              sx={{
                mb: 3,
                p: 2,
                bgcolor: 'success.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'success.200',
              }}
            >
              {reviewingShowReview.djName && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>DJ/Host:</strong> {reviewingShowReview.djName}
                </Typography>
              )}
              {reviewingShowReview.vendorName && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Vendor:</strong> {reviewingShowReview.vendorName}
                </Typography>
              )}
              {reviewingShowReview.venueName && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Venue:</strong> {reviewingShowReview.venueName}
                </Typography>
              )}
              {reviewingShowReview.venuePhone && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Phone:</strong> {reviewingShowReview.venuePhone}
                </Typography>
              )}
              {reviewingShowReview.venueWebsite && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Website:</strong> {reviewingShowReview.venueWebsite}
                </Typography>
              )}
              {reviewingShowReview.description && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Description:</strong> {reviewingShowReview.description}
                </Typography>
              )}
            </Box>

            {/* User Comments */}
            {reviewingShowReview.comments && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  User Comments:
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">{reviewingShowReview.comments}</Typography>
                </Paper>
              </Box>
            )}

            {/* Submission Info */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Submitted by:</strong>{' '}
                {reviewingShowReview.submittedByUser?.name || 'Unknown User'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Date:</strong> {new Date(reviewingShowReview.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> <Chip label={reviewingShowReview.status} size="small" />
              </Typography>
            </Box>

            {/* Admin Notes (if taking action) */}
            {reviewAction && (
              <Box sx={{ mb: 2 }}>
                <TextField
                  label="Admin Notes"
                  multiline
                  rows={3}
                  fullWidth
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                />
              </Box>
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
          <Button
            onClick={() => {
              setReviewingShowReview(null);
              setReviewAction(null);
              setAdminNotes('');
            }}
          >
            Cancel
          </Button>
          {reviewAction && reviewingShowReview && (
            <Button
              variant="contained"
              color={reviewAction === 'approve' ? 'success' : 'error'}
              startIcon={<FontAwesomeIcon icon={reviewAction === 'approve' ? faCheck : faTimes} />}
              onClick={async () => {
                try {
                  if (reviewAction === 'approve') {
                    await adminStore.approveShowReview(reviewingShowReview.id, adminNotes);
                    uiStore.addNotification('Review approved successfully', 'success');
                  } else {
                    await adminStore.declineShowReview(reviewingShowReview.id, adminNotes);
                    uiStore.addNotification('Review declined successfully', 'info');
                  }
                  setReviewingShowReview(null);
                  setReviewAction(null);
                  setAdminNotes('');
                } catch (error: any) {
                  uiStore.addNotification(error.message || 'Failed to process review', 'error');
                }
              }}
            >
              {reviewAction === 'approve' ? 'Approve' : 'Decline'}
            </Button>
          )}
        </Box>
      </CustomModal>

      {/* Deduplication Dialog */}
      <CustomModal
        open={dedupeDialogOpen}
        onClose={handleCloseDedupe}
        title={
          duplicatesFound.length > 0
            ? `Found ${duplicatesFound.length} Duplicate Groups`
            : 'No Duplicates Found'
        }
        icon={<FontAwesomeIcon icon={faCopy} />}
        maxWidth="md"
      >
        {duplicatesFound.length > 0 ? (
          <Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Select the records you want to delete. The first record in each group will be kept.
            </Typography>
            {duplicatesFound.map((group, groupIndex) => (
              <Box key={groupIndex} sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Duplicate Group {groupIndex + 1}
                </Typography>
                <List dense>
                  {group.records.map((record: any, recordIndex: number) => (
                    <ListItem key={record.id} sx={{ py: 0.5 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedDuplicates.includes(record.id)}
                            onChange={(e) => handleDuplicateSelection(record.id, e.target.checked)}
                            disabled={recordIndex === 0} // Keep first record
                          />
                        }
                        label={
                          <ListItemText
                            primary={record.name || record.title || 'Unnamed'}
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  ID: {record.id}
                                </Typography>
                                {record.venue && (
                                  <Typography variant="caption" display="block">
                                    Venue: {record.venue}
                                  </Typography>
                                )}
                                {record.website && (
                                  <Typography variant="caption" display="block">
                                    Website: {record.website}
                                  </Typography>
                                )}
                                {recordIndex === 0 && (
                                  <Chip
                                    label="KEEP"
                                    size="small"
                                    color="success"
                                    sx={{ mt: 0.5 }}
                                  />
                                )}
                              </Box>
                            }
                          />
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ))}
            {selectedDuplicates.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {selectedDuplicates.length} record(s) will be permanently deleted.
              </Alert>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button onClick={handleCloseDedupe}>Cancel</Button>
              {selectedDuplicates.length > 0 && (
                <Button
                  onClick={handleExecuteDeduplication}
                  variant="contained"
                  color="error"
                  disabled={dedupeLoading}
                >
                  {dedupeLoading ? (
                    <CircularProgress size={20} />
                  ) : (
                    `Delete ${selectedDuplicates.length} Records`
                  )}
                </Button>
              )}
            </Box>
          </Box>
        ) : (
          <Typography>No duplicate records were found.</Typography>
        )}
      </CustomModal>

      {/* Deduplication Results Modal */}
      <CustomModal
        open={resultsModalOpen}
        onClose={handleCloseResultsModal}
        title="Deduplication Complete"
        icon={<FontAwesomeIcon icon={faCheckCircle} />}
        maxWidth="md"
      >
        <Box sx={{ textAlign: 'center', py: 2 }}>
          {dedupeResults && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" color="success.main" sx={{ mb: 1 }}>
                  ✅ Successfully Deleted {dedupeResults.deletedCount} Duplicate Records
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dedupeResults.type.charAt(0).toUpperCase() + dedupeResults.type.slice(1)}{' '}
                  duplicates have been removed from your database.
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Deleted Records:
                </Typography>
                <Box
                  sx={{
                    maxHeight: 300,
                    overflowY: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                  }}
                >
                  {dedupeResults.deletedRecords.map((record, index) => (
                    <Box
                      key={record.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1,
                        borderBottom:
                          index < dedupeResults.deletedRecords.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {record.name || record.title || 'Unnamed'}
                        </Typography>
                        {record.venue && (
                          <Typography variant="caption" color="text.secondary">
                            Venue: {record.venue}
                          </Typography>
                        )}
                        {record.website && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Website: {record.website}
                          </Typography>
                        )}
                      </Box>
                      <Chip label="DELETED" size="small" color="error" variant="outlined" />
                    </Box>
                  ))}
                </Box>
              </Box>

              <Alert severity="success" sx={{ textAlign: 'left' }}>
                <Typography variant="body2">
                  Your database has been cleaned up! The remaining records are the highest quality
                  versions that were kept during deduplication.
                </Typography>
              </Alert>
            </>
          )}
        </Box>
      </CustomModal>

      {/* Show Cleanup Results Modal */}
      <ShowCleanupResultsModal
        open={!!showCleanupResults}
        onClose={() => setShowCleanupResults(null)}
        result={showCleanupResults}
      />

      {/* Error Dialog */}
      <CustomModal
        open={errorDialogOpen}
        onClose={handleCloseErrorDialog}
        title="Error"
        icon={<FontAwesomeIcon icon={faExclamationTriangle} color="red" />}
        maxWidth="sm"
      >
        <Typography color="text.primary">{errorMessage}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button onClick={handleCloseErrorDialog} variant="outlined">
            Close
          </Button>
        </Box>
      </CustomModal>
    </Box>
  );
});

export default AdminDataTables;
