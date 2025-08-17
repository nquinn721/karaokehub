import { CustomCard } from '@components/CustomCard';
import { LoadingButton } from '@components/LoadingButton';
import { ParseResults, ParseResultsDialog } from '@components/ParseResultsDialog';
import {
  faCheck,
  faGlobe,
  faMicrophone,
  faMusic,
  faTimes,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
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
            ? result.data.djs.reduce((sum: number, dj: any) => sum + dj.confidence, 0) /
              result.data.djs.length
            : 0;
        const avgShowConfidence =
          result.data.shows?.length > 0
            ? result.data.shows.reduce((sum: number, show: any) => sum + show.confidence, 0) /
              result.data.shows.length
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
      uiStore.addNotification('Selected items approved successfully!', 'success');
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
      uiStore.addNotification('All items approved successfully!', 'success');
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
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            <FontAwesomeIcon icon={faGlobe} style={{ marginRight: '12px' }} />
            Karaoke Parser & Review
          </Typography>

          <Button
            variant="contained"
            onClick={() => setUrlToParseDialog(true)}
            startIcon={<FontAwesomeIcon icon={faGlobe} />}
          >
            Parse New Website
          </Button>
        </Box>

        {parserStore.error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {parserStore.error}
          </Alert>
        )}

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
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
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
                            backgroundColor: getConfidenceColor(editedData.vendor?.confidence || 0),
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
                        <Paper key={index} sx={{ p: 2 }}>
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
                              <Typography variant="caption" color="text.secondary" display="block">
                                Known Aliases/Nicknames:
                              </Typography>
                              <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {dj.aliases.map((alias: string, aliasIndex: number) => (
                                  <Chip
                                    key={aliasIndex}
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
                              <Typography variant="caption" color="text.secondary" display="block">
                                Social Media Handles:
                              </Typography>
                              <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {dj.socialHandles.map((handle: string, handleIndex: number) => (
                                  <Chip
                                    key={handleIndex}
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
                        <Paper key={index} sx={{ p: 2 }}>
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
                              Select Show: {show.venue} - {show.date} {show.time}
                            </Typography>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                label="Venue"
                                value={show.venue || ''}
                                onChange={(e) => {
                                  const newShows = [...editedData.shows];
                                  newShows[index] = { ...newShows[index], venue: e.target.value };
                                  setEditedData({ ...editedData, shows: newShows });
                                }}
                                fullWidth
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                label="Date"
                                value={show.date || ''}
                                onChange={(e) => {
                                  const newShows = [...editedData.shows];
                                  newShows[index] = { ...newShows[index], date: e.target.value };
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
                                  newShows[index] = { ...newShows[index], time: e.target.value };
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
                                  newShows[index] = { ...newShows[index], djName: e.target.value };
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
                                  newShows[index] = { ...newShows[index], address: e.target.value };
                                  setEditedData({ ...editedData, shows: newShows });
                                }}
                                fullWidth
                                size="small"
                                placeholder="123 Main Street, City, State ZIP"
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
                            parserStore.updateReviewComments(selectedReview, reviewComments.trim());
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
    </Container>
  );
});

export default ParserReviewPage;
