import { CustomCard } from '@components/CustomCard';
import { LoadingButton } from '@components/LoadingButton';
import { ParseResults, ParseResultsDialog } from '@components/ParseResultsDialog';
import {
  faCheck,
  faFileLines,
  faGlobe,
  faMicrophone,
  faMusic,
  faTimes,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  alpha,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { authStore, parserStore, uiStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';

const ParserReviewPage: React.FC = observer(() => {
  const theme = useTheme();
  const [urlToParseDialog, setUrlToParseDialog] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<any>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [parseResults, setParseResults] = useState<ParseResults | null>(null);
  const [parseResultsDialogOpen, setParseResultsDialogOpen] = useState(false);
  const [selectedUrlToParse, setSelectedUrlToParse] = useState<string>('');

  // Granular approval state
  const [selectedVendor, setSelectedVendor] = useState(false);
  const [selectedDjs, setSelectedDjs] = useState<string[]>([]);
  const [selectedShows, setSelectedShows] = useState<string[]>([]);

  // Redirect non-admin users
  if (!authStore.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Initialize parser store data when component mounts
  React.useMemo(() => {
    if (!parserStore.isInitialized) {
      parserStore.initialize().catch((error) => {
        console.error('Failed to initialize parser store:', error);
      });
    }
    // Also fetch URLs to parse
    parserStore.fetchUrlsToParse().catch((error) => {
      console.error('Failed to fetch URLs to parse:', error);
    });
  }, []);

  const handleParseUrl = async () => {
    if (!newUrl.trim()) return;

    if (autoApprove) {
      // Use parse and save directly
      const result = await parserStore.parseAndSaveWebsite(newUrl);
      if (result.success && result.data) {
        // Show success dialog with details
        const avgDjConfidence =
          result.data.djs?.length > 0
            ? result.data.djs.reduce((sum: number, dj: any) => sum + (dj.confidence || 0), 0) /
              result.data.djs.length
            : 0;
        const avgShowConfidence =
          result.data.shows?.length > 0
            ? result.data.shows.reduce(
                (sum: number, show: any) => sum + (show.confidence || 0),
                0,
              ) / result.data.shows.length
            : 0;

        setParseResults({
          vendor: result.data.vendor,
          djsCount: result.data.djs?.length || 0,
          showsCount: result.data.shows?.length || 0,
          confidence: {
            vendor: result.data.vendor?.confidence || 0,
            avgDjConfidence: avgDjConfidence,
            avgShowConfidence: avgShowConfidence,
          },
          url: newUrl,
        });
        setParseResultsDialogOpen(true);
        setNewUrl('');
        setAutoApprove(false);
        setUrlToParseDialog(false);
      } else {
        uiStore.addNotification(
          result.error || 'Failed to parse and save website. Please try again.',
          'error',
        );
      }
    } else {
      // Use traditional parse for review
      const result = await parserStore.parseWebsite(newUrl);
      if (result.success) {
        uiStore.addNotification('Website parsed successfully! Check pending reviews.', 'success');
        setNewUrl('');
        setAutoApprove(false);
        setUrlToParseDialog(false);
      } else {
        uiStore.addNotification(
          result.error || 'Failed to parse website. Please try again.',
          'error',
        );
      }
    }
  };

  const handleReviewItem = (reviewId: string) => {
    const review = parserStore.getPendingReviewById(reviewId);
    if (review) {
      setSelectedReview(reviewId);
      setEditedData({ ...review.aiAnalysis });
      // Reset selections when switching reviews
      setSelectedVendor(false);
      setSelectedDjs([]);
      setSelectedShows([]);
    }
  };

  const handleApproveSelected = async () => {
    if (!selectedReview) return;

    const selectedItems = {
      vendor: selectedVendor,
      // Convert dj-0, dj-1 to actual indices for the backend
      djIds: selectedDjs.map((id) => id.replace('dj-', '')),
      // Convert show-0, show-1 to actual indices for the backend
      showIds: selectedShows.map((id) => id.replace('show-', '')),
    };

    const result = await parserStore.approveSelectedItems(selectedReview, selectedItems);
    if (result.success) {
      // Show detailed success message if available
      const message = result.message || 'Selected items approved successfully!';
      uiStore.addNotification(message, 'success');
      setSelectedReview(null);
      setEditedData(null);
      setSelectedVendor(false);
      setSelectedDjs([]);
      setSelectedShows([]);
    } else {
      uiStore.addNotification(
        result.error || 'Failed to approve selected items. Please try again.',
        'error',
      );
    }
  };

  const handleApproveAll = async () => {
    if (!selectedReview) return;

    const result = await parserStore.approveAllItems(selectedReview);
    if (result.success) {
      // Show detailed success message if available
      const message = result.message || 'All items approved successfully!';
      uiStore.addNotification(message, 'success');
      setSelectedReview(null);
      setEditedData(null);
      setSelectedVendor(false);
      setSelectedDjs([]);
      setSelectedShows([]);
    } else {
      uiStore.addNotification(
        result.error || 'Failed to approve items. Please try again.',
        'error',
      );
    }
  };

  const handleReject = async (reason?: string) => {
    if (!selectedReview) return;

    const result = await parserStore.rejectParsedData(selectedReview, reason);
    if (result.success) {
      uiStore.addNotification('Items rejected successfully!', 'success');
      setSelectedReview(null);
      setEditedData(null);
    } else {
      uiStore.addNotification(result.error || 'Failed to reject items. Please try again.', 'error');
    }
  };

  const handleParseFromDropdown = async () => {
    if (!selectedUrlToParse) return;

    const result = await parserStore.parseSelectedUrl(selectedUrlToParse);
    if (result.success) {
      uiStore.addNotification('URL parsed successfully!', 'success');
      // Reset selection after successful parsing
      setSelectedUrlToParse('');
    } else {
      uiStore.addNotification(result.error || 'Failed to parse URL. Please try again.', 'error');
    }
  };
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return theme.palette.success.main;
    if (confidence >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const selectedReviewData = selectedReview
    ? parserStore.getPendingReviewById(selectedReview)
    : null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, 
          ${alpha(theme.palette.primary.main, 0.1)} 0%, 
          ${alpha(theme.palette.secondary.main, 0.05)} 50%, 
          ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Box sx={{ maxWidth: '1400px', mx: 'auto', py: 6, position: 'relative', zIndex: 1 }}>
        {/* Enhanced Header */}
        <Paper
          elevation={0}
          sx={{
            background: `linear-gradient(135deg, 
              ${alpha(theme.palette.background.paper, 0.95)} 0%, 
              ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            borderRadius: 3,
            mb: 4,
            mx: 3,
            overflow: 'hidden',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            },
          }}
        >
          <Box sx={{ p: 4, pb: 2 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <FontAwesomeIcon icon={faGlobe} size="lg" />
                </Box>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                    Karaoke Parser & Review
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                    Parse karaoke venue websites and review AI-extracted data
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                onClick={() => setUrlToParseDialog(true)}
                startIcon={<FontAwesomeIcon icon={faGlobe} />}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                }}
              >
                Parse New Website
              </Button>
            </Box>

            {parserStore.error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {parserStore.error}
              </Alert>
            )}
          </Box>
        </Paper>

        <Box>
          {/* URL Parsing Section */}
          <CustomCard title="Parse Saved URLs" sx={{ mb: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Select a URL from your saved list to parse:
              </Typography>
            </Box>
            {parserStore.isLoading ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography>Loading URLs...</Typography>
              </Box>
            ) : parserStore.urlsToParse.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography color="text.secondary">
                  No URLs saved yet. Add some URLs using the "Parse New Website" button!
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl fullWidth>
                  <InputLabel>Select URL to Parse</InputLabel>
                  <Select
                    value={selectedUrlToParse}
                    onChange={(e) => setSelectedUrlToParse(e.target.value as string)}
                    label="Select URL to Parse"
                  >
                    {parserStore.urlsToParse.map((urlItem) => (
                      <MenuItem key={urlItem.id} value={urlItem.url}>
                        <Box>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                            {urlItem.url}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Added: {new Date(urlItem.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <LoadingButton
                  variant="contained"
                  onClick={handleParseFromDropdown}
                  disabled={!selectedUrlToParse || parserStore.isLoading}
                  loading={parserStore.isLoading}
                  startIcon={<FontAwesomeIcon icon={faGlobe} />}
                  sx={{ minWidth: '120px', flexShrink: 0 }}
                >
                  Parse
                </LoadingButton>
              </Box>
            )}
          </CustomCard>

          <Box sx={{ px: 3 }}>
            <Grid container spacing={3}>
              {/* Pending Reviews List */}
              <Grid item xs={12} lg={6}>
                <CustomCard title="Pending Reviews" sx={{ height: 'fit-content' }}>
                  {parserStore.isLoading ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography>Loading pending reviews...</Typography>
                    </Box>
                  ) : parserStore.pendingReviews.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">
                        No pending reviews. Parse a website to get started!
                      </Typography>
                    </Box>
                  ) : (
                    <List>
                      {parserStore.pendingReviews.map((review, index) => (
                        <React.Fragment key={review.id}>
                          <ListItem
                            sx={{
                              cursor: 'pointer',
                              borderRadius: 1,
                              mb: 1,
                              '&:hover': {
                                bgcolor: 'action.hover',
                              },
                              ...(selectedReview === review.id && {
                                bgcolor: theme.palette.primary.main + '20',
                                border: `1px solid ${theme.palette.primary.main}`,
                              }),
                            }}
                            onClick={() => handleReviewItem(review.id)}
                          >
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="subtitle2" noWrap>
                                    {review.aiAnalysis?.vendor?.name || 'Unknown Vendor'}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={`${review.aiAnalysis?.djs?.length || 0} DJs`}
                                    color="primary"
                                  />
                                  <Chip
                                    size="small"
                                    label={`${review.aiAnalysis?.shows?.length || 0} Shows`}
                                    color="secondary"
                                  />
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {review.url}
                                </Typography>
                              }
                            />
                          </ListItem>
                          {index < parserStore.pendingReviews.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </CustomCard>
              </Grid>

              {/* Review Details */}
              <Grid item xs={12} lg={6}>
                {selectedReviewData && editedData ? (
                  <CustomCard
                    title={
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant="h6">Review Details</Typography>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={handleApproveSelected}
                            disabled={
                              parserStore.isLoading ||
                              (!selectedVendor &&
                                selectedDjs.length === 0 &&
                                selectedShows.length === 0)
                            }
                            startIcon={<FontAwesomeIcon icon={faCheck} />}
                          >
                            Approve Selected
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={handleApproveAll}
                            disabled={parserStore.isLoading}
                            startIcon={<FontAwesomeIcon icon={faCheck} />}
                          >
                            Approve All
                          </Button>
                          <IconButton
                            color="error"
                            onClick={() => handleReject('Rejected during review')}
                            disabled={parserStore.isLoading}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </IconButton>
                        </Stack>
                      </Box>
                    }
                  >
                    <Stack spacing={3}>
                      {/* Vendor Information */}
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <Checkbox
                            checked={selectedVendor}
                            onChange={(e) => setSelectedVendor(e.target.checked)}
                            size="small"
                            color="primary"
                          />
                          <FontAwesomeIcon icon={faUsers} />
                          Vendor Information
                        </Typography>
                        <Stack spacing={2}>
                          <TextField
                            label="Vendor Name"
                            value={editedData.vendor?.name || ''}
                            onChange={(e) =>
                              setEditedData({
                                ...editedData,
                                vendor: { ...editedData.vendor, name: e.target.value },
                              })
                            }
                            fullWidth
                            size="small"
                          />
                          <TextField
                            label="Website"
                            value={editedData.vendor?.website || ''}
                            onChange={(e) =>
                              setEditedData({
                                ...editedData,
                                vendor: { ...editedData.vendor, website: e.target.value },
                              })
                            }
                            fullWidth
                            size="small"
                          />
                          <TextField
                            label="Description"
                            value={editedData.vendor?.description || ''}
                            onChange={(e) =>
                              setEditedData({
                                ...editedData,
                                vendor: { ...editedData.vendor, description: e.target.value },
                              })
                            }
                            fullWidth
                            multiline
                            rows={2}
                            size="small"
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption">Confidence:</Typography>
                            <Chip
                              size="small"
                              label={`${editedData.vendor?.confidence || 0}%`}
                              sx={{
                                backgroundColor: getConfidenceColor(
                                  editedData.vendor?.confidence || 0,
                                ),
                                color: 'white',
                              }}
                            />
                          </Box>
                        </Stack>
                      </Box>

                      <Divider />

                      {/* KJs */}
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <FontAwesomeIcon icon={faMicrophone} />
                          DJs ({editedData.djs?.length || 0})
                        </Typography>
                        <Stack spacing={1}>
                          {editedData.djs?.map((dj: any, index: number) => (
                            <Paper key={`dj-${index}-${dj.name || 'unnamed'}`} sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Checkbox
                                  checked={selectedDjs.includes(`dj-${index}`)}
                                  onChange={(e) => {
                                    const djId = `dj-${index}`;
                                    if (e.target.checked) {
                                      setSelectedDjs([...selectedDjs, djId]);
                                    } else {
                                      setSelectedDjs(selectedDjs.filter((id) => id !== djId));
                                    }
                                  }}
                                  size="small"
                                  color="primary"
                                />
                                <Typography variant="subtitle2" flexGrow={1}>
                                  Select DJ: {dj.name}
                                </Typography>
                              </Box>
                              <TextField
                                label="DJ Name"
                                value={dj.name || ''}
                                onChange={(e) => {
                                  const newDjs = [...editedData.djs];
                                  newDjs[index] = { ...newDjs[index], name: e.target.value };
                                  setEditedData({ ...editedData, djs: newDjs });
                                }}
                                fullWidth
                                size="small"
                                sx={{ mb: 1 }}
                              />

                              {/* DJ Aliases/Nicknames */}
                              {dj.aliases && dj.aliases.length > 0 && (
                                <Box sx={{ mb: 1 }}>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    Known Aliases/Nicknames:
                                  </Typography>
                                  <Box
                                    sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
                                  >
                                    {dj.aliases.map((alias: string, aliasIndex: number) => (
                                      <Chip
                                        key={`alias-${index}-${aliasIndex}-${alias}`}
                                        label={alias}
                                        size="small"
                                        variant="outlined"
                                        color="secondary"
                                        sx={{ fontSize: '0.75rem' }}
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              )}

                              {/* Social Media Handles */}
                              {dj.socialHandles && dj.socialHandles.length > 0 && (
                                <Box sx={{ mb: 1 }}>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    Social Media Handles:
                                  </Typography>
                                  <Box
                                    sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
                                  >
                                    {dj.socialHandles.map((handle: string, handleIndex: number) => (
                                      <Chip
                                        key={`handle-${index}-${handleIndex}-${handle}`}
                                        label={handle}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ fontSize: '0.75rem' }}
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              )}

                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption">Confidence:</Typography>
                                <Chip
                                  size="small"
                                  label={`${dj.confidence || 0}%`}
                                  sx={{
                                    backgroundColor: getConfidenceColor(dj.confidence || 0),
                                    color: 'white',
                                  }}
                                />
                              </Box>
                            </Paper>
                          ))}
                        </Stack>
                      </Box>

                      <Divider />

                      {/* Shows */}
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <FontAwesomeIcon icon={faMusic} />
                          Shows ({editedData.shows?.length || 0})
                        </Typography>
                        <Stack spacing={2}>
                          {editedData.shows?.map((show: any, index: number) => (
                            <Paper
                              key={`show-${index}-${show.venue || 'unknown'}-${show.time || index}`}
                              sx={{ p: 2 }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Checkbox
                                  checked={selectedShows.includes(`show-${index}`)}
                                  onChange={(e) => {
                                    const showId = `show-${index}`;
                                    if (e.target.checked) {
                                      setSelectedShows([...selectedShows, showId]);
                                    } else {
                                      setSelectedShows(selectedShows.filter((id) => id !== showId));
                                    }
                                  }}
                                  size="small"
                                  color="primary"
                                />
                                <Typography variant="subtitle2" flexGrow={1}>
                                  Select Show: {(show.venue && typeof show.venue === "object" ? show.venue.name : show.venue) || "Unknown Venue"} - {show.time}
                                </Typography>
                              </Box>
                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    label="Venue"
                                    value={show.venue || ''}
                                    onChange={(e) => {
                                      const newShows = [...editedData.shows];
                                      newShows[index] = {
                                        ...newShows[index],
                                        venue: e.target.value,
                                      };
                                      setEditedData({ ...editedData, shows: newShows });
                                    }}
                                    fullWidth
                                    size="small"
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    label="Time"
                                    value={show.time || ''}
                                    onChange={(e) => {
                                      const newShows = [...editedData.shows];
                                      newShows[index] = {
                                        ...newShows[index],
                                        time: e.target.value,
                                      };
                                      setEditedData({ ...editedData, shows: newShows });
                                    }}
                                    fullWidth
                                    size="small"
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    label="DJ Name"
                                    value={show.djName || ''}
                                    onChange={(e) => {
                                      const newShows = [...editedData.shows];
                                      newShows[index] = {
                                        ...newShows[index],
                                        djName: e.target.value,
                                      };
                                      setEditedData({ ...editedData, shows: newShows });
                                    }}
                                    fullWidth
                                    size="small"
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    label="Venue Address"
                                    value={show.address || ''}
                                    onChange={(e) => {
                                      const newShows = [...editedData.shows];
                                      newShows[index] = {
                                        ...newShows[index],
                                        address: e.target.value,
                                      };
                                      setEditedData({ ...editedData, shows: newShows });
                                    }}
                                    fullWidth
                                    size="small"
                                    placeholder="123 Main Street, City, State ZIP"
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    label="City"
                                    value={show.venue && typeof show.venue === "object" ? show.venue.city : null || ''}
                                    onChange={(e) => {
                                      const newShows = [...editedData.shows];
                                      newShows[index] = {
                                        ...newShows[index],
                                        city: e.target.value,
                                      };
                                      setEditedData({ ...editedData, shows: newShows });
                                    }}
                                    fullWidth
                                    size="small"
                                    placeholder="City name"
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    label="State"
                                    value={show.venue && typeof show.venue === "object" ? show.venue.state : null || ''}
                                    onChange={(e) => {
                                      const newShows = [...editedData.shows];
                                      newShows[index] = {
                                        ...newShows[index],
                                        state: e.target.value,
                                      };
                                      setEditedData({ ...editedData, shows: newShows });
                                    }}
                                    fullWidth
                                    size="small"
                                    placeholder="State (e.g., CA, NY, TX)"
                                    inputProps={{
                                      maxLength: 2,
                                      style: { textTransform: 'uppercase' },
                                    }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <TextField
                                    label="ZIP Code"
                                    value={show.zip || ''}
                                    onChange={(e) => {
                                      const newShows = [...editedData.shows];
                                      newShows[index] = { ...newShows[index], zip: e.target.value };
                                      setEditedData({ ...editedData, shows: newShows });
                                    }}
                                    fullWidth
                                    size="small"
                                    placeholder="12345"
                                    inputProps={{ maxLength: 10, pattern: '[0-9]{5}(-[0-9]{4})?' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    label="Latitude"
                                    value={show.venue && typeof show.venue === "object" ? show.venue.lat : null || ''}
                                    onChange={(e) => {
                                      const newShows = [...editedData.shows];
                                      newShows[index] = {
                                        ...newShows[index],
                                        lat: parseFloat(e.target.value) || undefined,
                                      };
                                      setEditedData({ ...editedData, shows: newShows });
                                    }}
                                    fullWidth
                                    size="small"
                                    placeholder="39.961176"
                                    inputProps={{ step: 'any', type: 'number' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    label="Longitude"
                                    value={show.venue && typeof show.venue === "object" ? show.venue.lng : null || ''}
                                    onChange={(e) => {
                                      const newShows = [...editedData.shows];
                                      newShows[index] = {
                                        ...newShows[index],
                                        lng: parseFloat(e.target.value) || undefined,
                                      };
                                      setEditedData({ ...editedData, shows: newShows });
                                    }}
                                    fullWidth
                                    size="small"
                                    placeholder="-82.998794"
                                    inputProps={{ step: 'any', type: 'number' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    label="Venue Phone"
                                    value={show.venuePhone || ''}
                                    onChange={(e) => {
                                      const newShows = [...editedData.shows];
                                      newShows[index] = {
                                        ...newShows[index],
                                        venuePhone: e.target.value,
                                      };
                                      setEditedData({ ...editedData, shows: newShows });
                                    }}
                                    fullWidth
                                    size="small"
                                    placeholder="(555) 123-4567"
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    label="Venue Website"
                                    value={show.venueWebsite || ''}
                                    onChange={(e) => {
                                      const newShows = [...editedData.shows];
                                      newShows[index] = {
                                        ...newShows[index],
                                        venueWebsite: e.target.value,
                                      };
                                      setEditedData({ ...editedData, shows: newShows });
                                    }}
                                    fullWidth
                                    size="small"
                                    placeholder="https://venue-website.com"
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    label="Source"
                                    value={show.source || ''}
                                    onChange={(e) => {
                                      const newShows = [...editedData.shows];
                                      newShows[index] = {
                                        ...newShows[index],
                                        source: e.target.value,
                                      };
                                      setEditedData({ ...editedData, shows: newShows });
                                    }}
                                    fullWidth
                                    size="small"
                                    placeholder="Original source URL where this show data was found"
                                    helperText="The URL or source where this show information was originally parsed from"
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    label="Venue Image URL"
                                    value={show.imageUrl || ''}
                                    onChange={(e) => {
                                      const newShows = [...editedData.shows];
                                      newShows[index] = {
                                        ...newShows[index],
                                        imageUrl: e.target.value,
                                      };
                                      setEditedData({ ...editedData, shows: newShows });
                                    }}
                                    fullWidth
                                    size="small"
                                    placeholder="https://example.com/venue-image.jpg"
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption">Confidence:</Typography>
                                    <Chip
                                      size="small"
                                      label={`${show.confidence || 0}%`}
                                      sx={{
                                        backgroundColor: getConfidenceColor(show.confidence || 0),
                                        color: 'white',
                                      }}
                                    />
                                  </Box>
                                </Grid>
                              </Grid>
                            </Paper>
                          ))}
                        </Stack>
                      </Box>

                      {/* Parsing Logs */}
                      {editedData?.parsingLogs && editedData.parsingLogs.length > 0 && (
                        <>
                          <Divider />
                          <Box>
                            <Accordion>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography
                                  variant="h6"
                                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                >
                                  <FontAwesomeIcon icon={faFileLines} />
                                  Parsing Logs ({editedData.parsingLogs.length})
                                </Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                                  <Stack spacing={1}>
                                    {editedData.parsingLogs.map((log: any, index: number) => (
                                      <Paper
                                        key={index}
                                        variant="outlined"
                                        sx={{
                                          p: 1.5,
                                          borderLeft: `4px solid ${
                                            log.level === 'error'
                                              ? '#f44336'
                                              : log.level === 'warn'
                                                ? '#ff9800'
                                                : log.level === 'success'
                                                  ? '#4caf50'
                                                  : '#2196f3'
                                          }`,
                                          backgroundColor:
                                            log.level === 'error'
                                              ? 'rgba(244, 67, 54, 0.05)'
                                              : log.level === 'warn'
                                                ? 'rgba(255, 152, 0, 0.05)'
                                                : log.level === 'success'
                                                  ? 'rgba(76, 175, 80, 0.05)'
                                                  : 'rgba(33, 150, 243, 0.05)',
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            mb: 0.5,
                                          }}
                                        >
                                          <Chip
                                            size="small"
                                            label={log.level.toUpperCase()}
                                            sx={{
                                              backgroundColor:
                                                log.level === 'error'
                                                  ? '#f44336'
                                                  : log.level === 'warn'
                                                    ? '#ff9800'
                                                    : log.level === 'success'
                                                      ? '#4caf50'
                                                      : '#2196f3',
                                              color: 'white',
                                              fontSize: '0.7rem',
                                              height: 20,
                                            }}
                                          />
                                          <Typography variant="caption" color="text.secondary">
                                            {new Date(log.timestamp).toLocaleString()}
                                          </Typography>
                                        </Box>
                                        <Typography
                                          variant="body2"
                                          sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                                        >
                                          {log.message}
                                        </Typography>
                                      </Paper>
                                    ))}
                                  </Stack>
                                </Box>
                              </AccordionDetails>
                            </Accordion>
                          </Box>
                        </>
                      )}

                      {/* Review Comments for AI Rules */}
                      <Divider />
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <FontAwesomeIcon icon={faMusic} />
                          Parsing Rules & Comments
                        </Typography>
                        <TextField
                          label="Comments & Rules for AI Parser"
                          placeholder="Add comments or rules that will help the AI parser improve future parsing of similar sites..."
                          value={reviewComments}
                          onChange={(e) => setReviewComments(e.target.value)}
                          fullWidth
                          multiline
                          rows={4}
                          size="small"
                          helperText="These comments will be saved and used as rules for future parsing to improve accuracy"
                        />
                        <Box sx={{ mt: 2 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              if (selectedReview && reviewComments.trim()) {
                                parserStore.updateReviewComments(
                                  selectedReview,
                                  reviewComments.trim(),
                                );
                              }
                            }}
                            disabled={!reviewComments.trim() || parserStore.isLoading}
                          >
                            Save Rules
                          </Button>
                        </Box>
                      </Box>
                    </Stack>
                  </CustomCard>
                ) : (
                  <CustomCard title="Review Details">
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">
                        Select a pending review to view details
                      </Typography>
                    </Box>
                  </CustomCard>
                )}
              </Grid>
            </Grid>
          </Box>

          {/* Parse URL Dialog */}
          <Dialog
            open={urlToParseDialog}
            onClose={() => setUrlToParseDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Parse Karaoke Website</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Website URL"
                type="url"
                fullWidth
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://stevesdj.com/"
                helperText="Enter the URL of a website to parse for karaoke schedules"
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoApprove}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAutoApprove(e.target.checked)
                    }
                    color="primary"
                  />
                }
                label="Auto-approve and save to database"
                sx={{
                  mt: 1,
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.9rem',
                    color: theme.palette.text.secondary,
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {autoApprove
                  ? '⚡ Parsed data will be automatically saved to the database without review'
                  : '📝 Parsed data will be added to the review queue for manual approval'}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setUrlToParseDialog(false)}>Cancel</Button>
              <LoadingButton
                onClick={handleParseUrl}
                loading={parserStore.isLoading}
                variant="contained"
              >
                Parse Website
              </LoadingButton>
            </DialogActions>
          </Dialog>

          {/* Parse Results Dialog */}
          <ParseResultsDialog
            open={parseResultsDialogOpen}
            onClose={() => setParseResultsDialogOpen(false)}
            results={parseResults}
            title="Parse Results"
          />
        </Box>
      </Box>
    </Box>
  );
});

export default ParserReviewPage;
