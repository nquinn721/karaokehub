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
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { authStore, parserStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
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

  // Granular approval state
  const [selectedVendor, setSelectedVendor] = useState(false);
  const [selectedKjs, setSelectedKjs] = useState<string[]>([]);
  const [selectedShows, setSelectedShows] = useState<string[]>([]);

  // Redirect non-admin users
  if (!authStore.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    parserStore.fetchPendingReviews();
  }, []);

  const handleParseUrl = async () => {
    if (!newUrl.trim()) return;

    if (autoApprove) {
      // Use parse and save directly
      const result = await parserStore.parseAndSaveWebsite(newUrl, true);
      if (result.success && result.data) {
        // Show success dialog with details
        setParseResults({
          vendor: result.data.vendor,
          kjsCount: result.data.kjsCount,
          showsCount: result.data.showsCount,
          confidence: result.data.confidence,
          url: newUrl,
        });
        setParseResultsDialogOpen(true);
        setNewUrl('');
        setAutoApprove(false);
        setUrlToParseDialog(false);
      }
    } else {
      // Use traditional parse for review
      const result = await parserStore.parseWebsite(newUrl);
      if (result.success) {
        setNewUrl('');
        setAutoApprove(false);
        setUrlToParseDialog(false);
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
      setSelectedKjs([]);
      setSelectedShows([]);
    }
  };

  const handleApprove = async () => {
    if (!selectedReview || !editedData) return;

    const result = await parserStore.approveParsedData(selectedReview, editedData);
    if (result.success) {
      setSelectedReview(null);
      setEditedData(null);
    }
  };

  const handleApproveSelected = async () => {
    if (!selectedReview) return;

    const selectedItems = {
      vendor: selectedVendor,
      // Convert kj-0, kj-1 to actual indices for the backend
      kjIds: selectedKjs.map((id) => id.replace('kj-', '')),
      // Convert show-0, show-1 to actual indices for the backend
      showIds: selectedShows.map((id) => id.replace('show-', '')),
    };

    const result = await parserStore.approveSelectedItems(selectedReview, selectedItems);
    if (result.success) {
      setSelectedReview(null);
      setEditedData(null);
      setSelectedVendor(false);
      setSelectedKjs([]);
      setSelectedShows([]);
    }
  };

  const handleApproveAll = async () => {
    if (!selectedReview) return;

    const result = await parserStore.approveAllItems(selectedReview);
    if (result.success) {
      setSelectedReview(null);
      setEditedData(null);
      setSelectedVendor(false);
      setSelectedKjs([]);
      setSelectedShows([]);
    }
  };

  const handleReject = async (reason?: string) => {
    if (!selectedReview) return;

    const result = await parserStore.rejectParsedData(selectedReview, reason);
    if (result.success) {
      setSelectedReview(null);
      setEditedData(null);
    }
  };

  const handleParseStevesdj = async () => {
    const result = await parserStore.parseStevesdj();
    if (result.success && result.data) {
      // Show success dialog with details
      setParseResults({
        vendor: result.data.vendor,
        kjsCount: result.data.kjsCount,
        showsCount: result.data.showsCount,
        confidence: result.data.confidence,
        url: "Steve's DJ Website",
      });
      setParseResultsDialogOpen(true);
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

          <Stack direction="row" spacing={2}>
            <LoadingButton
              variant="outlined"
              color="primary"
              onClick={handleParseStevesdj}
              loading={parserStore.isLoading}
              startIcon={<FontAwesomeIcon icon={faMicrophone} />}
              sx={{ textTransform: 'none' }}
            >
              Parse Steve's DJ
            </LoadingButton>

            <Button
              variant="contained"
              onClick={() => setUrlToParseDialog(true)}
              startIcon={<FontAwesomeIcon icon={faGlobe} />}
            >
              Parse New Website
            </Button>
          </Stack>
        </Box>

        {parserStore.error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {parserStore.error}
          </Alert>
        )}

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
                                label={`${review.aiAnalysis?.kjs?.length || 0} KJs`}
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
                            selectedKjs.length === 0 &&
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
                      KJs ({editedData.kjs?.length || 0})
                    </Typography>
                    <Stack spacing={1}>
                      {editedData.kjs?.map((kj: any, index: number) => (
                        <Paper key={index} sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Checkbox
                              checked={selectedKjs.includes(`kj-${index}`)}
                              onChange={(e) => {
                                const kjId = `kj-${index}`;
                                if (e.target.checked) {
                                  setSelectedKjs([...selectedKjs, kjId]);
                                } else {
                                  setSelectedKjs(selectedKjs.filter((id) => id !== kjId));
                                }
                              }}
                              size="small"
                              color="primary"
                            />
                            <Typography variant="subtitle2" flexGrow={1}>
                              Select KJ: {kj.name}
                            </Typography>
                          </Box>
                          <TextField
                            label="KJ Name"
                            value={kj.name || ''}
                            onChange={(e) => {
                              const newKjs = [...editedData.kjs];
                              newKjs[index] = { ...newKjs[index], name: e.target.value };
                              setEditedData({ ...editedData, kjs: newKjs });
                            }}
                            fullWidth
                            size="small"
                            sx={{ mb: 1 }}
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption">Confidence:</Typography>
                            <Chip
                              size="small"
                              label={`${kj.confidence || 0}%`}
                              sx={{
                                backgroundColor: getConfidenceColor(kj.confidence || 0),
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
                                label="KJ Name"
                                value={show.kjName || ''}
                                onChange={(e) => {
                                  const newShows = [...editedData.shows];
                                  newShows[index] = { ...newShows[index], kjName: e.target.value };
                                  setEditedData({ ...editedData, shows: newShows });
                                }}
                                fullWidth
                                size="small"
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
