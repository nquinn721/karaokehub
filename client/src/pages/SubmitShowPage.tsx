import { Add, Cancel, CheckCircle, Event, Link, MusicNote } from '@mui/icons-material';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { authStore, parserStore, vendorStore } from '../stores';
import { ParsedScheduleItem } from '../stores/ParserStore';
import { Vendor } from '../stores/VendorStore';

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const SubmitShowPage: React.FC = observer(() => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // URL parsing state
  const [url, setUrl] = useState('');
  const [parsedData, setParsedData] = useState<ParsedScheduleItem | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Manual show entry state
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [newVendorData, setNewVendorData] = useState({
    name: '',
    owner: '',
    website: '',
    instagram: '',
    facebook: '',
  });
  const [showData, setShowData] = useState({
    venue: '',
    address: '',
    day: '',
    startTime: '',
    endTime: '',
    djName: '',
    description: '',
    venuePhone: '',
    venueWebsite: '',
  });
  const [isCreatingVendor, setIsCreatingVendor] = useState(!authStore.isAuthenticated);

  useEffect(() => {
    // Load vendors when component mounts, but only if user is authenticated
    if (authStore.isAuthenticated) {
      vendorStore.fetchVendors();
    }
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await parserStore.parseWebsite(url);
      if (result.success && result.data) {
        setParsedData(result.data);
        setSuccess('URL parsed successfully! Please review the data below.');
      } else {
        setError(result.error || 'Failed to parse URL');
      }
    } catch (err) {
      setError('Failed to parse URL. Please try again.');
      console.error('Parse error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmParsedData = async () => {
    if (!parsedData) return;

    setLoading(true);
    try {
      const result = await parserStore.approveAllItems(parsedData.id);
      if (result.success) {
        setSuccess('Data confirmed and saved successfully!');
        setParsedData(null);
        setUrl('');
        setShowConfirmDialog(false);
      } else {
        setError(result.error || 'Failed to save confirmed data.');
      }
    } catch (err) {
      setError('Failed to save confirmed data.');
      console.error('Confirm error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectParsedData = async () => {
    if (!parsedData) return;

    setLoading(true);
    try {
      const result = await parserStore.rejectParsedData(parsedData.id, 'Rejected by user');
      if (result.success) {
        setSuccess('Data rejected successfully.');
        setParsedData(null);
        setUrl('');
        setShowConfirmDialog(false);
      } else {
        setError(result.error || 'Failed to reject data.');
      }
    } catch (err) {
      setError('Failed to reject data.');
      console.error('Reject error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async () => {
    if (!newVendorData.name.trim() || !newVendorData.owner.trim()) {
      setError('Vendor name and owner are required');
      return;
    }

    setLoading(true);
    try {
      const result = await vendorStore.createVendor(newVendorData);
      if (result.success) {
        setSelectedVendor(result.vendor);
        setIsCreatingVendor(false);
        setNewVendorData({ name: '', owner: '', website: '', instagram: '', facebook: '' });
        setSuccess('Vendor created successfully!');
      } else {
        setError(result.error || 'Failed to create vendor.');
      }
    } catch (err) {
      setError('Failed to create vendor.');
      console.error('Create vendor error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualShowSubmit = async () => {
    if (!selectedVendor) {
      setError('Please select or create a vendor first');
      return;
    }

    if (!showData.venue.trim() || !showData.day.trim() || !showData.startTime.trim()) {
      setError('Venue, day, and start time are required');
      return;
    }

    setLoading(true);
    try {
      // Create show data in the format expected by the backend
      const showSubmission = {
        vendorId: selectedVendor.id,
        venue: showData.venue,
        address: showData.address,
        day: showData.day,
        startTime: showData.startTime,
        endTime: showData.endTime,
        djName: showData.djName,
        description: showData.description,
        venuePhone: showData.venuePhone,
        venueWebsite: showData.venueWebsite,
      };

      const result = await parserStore.submitManualShow(showSubmission);

      if (result.success) {
        setSuccess('Show submitted successfully!');
        setShowData({
          venue: '',
          address: '',
          day: '',
          startTime: '',
          endTime: '',
          djName: '',
          description: '',
          venuePhone: '',
          venueWebsite: '',
        });
      } else {
        setError(result.error || 'Failed to submit show.');
      }
    } catch (err) {
      setError('Failed to submit show.');
      console.error('Submit show error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: 4, px: { xs: 1, sm: 3 } }}>
      {/* Header Section */}
      <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
        <MusicNote sx={{ fontSize: { xs: 48, sm: 64 }, color: 'primary.main', mb: 2 }} />
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          fontWeight={600}
          sx={{ fontSize: { xs: '1.8rem', sm: '3rem' } }}
        >
          Submit Karaoke Shows
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          paragraph
          sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
        >
          Help us expand our karaoke database by submitting venue URLs for parsing or manually
          adding show information.
        </Typography>
        <Box sx={{ maxWidth: 600, mx: 'auto', px: { xs: 2, sm: 0 } }}>
          <Typography variant="body2" color="text.secondary">
            Whether you have a website URL to parse or want to add show details manually, your
            contributions help fellow karaoke enthusiasts discover new venues and events.
          </Typography>
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 4 },
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.primary.main}02 100%)`,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 2 }}
            onClose={() => setError('')}
            icon={<Cancel />}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 3, borderRadius: 2 }}
            onClose={() => setSuccess('')}
            icon={<CheckCircle />}
          >
            {success}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: { xs: 2, sm: 4 } }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                py: { xs: 2.5, sm: 2 },
                minHeight: { xs: 64, sm: 72 },
                fontWeight: 500,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                textTransform: 'none',
              },
            }}
          >
            <Tab
              icon={<Link sx={{ fontSize: { xs: 24, sm: 28 }, mb: 1 }} />}
              label={
                <Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    Parse Website URL
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      display: { xs: 'none', sm: 'block' },
                    }}
                  >
                    Automatically extract show data
                  </Typography>
                </Box>
              }
            />
            <Tab
              icon={<Event sx={{ fontSize: { xs: 24, sm: 28 }, mb: 1 }} />}
              label={
                <Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    Add Show Manually
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      display: { xs: 'none', sm: 'block' },
                    }}
                  >
                    Enter show details by hand
                  </Typography>
                </Box>
              }
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 3,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                mb: 3,
                gap: { xs: 2, sm: 0 },
              }}
            >
              <Link
                sx={{
                  fontSize: { xs: 24, sm: 32 },
                  color: 'primary.main',
                  mr: { xs: 0, sm: 2 },
                }}
              />
              <Box>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                >
                  Submit Website URL for Parsing
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}
                >
                  Enter a venue website URL and our AI will automatically extract karaoke show
                  information, including venues, schedules, and DJ details.
                </Typography>
              </Box>
            </Box>

            <TextField
              fullWidth
              label="Website URL"
              placeholder="https://example.com/karaoke-schedule"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              sx={{ mb: 3 }}
              disabled={loading}
              variant="outlined"
              helperText="Enter the full URL of a webpage containing karaoke show information"
              InputProps={{
                sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
              }}
            />

            <Button
              variant="contained"
              size="large"
              onClick={handleUrlSubmit}
              disabled={loading || !url.trim()}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Link />}
              fullWidth
              sx={{
                px: 4,
                py: { xs: 2, sm: 1.5 },
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: '1.1rem' },
                minHeight: { xs: 48, sm: 'auto' },
              }}
            >
              {loading ? 'Parsing Website...' : 'Parse URL'}
            </Button>
          </Card>

          {parsedData && (
            <Card
              elevation={0}
              sx={{
                border: `2px solid ${theme.palette.success.main}20`,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.success.main}10, ${theme.palette.success.main}05)`,
                  p: { xs: 2, sm: 3 },
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 2, sm: 0 },
                    mb: 2,
                  }}
                >
                  <CheckCircle
                    sx={{
                      color: 'success.main',
                      mr: { xs: 0, sm: 2 },
                      fontSize: { xs: 28, sm: 32 },
                    }}
                  />
                  <Box>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                    >
                      ✨ Parsing Successful!
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}
                    >
                      Please review the extracted information below before saving to our database.
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight={600} color="primary">
                        🏢 Vendor Information
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={parsedData.aiAnalysis.vendor.name}
                          color="primary"
                          variant="filled"
                          sx={{ fontWeight: 600 }}
                        />
                        {parsedData.aiAnalysis.vendor.website && (
                          <Chip
                            label={parsedData.aiAnalysis.vendor.website}
                            variant="outlined"
                            color="primary"
                          />
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        fontWeight={600}
                        color="secondary"
                      >
                        🎤 DJs & KJs ({parsedData.aiAnalysis.djs.length})
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {parsedData.aiAnalysis.djs.map((dj, index) => (
                          <Chip
                            key={index}
                            label={dj.name}
                            color="secondary"
                            variant="filled"
                            sx={{ mb: 1 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                      📅 Shows Found ({parsedData.aiAnalysis.shows.length})
                    </Typography>
                    <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                      {parsedData.aiAnalysis.shows.map((show, index) => (
                        <Card
                          key={index}
                          variant="outlined"
                          sx={{
                            mb: 2,
                            p: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            '&:hover': {
                              boxShadow: theme.shadows[2],
                            },
                          }}
                        >
                          <Typography variant="body1" fontWeight={600} gutterBottom>
                            📍 {show.venue}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            ⏰ {show.time}
                          </Typography>
                          {show.djName && (
                            <Typography variant="body2" color="primary">
                              🎵 DJ: {show.djName}
                            </Typography>
                          )}
                        </Card>
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>

              <CardActions sx={{ p: 3, pt: 0, gap: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={loading}
                  startIcon={<CheckCircle />}
                  sx={{
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Confirm & Save All Data
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="large"
                  onClick={handleRejectParsedData}
                  disabled={loading}
                  startIcon={<Cancel />}
                  sx={{
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Reject Data
                </Button>
              </CardActions>
            </Card>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: { xs: 3, sm: 4 } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                mb: 3,
                gap: { xs: 2, sm: 0 },
              }}
            >
              <Event
                sx={{
                  fontSize: { xs: 24, sm: 32 },
                  color: 'primary.main',
                  mr: { xs: 0, sm: 2 },
                }}
              />
              <Box>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                >
                  Add Karaoke Show Manually
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}
                >
                  Enter show details by hand when you have specific information about karaoke venues
                  and schedules.
                </Typography>
              </Box>
            </Box>
          </Box>

          <Grid container spacing={{ xs: 2, sm: 4 }}>
            <Grid item xs={12}>
              <Card
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 3 },
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  fontWeight={600}
                  sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                >
                  Step 1: Vendor Selection
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  paragraph
                  sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}
                >
                  {authStore.isAuthenticated
                    ? 'Choose an existing vendor from our database or create a new one for this karaoke show.'
                    : 'Create a new vendor for this karaoke show. (Login to select from existing vendors)'}
                </Typography>

                {authStore.isAuthenticated && !isCreatingVendor ? (
                  <Box>
                    <Autocomplete
                      options={vendorStore.vendors}
                      getOptionLabel={(option) => option.name}
                      value={selectedVendor}
                      onChange={(_event, newValue) => setSelectedVendor(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Existing Vendor"
                          variant="outlined"
                          helperText="Choose from existing vendors in our database"
                          InputProps={{
                            ...params.InputProps,
                            sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                          }}
                        />
                      )}
                      sx={{ mb: 3 }}
                    />
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<Add />}
                      onClick={() => setIsCreatingVendor(true)}
                      fullWidth
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 2,
                        py: { xs: 1.5, sm: 1 },
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        minHeight: { xs: 48, sm: 'auto' },
                      }}
                    >
                      Create New Vendor
                    </Button>
                  </Box>
                ) : (
                  <Card
                    variant="outlined"
                    sx={{
                      p: { xs: 2, sm: 3 },
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}05, ${theme.palette.secondary.main}05)`,
                    }}
                  >
                    <Typography
                      variant="h6"
                      gutterBottom
                      fontWeight={600}
                      sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                    >
                      Create New Vendor
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                      sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}
                    >
                      Add a new karaoke vendor to our database. This could be a DJ company,
                      entertainment service, or venue that hosts karaoke events.
                    </Typography>

                    <Grid container spacing={{ xs: 2, sm: 3 }}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Vendor Name *"
                          placeholder="e.g., Mike's Karaoke Service"
                          value={newVendorData.name}
                          onChange={(e) =>
                            setNewVendorData({ ...newVendorData, name: e.target.value })
                          }
                          required
                          InputProps={{
                            sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Owner Name *"
                          placeholder="e.g., Mike Johnson"
                          value={newVendorData.owner}
                          onChange={(e) =>
                            setNewVendorData({ ...newVendorData, owner: e.target.value })
                          }
                          required
                          InputProps={{
                            sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Website"
                          placeholder="https://example.com"
                          value={newVendorData.website}
                          onChange={(e) =>
                            setNewVendorData({ ...newVendorData, website: e.target.value })
                          }
                          InputProps={{
                            sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Instagram"
                          placeholder="@karaoke_service"
                          value={newVendorData.instagram}
                          onChange={(e) =>
                            setNewVendorData({ ...newVendorData, instagram: e.target.value })
                          }
                          InputProps={{
                            sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Facebook"
                          placeholder="facebook.com/karaokeservice"
                          value={newVendorData.facebook}
                          onChange={(e) =>
                            setNewVendorData({ ...newVendorData, facebook: e.target.value })
                          }
                          InputProps={{
                            sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                          }}
                        />
                      </Grid>
                    </Grid>

                    <Box
                      sx={{
                        mt: 3,
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 2,
                      }}
                    >
                      <Button
                        variant="contained"
                        onClick={handleCreateVendor}
                        disabled={loading}
                        startIcon={
                          loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />
                        }
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          borderRadius: 2,
                          py: { xs: 1.5, sm: 1 },
                          fontSize: { xs: '0.95rem', sm: '1rem' },
                          minHeight: { xs: 48, sm: 'auto' },
                        }}
                      >
                        {loading ? 'Creating...' : 'Create Vendor'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setIsCreatingVendor(false)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          borderRadius: 2,
                          py: { xs: 1.5, sm: 1 },
                          fontSize: { xs: '0.95rem', sm: '1rem' },
                          minHeight: { xs: 48, sm: 'auto' },
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Card>
                )}
              </Card>
            </Grid>

            {selectedVendor && (
              <Grid item xs={12}>
                <Card
                  elevation={0}
                  sx={{
                    p: { xs: 2, sm: 3 },
                    border: `1px solid ${theme.palette.success.main}40`,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.success.main}05, transparent)`,
                  }}
                >
                  <Typography
                    variant="h6"
                    gutterBottom
                    fontWeight={600}
                    sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                  >
                    Step 2: Show Information
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    paragraph
                    sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}
                  >
                    Vendor selected: <strong>{selectedVendor.name}</strong>. Now add the karaoke
                    show details.
                  </Typography>

                  <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Venue Name *"
                        placeholder="e.g., Murphy's Pub"
                        value={showData.venue}
                        onChange={(e) => setShowData({ ...showData, venue: e.target.value })}
                        required
                        InputProps={{
                          sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Venue Address"
                        placeholder="e.g., 123 Main St, City, State"
                        value={showData.address}
                        onChange={(e) => setShowData({ ...showData, address: e.target.value })}
                        InputProps={{
                          sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel
                          sx={{
                            fontSize: { xs: '0.9rem', sm: '1rem' },
                            '&.MuiInputLabel-shrunk': {
                              fontSize: { xs: '0.75rem', sm: '0.75rem' },
                            },
                          }}
                        >
                          Day *
                        </InputLabel>
                        <Select
                          value={showData.day}
                          onChange={(e) => setShowData({ ...showData, day: e.target.value })}
                          label="Day *"
                          size="small"
                          sx={{
                            '& .MuiSelect-select': {
                              fontSize: { xs: '0.75rem', sm: '0.875rem' },
                              padding: { xs: '6px 8px', sm: '8.5px 14px' },
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              fontSize: { xs: '0.75rem', sm: '1rem' },
                            },
                          }}
                        >
                          <MenuItem
                            value="Monday"
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                          >
                            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Monday</Box>
                            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>Mon</Box>
                          </MenuItem>
                          <MenuItem
                            value="Tuesday"
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                          >
                            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Tuesday</Box>
                            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>Tue</Box>
                          </MenuItem>
                          <MenuItem
                            value="Wednesday"
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                          >
                            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Wednesday</Box>
                            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>Wed</Box>
                          </MenuItem>
                          <MenuItem
                            value="Thursday"
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                          >
                            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Thursday</Box>
                            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>Thu</Box>
                          </MenuItem>
                          <MenuItem
                            value="Friday"
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                          >
                            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Friday</Box>
                            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>Fri</Box>
                          </MenuItem>
                          <MenuItem
                            value="Saturday"
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                          >
                            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Saturday</Box>
                            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>Sat</Box>
                          </MenuItem>
                          <MenuItem
                            value="Sunday"
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                          >
                            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Sunday</Box>
                            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>Sun</Box>
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Start Time *"
                        type="time"
                        value={showData.startTime}
                        onChange={(e) => setShowData({ ...showData, startTime: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        required
                        InputProps={{
                          sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="End Time"
                        type="time"
                        value={showData.endTime}
                        onChange={(e) => setShowData({ ...showData, endTime: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="DJ/KJ Name"
                        placeholder="e.g., DJ Mike"
                        value={showData.djName}
                        onChange={(e) => setShowData({ ...showData, djName: e.target.value })}
                        InputProps={{
                          sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Venue Phone"
                        placeholder="e.g., (555) 123-4567"
                        value={showData.venuePhone}
                        onChange={(e) => setShowData({ ...showData, venuePhone: e.target.value })}
                        InputProps={{
                          sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Venue Website"
                        placeholder="https://venue-website.com"
                        value={showData.venueWebsite}
                        onChange={(e) => setShowData({ ...showData, venueWebsite: e.target.value })}
                        InputProps={{
                          sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={4}
                        label="Additional Description"
                        placeholder="Any additional details about the show, special events, song restrictions, etc."
                        value={showData.description}
                        onChange={(e) => setShowData({ ...showData, description: e.target.value })}
                        InputProps={{
                          sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 4 }}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleManualShowSubmit}
                      disabled={loading}
                      startIcon={
                        loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />
                      }
                      fullWidth
                      sx={{
                        px: 4,
                        py: { xs: 2, sm: 1.5 },
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 2,
                        fontSize: { xs: '1rem', sm: '1.1rem' },
                        minHeight: { xs: 52, sm: 'auto' },
                      }}
                    >
                      {loading ? 'Submitting Show...' : 'Submit Karaoke Show'}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>
      </Paper>

      {/* Enhanced Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircle sx={{ color: 'success.main', mr: 2, fontSize: 32 }} />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Confirm Parsed Data
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Save this information to the database
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to save this parsed data to our karaoke database? This will
            create:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <Typography component="li" variant="body2" gutterBottom>
              <strong>1 Vendor:</strong> {parsedData?.aiAnalysis.vendor.name}
            </Typography>
            <Typography component="li" variant="body2" gutterBottom>
              <strong>{parsedData?.aiAnalysis.djs.length} DJs/KJs:</strong>{' '}
              {parsedData?.aiAnalysis.djs.map((dj) => dj.name).join(', ')}
            </Typography>
            <Typography component="li" variant="body2">
              <strong>{parsedData?.aiAnalysis.shows.length} Shows:</strong> All scheduled karaoke
              events
            </Typography>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            This action will make the data available to all users on KaraokeHub.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={() => setShowConfirmDialog(false)}
            variant="outlined"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmParsedData}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            {loading ? 'Saving...' : 'Confirm & Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
});

export default SubmitShowPage;
