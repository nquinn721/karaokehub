import AdminBreadcrumb from '@components/AdminBreadcrumb';
import {
  faCheck,
  faChevronDown,
  faExclamationTriangle,
  faEye,
  faGlobe,
  faPlay,
  faPlus,
  faRefresh,
  faTimes,
  faTrash,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
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
  Radio,
  RadioGroup,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { authStore, parserStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';

const AdminParserPage: React.FC = observer(() => {
  const theme = useTheme();
  const [selectedUrl, setSelectedUrl] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [parseMethod, setParseMethod] = useState<'html' | 'screenshot'>('screenshot');
  const [isParsingUrl, setIsParsingUrl] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [urlToDelete, setUrlToDelete] = useState<{ id: number; url: string } | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Redirect non-admin users
  if (!authStore.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    // Initialize parser store data
    parserStore.initialize();
    parserStore.fetchUrlsToParse();
  }, []);

  // Auto-scroll to bottom when new log entries are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [parserStore.parsingLog.length]);

  const handleParseUrl = async () => {
    const urlToParse = selectedUrl || customUrl;
    if (!urlToParse) return;

    setIsParsingUrl(true);
    setParseResult(null);

    try {
      const result = await parserStore.parseAndSaveWebsite(urlToParse, parseMethod);
      setParseResult(result);

      // Only refresh pending reviews if parsing was successful
      if (result.success) {
        await parserStore.fetchPendingReviews();
      }
    } catch (error) {
      console.error('Error parsing URL:', error);
      // The error will be shown via parserStore.error from the store
    } finally {
      setIsParsingUrl(false);
    }
  };

  const handleReviewItem = (item: any) => {
    setSelectedReview(item);
    setReviewDialog(true);
    setReviewComments('');
  };

  const handleReviewAction = async (action: 'approve' | 'reject') => {
    if (!selectedReview) return;

    try {
      if (action === 'approve') {
        await parserStore.approveReview(selectedReview.id, reviewComments);
      } else {
        await parserStore.rejectReview(selectedReview.id, reviewComments);
      }

      // Refresh the pending reviews
      await parserStore.fetchPendingReviews();
      setReviewDialog(false);
      setSelectedReview(null);
    } catch (error) {
      console.error('Error processing review:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending_review':
        return 'warning';
      case 'needs_review':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <AdminBreadcrumb
        items={[
          {
            label: 'Admin',
            icon: faUserShield,
            path: '/admin',
          },
          {
            label: 'Parser',
            icon: faGlobe,
            isActive: true,
          },
        ]}
      />

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
          <FontAwesomeIcon
            icon={faGlobe}
            style={{ marginRight: '12px', color: theme.palette.primary.main }}
          />
          Karaoke Parser & Review
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Parse karaoke venue websites and review AI-extracted data
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Parse Section */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              <FontAwesomeIcon icon={faPlay} style={{ marginRight: '8px' }} />
              Parse Website
            </Typography>

            {parserStore.isLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Loading URLs to parse...
                </Typography>
              </Box>
            )}

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select URL to Parse</InputLabel>
                <Select
                  value={selectedUrl}
                  onChange={(e) => setSelectedUrl(e.target.value)}
                  label="Select URL to Parse"
                  disabled={showCustomUrl}
                  renderValue={(value) => (
                    <Box
                      sx={{
                        wordBreak: 'break-all',
                        whiteSpace: 'normal',
                        py: 0.5,
                      }}
                    >
                      {value}
                    </Box>
                  )}
                >
                  {parserStore.urlsToParse.map((url) => (
                    <MenuItem
                      key={url.id}
                      value={url.url}
                      sx={{
                        display: 'flex !important',
                        flexDirection: 'row !important',
                        justifyContent: 'space-between !important',
                        alignItems: 'center !important',
                        py: 1,
                        minHeight: '48px',
                        '&.Mui-selected': {
                          display: 'flex !important',
                          flexDirection: 'row !important',
                          justifyContent: 'space-between !important',
                          alignItems: 'center !important',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          flex: 1,
                          mr: 1,
                          wordBreak: 'break-all',
                          whiteSpace: 'normal',
                          maxWidth: 'calc(100% - 40px)',
                          alignSelf: 'center',
                        }}
                      >
                        {url.url}
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={async (e) => {
                          e.stopPropagation(); // Prevent MenuItem selection
                          setUrlToDelete({ id: url.id, url: url.url });
                          setDeleteConfirmDialog(true);
                        }}
                        title="Delete URL"
                        sx={{
                          minWidth: '32px',
                          width: '32px',
                          height: '32px',
                          flexShrink: 0,
                          alignSelf: 'center',
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} size="sm" />
                      </IconButton>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const newShowCustomUrl = !showCustomUrl;
                    setShowCustomUrl(newShowCustomUrl);
                    if (newShowCustomUrl) {
                      // Switching to custom URL - clear selected URL
                      setSelectedUrl('');
                    } else {
                      // Switching back to dropdown - clear custom URL
                      setCustomUrl('');
                    }
                  }}
                  startIcon={<FontAwesomeIcon icon={faPlus} />}
                >
                  {showCustomUrl ? 'Use Dropdown' : 'Custom URL'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => parserStore.fetchUrlsToParse()}
                  startIcon={<FontAwesomeIcon icon={faRefresh} />}
                >
                  Refresh URLs
                </Button>
              </Box>

              {showCustomUrl && (
                <TextField
                  fullWidth
                  label="Custom URL"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/karaoke-schedule"
                  sx={{ mb: 2 }}
                />
              )}

              {/* Parsing Method Selection */}
              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Parsing Method
                </Typography>
                <RadioGroup
                  row
                  value={parseMethod}
                  onChange={(e) => setParseMethod(e.target.value as 'html' | 'screenshot')}
                >
                  <FormControlLabel
                    value="screenshot"
                    control={<Radio />}
                    label="Screenshot Parsing (Recommended)"
                  />
                  <FormControlLabel value="html" control={<Radio />} label="HTML Parsing" />
                </RadioGroup>
                <Typography variant="caption" color="text.secondary">
                  {parseMethod === 'screenshot'
                    ? 'Take a full-page screenshot and parse visually (recommended - finds all shows)'
                    : 'Parse the HTML content with data attributes (may miss complex layouts)'}
                </Typography>
              </FormControl>

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleParseUrl}
                disabled={isParsingUrl || (!selectedUrl && !customUrl)}
                startIcon={
                  isParsingUrl ? <CircularProgress size={16} /> : <FontAwesomeIcon icon={faPlay} />
                }
              >
                {isParsingUrl
                  ? `Parsing... (${parserStore.getFormattedElapsedTime()})`
                  : 'Parse Website'}
              </Button>
            </Box>

            {/* Parsing Status */}
            {isParsingUrl && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'primary.50',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'primary.200',
                }}
              >
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  <strong>Parsing in progress... ({parserStore.getFormattedElapsedTime()})</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This may take several minutes depending on website size. The parser is processing
                  the content and extracting show information.
                </Typography>
              </Box>
            )}

            {parserStore.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {parserStore.error}
              </Alert>
            )}

            {parseResult && parseResult.success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Website parsed successfully! Check the review queue below.
              </Alert>
            )}

            {parseResult && !parseResult.success && parseResult.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Parsing failed: {parseResult.error}
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Parser Statistics */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '8px' }} />
              Parser Statistics
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 2,
                    backgroundColor: theme.palette.action.hover,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                    {parserStore.pendingReviews.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Reviews
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 2,
                    backgroundColor: theme.palette.action.hover,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                    {parserStore.urlsToParse.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    URLs in Queue
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Selected URL Display */}
            {selectedUrl && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Selected URL:
                  </Typography>
                  <Typography
                    variant="body2"
                    component="a"
                    href={selectedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: 'primary.main',
                      textDecoration: 'underline',
                      wordBreak: 'break-all',
                      '&:hover': {
                        color: 'primary.dark',
                      },
                    }}
                  >
                    {selectedUrl}
                  </Typography>
                </Box>
              </>
            )}

            {/* Parser Live Log */}
            <Divider sx={{ my: 2 }} />
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Parser Log:
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => parserStore.clearLog()}
                  sx={{ minWidth: 'auto', p: 0.5 }}
                >
                  Clear
                </Button>
              </Box>
              {parserStore.parsingLog.length > 0 ? (
                <Box
                  ref={logContainerRef}
                  sx={{
                    maxHeight: 200,
                    overflow: 'auto',
                    bgcolor: 'grey.900',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                  }}
                >
                  {parserStore.parsingLog.map((logEntry) => (
                    <Box
                      key={logEntry.id}
                      sx={{
                        display: 'flex',
                        gap: 1,
                        py: 0.25,
                        borderBottom: '1px solid',
                        borderColor: 'grey.800',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'grey.500',
                          minWidth: '60px',
                          flexShrink: 0,
                        }}
                      >
                        {logEntry.timestamp.toLocaleTimeString()}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color:
                            logEntry.level === 'success'
                              ? 'success.main'
                              : logEntry.level === 'error'
                                ? 'error.main'
                                : logEntry.level === 'warning'
                                  ? 'warning.main'
                                  : 'text.primary',
                        }}
                      >
                        {logEntry.message}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No log entries yet
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Button
              fullWidth
              variant="outlined"
              onClick={async () => {
                parserStore.addLogEntry('Refreshing data...', 'info');
                await parserStore.fetchPendingReviews();
                parserStore.addLogEntry('Data refreshed successfully', 'success');
              }}
              startIcon={<FontAwesomeIcon icon={faRefresh} />}
            >
              Refresh Data
            </Button>
          </Paper>
        </Grid>

        {/* Pending Reviews */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              <FontAwesomeIcon icon={faEye} style={{ marginRight: '8px' }} />
              Pending Reviews ({parserStore.pendingReviews.length})
            </Typography>

            {parserStore.pendingReviews.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No pending reviews at this time</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>URL</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Venue Found</TableCell>
                      <TableCell>DJs Found</TableCell>
                      <TableCell>Shows Found</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parserStore.pendingReviews.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {item.url}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.status.replace('_', ' ')}
                            color={getStatusColor(item.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {item.aiAnalysis?.vendor ? (
                            <Chip
                              label={item.aiAnalysis.vendor.name}
                              size="small"
                              color="success"
                            />
                          ) : (
                            <Chip label="None" size="small" color="default" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.aiAnalysis?.djs?.length || 0}
                            size="small"
                            color={item.aiAnalysis?.djs?.length ? 'info' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.aiAnalysis?.shows?.length || 0}
                            size="small"
                            color={item.aiAnalysis?.shows?.length ? 'info' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{formatDate(item.createdAt)}</Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleReviewItem(item)}
                            color="primary"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Review Parsed Data</DialogTitle>
        <DialogContent>
          {selectedReview && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                URL: {selectedReview.url}
              </Typography>

              {selectedReview.aiAnalysis && (
                <Box>
                  {/* Venue Information */}
                  {selectedReview.aiAnalysis.vendor && (
                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
                        <Typography variant="h6">
                          Venue Information (Confidence:{' '}
                          {Math.round(selectedReview.aiAnalysis.vendor.confidence * 100)}%)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography>
                          <strong>Name:</strong> {selectedReview.aiAnalysis.vendor.name}
                        </Typography>
                        <Typography>
                          <strong>Website:</strong> {selectedReview.aiAnalysis.vendor.website}
                        </Typography>
                        {selectedReview.aiAnalysis.vendor.description && (
                          <Typography>
                            <strong>Description:</strong>{' '}
                            {selectedReview.aiAnalysis.vendor.description}
                          </Typography>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {/* DJs */}
                  {selectedReview.aiAnalysis.djs && selectedReview.aiAnalysis.djs.length > 0 && (
                    <Accordion>
                      <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
                        <Typography variant="h6">
                          DJs Found ({selectedReview.aiAnalysis.djs.length})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List>
                          {selectedReview.aiAnalysis.djs.map((dj: any, index: number) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={dj.name}
                                secondary={`Confidence: ${Math.round(dj.confidence * 100)}% ${dj.context ? '| ' + dj.context : ''}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {/* Shows */}
                  {selectedReview.aiAnalysis.shows &&
                    selectedReview.aiAnalysis.shows.length > 0 && (
                      <Accordion>
                        <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
                          <Typography variant="h6">
                            Shows Found ({selectedReview.aiAnalysis.shows.length})
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List>
                            {selectedReview.aiAnalysis.shows.map((show: any, index: number) => (
                              <ListItem key={index} sx={{ borderBottom: '1px solid #eee', py: 2 }}>
                                <ListItemText
                                  primary={
                                    <Box>
                                      <Typography variant="subtitle1" fontWeight="bold">
                                        {show.venue}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {show.address}
                                      </Typography>
                                    </Box>
                                  }
                                  secondary={
                                    <Box sx={{ mt: 1 }}>
                                      <Typography variant="body2">
                                        <strong>Day:</strong> {show.day || show.date}
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>Time:</strong> {show.time} ({show.startTime} -{' '}
                                        {show.endTime})
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>DJ:</strong> {show.djName || 'Unknown'}
                                      </Typography>
                                      {show.venuePhone && (
                                        <Typography variant="body2">
                                          <strong>Phone:</strong> {show.venuePhone}
                                        </Typography>
                                      )}
                                      {show.venueWebsite && (
                                        <Typography variant="body2">
                                          <strong>Website:</strong> {show.venueWebsite}
                                        </Typography>
                                      )}
                                      {show.description && (
                                        <Typography variant="body2">
                                          <strong>Description:</strong> {show.description}
                                        </Typography>
                                      )}
                                      {show.notes && (
                                        <Typography variant="body2">
                                          <strong>Notes:</strong> {show.notes}
                                        </Typography>
                                      )}
                                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                                        <strong>Confidence:</strong>{' '}
                                        {Math.round(show.confidence * 100)}%
                                      </Typography>
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    )}
                </Box>
              )}

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Review Comments"
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                sx={{ mt: 2 }}
                placeholder="Add any comments about this parsed data..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => handleReviewAction('reject')}
            startIcon={<FontAwesomeIcon icon={faTimes} />}
          >
            Reject
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => handleReviewAction('approve')}
            startIcon={<FontAwesomeIcon icon={faCheck} />}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog}
        onClose={() => setDeleteConfirmDialog(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this URL from the parse queue?
            <br />
            <strong>{urlToDelete?.url}</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (urlToDelete) {
                const result = await parserStore.deleteUrlToParse(urlToDelete.id);
                if (!result.success && result.error) {
                  console.error('Failed to delete URL:', result.error);
                }
                // Clear selection if this URL was selected
                if (selectedUrl === urlToDelete.url) {
                  setSelectedUrl('');
                }
              }
              setDeleteConfirmDialog(false);
              setUrlToDelete(null);
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
});

export default AdminParserPage;
