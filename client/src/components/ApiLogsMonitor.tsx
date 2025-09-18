import {
  faCheckCircle,
  faCircleExclamation,
  faClock,
  faExclamationTriangle,
  faRefresh,
  faRobot,
  faSearch,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { apiStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

interface ApiLog {
  id: string;
  provider: string;
  logType: string;
  level: string;
  message: string;
  query?: string;
  statusCode?: number;
  responseTime?: number;
  wasRateLimited: boolean;
  circuitBreakerTripped: boolean;
  timestamp: string;
  requestData?: any;
  responseData?: any;
  errorDetails?: any;
}

interface ApiLogStats {
  totalRequests: number;
  successfulRequests: number;
  rateLimitedRequests: number;
  errorRequests: number;
  averageResponseTime: number;
  circuitBreakerTrips: number;
  recentRequests: ApiLog[];
  timeRange: {
    start: string;
    end: string;
  };
}

interface ItunesRateLimitStats {
  maxRequestsPerMinute: number;
  minDelayBetweenRequests: number;
  requestsThisMinute: number;
  requestsThisHour: number;
  requestsToday: number;
  averageRequestsPerMinute: number;
  circuitBreakerStatus: string;
  timeUntilReset: number;
  remainingQuotaThisMinute: number;
  projectedMinutelyUsage: number;
  rateLimitReachedCount: number;
}

interface ItunesUsageTrends {
  hourlyUsage: Array<{ hour: string; requests: number; errors: number; avgResponseTime: number }>;
  peakUsageTimes: Array<{ time: string; requests: number }>;
  performanceTrends: Array<{ period: string; avgResponseTime: number; successRate: number }>;
}

const ApiLogsMonitor = observer(() => {
  const [stats, setStats] = useState<ApiLogStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<ApiLog[]>([]);
  const [itunesRateLimit, setItunesRateLimit] = useState<ItunesRateLimitStats | null>(null);
  const [itunesUsage, setItunesUsage] = useState<ItunesUsageTrends | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [hoursRange, setHoursRange] = useState<number>(24);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await apiStore.get(
        `${apiStore.endpoints.admin.apiLogs.stats}?hours=${hoursRange}`,
      );
      setStats(response);
    } catch (error) {
      console.error('Failed to fetch API stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (filterLevel !== 'all') params.append('level', filterLevel);
      if (filterType !== 'all') params.append('logType', filterType);

      const response = await apiStore.get(
        `${apiStore.endpoints.admin.apiLogs.recent}?${params.toString()}`,
      );
      setRecentLogs(response);
    } catch (error) {
      console.error('Failed to fetch recent logs:', error);
    }
  };

  const fetchItunesRateLimit = async () => {
    try {
      const response = await apiStore.get('/api/admin/api-logs/itunes/rate-limit-info');
      setItunesRateLimit(response);
    } catch (error) {
      console.error('Failed to fetch iTunes rate limit stats:', error);
    }
  };

  const fetchItunesUsage = async () => {
    try {
      const response = await apiStore.get(
        `/api/admin/api-logs/itunes/usage-trends?hours=${hoursRange}`,
      );
      setItunesUsage(response);
    } catch (error) {
      console.error('Failed to fetch iTunes usage trends:', error);
    }
  };

  const fetchData = async () => {
    await Promise.all([
      fetchStats(),
      fetchRecentLogs(),
      fetchItunesRateLimit(),
      fetchItunesUsage(),
    ]);
  };

  useEffect(() => {
    fetchData();
  }, [hoursRange]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (autoRefresh) {
      interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, hoursRange]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return 'default';
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 400 && statusCode < 500) return 'warning';
    if (statusCode >= 500) return 'error';
    return 'default';
  };

  const getLogTypeIcon = (logType: string) => {
    switch (logType) {
      case 'search_songs':
      case 'search_artists':
        return faSearch;
      case 'snippet_request':
        return faRobot;
      case 'rate_limited':
        return faClock;
      case 'circuit_breaker':
        return faExclamationTriangle;
      default:
        return faCircleExclamation;
    }
  };

  if (!stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          API Logs Monitor
        </Typography>
        {loading && <LinearProgress />}
        <Typography>Loading API monitoring data...</Typography>
      </Box>
    );
  }

  const successRate =
    stats.totalRequests > 0
      ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
      : '0';

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          iTunes API Monitoring
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            }
            label="Auto Refresh"
          />
          <IconButton onClick={fetchData} disabled={loading}>
            <FontAwesomeIcon icon={faRefresh} spin={loading} />
          </IconButton>
        </Box>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  style={{ color: '#4caf50', fontSize: '24px' }}
                />
                <Box>
                  <Typography variant="h4">{stats.totalRequests}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Requests
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  style={{ color: '#4caf50', fontSize: '24px' }}
                />
                <Box>
                  <Typography variant="h4">{successRate}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Success Rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FontAwesomeIcon icon={faClock} style={{ color: '#ff9800', fontSize: '24px' }} />
                <Box>
                  <Typography variant="h4">{stats.rateLimitedRequests}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rate Limited
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FontAwesomeIcon
                  icon={faTimesCircle}
                  style={{ color: '#f44336', fontSize: '24px' }}
                />
                <Box>
                  <Typography variant="h4">{stats.errorRequests}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Errors
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Rate Limit Alert */}
      {stats.rateLimitedRequests > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Rate Limiting Detected</Typography>
          <Typography variant="body2">
            {stats.rateLimitedRequests} requests have been rate limited in the last {hoursRange}{' '}
            hours. Consider optimizing API usage patterns.
          </Typography>
        </Alert>
      )}

      {/* Circuit Breaker Alert */}
      {stats.circuitBreakerTrips > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Circuit Breaker Activated</Typography>
          <Typography variant="body2">
            {stats.circuitBreakerTrips} circuit breaker trips detected. API availability may be
            compromised.
          </Typography>
        </Alert>
      )}

      {/* iTunes Rate Limiting & Quota Information */}
      {itunesRateLimit && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
            >
              <Typography variant="h6" gutterBottom>
                iTunes API Rate Limits & Quotas
              </Typography>
              <Chip
                label="iTunes Search API"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>

            {/* Current Plan Info */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Current Plan: iTunes Search API (Free Tier)
              </Typography>
              <Typography variant="body2">
                Rate Limit: 300 requests per minute • Minimum delay: 50ms between requests • No
                daily quota limit
              </Typography>
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={3}
                  sx={{
                    textAlign: 'center',
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
                    },
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 'bold',
                      color: 'white',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    {itunesRateLimit?.maxRequestsPerMinute || 300}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255, 255, 255, 0.9)' }}>
                    Max Requests/Minute
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={3}
                  sx={{
                    textAlign: 'center',
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 32px rgba(168, 85, 247, 0.3)',
                    },
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 'bold',
                      color: 'white',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    {itunesRateLimit?.requestsThisMinute || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255, 255, 255, 0.9)' }}>
                    Used This Minute
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={3}
                  sx={{
                    textAlign: 'center',
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
                    },
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 'bold',
                      color: 'white',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    {(itunesRateLimit?.maxRequestsPerMinute || 300) -
                      (itunesRateLimit?.requestsThisMinute || 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255, 255, 255, 0.9)' }}>
                    Remaining Quota
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={3}
                  sx={{
                    textAlign: 'center',
                    p: 3,
                    borderRadius: 3,
                    background:
                      (itunesRateLimit?.projectedMinutelyUsage || 0) >
                      (itunesRateLimit?.maxRequestsPerMinute || 0)
                        ? 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)'
                        : 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)',
                    border:
                      (itunesRateLimit?.projectedMinutelyUsage || 0) >
                      (itunesRateLimit?.maxRequestsPerMinute || 0)
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid rgba(236, 72, 153, 0.3)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow:
                        (itunesRateLimit?.projectedMinutelyUsage || 0) >
                        (itunesRateLimit?.maxRequestsPerMinute || 0)
                          ? '0 8px 32px rgba(239, 68, 68, 0.3)'
                          : '0 8px 32px rgba(236, 72, 153, 0.3)',
                    },
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 'bold',
                      color: 'white',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    {itunesRateLimit?.projectedMinutelyUsage || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255, 255, 255, 0.9)' }}>
                    Projected Usage
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 2,
                    backgroundColor: 'background.default',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="h5">{itunesRateLimit?.requestsThisHour || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Requests This Hour
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 2,
                    backgroundColor: 'background.default',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="h5">{itunesRateLimit?.requestsToday || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Requests Today
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 2,
                    backgroundColor: 'background.default',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="h5">
                    {Math.round((itunesRateLimit?.timeUntilReset || 0) / 1000)}s
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Time Until Reset
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 2,
                    backgroundColor: 'background.default',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="h5">
                    {itunesRateLimit?.circuitBreakerStatus || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Circuit Breaker
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Rate Limit Warning */}
            {(itunesRateLimit?.rateLimitReachedCount || 0) > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Rate limit reached {itunesRateLimit?.rateLimitReachedCount} times. Consider
                  implementing request throttling or increasing delays between requests.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage Trends */}
      {itunesUsage && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <FontAwesomeIcon icon={faSearch} style={{ fontSize: '20px', color: '#1976d2' }} />
              Usage Trends & Performance
            </Typography>

            {/* Peak Usage Times */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Peak Usage Times
              </Typography>
              <Grid container spacing={2}>
                {itunesUsage?.peakUsageTimes?.slice(0, 5).map((peak, index) => (
                  <Grid item key={index} xs={12} sm={6} md={2.4}>
                    <Paper
                      elevation={2}
                      sx={{
                        textAlign: 'center',
                        p: 2,
                        backgroundColor: 'primary.dark',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'primary.main',
                        opacity: 0.9,
                        transition: 'transform 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 3,
                          opacity: 1,
                        },
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold" color="primary.contrastText">
                        {peak.time}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {peak.requests} requests
                      </Typography>
                    </Paper>
                  </Grid>
                )) || (
                  <Grid item xs={12}>
                    <Paper
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        backgroundColor: 'action.hover',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        No peak usage data available
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>

            {/* Performance Trends */}
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Performance Trends (4-hour periods)
              </Typography>
              <Grid container spacing={2}>
                {itunesUsage?.performanceTrends?.map((trend, index) => (
                  <Grid item key={index} xs={12} sm={6} md={4}>
                    <Paper
                      elevation={1}
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        backgroundColor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: 2,
                        },
                      }}
                    >
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color="primary.main"
                        sx={{ mb: 1 }}
                      >
                        {trend.period}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Avg Response:
                          </Typography>
                          <Chip
                            label={`${trend.avgResponseTime}ms`}
                            size="small"
                            color={
                              trend.avgResponseTime < 500
                                ? 'success'
                                : trend.avgResponseTime < 1000
                                  ? 'warning'
                                  : 'error'
                            }
                            variant="outlined"
                          />
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Success Rate:
                          </Typography>
                          <Chip
                            label={`${trend.successRate}%`}
                            size="small"
                            color={
                              trend.successRate >= 95
                                ? 'success'
                                : trend.successRate >= 80
                                  ? 'warning'
                                  : 'error'
                            }
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                )) || (
                  <Grid item xs={12}>
                    <Paper
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        backgroundColor: 'action.hover',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        No performance trend data available
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters & Settings
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={hoursRange}
                  label="Time Range"
                  onChange={(e) => setHoursRange(Number(e.target.value))}
                >
                  <MenuItem value={1}>Last Hour</MenuItem>
                  <MenuItem value={6}>Last 6 Hours</MenuItem>
                  <MenuItem value={24}>Last 24 Hours</MenuItem>
                  <MenuItem value={72}>Last 3 Days</MenuItem>
                  <MenuItem value={168}>Last Week</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Log Level</InputLabel>
                <Select
                  value={filterLevel}
                  label="Log Level"
                  onChange={(e) => setFilterLevel(e.target.value)}
                >
                  <MenuItem value="all">All Levels</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="warn">Warning</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Log Type</InputLabel>
                <Select
                  value={filterType}
                  label="Log Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="search_songs">Song Search</MenuItem>
                  <MenuItem value="search_artists">Artist Search</MenuItem>
                  <MenuItem value="snippet_request">30s Previews</MenuItem>
                  <MenuItem value="rate_limited">Rate Limited</MenuItem>
                  <MenuItem value="circuit_breaker">Circuit Breaker</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Recent Logs Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent API Activity
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Query</TableCell>
                  <TableCell>Response</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Typography variant="caption">{formatTimestamp(log.timestamp)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FontAwesomeIcon
                          icon={getLogTypeIcon(log.logType)}
                          style={{ fontSize: '14px' }}
                        />
                        <Typography variant="caption">{log.logType.replace('_', ' ')}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.level.toUpperCase()}
                        size="small"
                        color={
                          log.level === 'error'
                            ? 'error'
                            : log.level === 'warn'
                              ? 'warning'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={log.query || ''}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {log.query || '-'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {log.responseTime ? `${log.responseTime}ms` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                        {log.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.statusCode || 'N/A'}
                        size="small"
                        color={getStatusColor(log.statusCode)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
});

export default ApiLogsMonitor;
