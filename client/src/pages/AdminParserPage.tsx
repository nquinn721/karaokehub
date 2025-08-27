import AdminBreadcrumb from '@components/AdminBreadcrumb';
import FacebookLoginModal from '@components/FacebookLoginModal';
import {
  faCheck,
  faChevronDown,
  faCopy,
  faExclamationTriangle,
  faEye,
  faGlobe,
  faPlay,
  faPlus,
  faRefresh,
  faStop,
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
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { authStore, parserStore, uiStore, webSocketStore } from '@stores/index';
import { autorun } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';

const AdminParserPage: React.FC = observer(() => {
  const theme = useTheme();
  const [selectedUrl, setSelectedUrl] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [parseMethod, setParseMethod] = useState<'html' | 'screenshot' | 'deepseek'>('screenshot');
  const [isParsingUrl, setIsParsingUrl] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [urlToDelete, setUrlToDelete] = useState<{ id: number; url: string } | null>(null);

  // Facebook Login Modal state
  const [facebookModalOpen, setFacebookModalOpen] = useState(false);
  const [facebookRequestId, setFacebookRequestId] = useState<string | null>(null);
  const [facebookLoginLoading, setFacebookLoginLoading] = useState(false);
  const [facebookLoginError, setFacebookLoginError] = useState<string | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Facebook Login Modal handlers
  const handleFacebookCredentials = (email: string, password: string, requestId: string) => {
    setFacebookLoginLoading(true);
    setFacebookLoginError(null);

    // Send credentials via WebSocket
    webSocketStore.socket?.emit('provide-facebook-credentials', {
      email,
      password,
      requestId,
    });

    console.log('🔑 Credentials sent for request:', requestId);
  };

  const handleFacebookModalCancel = () => {
    setFacebookModalOpen(false);
    setFacebookRequestId(null);
    setFacebookLoginError(null);
    setFacebookLoginLoading(false);
  };

  // Helper function to detect Facebook URLs
  const isFacebookUrl = (url: string): boolean => {
    return url.includes('facebook.com') || url.includes('fb.com');
  };

  // Helper function to detect Instagram URLs
  const isInstagramUrl = (url: string): boolean => {
    return url.includes('instagram.com');
  };

  // Get current URL to check if it's Facebook or Instagram
  const currentUrl = selectedUrl || customUrl;
  const isCurrentUrlFacebook = currentUrl ? isFacebookUrl(currentUrl) : false;
  const isCurrentUrlInstagram = currentUrl ? isInstagramUrl(currentUrl) : false;

  // Redirect non-admin users
  if (!authStore.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    // Initialize parser store data
    parserStore.initialize();
    parserStore.fetchUrlsBasedOnFilter();

    // Set up Facebook login modal functionality
    const setupFacebookModal = () => {
      // Set up WebSocket listeners
      if (webSocketStore.socket) {
        console.log('Setting up Facebook modal WebSocket listeners');

        webSocketStore.socket.on('facebook-login-required', (data: any) => {
          console.log('🚨 Facebook login required event received:', data);
          setFacebookRequestId(data.requestId);
          setFacebookModalOpen(true);
          setFacebookLoginError(null);
        });

        webSocketStore.socket.on('facebook-login-result', (data: any) => {
          console.log('✅ Facebook login result received:', data);
          setFacebookLoginLoading(false);
          if (data.success) {
            setFacebookModalOpen(false);
            setFacebookRequestId(null);
            setFacebookLoginError(null);
          } else {
            setFacebookLoginError(data.message || 'Login failed');
          }
        });
      }
    };

    // Set up WebSocket for parser logs
    autorun(() => {
      if (webSocketStore.isConnected && webSocketStore.socket) {
        parserStore.setupParserEvents(webSocketStore.socket);
        setupFacebookModal(); // Set up modal when WebSocket is ready
      }
    });

    // Check if parsing is already in progress on the server
    const checkParsingStatus = async () => {
      const isParsingActive = await parserStore.checkAndRestoreParsingStatus();
      if (isParsingActive) {
        setIsParsingUrl(true);
      }
    };

    checkParsingStatus();

    // Cleanup WebSocket connection when component unmounts
    return () => {
      if (webSocketStore.socket) {
        parserStore.leaveParserLogs(webSocketStore.socket);
        // Clean up Facebook modal listeners
        webSocketStore.socket.off('facebook-login-required');
        webSocketStore.socket.off('facebook-login-result');
      }
    };
  }, []);

  // Auto-scroll to bottom when new log entries are added
  useEffect(() => {
    const scrollToBottom = () => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    };

    // Use setTimeout to ensure DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 0);

    return () => clearTimeout(timeoutId);
  }, [parserStore.parsingLog.length]);

  // Additional auto-scroll trigger for rapid log updates
  useEffect(() => {
    const scrollToBottom = () => {
      if (logContainerRef.current) {
        // Force scroll to bottom
        const element = logContainerRef.current;
        element.scrollTop = element.scrollHeight;
      }
    };

    // Also trigger on actual log content changes
    if (parserStore.parsingLog.length > 0) {
      scrollToBottom();
    }
  }, [parserStore.parsingLog]);

  // Monitor parsing completion through log messages
  useEffect(() => {
    const lastLog = parserStore.parsingLog[parserStore.parsingLog.length - 1];
    if (lastLog && isParsingUrl) {
      // Check for completion messages - prioritize success messages over errors
      const successMessages = [
        'Data saved for admin review',
        'Parse completed:',
        'Parsing completed successfully',
      ];

      const errorMessages = [
        'Error parsing and saving website',
        'Failed to parse and save website',
        'Parsing timed out',
      ];

      const isSuccessful = successMessages.some((msg) => lastLog.message.includes(msg));
      const isError = errorMessages.some((msg) => lastLog.message.includes(msg));

      // Only treat as completed if we have a definitive success or error message
      // Don't let timeout messages override successful completion
      if (
        isSuccessful ||
        (isError &&
          !parserStore.parsingLog.some((log) =>
            successMessages.some((msg) => log.message.includes(msg)),
          ))
      ) {
        // Add a small delay to ensure all logs are received
        setTimeout(() => {
          setIsParsingUrl(false);
          parserStore.stopParsingTimer();

          // Refresh pending reviews if parsing was successful
          if (isSuccessful) {
            parserStore.fetchPendingReviews();
          }
        }, 1000);
      }
    }
  }, [parserStore.parsingLog, isParsingUrl]);

  const handleParseUrl = async () => {
    const urlToParse = selectedUrl || customUrl;
    if (!urlToParse) return;

    setIsParsingUrl(true);
    setParseResult(null);

    try {
      let result;

      if (parseMethod === 'deepseek') {
        // Use experimental DeepSeek parsing
        const parseType = isCurrentUrlFacebook ? 'facebook' : 'karaoke';
        result = await parserStore.parseWithDeepSeek(urlToParse, parseType);
      } else {
        // Use traditional parsing methods
        result = await parserStore.parseAndSaveWebsite(urlToParse, parseMethod);
      }

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

  /**
   * Handle cancellation of active parsing operation
   * Calls the emergency cancel endpoint to stop all workers and browsers
   */
  const handleCancelParsing = async () => {
    try {
      const result = await parserStore.cancelParsing();
      if (result.success) {
        setIsParsingUrl(false);
        setParseResult(null);
      }
    } catch (error) {
      console.error('Error cancelling parsing:', error);
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
        {/* Breadcrumbs */}
        <Box sx={{ px: 3 }}>
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
        </Box>

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
                variant="outlined"
                onClick={async () => {
                  parserStore.addLogEntry('Refreshing data...', 'info');
                  await Promise.all([
                    parserStore.fetchUrlsBasedOnFilter(),
                    parserStore.fetchPendingReviews(),
                  ]);
                  parserStore.addLogEntry('Data refreshed successfully', 'success');
                }}
                startIcon={<FontAwesomeIcon icon={faRefresh} />}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                }}
              >
                Refresh Data
              </Button>
            </Box>
          </Box>
        </Paper>

        <Box sx={{ px: 3 }}>
          <Grid container spacing={3}>
            {/* Parse Section */}
            <Grid item xs={12} lg={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, 
                ${alpha(theme.palette.background.paper, 0.95)} 0%, 
                ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  position: 'relative',
                  overflow: 'hidden',
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
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  <FontAwesomeIcon icon={faPlay} style={{ marginRight: '8px' }} />
                  Parse Website
                </Typography>

                {/* URL Filter */}
                <Box sx={{ mb: 3 }}>
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Filter URLs</InputLabel>
                    <Select
                      value={parserStore.urlFilter}
                      onChange={(e) =>
                        parserStore.setUrlFilter(
                          e.target.value as 'all' | 'unparsed' | 'approved-and-unparsed',
                        )
                      }
                      label="Filter URLs"
                      size="small"
                    >
                      <MenuItem value="all">All URLs</MenuItem>
                      <MenuItem value="unparsed">Unparsed Only</MenuItem>
                      <MenuItem value="approved-and-unparsed">Approved & Unparsed</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

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
                      renderValue={(value) => {
                        const urlObj = parserStore.urlsToParse.find((u) => u.url === value);
                        const displayText = urlObj?.name || value;
                        return (
                          <Box
                            sx={{
                              wordBreak: 'break-all',
                              whiteSpace: 'normal',
                              py: 0.5,
                            }}
                            title={urlObj?.name ? `${urlObj.name} - ${value}` : value}
                          >
                            {displayText}
                          </Box>
                        );
                      }}
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
                            <Box>
                              {url.name ? (
                                <>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography
                                      variant="body2"
                                      component="div"
                                      sx={{ fontWeight: 'bold' }}
                                    >
                                      {url.name}
                                    </Typography>
                                    <Chip
                                      label={url.hasBeenParsed ? 'Parsed' : 'Unparsed'}
                                      size="small"
                                      color={url.hasBeenParsed ? 'success' : 'warning'}
                                      variant="outlined"
                                    />
                                  </Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    component="div"
                                  >
                                    {url.url}
                                  </Typography>
                                </>
                              ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2">{url.url}</Typography>
                                  <Chip
                                    label={url.hasBeenParsed ? 'Parsed' : 'Unparsed'}
                                    size="small"
                                    color={url.hasBeenParsed ? 'success' : 'warning'}
                                    variant="outlined"
                                  />
                                </Box>
                              )}
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5, alignSelf: 'center' }}>
                            <IconButton
                              size="small"
                              color={url.hasBeenParsed ? 'warning' : 'success'}
                              onClick={async (e) => {
                                e.stopPropagation(); // Prevent MenuItem selection
                                if (url.hasBeenParsed) {
                                  await parserStore.markUrlAsUnparsed(url.id);
                                } else {
                                  await parserStore.markUrlAsParsed(url.id);
                                }
                              }}
                              title={url.hasBeenParsed ? 'Mark as Unparsed' : 'Mark as Parsed'}
                              sx={{
                                minWidth: '32px',
                                width: '32px',
                                height: '32px',
                                flexShrink: 0,
                              }}
                            >
                              <FontAwesomeIcon
                                icon={url.hasBeenParsed ? faTimes : faCheck}
                                size="sm"
                              />
                            </IconButton>
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
                              }}
                            >
                              <FontAwesomeIcon icon={faTrash} size="sm" />
                            </IconButton>
                          </Box>
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
                    {isCurrentUrlFacebook ? (
                      // Facebook URL - show only Facebook parsing option
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          🔵 Facebook Parsing
                        </Typography>
                        <Typography variant="caption">
                          Specialized Facebook parsing using Puppeteer and AI analysis
                        </Typography>
                      </Box>
                    ) : isCurrentUrlInstagram ? (
                      // Instagram URL - show only Instagram parsing option
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: 'secondary.main',
                          color: 'secondary.contrastText',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          📷 Instagram Parsing
                        </Typography>
                        <Typography variant="caption">
                          Visual Instagram parsing using screenshots and AI analysis
                        </Typography>
                      </Box>
                    ) : (
                      // Non-Facebook/Instagram URL - show normal parsing options
                      <>
                        <RadioGroup
                          row
                          value={parseMethod}
                          onChange={(e) =>
                            setParseMethod(e.target.value as 'html' | 'screenshot' | 'deepseek')
                          }
                        >
                          <FormControlLabel
                            value="screenshot"
                            control={<Radio />}
                            label="Screenshot Parsing (Recommended)"
                          />
                          <FormControlLabel value="html" control={<Radio />} label="HTML Parsing" />
                          <FormControlLabel
                            value="deepseek"
                            control={<Radio />}
                            label="🧪 DeepSeek-V3.1 (Experimental)"
                          />
                        </RadioGroup>
                        <Typography variant="caption" color="text.secondary">
                          {parseMethod === 'screenshot'
                            ? 'Take a full-page screenshot and parse visually (recommended - finds all shows)'
                            : parseMethod === 'deepseek'
                              ? '🧪 Experimental AI parsing using DeepSeek-V3.1 - advanced reasoning and understanding'
                              : 'Parse the HTML content with data attributes (may miss complex layouts)'}
                        </Typography>
                      </>
                    )}
                  </FormControl>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleParseUrl}
                    disabled={isParsingUrl || (!selectedUrl && !customUrl)}
                    startIcon={
                      isParsingUrl ? (
                        <CircularProgress size={16} />
                      ) : (
                        <FontAwesomeIcon icon={faPlay} />
                      )
                    }
                    sx={{ mb: isParsingUrl ? 1 : 0 }}
                  >
                    {isParsingUrl
                      ? `Parsing... (${parserStore.getFormattedElapsedTime()})`
                      : parseMethod === 'deepseek'
                        ? '🧪 Parse with DeepSeek-V3.1'
                        : isCurrentUrlFacebook
                          ? 'Parse Facebook'
                          : isCurrentUrlInstagram
                            ? 'Parse Instagram'
                            : 'Parse Website'}
                  </Button>

                  {/* Cancel Button - only show when parsing is active */}
                  {isParsingUrl && (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      onClick={handleCancelParsing}
                      startIcon={<FontAwesomeIcon icon={faStop} />}
                      sx={{
                        borderColor: 'error.main',
                        color: 'error.main',
                        '&:hover': {
                          backgroundColor: 'error.main',
                          color: 'white',
                          borderColor: 'error.main',
                        },
                      }}
                    >
                      Cancel Parsing
                    </Button>
                  )}
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
                    <Typography
                      variant="body2"
                      sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
                    >
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      <strong>
                        Parsing in progress... ({parserStore.getFormattedElapsedTime()})
                      </strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This may take several minutes depending on website size. The parser is
                      processing the content and extracting show information.
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
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, 
                ${alpha(theme.palette.background.paper, 0.95)} 0%, 
                ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.info.main})`,
                  },
                }}
              >
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '8px' }} />
                  Parser Statistics
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={4}>
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
                  <Grid item xs={4}>
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
                  <Grid item xs={4}>
                    <Box
                      sx={{
                        textAlign: 'center',
                        p: 2,
                        backgroundColor: theme.palette.action.hover,
                        borderRadius: 1,
                      }}
                    >
                      <Typography
                        variant="h4"
                        color={
                          parserStore.lastCompletedParsingTime ? 'info.main' : 'text.secondary'
                        }
                        sx={{ fontWeight: 600 }}
                      >
                        {parserStore.getFormattedCompletionTime()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Last Parse Time
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            flex: 1,
                            '&:hover': {
                              color: 'primary.dark',
                            },
                          }}
                        >
                          {selectedUrl}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedUrl);
                            uiStore.addNotification('URL copied to clipboard!', 'success');
                          }}
                          title="Copy URL"
                          sx={{ ml: 1 }}
                        >
                          <FontAwesomeIcon icon={faCopy} style={{ fontSize: '14px' }} />
                        </IconButton>
                      </Box>
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
                        scrollBehavior: 'smooth',
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
              </Paper>
            </Grid>

            {/* Facebook Group Discovery */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, 
                ${alpha(theme.palette.background.paper, 0.95)} 0%, 
                ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.success.main})`,
                  },
                }}
              >
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  <FontAwesomeIcon icon={faGlobe} style={{ marginRight: '8px' }} />
                  Facebook Group Discovery
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Automatically discover karaoke groups from all US cities using AI-powered
                  analysis. This process will search Facebook groups in {'{'}865{'}'} cities and use
                  Gemini AI to select the most relevant karaoke communities.
                </Typography>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <strong>Important:</strong> This process requires Facebook authentication and may
                  take several hours to complete. Make sure you have proper Facebook credentials
                  configured before starting.
                </Alert>

                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Button
                    variant="contained"
                    onClick={async () => {
                      try {
                        uiStore.addNotification('Starting Facebook group discovery...', 'info');

                        const response = await fetch('/api/parser/discover-facebook-groups', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                        });

                        const result = await response.json();

                        if (result.success) {
                          uiStore.addNotification(
                            `Facebook group discovery completed! Found ${result.data.totalGroups} groups across ${result.data.successfulCities} cities.`,
                            'success',
                          );
                        } else {
                          throw new Error(result.message || 'Discovery failed');
                        }
                      } catch (error) {
                        console.error('Facebook group discovery error:', error);
                        uiStore.addNotification(
                          `Facebook group discovery failed: ${error instanceof Error ? error.message : String(error)}`,
                          'error',
                        );
                      }
                    }}
                    startIcon={<FontAwesomeIcon icon={faGlobe} />}
                    sx={{
                      background: `linear-gradient(45deg, ${theme.palette.secondary.main}, ${theme.palette.success.main})`,
                      color: 'white',
                      '&:hover': {
                        background: `linear-gradient(45deg, ${theme.palette.secondary.dark}, ${theme.palette.success.dark})`,
                      },
                    }}
                  >
                    Start Group Discovery
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/parser/facebook-groups/status');
                        const result = await response.json();

                        if (result.success) {
                          const { totalCities, discoveredGroups, isRunning } = result.data;
                          uiStore.addNotification(
                            `Discovery Status: ${discoveredGroups} groups found from ${totalCities} total cities. ${isRunning ? 'Currently running...' : 'Not running.'}`,
                            'info',
                          );
                        }
                      } catch (error) {
                        console.error('Failed to get discovery status:', error);
                        uiStore.addNotification('Failed to get discovery status', 'error');
                      }
                    }}
                    startIcon={<FontAwesomeIcon icon={faRefresh} />}
                  >
                    Check Status
                  </Button>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  💡 Tip: The discovery process will automatically save found group URLs to the URLs
                  to Parse table above. You can then review and parse them individually.
                </Typography>
              </Paper>
            </Grid>

            {/* Pending Reviews */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, 
                ${alpha(theme.palette.background.paper, 0.95)} 0%, 
                ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.info.main})`,
                  },
                }}
              >
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
                              {item.stats?.vendorsFound ? (
                                <Chip
                                  label={`${item.stats.vendorsFound} venues`}
                                  size="small"
                                  color="success"
                                />
                              ) : (
                                <Chip label="None" size="small" color="default" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.stats?.djsFound || 0}
                                size="small"
                                color={item.stats?.djsFound ? 'info' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.stats?.showsFound || 0}
                                size="small"
                                color={item.stats?.showsFound ? 'info' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {formatDate(item.createdAt)}
                              </Typography>
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
        </Box>

        {/* Review Dialog */}
        <Dialog
          open={reviewDialog}
          onClose={() => setReviewDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'background.paper',
              color: 'text.primary',
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: 'background.paper',
              color: 'text.primary',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            Review Parsed Data
          </DialogTitle>
          <DialogContent
            sx={{
              bgcolor: 'background.paper',
              color: 'text.primary',
            }}
          >
            {selectedReview && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  URL: {selectedReview.url}
                </Typography>

                {(selectedReview.aiAnalysis ||
                  selectedReview.stats ||
                  selectedReview.shows ||
                  selectedReview.vendors) && (
                  <Box>
                    {/* Compact Vendor Information */}
                    {(selectedReview.aiAnalysis?.vendor ||
                      selectedReview.aiAnalysis?.vendors ||
                      selectedReview.vendors ||
                      (selectedReview.stats?.vendorsFound &&
                        selectedReview.stats.vendorsFound > 0)) && (
                      <Accordion>
                        <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
                          <Typography variant="h6">
                            🏢 Vendors (
                            {selectedReview.vendors?.length ||
                              selectedReview.aiAnalysis?.vendors?.length ||
                              selectedReview.stats?.vendorsFound ||
                              1}
                            )
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {selectedReview.vendors && selectedReview.vendors.length > 0 ? (
                              // New format: vendors array - compact chip display
                              selectedReview.vendors.map((vendor: any, index: number) => (
                                <Chip
                                  key={index}
                                  label={`${vendor.name} (${Math.round((vendor.confidence || 0) * 100)}%)`}
                                  variant="outlined"
                                  color="primary"
                                  size="small"
                                />
                              ))
                            ) : selectedReview.aiAnalysis?.vendors &&
                              selectedReview.aiAnalysis.vendors.length > 0 ? (
                              // Old format: aiAnalysis.vendors array - compact chip display
                              selectedReview.aiAnalysis.vendors.map(
                                (vendor: any, index: number) => (
                                  <Chip
                                    key={index}
                                    label={`${vendor.name} (${Math.round((vendor.confidence || 0) * 100)}%)`}
                                    variant="outlined"
                                    color="primary"
                                    size="small"
                                  />
                                ),
                              )
                            ) : selectedReview.aiAnalysis?.vendor ? (
                              // Single vendor display (backward compatibility)
                              <Chip
                                label={selectedReview.aiAnalysis.vendor.name}
                                variant="filled"
                                color="primary"
                                size="small"
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No vendor information available
                              </Typography>
                            )}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {/* DJs - Enhanced to show extracted DJs and from shows */}
                    {((selectedReview.aiAnalysis?.djs &&
                      selectedReview.aiAnalysis.djs.length > 0) ||
                      (selectedReview.stats?.djsFound && selectedReview.stats.djsFound > 0)) && (
                      <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
                          <Typography variant="h6">
                            🎤 DJs Found (
                            {selectedReview.stats?.djsFound ||
                              selectedReview.aiAnalysis?.djs?.length ||
                              0}
                            )
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          {selectedReview.aiAnalysis?.djs &&
                          selectedReview.aiAnalysis.djs.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                              {selectedReview.aiAnalysis.djs.map((dj: any, index: number) => (
                                <Chip
                                  key={index}
                                  label={`${dj.name} (${Math.round((dj.confidence || 0) * 100)}%)`}
                                  color="secondary"
                                  variant="filled"
                                  size="small"
                                />
                              ))}
                            </Box>
                          ) : null}

                          {!selectedReview.aiAnalysis?.djs?.length && (
                            <Typography variant="body2" color="text.secondary">
                              {selectedReview.stats?.djsFound} DJs found in shows data (names not
                              extracted separately)
                            </Typography>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {/* Shows - Enhanced with missing data highlights and source info */}
                    {((selectedReview.aiAnalysis?.shows &&
                      selectedReview.aiAnalysis.shows.length > 0) ||
                      (selectedReview.stats?.showsFound &&
                        selectedReview.stats.showsFound > 0)) && (
                      <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
                          <Typography variant="h6">
                            📅 Shows Found (
                            {selectedReview.stats?.showsFound ||
                              selectedReview.aiAnalysis?.shows?.length ||
                              0}
                            )
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List>
                            {(selectedReview.shows || selectedReview.aiAnalysis?.shows || []).map(
                              (show: any, index: number) => (
                                <ListItem
                                  key={index}
                                  sx={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                    py: 2,
                                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                                    mb: 1,
                                    borderRadius: 1,
                                  }}
                                >
                                  <ListItemText
                                    primary={
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <Typography
                                          variant="subtitle1"
                                          fontWeight="bold"
                                          component="div"
                                        >
                                          {show.venue}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {Math.round((show.confidence || 0) * 100)}% confidence
                                        </Typography>
                                      </Box>
                                    }
                                    secondary={
                                      <Box component="div" sx={{ mt: 1 }}>
                                        {/* Location & Address - with missing data highlights */}
                                        <Box
                                          sx={{
                                            mb: 1,
                                            p: 1,
                                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: 1,
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                          }}
                                        >
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ fontWeight: 'bold', mb: 0.5 }}
                                          >
                                            📍 Location:
                                          </Typography>
                                          <Box sx={{ ml: 1 }}>
                                            {show.address ? (
                                              <Typography variant="body2">
                                                <strong>Address:</strong> {show.address}
                                              </Typography>
                                            ) : (
                                              <Typography
                                                variant="body2"
                                                color="warning.main"
                                                sx={{ fontStyle: 'italic' }}
                                              >
                                                ⚠️ Address missing
                                              </Typography>
                                            )}
                                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                              {show.city && (
                                                <Typography variant="body2">
                                                  <strong>City:</strong> {show.city}
                                                </Typography>
                                              )}
                                              {show.state && (
                                                <Typography variant="body2">
                                                  <strong>State:</strong> {show.state}
                                                </Typography>
                                              )}
                                              {show.zip && (
                                                <Typography variant="body2">
                                                  <strong>ZIP:</strong> {show.zip}
                                                </Typography>
                                              )}
                                            </Box>
                                          </Box>
                                        </Box>

                                        {/* Schedule Information - with missing data highlights */}
                                        <Box
                                          sx={{
                                            mb: 1,
                                            p: 1,
                                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: 1,
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                          }}
                                        >
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ fontWeight: 'bold', mb: 0.5 }}
                                          >
                                            🗓️ Schedule:
                                          </Typography>
                                          <Box sx={{ ml: 1 }}>
                                            <Typography variant="body2">
                                              <strong>Day:</strong>{' '}
                                              {show.dayOfWeek ||
                                                show.day ||
                                                show.date ||
                                                'Not specified'}
                                            </Typography>
                                            {show.time ? (
                                              <Typography variant="body2">
                                                <strong>Time:</strong> {show.time}
                                                {show.startTime && show.endTime && (
                                                  <span>
                                                    {' '}
                                                    ({show.startTime} - {show.endTime})
                                                  </span>
                                                )}
                                              </Typography>
                                            ) : (
                                              <Typography
                                                variant="body2"
                                                color="warning.main"
                                                sx={{ fontStyle: 'italic' }}
                                              >
                                                ⚠️ <strong>Time:</strong> Missing
                                              </Typography>
                                            )}
                                          </Box>
                                        </Box>

                                        {/* DJ & Host Information */}
                                        <Box sx={{ mb: 1 }}>
                                          <Typography variant="body2">
                                            <strong>DJ/Host:</strong>{' '}
                                            {show.djName || 'Not specified'}
                                          </Typography>
                                          {show.vendor && (
                                            <Typography variant="body2">
                                              <strong>Hosted by:</strong> {show.vendor}
                                            </Typography>
                                          )}
                                        </Box>

                                        {/* Source Information - Enhanced to show image source */}
                                        {show.source && (
                                          <Box
                                            sx={{
                                              mb: 1,
                                              p: 1,
                                              bgcolor: 'rgba(25, 118, 210, 0.1)',
                                              borderRadius: 1,
                                              border: '1px solid rgba(25, 118, 210, 0.2)',
                                            }}
                                          >
                                            <Typography
                                              variant="body2"
                                              color="text.secondary"
                                              sx={{ fontWeight: 'bold', mb: 0.5 }}
                                            >
                                              🖼️ Source:
                                            </Typography>
                                            <Typography variant="body2" sx={{ ml: 1 }}>
                                              {show.source.startsWith('http') ? (
                                                <a
                                                  href={show.source}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  style={{
                                                    color: '#90caf9',
                                                    textDecoration: 'underline',
                                                  }}
                                                >
                                                  {show.source.includes('facebook')
                                                    ? '📘 Facebook Image'
                                                    : show.source.includes('instagram')
                                                      ? '📸 Instagram Image'
                                                      : '🖼️ Image Source'}
                                                </a>
                                              ) : (
                                                <span>{show.source}</span>
                                              )}
                                            </Typography>
                                          </Box>
                                        )}

                                        {/* Description */}
                                        {show.description && (
                                          <Typography
                                            variant="body2"
                                            sx={{ mt: 1, fontStyle: 'italic' }}
                                          >
                                            <strong>Description:</strong> {show.description}
                                          </Typography>
                                        )}
                                      </Box>
                                    }
                                    secondaryTypographyProps={{
                                      component: 'div',
                                    }}
                                  />
                                </ListItem>
                              ),
                            )}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {/* Parsing Logs */}
                    {selectedReview.parsingLogs && selectedReview.parsingLogs.length > 0 && (
                      <Accordion>
                        <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
                          <Typography variant="h6">
                            Parsing Logs ({selectedReview.parsingLogs.length})
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                            <List dense>
                              {selectedReview.parsingLogs.map((log: any, index: number) => {
                                // Safety check for log structure
                                const safeLog = {
                                  level: log?.level || 'info',
                                  message: log?.message || 'No message',
                                  timestamp: log?.timestamp || new Date(),
                                };

                                return (
                                  <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                                    <Box sx={{ width: '100%' }}>
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 1,
                                          mb: 0.5,
                                        }}
                                      >
                                        <Chip
                                          label={safeLog.level.toUpperCase()}
                                          size="small"
                                          color={
                                            safeLog.level === 'error'
                                              ? 'error'
                                              : safeLog.level === 'warning'
                                                ? 'warning'
                                                : safeLog.level === 'success'
                                                  ? 'success'
                                                  : 'default'
                                          }
                                          sx={{
                                            minWidth: 70,
                                            fontSize: '0.7rem',
                                            height: 20,
                                          }}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                          {new Date(log.timestamp).toLocaleTimeString()}
                                        </Typography>
                                      </Box>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.85rem',
                                          backgroundColor:
                                            safeLog.level === 'error'
                                              ? 'rgba(244, 67, 54, 0.1)'
                                              : safeLog.level === 'warning'
                                                ? 'rgba(255, 152, 0, 0.1)'
                                                : safeLog.level === 'success'
                                                  ? 'rgba(76, 175, 80, 0.1)'
                                                  : 'rgba(0, 0, 0, 0.05)',
                                          padding: 1,
                                          borderRadius: 1,
                                          wordBreak: 'break-all',
                                        }}
                                      >
                                        {safeLog.message}
                                      </Typography>
                                    </Box>
                                  </ListItem>
                                );
                              })}
                            </List>
                          </Box>
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

        {/* Facebook Login Modal - React Component */}
        <FacebookLoginModal
          open={facebookModalOpen}
          onCredentials={handleFacebookCredentials}
          onCancel={handleFacebookModalCancel}
          requestId={facebookRequestId}
          loading={facebookLoginLoading}
          error={facebookLoginError}
        />
      </Box>
    </Box>
  );
});

export default AdminParserPage;
