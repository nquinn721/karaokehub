import AdminBreadcrumb from '@components/AdminBreadcrumb';
import FacebookLoginModal from '@components/FacebookLoginModal';
import {
  faChartLine,
  faCheck,
  faCode,
  faDatabase,
  faExclamationTriangle,
  faEye,
  faGlobe,
  faPlay,
  faRefresh,
  faRobot,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { authStore, parserStore, webSocketStore } from '@stores/index';
import { autorun } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';

const AdminParserPageModern: React.FC = observer(() => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // State management
  const [selectedUrl, setSelectedUrl] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [parseMethod, setParseMethod] = useState<'html' | 'screenshot' | 'deepseek'>('deepseek');
  const [isParsingUrl, setIsParsingUrl] = useState(false);

  // Facebook Login Modal state
  const [facebookModalOpen, setFacebookModalOpen] = useState(false);
  const [facebookRequestId, setFacebookRequestId] = useState<string | null>(null);
  const [facebookLoginLoading, setFacebookLoginLoading] = useState(false);
  const [facebookLoginError, setFacebookLoginError] = useState<string | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Redirect non-admin users
  if (!authStore.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Modern dark theme colors
  const darkColors = {
    background: isDark ? '#0a0a0a' : '#f8f9fa',
    paper: isDark ? '#1a1a1a' : '#ffffff',
    surface: isDark ? '#242424' : '#f5f5f5',
    accent: isDark ? '#2a2a2a' : '#e0e0e0',
    primary: theme.palette.primary.main,
    success: '#00c851',
    warning: '#ff8800',
    error: '#ff4444',
    text: {
      primary: isDark ? '#ffffff' : '#212121',
      secondary: isDark ? '#b0b0b0' : '#757575',
      muted: isDark ? '#888888' : '#9e9e9e',
    },
    border: isDark ? '#333333' : '#e0e0e0',
  };

  // Initialize effects
  useEffect(() => {
    parserStore.initialize();
    parserStore.fetchUrlsBasedOnFilter();

    const setupFacebookModal = () => {
      if (webSocketStore.socket) {
        webSocketStore.socket.on('facebook-login-required', (data: any) => {
          setFacebookRequestId(data.requestId);
          setFacebookModalOpen(true);
          setFacebookLoginError(null);
        });

        webSocketStore.socket.on('facebook-login-result', (data: any) => {
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

    autorun(() => {
      if (webSocketStore.isConnected && webSocketStore.socket) {
        parserStore.setupParserEvents(webSocketStore.socket);
        setupFacebookModal();
      }
    });

    const checkParsingStatus = async () => {
      const isParsingActive = await parserStore.checkAndRestoreParsingStatus();
      if (isParsingActive) {
        setIsParsingUrl(true);
      }
    };

    checkParsingStatus();

    return () => {
      if (webSocketStore.socket) {
        parserStore.leaveParserLogs(webSocketStore.socket);
        webSocketStore.socket.off('facebook-login-required');
        webSocketStore.socket.off('facebook-login-result');
      }
    };
  }, []);

  // Parse URL function
  const parseUrl = async (url: string) => {
    if (!url) return;

    setIsParsingUrl(true);

    try {
      const result = await parserStore.parseAndSaveWebsite(
        url,
        parseMethod === 'deepseek' ? undefined : parseMethod,
      );
      if (result.success) {
        parserStore.addLogEntry(`Successfully parsed ${url}`, 'success');
        // Refresh pending reviews
        await parserStore.fetchPendingReviews();
      } else {
        parserStore.addLogEntry(`Failed to parse ${url}: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Parse error:', error);
      parserStore.addLogEntry(`Parse error: ${error}`, 'error');
    } finally {
      setIsParsingUrl(false);
    }
  };

  const currentUrl = selectedUrl || customUrl;
  const isCurrentUrlFacebook =
    currentUrl?.includes('facebook.com') || currentUrl?.includes('fb.com');
  const isCurrentUrlInstagram = currentUrl?.includes('instagram.com');

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: darkColors.background,
        color: darkColors.text.primary,
      }}
    >
      {/* Header Section */}
      <Box sx={{ p: 3, pb: 0 }}>
        <AdminBreadcrumb
          items={[
            { label: 'Admin', icon: faUserShield, path: '/admin' },
            { label: 'Parser', icon: faGlobe, isActive: true },
          ]}
        />
      </Box>

      {/* Main Header */}
      <Box sx={{ px: 3, mb: 4 }}>
        <Card
          sx={{
            background: `linear-gradient(135deg, ${darkColors.paper} 0%, ${alpha(darkColors.surface, 0.8)} 100%)`,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${darkColors.border}`,
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: `linear-gradient(90deg, ${darkColors.primary}, ${theme.palette.secondary.main})`,
            },
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" spacing={3} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={3} alignItems="center">
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${darkColors.primary}, ${theme.palette.secondary.main})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: `0 8px 32px ${alpha(darkColors.primary, 0.3)}`,
                  }}
                >
                  <FontAwesomeIcon icon={faRobot} size="lg" />
                </Box>
                <Box>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 800,
                      color: darkColors.text.primary,
                      mb: 0.5,
                      fontSize: { xs: '1.8rem', md: '2.5rem' },
                    }}
                  >
                    AI Parser Studio
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color: darkColors.text.secondary,
                      fontWeight: 400,
                      fontSize: { xs: '0.9rem', md: '1.1rem' },
                    }}
                  >
                    Advanced venue data extraction and review system
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={2}>
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
                    borderColor: darkColors.border,
                    color: darkColors.text.primary,
                    '&:hover': {
                      borderColor: darkColors.primary,
                      background: alpha(darkColors.primary, 0.1),
                    },
                  }}
                >
                  Refresh
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Main Content */}
      <Box sx={{ px: 3 }}>
        <Grid container spacing={3}>
          {/* Parser Section */}
          <Grid item xs={12} lg={6}>
            <Card
              sx={{
                background: darkColors.paper,
                border: `1px solid ${darkColors.border}`,
                borderRadius: 3,
                overflow: 'hidden',
                height: 'fit-content',
              }}
            >
              <Box
                sx={{
                  p: 3,
                  borderBottom: `1px solid ${darkColors.border}`,
                  background: alpha(darkColors.primary, 0.05),
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      background: darkColors.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <FontAwesomeIcon icon={faCode} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: darkColors.text.primary }}>
                    Website Parser
                  </Typography>
                </Stack>
              </Box>

              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                  {/* URL Filter */}
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1, color: darkColors.text.secondary }}
                    >
                      URL Filter
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={parserStore.urlFilter}
                        onChange={(e) =>
                          parserStore.setUrlFilter(
                            e.target.value as 'all' | 'unparsed' | 'approved-and-unparsed',
                          )
                        }
                        sx={{
                          background: darkColors.surface,
                          borderRadius: 2,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: darkColors.border,
                          },
                        }}
                      >
                        <MenuItem value="all">All URLs</MenuItem>
                        <MenuItem value="unparsed">Unparsed Only</MenuItem>
                        <MenuItem value="approved-and-unparsed">Approved & Unparsed</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  {/* URL Selection */}
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1, color: darkColors.text.secondary }}
                    >
                      Target URL
                    </Typography>
                    {!showCustomUrl ? (
                      <Stack spacing={2}>
                        <FormControl fullWidth size="small">
                          <Select
                            value={selectedUrl}
                            onChange={(e) => setSelectedUrl(e.target.value)}
                            displayEmpty
                            sx={{
                              background: darkColors.surface,
                              borderRadius: 2,
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: darkColors.border,
                              },
                            }}
                            renderValue={(value) => {
                              if (!value) return <em>Select a URL to parse</em>;
                              const urlObj = parserStore.urlsToParse.find((u) => u.url === value);
                              return urlObj?.name || value;
                            }}
                          >
                            {parserStore.urlsToParse.map((url) => (
                              <MenuItem key={url.id} value={url.url}>
                                <Box sx={{ wordBreak: 'break-all' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {url.name || 'Unnamed Venue'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {url.url}
                                  </Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => setShowCustomUrl(true)}
                          sx={{ alignSelf: 'flex-start', color: darkColors.primary }}
                        >
                          + Use Custom URL
                        </Button>
                      </Stack>
                    ) : (
                      <Stack spacing={2}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Enter custom URL to parse"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              background: darkColors.surface,
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: darkColors.border,
                              },
                            },
                          }}
                        />
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => {
                            setShowCustomUrl(false);
                            setCustomUrl('');
                          }}
                          sx={{ alignSelf: 'flex-start', color: darkColors.text.secondary }}
                        >
                          ← Back to URL List
                        </Button>
                      </Stack>
                    )}
                  </Box>

                  {/* Parse Method */}
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 2, color: darkColors.text.secondary }}
                    >
                      Parsing Method
                    </Typography>
                    <RadioGroup
                      value={parseMethod}
                      onChange={(e) => setParseMethod(e.target.value as any)}
                      row
                    >
                      <FormControlLabel
                        value="deepseek"
                        control={<Radio size="small" />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FontAwesomeIcon icon={faRobot} size="sm" />
                            <Typography variant="body2">AI (Recommended)</Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="screenshot"
                        control={<Radio size="small" />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FontAwesomeIcon icon={faEye} size="sm" />
                            <Typography variant="body2">Screenshot</Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="html"
                        control={<Radio size="small" />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FontAwesomeIcon icon={faCode} size="sm" />
                            <Typography variant="body2">HTML</Typography>
                          </Box>
                        }
                      />
                    </RadioGroup>
                  </Box>

                  {/* Parse Button */}
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={() => parseUrl(currentUrl)}
                    disabled={!currentUrl || isParsingUrl}
                    startIcon={
                      isParsingUrl ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <FontAwesomeIcon icon={faPlay} />
                      )
                    }
                    sx={{
                      borderRadius: 2,
                      py: 1.5,
                      mt: 2,
                      background: `linear-gradient(135deg, ${darkColors.primary}, ${theme.palette.secondary.main})`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${alpha(darkColors.primary, 0.8)}, ${alpha(theme.palette.secondary.main, 0.8)})`,
                      },
                    }}
                  >
                    {isParsingUrl ? 'Parsing...' : 'Start Parsing'}
                  </Button>

                  {/* Warning for social media URLs */}
                  {(isCurrentUrlFacebook || isCurrentUrlInstagram) && (
                    <Alert
                      severity="warning"
                      sx={{
                        borderRadius: 2,
                        background: alpha(darkColors.warning, 0.1),
                        border: `1px solid ${alpha(darkColors.warning, 0.3)}`,
                      }}
                    >
                      <Typography variant="body2">
                        {isCurrentUrlFacebook
                          ? 'Facebook parsing may require login credentials'
                          : 'Instagram parsing has limitations due to anti-bot measures'}
                      </Typography>
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Live Logs Section */}
          <Grid item xs={12} lg={6}>
            <Card
              sx={{
                background: darkColors.paper,
                border: `1px solid ${darkColors.border}`,
                borderRadius: 3,
                overflow: 'hidden',
                height: '600px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  p: 3,
                  borderBottom: `1px solid ${darkColors.border}`,
                  background: alpha(darkColors.primary, 0.05),
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        background: darkColors.success,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      <FontAwesomeIcon icon={faChartLine} />
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, color: darkColors.text.primary }}
                    >
                      Live Parser Logs
                    </Typography>
                  </Stack>

                  <Chip
                    label={webSocketStore.isConnected ? 'Connected' : 'Disconnected'}
                    color={webSocketStore.isConnected ? 'success' : 'error'}
                    size="small"
                    sx={{ borderRadius: 1 }}
                  />
                </Stack>
              </Box>

              <Box
                ref={logContainerRef}
                sx={{
                  flex: 1,
                  p: 2,
                  background: darkColors.surface,
                  overflowY: 'auto',
                  fontFamily: 'Monaco, Consolas, "Roboto Mono", monospace',
                  fontSize: '0.8rem',
                  lineHeight: 1.4,
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: darkColors.accent,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: darkColors.border,
                    borderRadius: '4px',
                  },
                }}
              >
                {parserStore.parsingLog.length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: darkColors.text.muted,
                    }}
                  >
                    <Typography variant="body2">Waiting for parser activity...</Typography>
                  </Box>
                ) : (
                  <Stack spacing={0.5}>
                    {parserStore.parsingLog.map((log: any, index: number) => (
                      <Box
                        key={index}
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          background:
                            log.level === 'error'
                              ? alpha(darkColors.error, 0.1)
                              : log.level === 'success'
                                ? alpha(darkColors.success, 0.1)
                                : log.level === 'warning'
                                  ? alpha(darkColors.warning, 0.1)
                                  : 'transparent',
                          borderLeft: `3px solid ${
                            log.level === 'error'
                              ? darkColors.error
                              : log.level === 'success'
                                ? darkColors.success
                                : log.level === 'warning'
                                  ? darkColors.warning
                                  : darkColors.border
                          }`,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color:
                              log.level === 'error'
                                ? darkColors.error
                                : log.level === 'success'
                                  ? darkColors.success
                                  : log.level === 'warning'
                                    ? darkColors.warning
                                    : darkColors.text.primary,
                            fontFamily: 'inherit',
                          }}
                        >
                          [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Card>
          </Grid>

          {/* Statistics Cards */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    background: `linear-gradient(135deg, ${darkColors.primary}, ${alpha(darkColors.primary, 0.8)})`,
                    color: 'white',
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <FontAwesomeIcon icon={faDatabase} size="lg" />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {parserStore.urlsToParse.length}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          URLs to Parse
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    background: `linear-gradient(135deg, ${darkColors.success}, ${alpha(darkColors.success, 0.8)})`,
                    color: 'white',
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <FontAwesomeIcon icon={faCheck} size="lg" />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {parserStore.pendingReviews.length}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Pending Reviews
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    background: `linear-gradient(135deg, ${darkColors.warning}, ${alpha(darkColors.warning, 0.8)})`,
                    color: 'white',
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <FontAwesomeIcon icon={faExclamationTriangle} size="lg" />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {
                            parserStore.parsingLog.filter((log: any) => log.level === 'warning')
                              .length
                          }
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Warnings
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${alpha(theme.palette.secondary.main, 0.8)})`,
                    color: 'white',
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <FontAwesomeIcon icon={faRobot} size="lg" />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {isParsingUrl ? 'Active' : 'Idle'}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Parser Status
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>

      {/* Modals - Simplified for modern UI */}
      <FacebookLoginModal
        open={facebookModalOpen}
        onCredentials={handleFacebookCredentials}
        onCancel={() => setFacebookModalOpen(false)}
        loading={facebookLoginLoading}
        error={facebookLoginError}
        requestId={facebookRequestId || ''}
      />

      {/* Location Edit Modal removed for cleaner interface */}
    </Box>
  );

  function handleFacebookCredentials(email: string, password: string, requestId: string) {
    setFacebookLoginLoading(true);
    setFacebookLoginError(null);

    webSocketStore.socket?.emit('provide-facebook-credentials', {
      email,
      password,
      requestId,
    });
  }
});

export default AdminParserPageModern;
