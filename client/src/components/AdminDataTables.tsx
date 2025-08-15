import {
  faComment,
  faEdit,
  faFileAudio,
  faGlobe,
  faHeart,
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
} from '@mui/material';
import type {
  AdminDJ,
  AdminFavorite,
  AdminFeedback,
  AdminShow,
  AdminSong,
  AdminUser,
  AdminVenue,
} from '@stores/AdminStore';
import { adminStore } from '@stores/index';
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
      id={`data-tabpanel-${index}`}
      aria-labelledby={`data-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminDataTables: React.FC = observer(() => {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({
    users: '',
    venues: '',
    shows: '',
    djs: '',
    favorites: '',
    songs: '',
  });
  const [pages, setPages] = useState<Record<string, number>>({
    users: 0,
    venues: 0,
    shows: 0,
    djs: 0,
    favorites: 0,
    songs: 0,
  });
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Edit and Delete state
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editType, setEditType] = useState<'venue' | 'show' | 'dj' | 'feedback' | null>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [deleteType, setDeleteType] = useState<'venue' | 'show' | 'dj' | 'feedback' | null>(null);
  const [deleteRelationships, setDeleteRelationships] = useState<any>(null);

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
      case 'favorites':
        await adminStore.fetchFavorites(page + 1, rowsPerPage, search);
        break;
      case 'songs':
        await adminStore.fetchSongs(page + 1, rowsPerPage, search);
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
    setDeleteItem(item);
    setDeleteType(type);

    // Fetch relationship data (only for venue, show, dj - feedback doesn't have relationships)
    if (type !== 'feedback') {
      try {
        let relationships;
        switch (type) {
          case 'venue':
            relationships = await adminStore.getVenueRelationships(item.id);
            break;
          case 'show':
            relationships = await adminStore.getShowRelationships(item.id);
            break;
          case 'dj':
            relationships = await adminStore.getDjRelationships(item.id);
            break;
        }
        setDeleteRelationships(relationships);
      } catch (error) {
        console.error('Failed to fetch relationships:', error);
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem || !deleteType) return;

    try {
      switch (deleteType) {
        case 'venue':
          await adminStore.deleteVenue(deleteItem.id);
          break;
        case 'show':
          await adminStore.deleteShow(deleteItem.id);
          break;
        case 'dj':
          await adminStore.deleteDj(deleteItem.id);
          break;
        case 'feedback':
          await adminStore.deleteFeedback(deleteItem.id);
          break;
      }

      // Show success message
      alert(`${deleteType.charAt(0).toUpperCase() + deleteType.slice(1)} deleted successfully!`);

      // Refresh the current tab's data
      const tables = ['users', 'venues', 'shows', 'djs', 'favorites', 'songs', 'feedback'];
      const currentTable = tables[tabValue];
      if (currentTable) {
        fetchData(currentTable, pages[currentTable] || 0, searchTerms[currentTable] || undefined);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      // Show user-friendly error message
      let errorMessage = 'Failed to delete ' + deleteType;
      const errorObj = error as any;
      if (errorObj?.message?.includes('Unauthorized')) {
        errorMessage = 'You are not authorized to perform this action. Please log in as an admin.';
      } else if (errorObj?.message?.includes('Internal server error')) {
        errorMessage = `Cannot delete this ${deleteType} because it has related data. Please remove related shows, DJs, or favorites first.`;
      } else if (errorObj?.message) {
        errorMessage = errorObj.message;
      }
      alert(errorMessage);
    } finally {
      setDeleteItem(null);
      setDeleteType(null);
      setDeleteRelationships(null);
    }
  };

  const handleEditFeedback = (feedback: AdminFeedback) => {
    handleEdit(feedback, 'feedback');
  };

  const handleDeleteFeedback = async (feedback: AdminFeedback) => {
    await handleDelete(feedback, 'feedback');
  };

  useEffect(() => {
    // Load initial data based on current tab
    const tables = ['users', 'venues', 'shows', 'djs', 'favorites', 'songs', 'feedback'];
    const currentTable = tables[tabValue];
    if (currentTable) {
      fetchData(currentTable, pages[currentTable] || 0, searchTerms[currentTable] || undefined);
    }
  }, [tabValue, pages, rowsPerPage]);

  // Load parser status when needed
  useEffect(() => {
    if (tabValue === 7) {
      // Parser tab (moved from index 6 to 7)
      adminStore.fetchParserStatus();
    }
  }, [tabValue]);

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
    <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab icon={<FontAwesomeIcon icon={faUsers} />} label="Users" />
          <Tab icon={<FontAwesomeIcon icon={faMapMarkerAlt} />} label="Venues" />
          <Tab icon={<FontAwesomeIcon icon={faMusic} />} label="Shows" />
          <Tab icon={<FontAwesomeIcon icon={faMicrophone} />} label="DJs" />
          <Tab icon={<FontAwesomeIcon icon={faHeart} />} label="Favorites" />
          <Tab icon={<FontAwesomeIcon icon={faFileAudio} />} label="Songs" />
          <Tab icon={<FontAwesomeIcon icon={faComment} />} label="Feedback" />
          <Tab icon={<FontAwesomeIcon icon={faGlobe} />} label="Parser" />
        </Tabs>
      </Box>

      {adminStore.tableError && (
        <Alert severity="error" sx={{ m: 2 }}>
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
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.isLoadingTable ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                adminStore.users?.items.map((user: AdminUser) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
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
                <TableCell>Location</TableCell>
                <TableCell>Shows</TableCell>
                <TableCell>DJs</TableCell>
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
                adminStore.venues?.items.map((venue: AdminVenue) => (
                  <TableRow key={venue.id}>
                    <TableCell>{venue.name}</TableCell>
                    <TableCell>{venue.location || 'N/A'}</TableCell>
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
                <TableCell>Venue</TableCell>
                <TableCell>Day</TableCell>
                <TableCell>DJ</TableCell>
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
                adminStore.shows?.items.map((show: AdminShow) => (
                  <TableRow key={show.id}>
                    <TableCell>{show.vendor?.name || 'N/A'}</TableCell>
                    <TableCell>{show.day || 'N/A'}</TableCell>
                    <TableCell>{show.dj?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={show.isActive ? 'Active' : 'Inactive'}
                        color={show.isActive ? 'success' : 'default'}
                        size="small"
                      />
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
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.isLoadingTable ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                adminStore.djs?.items.map((dj: AdminDJ) => (
                  <TableRow key={dj.id}>
                    <TableCell>{dj.name}</TableCell>
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
          <Typography variant="h6">User Favorites</Typography>
          <SearchField table="favorites" placeholder="Search favorites..." />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Show</TableCell>
                <TableCell>Venue</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.isLoadingTable ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                adminStore.favorites?.items.map((favorite: AdminFavorite) => (
                  <TableRow key={favorite.id}>
                    <TableCell>{favorite.user?.name || favorite.user?.email || 'N/A'}</TableCell>
                    <TableCell>{favorite.show?.day || 'N/A'}</TableCell>
                    <TableCell>{favorite.show?.vendor?.name || 'N/A'}</TableCell>
                    <TableCell>{formatDate(favorite.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationControls table="favorites" data={adminStore.favorites} />
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Parsed Songs</Typography>
          <SearchField table="songs" placeholder="Search parsed data..." />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>URL</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Has AI Analysis</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.isLoadingTable ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                adminStore.songs?.items.map((song: AdminSong) => (
                  <TableRow key={song.id}>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {song.url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={song.status}
                        color={song.status === 'approved' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={song.aiAnalysis ? 'Yes' : 'No'}
                        color={song.aiAnalysis ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(song.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationControls table="songs" data={adminStore.songs} />
      </TabPanel>

      <TabPanel value={tabValue} index={6}>
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
                <TableCell>Rating</TableCell>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2">{feedback.rating}</Typography>
                      <FontAwesomeIcon
                        icon={faHeart}
                        style={{ color: '#f39c12', fontSize: '12px' }}
                      />
                    </Box>
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
                      <Tooltip title="Edit Feedback">
                        <IconButton
                          size="small"
                          onClick={() => handleEditFeedback(feedback)}
                          color="primary"
                        >
                          <FontAwesomeIcon icon={faEdit} />
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

      <TabPanel value={tabValue} index={7}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Parser Status</Typography>
          <IconButton onClick={() => adminStore.fetchParserStatus()}>
            <FontAwesomeIcon icon={faRefresh} />
          </IconButton>
        </Box>

        {adminStore.isLoadingTable ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : adminStore.parserStatus ? (
          <Box>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<FontAwesomeIcon icon={faGlobe} />}
                label={`Status: ${adminStore.parserStatus.status}`}
                color="success"
              />
              <Chip
                label={`Total Parsed: ${adminStore.parserStatus.statistics.totalParsed}`}
                color="info"
              />
              <Chip
                label={`Success Rate: ${adminStore.parserStatus.statistics.successRate}%`}
                color={adminStore.parserStatus.statistics.successRate > 80 ? 'success' : 'warning'}
              />
            </Box>

            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Parser Activity
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>URL</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Time Ago</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adminStore.parserStatus.recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 250,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {activity.url}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={activity.status}
                          color={activity.status === 'approved' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(activity.createdAt)}</TableCell>
                      <TableCell>{activity.timeAgo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          <Alert severity="info">No parser data available</Alert>
        )}
      </TabPanel>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: 'error.light',
              color: 'error.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesomeIcon icon={faTrash} size="lg" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Confirm Deletion
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This action cannot be undone
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Typography
            variant="body1"
            sx={{ mb: 3, fontSize: '1.1rem', fontWeight: 500, color: 'text.primary' }}
          >
            Are you sure you want to delete this {deleteType}?
          </Typography>

          {deleteItem && (
            <Box
              sx={{
                mb: 3,
                p: 2.5,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '2px solid',
                borderColor: 'primary.main',
                boxShadow: 1,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                  color: 'text.primary',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '1.2rem',
                }}
              >
                {deleteType === 'venue' && (
                  <>
                    <Box component="span" sx={{ fontSize: '1.2em' }}>
                      📍
                    </Box>
                    {deleteItem.name || 'Unnamed Venue'}
                  </>
                )}
                {deleteType === 'show' && (
                  <>
                    <Box component="span" sx={{ fontSize: '1.2em' }}>
                      🎤
                    </Box>
                    {deleteItem.vendor?.name || 'Unknown Venue'} - {deleteItem.day || 'No Day'}
                  </>
                )}
                {deleteType === 'dj' && (
                  <>
                    <Box component="span" sx={{ fontSize: '1.2em' }}>
                      🎧
                    </Box>
                    {deleteItem.name || 'Unnamed DJ'}
                  </>
                )}
              </Typography>

              {deleteType === 'venue' && deleteItem.location && (
                <Typography variant="body2" color="text.secondary">
                  Location: {deleteItem.location}
                </Typography>
              )}

              {deleteType === 'show' && deleteItem.time && (
                <Typography variant="body2" color="text.secondary">
                  Time: {deleteItem.time}
                </Typography>
              )}
            </Box>
          )}

          {deleteRelationships && (
            <Box
              sx={{
                mt: 2,
                p: 2.5,
                bgcolor: 'error.50',
                borderRadius: 2,
                border: '2px solid',
                borderColor: 'error.main',
                boxShadow: 1,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: 'error.dark',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '1.1rem',
                }}
              >
                ⚠️ Related Data Impact
              </Typography>

              {deleteType === 'venue' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {deleteRelationships.shows?.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          minWidth: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: 'warning.light',
                          color: 'warning.contrastText',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        {deleteRelationships.shows.length}
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        Show{deleteRelationships.shows.length !== 1 ? 's' : ''} will be permanently
                        deleted
                      </Typography>
                    </Box>
                  )}

                  {deleteRelationships.djs?.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          minWidth: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: 'info.light',
                          color: 'info.contrastText',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        {deleteRelationships.djs.length}
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        DJ{deleteRelationships.djs.length !== 1 ? 's' : ''} will be permanently
                        deleted
                      </Typography>
                    </Box>
                  )}

                  {!deleteRelationships.shows?.length && !deleteRelationships.djs?.length && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          minWidth: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: 'success.light',
                          color: 'success.contrastText',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ✓
                      </Box>
                      <Typography variant="body1" color="success.dark">
                        No related data will be deleted
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {deleteType === 'show' && deleteRelationships.favorites?.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      minWidth: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: 'warning.light',
                      color: 'warning.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    {deleteRelationships.favorites.length}
                  </Box>
                  <Typography variant="body1">
                    User favorite{deleteRelationships.favorites.length !== 1 ? 's' : ''} will be
                    removed
                  </Typography>
                </Box>
              )}

              {deleteType === 'dj' && deleteRelationships.shows?.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      minWidth: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: 'warning.light',
                      color: 'warning.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    {deleteRelationships.shows.length}
                  </Box>
                  <Typography variant="body1">
                    Show{deleteRelationships.shows.length !== 1 ? 's' : ''} will have no DJ assigned
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 3,
            gap: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Button
            onClick={() => setDeleteItem(null)}
            variant="outlined"
            size="large"
            sx={{ minWidth: 100 }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            size="large"
            sx={{
              minWidth: 100,
              fontWeight: 600,
            }}
            startIcon={<FontAwesomeIcon icon={faTrash} />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
                const tables = ['users', 'venues', 'shows', 'djs', 'favorites', 'songs', 'feedback'];
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
    </Paper>
  );
});

export default AdminDataTables;
