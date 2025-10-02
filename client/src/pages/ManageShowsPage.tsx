import { LoadingButton } from '@components/LoadingButton';
import {
  faBuilding,
  faClock,
  faEdit,
  faMapMarkerAlt,
  faMusic,
  faSave,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Card,
  CardContent,
  Container,
  FormControl,
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
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { apiStore, authStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import AddVenueForm from '../components/AddVenueForm';

interface DjShow {
  id: string;
  startTime: string;
  endTime: string;
  venue: {
    id: string;
    name: string;
    address?: string;
  };
  description?: string;
  day?: string;
  time?: string;
}

const ManageShowsPage: React.FC = observer(() => {
  const theme = useTheme();
  const [shows, setShows] = useState<DjShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingShow, setEditingShow] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ [key: string]: Partial<DjShow> }>({});
  const [venues, setVenues] = useState<any[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);

  useEffect(() => {
    if (authStore.user?.djId) {
      loadShows();
    }
  }, [authStore.user?.djId]);

  const loadShows = async () => {
    try {
      setLoading(true);
      setError('');

      if (!authStore.user?.djId) {
        throw new Error('No DJ ID found for user');
      }

      const response = await apiStore.get(apiStore.endpoints.shows.byDJ(authStore.user.djId));

      setShows(response.data || response || []);
    } catch (err: any) {
      console.error('Error loading shows:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load shows';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadVenues = async () => {
    try {
      setLoadingVenues(true);
      const response = await apiStore.get('/venues');
      setVenues(response.data || response || []);
    } catch (err: any) {
      console.error('Error loading venues:', err);
    } finally {
      setLoadingVenues(false);
    }
  };

  // Load venues when component mounts
  useEffect(() => {
    loadVenues();
  }, []);

  const handleEdit = (show: DjShow) => {
    setEditingShow(show.id);
    setEditData({
      ...editData,
      [show.id]: {
        startTime: show.startTime,
        endTime: show.endTime,
        description: show.description || '',
        day: show.day || '',
        venue: show.venue,
      },
    });
  };

  const handleSave = async (showId: string) => {
    try {
      const updateData = editData[showId];
      if (!updateData) return;

      const response = await apiStore.put(apiStore.endpoints.djShows.byId(showId), updateData);

      const updatedShow = response.data;

      // Update the shows list
      setShows(shows.map((show) => (show.id === showId ? updatedShow : show)));

      setEditingShow(null);
      setSuccess('Show updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update show';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleCancel = () => {
    setEditingShow(null);
    setEditData({});
  };

  const updateEditData = (showId: string, field: keyof DjShow, value: string) => {
    setEditData({
      ...editData,
      [showId]: {
        ...editData[showId],
        [field]: value,
      },
    });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    // Convert 24-hour time to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDayColor = (day: string | undefined) => {
    const dayColors: { [key: string]: string } = {
      monday: '#42a5f5', // Lighter Blue for dark theme
      tuesday: '#66bb6a', // Lighter Green
      wednesday: '#ffb74d', // Lighter Orange
      thursday: '#ab47bc', // Lighter Purple
      friday: '#ef5350', // Lighter Red
      saturday: '#ec407a', // Lighter Pink
      sunday: '#78909c', // Lighter Blue Grey
    };
    return dayColors[day?.toLowerCase() || ''] || '#9e9e9e';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>Loading your shows...</Typography>
      </Container>
    );
  }

  return (
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
              <FontAwesomeIcon icon={faMusic} style={{ fontSize: 30 }} />
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
              Manage Shows
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {shows.length === 0 ? (
            <Card
              sx={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <FontAwesomeIcon
                  icon={faMusic}
                  style={{ fontSize: '64px', color: '#666666', opacity: 0.7 }}
                />
                <Typography variant="h5" sx={{ mt: 2, mb: 1, color: 'white' }}>
                  No Shows Found
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  You don't have any shows scheduled yet. Contact your venue to get your shows added
                  to the system.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <TableContainer
              component={Paper}
              sx={{
                backgroundColor: '#1e1e1e',
                '& .MuiTableCell-root': {
                  borderColor: '#333333',
                  color: '#ffffff',
                },
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#2d2d2d' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Venue</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Day</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Start Time</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>End Time</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shows.map((show, index) => (
                    <TableRow
                      key={show.id}
                      sx={{
                        backgroundColor: index % 2 === 0 ? '#1a1a1a' : '#1e1e1e',
                        '&:hover': {
                          backgroundColor: editingShow === show.id ? '#2d4a6b' : '#2a2a2a',
                        },
                        borderLeft: editingShow === show.id ? '4px solid #64b5f6' : 'none',
                      }}
                    >
                      <TableCell>
                        {editingShow === show.id ? (
                          <Autocomplete
                            size="small"
                            options={venues}
                            getOptionLabel={(option) => option.name}
                            value={editData[show.id]?.venue || show.venue}
                            onChange={(_event, newValue) => {
                              if (newValue) {
                                updateEditData(show.id, 'venue', newValue);
                              }
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="Venue" variant="outlined" />
                            )}
                            sx={{ minWidth: 200 }}
                            loading={loadingVenues}
                          />
                        ) : (
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              <FontAwesomeIcon icon={faBuilding} style={{ marginRight: '8px' }} />
                              {show.venue.name}
                            </Typography>
                            {show.venue.address && (
                              <Typography variant="body2" color="text.secondary">
                                <FontAwesomeIcon
                                  icon={faMapMarkerAlt}
                                  style={{ marginRight: '4px' }}
                                />
                                {show.venue.address}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingShow === show.id ? (
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Day</InputLabel>
                            <Select
                              value={editData[show.id]?.day || show.day || ''}
                              label="Day"
                              onChange={(event) =>
                                updateEditData(show.id, 'day', event.target.value)
                              }
                            >
                              <MenuItem value="monday">Monday</MenuItem>
                              <MenuItem value="tuesday">Tuesday</MenuItem>
                              <MenuItem value="wednesday">Wednesday</MenuItem>
                              <MenuItem value="thursday">Thursday</MenuItem>
                              <MenuItem value="friday">Friday</MenuItem>
                              <MenuItem value="saturday">Saturday</MenuItem>
                              <MenuItem value="sunday">Sunday</MenuItem>
                            </Select>
                          </FormControl>
                        ) : (
                          <Box sx={{ display: 'inline-block' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                textTransform: 'capitalize',
                                backgroundColor: getDayColor(show.day),
                                color: 'white',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 2,
                                fontWeight: 'medium',
                                fontSize: '0.75rem',
                                display: 'inline-block',
                              }}
                            >
                              {show.day || 'N/A'}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingShow === show.id ? (
                          <TextField
                            type="time"
                            size="small"
                            value={editData[show.id]?.startTime || ''}
                            onChange={(e) => updateEditData(show.id, 'startTime', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <FontAwesomeIcon
                              icon={faClock}
                              style={{ marginRight: '4px', color: theme.palette.text.secondary }}
                            />
                            {formatTime(show.startTime)}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingShow === show.id ? (
                          <TextField
                            type="time"
                            size="small"
                            value={editData[show.id]?.endTime || ''}
                            onChange={(e) => updateEditData(show.id, 'endTime', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <FontAwesomeIcon
                              icon={faClock}
                              style={{ marginRight: '4px', color: theme.palette.text.secondary }}
                            />
                            {formatTime(show.endTime)}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingShow === show.id ? (
                          <TextField
                            size="small"
                            multiline
                            rows={2}
                            placeholder="Show description..."
                            value={editData[show.id]?.description || ''}
                            onChange={(e) => updateEditData(show.id, 'description', e.target.value)}
                            sx={{ minWidth: 200 }}
                          />
                        ) : (
                          <Typography variant="body2">
                            {show.description || (
                              <em style={{ color: theme.palette.text.secondary }}>
                                No description
                              </em>
                            )}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {editingShow === show.id ? (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <LoadingButton
                              size="small"
                              variant="contained"
                              startIcon={<FontAwesomeIcon icon={faSave} />}
                              onClick={() => handleSave(show.id)}
                            >
                              Save
                            </LoadingButton>
                            <LoadingButton size="small" variant="outlined" onClick={handleCancel}>
                              Cancel
                            </LoadingButton>
                          </Box>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(show)}
                            sx={{ color: theme.palette.primary.main }}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Add Venue Form */}
          <AddVenueForm
            onVenueAdded={(newVenue) => {
              // Refresh the venues list when a new venue is added
              loadVenues();
              // Optionally show a success message or update the venues state directly
              setVenues((prev) => [...prev, newVenue]);
            }}
          />
        </Box>
      </Container>
    </Box>
  );
});

export default ManageShowsPage;
