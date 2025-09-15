import AdminBreadcrumb from '@components/AdminBreadcrumb';
import CustomModal from '@components/CustomModal';
import FacebookLoginModal from '@components/FacebookLoginModal';
import LocationEditModal from '@components/LocationEditModal';
import {
  faCheck,
  faChevronDown,
  faCookie,
  faCopy,
  faEdit,
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
import { Cancel, CloudUpload } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  alpha,
  Autocomplete,
  Box,
  Button,
  Card,
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
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  apiStore,
  authStore,
  parserStore,
  uiStore,
  vendorStore,
  webSocketStore,
} from '@stores/index';
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

  // Location Edit Modal state
  const [locationEditModalOpen, setLocationEditModalOpen] = useState(false);
  const [urlToEdit, setUrlToEdit] = useState<{
    id: number;
    url: string;
    name?: string;
    city?: string;
    state?: string;
  } | null>(null);

  // Facebook Login Modal state
  const [facebookModalOpen, setFacebookModalOpen] = useState(false);
  const [facebookRequestId, setFacebookRequestId] = useState<string | null>(null);
  const [facebookLoginLoading, setFacebookLoginLoading] = useState(false);
  const [facebookLoginError, setFacebookLoginError] = useState<string | null>(null);

  // Tab state for Parse Website and Facebook Discovery
  const [parserTabValue, setParserTabValue] = useState(0);

  // Image Upload state
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<
    Array<{ id: string; dataUrl: string; file: File; name: string }>
  >([]);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [vendorSearchValue, setVendorSearchValue] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);

  // Puppeteer Stream state
  const [puppeteerConnected, setPuppeteerConnected] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [screenshotHistory, setScreenshotHistory] = useState<
    Array<{
      screenshot: string;
      action: string;
      timestamp: string;
      metadata?: any;
    }>
  >([]);
  const [puppeteerModalOpen, setPuppeteerModalOpen] = useState(false);

  // Approval Modal state
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [pendingApprovalData, setPendingApprovalData] = useState<any>(null);

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

  // Multiple image handling functions
  const handleMultipleImageFiles = (files: File[], replaceMode: boolean = false) => {
    const validImages: Array<{ id: string; dataUrl: string; file: File; name: string }> = [];
    let invalidCount = 0;

    const processFile = (file: File, index: number) => {
      return new Promise<void>((resolve) => {
        if (!file.type.startsWith('image/')) {
          invalidCount++;
          resolve();
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          // 10MB limit
          invalidCount++;
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`;
          validImages.push({
            id,
            dataUrl: e.target?.result as string,
            file,
            name: file.name,
          });
          resolve();
        };
        reader.onerror = () => {
          invalidCount++;
          resolve();
        };
        reader.readAsDataURL(file);
      });
    };

    // Process all files
    Promise.all(files.map((file, index) => processFile(file, index))).then(() => {
      console.log(
        `Processing ${files.length} files, valid: ${validImages.length}, replaceMode: ${replaceMode}`,
      );
      if (validImages.length > 0) {
        if (replaceMode) {
          console.log('Replacing all images');
          setUploadedImages(validImages); // Replace all images
        } else {
          console.log('Adding to existing images');
          setUploadedImages((prev) => {
            console.log(`Previous count: ${prev.length}, adding: ${validImages.length}`);
            return [...prev, ...validImages];
          }); // Add to existing
        }
      }

      if (invalidCount > 0) {
        console.error(
          `${invalidCount} file(s) were skipped (invalid format or too large). Please use image files under 10MB.`,
        );
      }
    });
  };

  const removeImage = (imageId: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleAnalyzeImages = async () => {
    if (uploadedImages.length === 0) {
      console.error('Please upload at least one image first');
      return;
    }

    // Analyze all uploaded images, not just the first one
    const allImageDataUrls = uploadedImages.map((img) => img.dataUrl);
    await analyzeMultipleImagesWithRetry(allImageDataUrls);
  };

  // Image analysis function with retry logic for multiple images (using parallel processing)
  const analyzeMultipleImagesWithRetry = async (imageDataUrls: string[], retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

    setIsUploadingImage(true);
    setUploadFailed(false);

    try {
      console.log(`� Analyzing ${imageDataUrls.length} images in parallel...`);

      const response = await fetch(
        `${apiStore.environmentInfo.baseURL}/parser/analyze-admin-screenshots-parallel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authStore.token}`,
          },
          body: JSON.stringify({
            screenshots: imageDataUrls, // Pass all images
            vendor: selectedVendor?.name || vendorSearchValue || null,
            description: `Admin uploaded ${imageDataUrls.length} image(s) for parallel analysis`,
            maxConcurrentWorkers: Math.min(imageDataUrls.length, 3), // Optimize worker count
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();

      console.log('✅ Parallel image analysis successful:', result);

      if (result.success && result.data) {
        openApprovalModal(result.data);
        uiStore.addNotification(
          `Successfully analyzed ${imageDataUrls.length} image(s) in parallel with speedup benefits`,
          'success',
        );
      } else {
        throw new Error(result.error || 'Parallel analysis failed');
      }
    } catch (error: any) {
      console.error(`Parallel image analysis error (attempt ${retryCount + 1}):`, error);

      if (retryCount < maxRetries) {
        uiStore.addNotification(
          `Parallel analysis failed, retrying in ${retryDelay / 1000}s... (${retryCount + 1}/${maxRetries + 1})`,
          'warning',
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return analyzeMultipleImagesWithRetry(imageDataUrls, retryCount + 1);
      } else {
        setUploadFailed(true);
        uiStore.addNotification(
          `Failed to analyze images in parallel after ${maxRetries + 1} attempts. You can try again with the retry button.`,
          'error',
        );
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Image analysis function with retry logic for single image (legacy support)
  const analyzeImageWithRetry = async (base64: string, retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

    setIsUploadingImage(true);
    setUploadFailed(false);

    try {
      const response = await fetch(
        `${apiStore.environmentInfo.baseURL}/parser/analyze-admin-screenshots`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authStore.token}`,
          },
          body: JSON.stringify({
            screenshots: [base64],
            vendor: selectedVendor?.name || vendorSearchValue || null,
          }),
        },
      );

      const result = await response.json();
      if (result.success) {
        uiStore.addNotification('Image analyzed successfully!', 'success');
        setUploadFailed(false);

        // Open modal with analysis results for approval
        if (result.data && result.requiresApproval) {
          console.log('Analysis result data structure:', result.data);
          console.log('Vendor:', result.data.vendor);
          console.log('Venues:', result.data.venues);
          console.log('DJs:', result.data.djs);
          console.log('Shows:', result.data.shows);
          console.log('Raw Data:', result.data.rawData);
          openApprovalModal(result.data);
        }
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error(`Image upload error (attempt ${retryCount + 1}):`, error);

      if (retryCount < maxRetries) {
        uiStore.addNotification(
          `Upload failed, retrying in ${retryDelay / 1000}s... (${retryCount + 1}/${maxRetries + 1})`,
          'warning',
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return analyzeImageWithRetry(base64, retryCount + 1);
      } else {
        setUploadFailed(true);
        uiStore.addNotification(
          `Failed to upload image after ${maxRetries + 1} attempts. You can try again with the retry button.`,
          'error',
        );
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Open approval modal with analysis results
  const openApprovalModal = (analysisData: any) => {
    setPendingApprovalData(analysisData);
    setApprovalModalOpen(true);
  };

  // Handle approval of analysis results
  const handleApproval = async (approved: boolean) => {
    if (!pendingApprovalData) return;

    try {
      if (approved) {
        // Call the admin approval endpoint with deduplication
        const response = await fetch(
          `${apiStore.environmentInfo.baseURL}/parser/approve-admin-analysis`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authStore.token}`,
            },
            body: JSON.stringify({
              data: pendingApprovalData,
            }),
          },
        );

        const result = await response.json();
        if (result.success) {
          const { finalCount, duplicatesRemoved, saveResult } = result;

          if (duplicatesRemoved > 0) {
            uiStore.addNotification(
              `Analysis approved! Saved ${finalCount} shows (removed ${duplicatesRemoved} duplicates)`,
              'success',
            );
          } else {
            uiStore.addNotification(
              `Analysis approved! Saved ${finalCount} unique shows`,
              'success',
            );
          }

          // Clear the uploaded images and reset vendor selection after successful save
          setUploadedImages([]);
          setSelectedVendor(null);
          setVendorSearchValue('');
          setUploadFailed(false);

          // Log the save results for debugging
          console.log('Save results:', saveResult);
        } else {
          uiStore.addNotification('Failed to save analysis data', 'error');
        }
      } else {
        uiStore.addNotification('Analysis rejected', 'info');
      }
    } catch (error) {
      console.error('Approval error:', error);
      uiStore.addNotification('Error processing approval', 'error');
    } finally {
      setApprovalModalOpen(false);
      setPendingApprovalData(null);
    }
  };
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

    // Initialize vendor store data
    vendorStore.fetchVendors();

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

    // Set up Puppeteer stream functionality
    const setupPuppeteerStream = () => {
      if (webSocketStore.socket) {
        console.log('Setting up Puppeteer stream WebSocket listeners');

        // Join the stream when connecting
        webSocketStore.socket.emit('join-puppeteer-stream');

        webSocketStore.socket.on('puppeteer-stream-joined', (data: any) => {
          console.log('📺 Joined Puppeteer stream:', data);
          setPuppeteerConnected(true);
        });

        webSocketStore.socket.on('puppeteer-screenshot', (data: any) => {
          console.log('📸 New Puppeteer screenshot received:', data.action);
          setCurrentScreenshot(`data:image/jpeg;base64,${data.screenshot}`);
          setCurrentAction(data.action);

          // Add to history (keep only last 5 for performance)
          setScreenshotHistory((prev) => [
            ...prev.slice(-4), // Keep last 4
            {
              screenshot: `data:image/jpeg;base64,${data.screenshot}`,
              action: data.action,
              timestamp: data.timestamp,
              metadata: data.metadata,
            },
          ]);
        });

        webSocketStore.socket.on('puppeteer-status', (data: any) => {
          console.log('📊 Puppeteer status update:', data);
          setCurrentStatus(data.status);
          if (data.progress !== undefined) {
            setCurrentProgress(data.progress);
          }
        });
      }
    };

    // Set up WebSocket for parser logs
    autorun(() => {
      if (webSocketStore.isConnected && webSocketStore.socket) {
        parserStore.setupParserEvents(webSocketStore.socket);
        setupFacebookModal(); // Set up modal when WebSocket is ready
        setupPuppeteerStream(); // Set up Puppeteer stream when WebSocket is ready
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
        // Clean up Puppeteer stream listeners
        webSocketStore.socket.emit('leave-puppeteer-stream');
        webSocketStore.socket.off('puppeteer-stream-joined');
        webSocketStore.socket.off('puppeteer-screenshot');
        webSocketStore.socket.off('puppeteer-status');
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
        // Use comprehensive DeepSeek website parsing
        result = await parserStore.parseWithDeepSeek(urlToParse, {
          usePuppeteer: true,
          maxPages: 10,
          includeSubdomains: false,
        });
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
                <Tabs
                  value={parserTabValue}
                  onChange={(_, newValue) => setParserTabValue(newValue)}
                  sx={{ mb: 3 }}
                >
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FontAwesomeIcon icon={faPlay} />
                        Parse Website
                      </Box>
                    }
                  />
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FontAwesomeIcon icon={faGlobe} />
                        Facebook Discovery
                      </Box>
                    }
                  />
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CloudUpload />
                        Image Upload
                      </Box>
                    }
                  />
                </Tabs>

                {/* Parse Website Tab Content */}
                <Box sx={{ display: parserTabValue === 0 ? 'block' : 'none' }}>
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
                                    {(url.city || url.state) && (
                                      <Typography
                                        variant="caption"
                                        color="primary.main"
                                        component="div"
                                        sx={{ fontStyle: 'italic' }}
                                      >
                                        📍{' '}
                                        {url.city && url.state
                                          ? `${url.city}, ${url.state}`
                                          : url.city || url.state}
                                      </Typography>
                                    )}
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
                                color="info"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent MenuItem selection
                                  setUrlToEdit({
                                    id: url.id,
                                    url: url.url,
                                    name: url.name,
                                    city: url.city,
                                    state: url.state,
                                  });
                                  setLocationEditModalOpen(true);
                                }}
                                title="Edit URL Info"
                                sx={{
                                  minWidth: '32px',
                                  width: '32px',
                                  height: '32px',
                                  flexShrink: 0,
                                }}
                              >
                                <FontAwesomeIcon icon={faEdit} size="sm" />
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
                            <FormControlLabel
                              value="html"
                              control={<Radio />}
                              label="HTML Parsing"
                            />
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
                </Box>

                {/* Facebook Discovery Tab Content */}
                <Box sx={{ display: parserTabValue === 1 ? 'block' : 'none' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Automatically discover karaoke groups from all US cities using AI-powered
                    analysis. This process will search Facebook groups in {'{'}865{'}'} cities and
                    use Gemini AI to select the most relevant karaoke communities.
                  </Typography>

                  <Alert severity="info" sx={{ mb: 3 }}>
                    <strong>Important:</strong> This process requires Facebook authentication and
                    may take several hours to complete. Make sure you have proper Facebook
                    credentials configured before starting.
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

                    <Button
                      variant="outlined"
                      onClick={async () => {
                        try {
                          // First check cookie validation
                          const response = await fetch('/api/parser/facebook-cookies/validate');
                          const result = await response.json();

                          if (result.success) {
                            const { validation, nextExpiry } = result.data;

                            // If cookies appear valid locally, test authentication
                            let authStatus = '';
                            let finalNotificationType: 'success' | 'warning' | 'error' | 'info' =
                              'info';

                            if (validation.isValid) {
                              try {
                                const testResponse = await fetch(
                                  '/api/parser/facebook-cookies/test',
                                  {
                                    method: 'POST',
                                    signal: AbortSignal.timeout(8000), // 8 second timeout
                                  },
                                );
                                const testResult = await testResponse.json();

                                if (testResult.success && testResult.data.success) {
                                  authStatus = '🎉 Authentication: WORKING';
                                  finalNotificationType = 'success';
                                } else {
                                  authStatus = '⚠️ Authentication: FAILED (need refresh)';
                                  finalNotificationType = 'warning';
                                }
                              } catch {
                                authStatus = '⚠️ Authentication: TIMEOUT (need refresh)';
                                finalNotificationType = 'warning';
                              }
                            } else {
                              authStatus = '❌ Authentication: CANNOT TEST (invalid cookies)';
                              finalNotificationType = 'error';
                            }

                            const status = validation.isValid
                              ? '✅ Format Valid'
                              : '❌ Format Invalid';
                            const expiredInfo =
                              validation.expired > 0 ? ` (${validation.expired} expired)` : '';
                            const nextExpiryInfo = nextExpiry
                              ? ` - Expires: ${new Date(nextExpiry).toLocaleDateString()}`
                              : '';

                            uiStore.addNotification(
                              `Facebook Cookies: ${status} (${validation.total} total${expiredInfo}) | ${authStatus}${nextExpiryInfo}`,
                              finalNotificationType,
                            );
                          }
                        } catch (error) {
                          console.error('Failed to check Facebook cookies:', error);
                          uiStore.addNotification('❌ Failed to check Facebook cookies', 'error');
                        }
                      }}
                      startIcon={<FontAwesomeIcon icon={faCookie} />}
                    >
                      Check FB Cookies
                    </Button>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    💡 Tip: The discovery process will automatically save found group URLs to the
                    URLs to Parse table above. You can then review and parse them individually.
                  </Typography>

                  <Alert severity="info" sx={{ mt: 2, fontSize: '0.875rem' }}>
                    <strong>Facebook Cookie Status:</strong> Format validation checks if cookies
                    exist and aren't expired. Authentication testing verifies if Facebook accepts
                    the cookies. If authentication fails, cookies need to be refreshed using{' '}
                    <code>bash fix-facebook-cookies.sh</code>
                  </Alert>
                </Box>

                {/* Image Upload Tab Content */}
                <Box sx={{ display: parserTabValue === 2 ? 'block' : 'none' }}>
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
                      <CloudUpload style={{ marginRight: '8px' }} />
                      Image Upload & Analysis
                    </Typography>

                    {/* Vendor Selection */}
                    <Box sx={{ mb: 3 }}>
                      <Autocomplete
                        options={vendorStore.vendors}
                        getOptionLabel={(option) => option.name}
                        value={selectedVendor}
                        onChange={(_, newValue) => {
                          setSelectedVendor(newValue);
                        }}
                        onInputChange={(_, newInputValue) => {
                          setVendorSearchValue(newInputValue);
                        }}
                        freeSolo
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select or Create Vendor (Optional)"
                            placeholder="Type vendor name..."
                            helperText="Optional: Select existing vendor or type new name to create one"
                          />
                        )}
                        sx={{ minWidth: 300 }}
                      />
                    </Box>

                    {/* Image Upload Area */}
                    <Box
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);

                        const files = Array.from(e.dataTransfer.files);
                        handleMultipleImageFiles(files, false); // Add to existing images
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onClick={() => {
                        // Only trigger file browser if we don't have images
                        if (uploadedImages.length === 0) {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.multiple = true;
                          input.onchange = (e) => {
                            const files = (e.target as HTMLInputElement).files;
                            if (files) {
                              handleMultipleImageFiles(Array.from(files), false);
                            }
                          };
                          input.click();
                        }
                      }}
                      sx={{
                        border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.divider}`,
                        borderRadius: 2,
                        p: 4,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        backgroundColor: isDragOver
                          ? alpha(theme.palette.primary.main, 0.1)
                          : 'transparent',
                        '&:hover': {
                          borderColor: theme.palette.primary.main,
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        },
                      }}
                    >
                      {isUploadingImage ? (
                        <CircularProgress size={48} />
                      ) : uploadedImages.length > 0 ? (
                        <Box>
                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            {uploadedImages.map((image) => (
                              <Grid item xs={6} sm={4} md={3} key={image.id}>
                                <Box sx={{ position: 'relative' }}>
                                  <img
                                    src={image.dataUrl}
                                    alt={image.name}
                                    style={{
                                      width: '100%',
                                      height: '120px',
                                      objectFit: 'cover',
                                      borderRadius: '8px',
                                    }}
                                  />
                                  <IconButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeImage(image.id);
                                    }}
                                    sx={{
                                      position: 'absolute',
                                      top: 6,
                                      right: 6,
                                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                      color: 'white',
                                      border: '2px solid rgba(255, 255, 255, 0.9)',
                                      boxShadow: '0 3px 8px rgba(0, 0, 0, 0.4)',
                                      backdropFilter: 'blur(4px)',
                                      '&:hover': {
                                        backgroundColor: 'error.main',
                                        color: 'white',
                                        transform: 'scale(1.15)',
                                        boxShadow: '0 4px 12px rgba(244, 67, 54, 0.5)',
                                        border: '2px solid white',
                                      },
                                      width: 32,
                                      height: 32,
                                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                      zIndex: 10,
                                    }}
                                  >
                                    <Cancel sx={{ fontSize: 20, fontWeight: 'bold' }} />
                                  </IconButton>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      position: 'absolute',
                                      bottom: 4,
                                      left: 4,
                                      right: 4,
                                      backgroundColor: 'rgba(0,0,0,0.7)',
                                      color: 'white',
                                      padding: '2px 4px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      textOverflow: 'ellipsis',
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {image.name}
                                  </Typography>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mt: 2,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              {uploadedImages.length} image(s) uploaded. Drag more images to add
                              them.
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                gap: 2,
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                              }}
                            >
                              <Button
                                variant="outlined"
                                size="medium"
                                startIcon={<CloudUpload />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.multiple = true;
                                  input.onchange = (e) => {
                                    const files = (e.target as HTMLInputElement).files;
                                    if (files) {
                                      handleMultipleImageFiles(Array.from(files), false);
                                    }
                                  };
                                  input.click();
                                }}
                                sx={{
                                  px: 3,
                                  py: 1,
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontWeight: 500,
                                }}
                              >
                                Add More Images
                              </Button>
                              <Button
                                variant="contained"
                                size="medium"
                                startIcon={
                                  isUploadingImage ? (
                                    <CircularProgress size={16} />
                                  ) : (
                                    <CloudUpload />
                                  )
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAnalyzeImages();
                                }}
                                disabled={isUploadingImage}
                                sx={{
                                  px: 3,
                                  py: 1,
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  boxShadow: 2,
                                  '&:hover': {
                                    boxShadow: 4,
                                  },
                                }}
                              >
                                {isUploadingImage
                                  ? 'Analyzing...'
                                  : `Analyze ${uploadedImages.length} Image${uploadedImages.length > 1 ? 's' : ''}`}
                              </Button>
                            </Box>
                          </Box>
                          {uploadFailed && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                              <Button
                                variant="outlined"
                                size="medium"
                                startIcon={<FontAwesomeIcon icon={faRefresh} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAnalyzeImages();
                                }}
                                sx={{
                                  px: 3,
                                  py: 1,
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontWeight: 500,
                                  color: 'warning.main',
                                  borderColor: 'warning.main',
                                  '&:hover': {
                                    borderColor: 'warning.dark',
                                    backgroundColor: 'warning.light',
                                  },
                                }}
                              >
                                Retry Analysis
                              </Button>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Box>
                          <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                          <Typography variant="h6" gutterBottom>
                            Drop images here or click to select
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Upload multiple images for analysis and venue information extraction
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Alert severity="info" sx={{ mt: 2 }}>
                      Upload images of venue websites, social media pages, or event listings for
                      automatic extraction of karaoke show information.
                    </Alert>
                  </Paper>
                </Box>
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
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '8px' }} />
                    Parser Statistics
                  </Typography>

                  {/* Puppeteer Stream Icon */}
                  <IconButton
                    onClick={() => setPuppeteerModalOpen(true)}
                    sx={{
                      bgcolor: puppeteerConnected ? 'success.main' : 'action.hover',
                      color: puppeteerConnected ? 'white' : 'text.secondary',
                      '&:hover': {
                        bgcolor: puppeteerConnected ? 'success.dark' : 'action.selected',
                      },
                      position: 'relative',
                    }}
                    title="View Puppeteer Live Stream"
                  >
                    <FontAwesomeIcon icon={faEye} />
                    {currentScreenshot && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 8,
                          height: 8,
                          bgcolor: 'success.main',
                          borderRadius: '50%',
                          border: '1px solid white',
                        }}
                      />
                    )}
                  </IconButton>
                </Box>

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

                {/* Parser Summary */}
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontWeight: 600, mb: 2 }}
                  >
                    Parser Summary:
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Card sx={{ p: 2, bgcolor: 'background.paper' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Current Status
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor:
                                parserStore.parserSummary.status === 'parsing'
                                  ? 'warning.main'
                                  : parserStore.parserSummary.status === 'completed'
                                    ? 'success.main'
                                    : parserStore.parserSummary.status === 'error'
                                      ? 'error.main'
                                      : 'grey.500',
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {parserStore.parserSummary.status.charAt(0).toUpperCase() +
                              parserStore.parserSummary.status.slice(1)}
                          </Typography>
                        </Box>
                        {parserStore.parserSummary.pageName && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Page: {parserStore.parserSummary.pageName}
                          </Typography>
                        )}
                        {parserStore.parserSummary.currentStep && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Step: {parserStore.parserSummary.currentStep}
                          </Typography>
                        )}
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Card sx={{ p: 2, bgcolor: 'background.paper' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Image Processing
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Found:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {parserStore.parserSummary.imagesFound}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Parsed:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {parserStore.parserSummary.imagesParsed} /{' '}
                            {parserStore.parserSummary.imagesFound}
                          </Typography>
                        </Box>
                        {parserStore.parserSummary.imagesFound > 0 && (
                          <LinearProgress
                            variant="determinate"
                            value={
                              (parserStore.parserSummary.imagesParsed /
                                parserStore.parserSummary.imagesFound) *
                              100
                            }
                            sx={{ mt: 1, height: 4, borderRadius: 2 }}
                          />
                        )}
                      </Card>
                    </Grid>

                    <Grid item xs={12}>
                      <Card sx={{ p: 2, bgcolor: 'background.paper' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Extracted Data
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={3}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" color="primary">
                                {parserStore.parserSummary.totalVenues}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Venues
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={3}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" color="primary">
                                {parserStore.parserSummary.totalShows}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Shows
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={3}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" color="primary">
                                {parserStore.parserSummary.totalDJs}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                DJs
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={3}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" color="primary">
                                {parserStore.parserSummary.totalVendors}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Vendors
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>

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
                              {item.stats?.venuesFound ? (
                                <Chip
                                  label={`${item.stats.venuesFound} venues`}
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
        <CustomModal
          open={reviewDialog}
          onClose={() => setReviewDialog(false)}
          title="Review Parsed Data"
          maxWidth="lg"
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
                  {/* Compact Venue Information */}
                  {(selectedReview.aiAnalysis?.venues ||
                    selectedReview.venues ||
                    (selectedReview.stats?.venuesFound &&
                      selectedReview.stats.venuesFound > 0)) && (
                    <Accordion>
                      <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
                        <Typography variant="h6">
                          🏢 Venues (
                          {selectedReview.venues?.length ||
                            selectedReview.aiAnalysis?.venues?.length ||
                            selectedReview.stats?.venuesFound ||
                            1}
                          )
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {selectedReview.venues && selectedReview.venues.length > 0 ? (
                            // New format: venues array - compact chip display
                            selectedReview.venues.map((venue: any, index: number) => (
                              <Chip
                                key={index}
                                label={`${venue.name} (${Math.round((venue.confidence || 0) * 100)}%)`}
                                variant="outlined"
                                color="primary"
                                size="small"
                              />
                            ))
                          ) : selectedReview.aiAnalysis?.venues &&
                            selectedReview.aiAnalysis.venues.length > 0 ? (
                            // Old format: aiAnalysis.venues array - compact chip display
                            selectedReview.aiAnalysis.venues.map((venue: any, index: number) => (
                              <Chip
                                key={index}
                                label={`${venue.name} (${Math.round((venue.confidence || 0) * 100)}%)`}
                                variant="outlined"
                                color="primary"
                                size="small"
                              />
                            ))
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
                              No venue information available
                            </Typography>
                          )}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {/* DJs - Enhanced to show extracted DJs and from shows */}
                  {((selectedReview.aiAnalysis?.djs && selectedReview.aiAnalysis.djs.length > 0) ||
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
                    (selectedReview.stats?.showsFound && selectedReview.stats.showsFound > 0)) && (
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
                                        {(show.venue && typeof show.venue === 'object'
                                          ? show.venue.name
                                          : show.venue) || 'Unknown Venue'}
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
                                          {show.venue?.address ? (
                                            <Typography variant="body2">
                                              <strong>Address:</strong> {show.venue.address}
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
                                            {show.venue &&
                                              typeof show.venue === 'object' &&
                                              show.venue.city && (
                                                <Typography variant="body2">
                                                  <strong>City:</strong>{' '}
                                                  {show.venue && typeof show.venue === 'object'
                                                    ? show.venue.city
                                                    : null}
                                                </Typography>
                                              )}
                                            {show.venue &&
                                              typeof show.venue === 'object' &&
                                              show.venue.state && (
                                                <Typography variant="body2">
                                                  <strong>State:</strong>{' '}
                                                  {show.venue && typeof show.venue === 'object'
                                                    ? show.venue.state
                                                    : null}
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
                                          <strong>DJ/Host:</strong> {show.djName || 'Not specified'}
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

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
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
          </Box>
        </CustomModal>

        {/* Location Edit Modal */}
        <LocationEditModal
          open={locationEditModalOpen}
          onClose={() => {
            setLocationEditModalOpen(false);
            setUrlToEdit(null);
          }}
          onSave={async (data) => {
            if (urlToEdit) {
              const result = await parserStore.updateUrlCityState(
                urlToEdit.id,
                data.city,
                data.state,
                data.name,
              );
              if (!result.success) {
                throw new Error(result.error || 'Failed to update URL');
              }
            }
          }}
          initialData={
            urlToEdit
              ? {
                  url: urlToEdit.url,
                  name: urlToEdit.name,
                  city: urlToEdit.city,
                  state: urlToEdit.state,
                }
              : undefined
          }
        />

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

        {/* Approval Modal for Admin Screenshot Analysis */}
        <CustomModal
          open={approvalModalOpen}
          onClose={() => setApprovalModalOpen(false)}
          title="Review Screenshot Analysis Results"
          maxWidth="lg"
        >
          <Box sx={{ p: 2 }}>
            {pendingApprovalData && (
              <>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}
                >
                  🎤 Analysis Results
                </Typography>

                {/* Summary Stats */}
                <Card
                  sx={{
                    mb: 3,
                    p: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ color: 'primary.main', fontWeight: 600 }}
                  >
                    📊 Summary
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {pendingApprovalData.vendor && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Vendor:
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                          1
                        </Typography>
                      </Box>
                    )}
                    {pendingApprovalData.venues && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Venues:
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                          {pendingApprovalData.venues.length}
                        </Typography>
                      </Box>
                    )}
                    {pendingApprovalData.djs && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          DJs:
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                          {pendingApprovalData.djs.length}
                        </Typography>
                      </Box>
                    )}
                    {pendingApprovalData.shows && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Shows:
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                          {pendingApprovalData.shows.length}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Card>

                {/* Vendor Information */}
                {pendingApprovalData.vendor && (
                  <Card
                    sx={{
                      mb: 3,
                      border: '1px solid',
                      borderColor: 'primary.light',
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        🏢 Vendor Information
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            Name
                          </Typography>
                          <Typography variant="body1" fontWeight="600">
                            {pendingApprovalData.vendor.name || 'Unknown'}
                          </Typography>
                        </Grid>
                        {pendingApprovalData.vendor.confidence && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Confidence
                            </Typography>
                            <Typography variant="body1" fontWeight="600" color="success.main">
                              {(pendingApprovalData.vendor.confidence * 100).toFixed(1)}%
                            </Typography>
                          </Grid>
                        )}
                        {pendingApprovalData.vendor.website && (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">
                              Website
                            </Typography>
                            <Typography variant="body1">
                              {pendingApprovalData.vendor.website}
                            </Typography>
                          </Grid>
                        )}
                        {pendingApprovalData.vendor.description && (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">
                              Description
                            </Typography>
                            <Typography variant="body1">
                              {pendingApprovalData.vendor.description}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </Card>
                )}

                {/* Venues */}
                {pendingApprovalData.venues && pendingApprovalData.venues.length > 0 && (
                  <Card
                    sx={{ mb: 3, border: '1px solid', borderColor: 'info.light', borderRadius: 2 }}
                  >
                    <Box sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        📍 Venues ({pendingApprovalData.venues.length})
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        {pendingApprovalData.venues.map((venue: any, index: number) => (
                          <Grid item xs={12} md={6} key={index}>
                            <Paper
                              sx={{
                                p: 2,
                                border: '1px solid',
                                borderColor: 'grey.200',
                                borderRadius: 1,
                              }}
                            >
                              <Grid container spacing={1}>
                                <Grid item xs={12}>
                                  <Typography variant="body2" color="text.secondary">
                                    Name
                                  </Typography>
                                  <Typography variant="body1" fontWeight="600">
                                    {venue.name || 'Unknown'}
                                  </Typography>
                                </Grid>
                                {venue.address && (
                                  <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                      Full Address
                                    </Typography>
                                    <Typography variant="body1">
                                      {venue.address}
                                      {venue.city && `, ${venue.city}`}
                                      {venue.state && `, ${venue.state}`}
                                      {venue.zip && ` ${venue.zip}`}
                                    </Typography>
                                  </Grid>
                                )}
                                {(venue.city || venue.state) && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      Location
                                    </Typography>
                                    <Typography variant="body1">
                                      {venue.city && venue.state ? `${venue.city}, ${venue.state}` : venue.city || venue.state}
                                    </Typography>
                                  </Grid>
                                )}
                                {venue.zip && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      ZIP Code
                                    </Typography>
                                    <Typography variant="body1">{venue.zip}</Typography>
                                  </Grid>
                                )}
                                {(venue.lat && venue.lng) && (
                                  <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                      Coordinates
                                    </Typography>
                                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                      {venue.lat}, {venue.lng}
                                    </Typography>
                                  </Grid>
                                )}
                                {venue.phone && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      Phone
                                    </Typography>
                                    <Typography variant="body1">{venue.phone}</Typography>
                                  </Grid>
                                )}
                                {venue.confidence && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      Confidence
                                    </Typography>
                                    <Typography
                                      variant="body1"
                                      fontWeight="600"
                                      color="success.main"
                                    >
                                      {(venue.confidence * 100).toFixed(1)}%
                                    </Typography>
                                  </Grid>
                                )}
                                {venue.website && (
                                  <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                      Website
                                    </Typography>
                                    <Typography variant="body1">{venue.website}</Typography>
                                  </Grid>
                                )}
                                {venue.lat && venue.lng && (
                                  <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                      Coordinates
                                    </Typography>
                                    <Typography variant="body1">
                                      {venue.lat}, {venue.lng}
                                    </Typography>
                                  </Grid>
                                )}
                              </Grid>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Card>
                )}

                {/* DJs */}
                {pendingApprovalData.djs && pendingApprovalData.djs.length > 0 && (
                  <Card
                    sx={{
                      mb: 3,
                      border: '1px solid',
                      borderColor: 'warning.light',
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ p: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        🎧 DJs ({pendingApprovalData.djs.length})
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        {pendingApprovalData.djs.map((dj: any, index: number) => (
                          <Grid item xs={12} sm={6} md={4} key={index}>
                            <Paper
                              sx={{
                                p: 2,
                                border: '1px solid',
                                borderColor: 'grey.200',
                                borderRadius: 1,
                              }}
                            >
                              <Grid container spacing={1}>
                                <Grid item xs={12}>
                                  <Typography variant="body2" color="text.secondary">
                                    Name
                                  </Typography>
                                  <Typography variant="body1" fontWeight="600">
                                    {dj.name || 'Unknown'}
                                  </Typography>
                                </Grid>
                                {dj.context && (
                                  <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                      Context
                                    </Typography>
                                    <Typography variant="body1">{dj.context}</Typography>
                                  </Grid>
                                )}
                                {dj.confidence && (
                                  <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                      Confidence
                                    </Typography>
                                    <Typography
                                      variant="body1"
                                      fontWeight="600"
                                      color="success.main"
                                    >
                                      {(dj.confidence * 100).toFixed(1)}%
                                    </Typography>
                                  </Grid>
                                )}
                              </Grid>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Card>
                )}

                {/* Karaoke Shows */}
                {pendingApprovalData.shows && pendingApprovalData.shows.length > 0 && (
                  <Card
                    sx={{
                      mb: 3,
                      border: '1px solid',
                      borderColor: 'success.light',
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        🎤 Karaoke Shows ({pendingApprovalData.shows.length})
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        {pendingApprovalData.shows.map((show: any, index: number) => (
                          <Grid item xs={12} md={6} key={index}>
                            <Paper
                              sx={{
                                p: 2,
                                border: '1px solid',
                                borderColor: 'grey.200',
                                borderRadius: 1,
                              }}
                            >
                              <Grid container spacing={1}>
                                <Grid item xs={12}>
                                  <Typography variant="body2" color="text.secondary">
                                    Venue
                                  </Typography>
                                  <Typography variant="body1" fontWeight="600">
                                    {show.venueName || show.venue || 'Unknown'}
                                  </Typography>
                                </Grid>
                                {show.date && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      Date
                                    </Typography>
                                    <Typography variant="body1">{show.date}</Typography>
                                  </Grid>
                                )}
                                {show.dayOfWeek && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      Day
                                    </Typography>
                                    <Typography variant="body1">{show.dayOfWeek}</Typography>
                                  </Grid>
                                )}
                                {(show.startTime || show.endTime) && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      Time
                                    </Typography>
                                    <Typography variant="body1">
                                      {show.startTime || ''}
                                      {show.endTime ? ` - ${show.endTime}` : ''}
                                    </Typography>
                                  </Grid>
                                )}
                                {show.eventType && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      Type
                                    </Typography>
                                    <Typography variant="body1">{show.eventType}</Typography>
                                  </Grid>
                                )}
                                {show.djName && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      DJ
                                    </Typography>
                                    <Typography variant="body1">{show.djName}</Typography>
                                  </Grid>
                                )}
                                {show.confidence && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      Confidence
                                    </Typography>
                                    <Typography
                                      variant="body1"
                                      fontWeight="600"
                                      color="success.main"
                                    >
                                      {(show.confidence * 100).toFixed(1)}%
                                    </Typography>
                                  </Grid>
                                )}
                                {show.description && (
                                  <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                      Description
                                    </Typography>
                                    <Typography variant="body1">{show.description}</Typography>
                                  </Grid>
                                )}
                              </Grid>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Card>
                )}

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                  <Button variant="outlined" color="error" onClick={() => handleApproval(false)}>
                    Reject
                  </Button>
                  <Button variant="contained" color="primary" onClick={() => handleApproval(true)}>
                    Approve & Save
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </CustomModal>

        {/* Puppeteer Stream Modal */}
        <Dialog
          open={puppeteerModalOpen}
          onClose={() => setPuppeteerModalOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={faEye} />
              Puppeteer Live Stream
              {puppeteerConnected && (
                <Chip label="LIVE" color="success" size="small" sx={{ ml: 1 }} />
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            {/* Connection Status */}
            <Alert severity={puppeteerConnected ? 'success' : 'info'} sx={{ mb: 2 }}>
              {puppeteerConnected
                ? '🟢 Connected to Puppeteer stream'
                : '⭕ Waiting for Puppeteer session to start...'}
            </Alert>

            {/* Current Status and Progress */}
            {currentStatus && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Status: {currentStatus}
                </Typography>
                {currentProgress > 0 && (
                  <LinearProgress variant="determinate" value={currentProgress} sx={{ mb: 1 }} />
                )}
                {currentAction && (
                  <Typography variant="body2" color="text.primary">
                    Last Action: {currentAction}
                  </Typography>
                )}
              </Box>
            )}

            {/* Live Screenshot Display */}
            {currentScreenshot && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Live Browser View:
                </Typography>
                <Paper
                  elevation={2}
                  sx={{
                    p: 1,
                    textAlign: 'center',
                    backgroundColor: '#000',
                    borderRadius: 2,
                  }}
                >
                  <img
                    src={currentScreenshot}
                    alt="Puppeteer Live View"
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: '4px',
                      border: '1px solid #333',
                    }}
                  />
                </Paper>
                {currentAction && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 1, textAlign: 'center' }}
                  >
                    {currentAction}
                  </Typography>
                )}
              </Box>
            )}

            {/* Screenshot History */}
            {screenshotHistory.length > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Recent Screenshots:
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    overflowX: 'auto',
                    pb: 1,
                    '&::-webkit-scrollbar': {
                      height: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: alpha(theme.palette.action.hover, 0.3),
                      borderRadius: '3px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.5),
                      borderRadius: '3px',
                    },
                  }}
                >
                  {screenshotHistory.map((item, index) => (
                    <Box
                      key={index}
                      sx={{
                        minWidth: '120px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'scale(1.05)',
                        },
                        transition: 'transform 0.2s',
                      }}
                      onClick={() => setCurrentScreenshot(item.screenshot)}
                    >
                      <img
                        src={item.screenshot}
                        alt={`Step ${index + 1}`}
                        style={{
                          width: '120px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          border:
                            currentScreenshot === item.screenshot
                              ? `2px solid ${theme.palette.primary.main}`
                              : '1px solid #ccc',
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          fontSize: '10px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.action}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {!currentScreenshot && !puppeteerConnected && (
              <Alert severity="info">
                Start a Facebook parsing job to see live browser automation in action.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPuppeteerModalOpen(false)} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
});

export default AdminParserPage;
