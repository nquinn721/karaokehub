import {
  faComment,
  faEdit,
  faEye,
  faMapMarkerAlt,
  faMicrophone,
  faMusic,
  faRefresh,
  faSearch,
  faTrash,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
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
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type { AdminDJ, AdminFeedback, AdminShow, AdminUser, AdminVenue } from '@stores/AdminStore';
import { adminStore, uiStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { UserFeatureOverrideModal } from './UserFeatureOverrideModal';

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
  });
  const [pages, setPages] = useState<Record<string, number>>({
    users: 0,
    venues: 0,
    shows: 0,
    djs: 0,
    feedback: 0,
  });
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Edit state
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editType, setEditType] = useState<'venue' | 'show' | 'dj' | 'feedback' | null>(null);

  // Feedback view state
  const [viewingFeedback, setViewingFeedback] = useState<AdminFeedback | null>(null);

  // User image view state
  const [viewingUserImage, setViewingUserImage] = useState<{
    src: string;
    userName: string;
  } | null>(null);

  // User feature override modal state
  const [userOverrideModalOpen, setUserOverrideModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearch = (table: string, term: string) => {
    setSearchTerms((prev) => ({ ...prev, [table]: term }));
    setPages((prev) => ({ ...prev, [table]: 0 }));
  };

  const handlePageChange = (table: string, newPage: number) => {
    setPages((prev) => ({ ...prev, [table]: newPage }));
  };

  const fetchData = async (table: string, page: number, search?: string) => {
    switch (table) {
      case 'users':
        await adminStore.fetchUsers(page + 1, rowsPerPage, search);
        break;
      case 'venues':
        await adminStore.fetchVenues(page + 1, rowsPerPage, search);
        break;
      case 'shows':
        await adminStore.fetchShows(page + 1, rowsPerPage, search);
        break;
      case 'djs':
        await adminStore.fetchDjs(page + 1, rowsPerPage, search);
        break;
      case 'feedback':
        await adminStore.fetchFeedback(page + 1, rowsPerPage, search);
        break;
    }
  };

  // Action handlers
  const handleEdit = (item: any, type: 'venue' | 'show' | 'dj' | 'feedback') => {
    setEditingItem(item);
    setEditType(type);
  };

  const handleDelete = async (item: any, type: 'venue' | 'show' | 'dj' | 'feedback') => {
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
      const tables = ['users', 'venues', 'shows', 'djs', 'feedback'];
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

  useEffect(() => {
    // Load statistics to show counts in tabs
    if (!adminStore.statistics) {
      adminStore.fetchStatistics();
    }

    // Load initial data based on current tab
    const tables = ['users', 'venues', 'shows', 'djs', 'feedback'];
    const currentTable = tables[tabValue];
    if (currentTable) {
      fetchData(currentTable, pages[currentTable] || 0, searchTerms[currentTable] || undefined);
    }
  }, [tabValue, pages, rowsPerPage]);

  const SearchField = ({ table, placeholder }: { table: string; placeholder: string }) => (
    <TextField
      size="small"
      placeholder={placeholder}
      value={searchTerms[table] || ''}
      onChange={(e) => handleSearch(table, e.target.value)}
      onKeyPress={(e) => {
        if (e.key === 'Enter') {
          fetchData(table, 0, searchTerms[table] || undefined);
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
            <IconButton
              size="small"
              onClick={() => fetchData(table, pages[table] || 0, searchTerms[table] || undefined)}
            >
              <FontAwesomeIcon icon={faRefresh} size="xs" />
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{ minWidth: 250 }}
    />
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
              label={`Venues${adminStore.statistics?.totalVendors ? ` (${adminStore.statistics.totalVendors})` : ''}`}
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
              icon={<FontAwesomeIcon icon={faComment} />}
              label={`Feedback${adminStore.statistics?.totalFeedback ? ` (${adminStore.statistics.totalFeedback})` : ''}`}
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
                <TableCell>Name</TableCell>
                <TableCell>Stage Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Admin</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
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
          <SearchField table="venues" placeholder="Search venues..." />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Website</TableCell>
                <TableCell>Social</TableCell>
                <TableCell>Shows</TableCell>
                <TableCell>DJs</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Parsed</TableCell>
                <TableCell>Created</TableCell>
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
                    <TableCell>{venue.owner || 'N/A'}</TableCell>
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
          <SearchField table="shows" placeholder="Search shows..." />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendor</TableCell>
                <TableCell>Venue</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell>DJ</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Created</TableCell>
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
                adminStore.shows?.items.map((show: AdminShow) => (
                  <TableRow key={show.id}>
                    <TableCell>{show.vendor?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{show.venue || 'N/A'}</Typography>
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
                        {show.address && (
                          <Typography variant="body2" title={show.address}>
                            {show.address.length > 30
                              ? `${show.address.substring(0, 27)}...`
                              : show.address}
                          </Typography>
                        )}
                        {(show.city || show.state) && (
                          <Typography variant="caption" color="text.secondary">
                            {[show.city, show.state].filter(Boolean).join(', ')}
                            {show.zip && ` ${show.zip}`}
                          </Typography>
                        )}
                        {show.lat &&
                          show.lng &&
                          !isNaN(Number(show.lat)) &&
                          !isNaN(Number(show.lng)) && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block' }}
                            >
                              📍 {Number(show.lat).toFixed(4)}, {Number(show.lng).toFixed(4)}
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
                        {show.venuePhone && (
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            📞 {show.venuePhone}
                          </Typography>
                        )}
                        {show.venueWebsite && (
                          <Button
                            size="small"
                            variant="outlined"
                            href={show.venueWebsite}
                            target="_blank"
                            sx={{ textTransform: 'none', fontSize: '0.7rem', mt: 0.5 }}
                          >
                            Website
                          </Button>
                        )}
                        {!show.venuePhone && !show.venueWebsite && 'N/A'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={show.isActive ? 'Active' : 'Inactive'}
                        color={show.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {show.source ? (
                        <Chip label={show.source} size="small" color="info" variant="outlined" />
                      ) : (
                        'Manual'
                      )}
                    </TableCell>
                    <TableCell>{formatDate(show.createdAt)}</TableCell>
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
          <SearchField table="djs" placeholder="Search DJs..." />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Nicknames</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.isLoadingTable ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
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
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {dj.nicknames && dj.nicknames.length > 0 ? (
                          dj.nicknames
                            .filter((nickname) => nickname.isActive)
                            .map((nickname) => (
                              <Chip
                                key={nickname.id}
                                label={nickname.nickname}
                                size="small"
                                color={
                                  nickname.type === 'stage_name'
                                    ? 'primary'
                                    : nickname.type === 'social_handle'
                                      ? 'secondary'
                                      : nickname.type === 'real_name'
                                        ? 'success'
                                        : 'default'
                                }
                                variant="outlined"
                                title={`${nickname.type}${nickname.platform ? ` (${nickname.platform})` : ''}`}
                              />
                            ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No nicknames
                          </Typography>
                        )}
                      </Box>
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

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onClose={() => setEditingItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit {editType && editType.charAt(0).toUpperCase() + editType.slice(1)}
        </DialogTitle>
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
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
                  case 'feedback':
                    await adminStore.updateFeedback(editingItem.id, {
                      status: editingItem.status,
                      response: editingItem.response,
                      responseDate: editingItem.response ? new Date() : null,
                    });
                    break;
                }

                // Refresh data
                const tables = ['users', 'venues', 'shows', 'djs', 'feedback'];
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
        </DialogActions>
      </Dialog>

      {/* Feedback View Dialog */}
      <Dialog
        open={!!viewingFeedback}
        onClose={() => setViewingFeedback(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FontAwesomeIcon icon={faComment} />
            Feedback Details
          </Box>
        </DialogTitle>
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingFeedback(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* User Image View Dialog */}
      <Dialog
        open={!!viewingUserImage}
        onClose={() => setViewingUserImage(null)}
        PaperProps={{
          sx: {
            background: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
          },
        }}
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
      </Dialog>

      {/* User Feature Override Modal */}
      <UserFeatureOverrideModal
        open={userOverrideModalOpen}
        onClose={handleCloseUserOverrideModal}
        user={selectedUser}
      />
    </Box>
  );
});

export default AdminDataTables;
