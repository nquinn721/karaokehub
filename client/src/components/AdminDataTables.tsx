import {
  faFileAudio,
  faGlobe,
  faHeart,
  faMapMarkerAlt,
  faMicrophone,
  faMusic,
  faRefresh,
  faSearch,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
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
  Typography,
} from '@mui/material';
import type {
  AdminDJ,
  AdminFavorite,
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
    }
  };

  useEffect(() => {
    // Load initial data based on current tab
    const tables = ['users', 'venues', 'shows', 'djs', 'favorites', 'songs'];
    const currentTable = tables[tabValue];
    if (currentTable) {
      fetchData(currentTable, pages[currentTable] || 0, searchTerms[currentTable] || undefined);
    }
  }, [tabValue, pages, rowsPerPage]);

  // Load parser status when needed
  useEffect(() => {
    if (tabValue === 6) {
      // Parser tab
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
                <TableCell>Created</TableCell>
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
                adminStore.venues?.items.map((venue: AdminVenue) => (
                  <TableRow key={venue.id}>
                    <TableCell>{venue.name}</TableCell>
                    <TableCell>{venue.location || 'N/A'}</TableCell>
                    <TableCell>{formatDate(venue.createdAt)}</TableCell>
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
                <TableCell>Bio</TableCell>
                <TableCell>Created</TableCell>
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
                    <TableCell>{dj.bio || 'N/A'}</TableCell>
                    <TableCell>{formatDate(dj.createdAt)}</TableCell>
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
    </Paper>
  );
});

export default AdminDataTables;
