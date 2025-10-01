import {
  faCheck,
  faCheckCircle,
  faClock,
  faExclamationTriangle,
  faEye,
  faRefresh,
  faRobot,
  faTimesCircle,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
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
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Tooltip as ChartTooltip,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Title,
} from 'chart.js';
import React, { useEffect, useState } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ArcElement,
  ChartTooltip,
  Legend,
  TimeScale,
);

interface DashboardSummary {
  totalCallsToday: number;
  successRateToday: number;
  activeIssues: number;
  avgResponseTimeToday: number;
}

interface DailyMetric {
  id: string;
  date: string;
  provider: string;
  endpointType: string;
  totalCalls: number;
  successCount: number;
  errorCount: number;
  rateLimitHits: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
}

interface ApiIssue {
  id: string;
  timestamp: string;
  provider: string;
  endpointType: string;
  issueType: 'error' | 'rate_limit' | 'timeout' | 'invalid_response';
  errorCode?: string;
  errorMessage?: string;
  requestDetails: any;
  responseDetails: any;
  responseTime: number;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  createdAt: string;
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

interface RecentApiCall {
  id: number;
  provider: string;
  endpointType: string;
  statusCode: number;
  responseTimeMs: number;
  success: boolean;
  rateLimited: boolean;
  errorType: string | null;
  timestamp: string;
}

const EnhancedApiMonitoring: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [itunesStats, setItunesStats] = useState<ItunesRateLimitStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentApiCall[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<ApiIssue | null>(null);
  const [resolutionDialog, setResolutionDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [daysFilter, setDaysFilter] = useState(7);

  useEffect(() => {
    loadData();
  }, [daysFilter]);

  // Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load real-time status from new endpoint
      try {
        const summaryRes = await fetch('/api/api-monitoring/realtime/status');
        const summaryData = await summaryRes.json();

        // Transform real-time data to match expected interface
        setSummary({
          totalCallsToday: summaryData.metrics.totalCallsToday || 0,
          successRateToday: summaryData.metrics.successRateToday || 100,
          activeIssues: summaryData.metrics.activeIssues || 0,
          avgResponseTimeToday: summaryData.metrics.avgResponseTime || 0,
        });

        // Update iTunes stats from real-time status
        setItunesStats({
          maxRequestsPerMinute: summaryData.rateLimiting.maxPerMinute || 300,
          minDelayBetweenRequests: 50,
          requestsThisMinute: summaryData.rateLimiting.usedThisMinute || 0,
          requestsThisHour: summaryData.usageStatistics.requestsThisHour || 0,
          requestsToday: summaryData.usageStatistics.requestsToday || 0,
          averageRequestsPerMinute: summaryData.usageStatistics.avgMinLastHour || 0,
          circuitBreakerStatus: summaryData.usageStatistics.circuitBreaker || 'closed',
          timeUntilReset: 0,
          remainingQuotaThisMinute: summaryData.rateLimiting.remaining || 300,
          projectedMinutelyUsage: 0,
          rateLimitReachedCount: summaryData.rateLimiting.rateLimitsHitToday || 0,
        });
      } catch (error) {
        console.warn('Real-time status not available, using placeholder data');
        setSummary({
          totalCallsToday: 0,
          successRateToday: 100,
          activeIssues: 0,
          avgResponseTimeToday: 0,
        });
        setItunesStats({
          maxRequestsPerMinute: 300,
          minDelayBetweenRequests: 50,
          requestsThisMinute: 0,
          requestsThisHour: 0,
          requestsToday: 0,
          averageRequestsPerMinute: 0,
          circuitBreakerStatus: 'closed',
          timeUntilReset: 0,
          remainingQuotaThisMinute: 300,
          projectedMinutelyUsage: 0,
          rateLimitReachedCount: 0,
        });
      }

      // Load metrics with fallback
      try {
        const metricsUrl = `/api/api-monitoring/metrics/daily?days=${daysFilter}&provider=itunes`;
        const metricsRes = await fetch(metricsUrl);
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      } catch (error) {
        console.warn('Metrics not available, using empty data');
        setMetrics([]);
      }

      // Load issues with fallback
      try {
        const issuesRes = await fetch('/api/api-monitoring/issues/active?limit=100');
        const issuesData = await issuesRes.json();
        setIssues(issuesData);
      } catch (error) {
        console.warn('Issues not available, using empty data');
        setIssues([]);
      }

      // Load recent API calls from new real-time endpoint
      try {
        const recentCallsRes = await fetch('/api/api-monitoring/realtime/recent-calls');
        const recentCallsData = await recentCallsRes.json();
        setRecentCalls(recentCallsData);
      } catch (error) {
        console.warn('Recent calls not available, using empty data');
        setRecentCalls([]);
      }

      // Load chart data with fallback
      loadChartData();
    } catch (error) {
      console.error('Error loading API monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      // Use real-time data to create charts instead of non-existent chart endpoints
      const [statusData, recentCallsData] = await Promise.all([
        fetch('/api/api-monitoring/realtime/status')
          .then((res) => res.json())
          .catch(() => null),
        fetch('/api/api-monitoring/realtime/recent-calls')
          .then((res) => res.json())
          .catch(() => []),
      ]);

      // Create charts from real-time data
      const charts = {
        calls: createCallsChartFromRecentData(recentCallsData),
        responseTimes: createResponseTimeChartFromRecentData(recentCallsData),
        successRate: createSuccessRateChartFromStatus(statusData),
        providers: createProviderBreakdownFromRecentData(recentCallsData),
        errorTypes: createErrorTypesChartFromRecentData(recentCallsData),
      };

      setChartData(charts);
    } catch (error) {
      console.warn('Error loading chart data, using placeholder data:', error);
      setChartData({
        calls: getPlaceholderChartData('calls'),
        responseTimes: getPlaceholderChartData('responseTimes'),
        successRate: getPlaceholderChartData('successRate'),
        providers: getPlaceholderChartData('providers'),
        errorTypes: getPlaceholderChartData('errorTypes'),
      });
    }
  };

  // Helper functions to create charts from real-time data
  const createCallsChartFromRecentData = (recentCalls: any[]) => {
    // Group calls by hour to show recent activity
    const now = new Date();
    const hoursAgo = [];
    const callCounts = [];

    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      hoursAgo.push(hour.getHours() + ':00');

      const callsInHour = recentCalls.filter((call) => {
        const callTime = new Date(call.timestamp);
        return callTime.getHours() === hour.getHours() && callTime.getDate() === hour.getDate();
      }).length;

      callCounts.push(callsInHour);
    }

    return {
      labels: hoursAgo,
      datasets: [
        {
          label: 'API Calls per Hour',
          data: callCounts,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
        },
      ],
    };
  };

  const createResponseTimeChartFromRecentData = (recentCalls: any[]) => {
    const labels = recentCalls
      .slice(0, 10)
      .reverse()
      .map((_, i) => `Call ${i + 1}`);
    const responseTimes = recentCalls
      .slice(0, 10)
      .reverse()
      .map((call) => call.responseTimeMs);

    return {
      labels,
      datasets: [
        {
          label: 'Response Time (ms)',
          data: responseTimes,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
        },
      ],
    };
  };

  const createSuccessRateChartFromStatus = (statusData: any) => {
    if (!statusData) return getPlaceholderChartData('successRate');

    const successRate = statusData.metrics?.successRateToday || 100;
    const labels = ['Today'];

    return {
      labels,
      datasets: [
        {
          label: 'Success Rate (%)',
          data: [successRate],
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
        },
      ],
    };
  };

  const createProviderBreakdownFromRecentData = (recentCalls: any[]) => {
    const providerCounts = recentCalls.reduce((acc, call) => {
      acc[call.provider] = (acc[call.provider] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: Object.keys(providerCounts),
      datasets: [
        {
          data: Object.values(providerCounts),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
          ],
        },
      ],
    };
  };

  const createErrorTypesChartFromRecentData = (recentCalls: any[]) => {
    const errorCounts = recentCalls
      .filter((call) => !call.success)
      .reduce((acc, call) => {
        const errorType = call.errorType || 'Unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {});

    if (Object.keys(errorCounts).length === 0) {
      return {
        labels: ['No Errors'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['rgba(75, 192, 192, 0.8)'],
          },
        ],
      };
    }

    return {
      labels: Object.keys(errorCounts),
      datasets: [
        {
          data: Object.values(errorCounts),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(255, 205, 86, 0.8)',
          ],
        },
      ],
    };
  };

  const getPlaceholderChartData = (type: string) => {
    const labels = [
      '6 days ago',
      '5 days ago',
      '4 days ago',
      '3 days ago',
      '2 days ago',
      'Yesterday',
      'Today',
    ];

    switch (type) {
      case 'calls':
        return {
          labels,
          datasets: [
            {
              label: 'iTunes API Calls (No data yet)',
              data: [0, 0, 0, 0, 0, 0, 0],
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
            },
          ],
        };
      case 'responseTimes':
        return {
          labels,
          datasets: [
            {
              label: 'Response Time (ms) (No data yet)',
              data: [0, 0, 0, 0, 0, 0, 0],
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
            },
          ],
        };
      case 'successRate':
        return {
          labels,
          datasets: [
            {
              label: 'Success Rate (%) (No data yet)',
              data: [100, 100, 100, 100, 100, 100, 100],
              borderColor: 'rgb(54, 162, 235)',
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
            },
          ],
        };
      case 'providers':
        return {
          labels: ['iTunes (No data yet)'],
          datasets: [
            {
              data: [1],
              backgroundColor: ['#FF6384'],
            },
          ],
        };
      case 'errorTypes':
        return {
          labels: ['No Errors Recorded'],
          datasets: [
            {
              data: [1],
              backgroundColor: ['#36A2EB'],
            },
          ],
        };
      default:
        return { labels: [], datasets: [] };
    }
  };

  const resolveIssue = async (issueId: string, notes: string) => {
    try {
      await fetch(`/api-monitoring/issues/${issueId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolvedBy: 'admin', // You might want to get this from auth context
          resolutionNotes: notes,
        }),
      });

      setResolutionDialog(false);
      setResolutionNotes('');
      setSelectedIssue(null);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error resolving issue:', error);
    }
  };

  const clearResolvedIssues = async () => {
    try {
      const res = await fetch('/api-monitoring/issues/cleanup', { method: 'DELETE' });
      const result = await res.json();
      alert(`Cleaned up ${result.deletedCount} resolved issues`);
      loadData();
    } catch (error) {
      console.error('Error cleaning up issues:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getIssueIcon = (issueType: string) => {
    switch (issueType) {
      case 'error':
        return faTimesCircle;
      case 'rate_limit':
        return faExclamationTriangle;
      case 'timeout':
        return faClock;
      default:
        return faExclamationTriangle;
    }
  };

  const getIssueColor = (issueType: string) => {
    switch (issueType) {
      case 'error':
        return 'error';
      case 'rate_limit':
        return 'warning';
      case 'timeout':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        iTunes API Monitoring Dashboard
      </Typography>

      {/* Current iTunes API Status - Prominent Section */}
      <Card sx={{ mb: 3, background: 'linear-gradient(45deg, #1e3c72 30%, #2a5298 90%)' }}>
        <CardContent>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ color: 'white', display: 'flex', alignItems: 'center' }}
          >
            <FontAwesomeIcon icon={faRobot} style={{ marginRight: 12 }} />
            Live iTunes API Status
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Rate Limiting
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Max/Minute
                      </Typography>
                      <Typography variant="h6">
                        {itunesStats?.maxRequestsPerMinute || 300}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Used This Minute
                      </Typography>
                      <Typography
                        variant="h6"
                        color={
                          (itunesStats?.requestsThisMinute || 0) > 240
                            ? 'error.main'
                            : (itunesStats?.requestsThisMinute || 0) > 150
                              ? 'warning.main'
                              : 'success.main'
                        }
                      >
                        {itunesStats?.requestsThisMinute || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Remaining
                      </Typography>
                      <Typography
                        variant="h6"
                        color={
                          (itunesStats?.remainingQuotaThisMinute || 300) < 50
                            ? 'error.main'
                            : (itunesStats?.remainingQuotaThisMinute || 300) < 100
                              ? 'warning.main'
                              : 'success.main'
                        }
                      >
                        {itunesStats?.remainingQuotaThisMinute || 300}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Rate Limits Hit Today
                      </Typography>
                      <Typography
                        variant="h6"
                        color={
                          (itunesStats?.rateLimitReachedCount || 0) > 0
                            ? 'error.main'
                            : 'success.main'
                        }
                      >
                        {itunesStats?.rateLimitReachedCount || 0}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Usage Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Requests This Hour
                      </Typography>
                      <Typography variant="h6">{itunesStats?.requestsThisHour || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Requests Today
                      </Typography>
                      <Typography variant="h6">{itunesStats?.requestsToday || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Avg/Min (Last Hour)
                      </Typography>
                      <Typography variant="h6">
                        {itunesStats?.averageRequestsPerMinute || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Circuit Breaker
                      </Typography>
                      <Chip
                        label={itunesStats?.circuitBreakerStatus || 'closed'}
                        color={
                          (itunesStats?.circuitBreakerStatus || 'closed') === 'closed'
                            ? 'success'
                            : 'error'
                        }
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Calls Today
                </Typography>
                <Typography variant="h5">{summary.totalCallsToday}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Success Rate Today
                </Typography>
                <Typography
                  variant="h5"
                  color={summary.successRateToday > 95 ? 'success.main' : 'warning.main'}
                >
                  {Number(summary.successRateToday || 0).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Issues
                </Typography>
                <Typography
                  variant="h5"
                  color={summary.activeIssues > 0 ? 'error.main' : 'success.main'}
                >
                  {summary.activeIssues}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Avg Response Time
                </Typography>
                <Typography variant="h5">{summary.avgResponseTimeToday}ms</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={daysFilter}
              onChange={(e) => setDaysFilter(Number(e.target.value))}
              label="Time Range"
            >
              <MenuItem value={1}>Last 24 hours</MenuItem>
              <MenuItem value={7}>Last 7 days</MenuItem>
              <MenuItem value={30}>Last 30 days</MenuItem>
              <MenuItem value={90}>Last 90 days</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            variant="outlined"
            startIcon={<FontAwesomeIcon icon={faRefresh} />}
            onClick={loadData}
            fullWidth
          >
            Refresh Data
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<FontAwesomeIcon icon={faTrash} />}
            onClick={clearResolvedIssues}
            fullWidth
          >
            Clear Resolved
          </Button>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Charts & Analytics" />
        <Tab label="Recent Calls" />
        <Tab label="Active Issues" />
        <Tab label="Metrics Table" />
      </Tabs>

      {/* Charts Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Info Message for No Data */}
          {summary?.totalCallsToday === 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                No API Data Yet
              </Typography>
              <Typography>
                The charts below will populate automatically as iTunes API calls are made. To
                generate data, use the music search feature on your website. The monitoring system
                will capture all iTunes API calls, response times, and any errors.
              </Typography>
            </Alert>
          )}

          {chartData && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      API Calls Over Time
                    </Typography>
                    <Box sx={{ height: 300, width: '100%' }}>
                      <Line
                        data={chartData.calls}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                            },
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Response Times
                    </Typography>
                    <Box sx={{ height: 300, width: '100%' }}>
                      <Line
                        data={chartData.responseTimes}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                            },
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Success Rate
                    </Typography>
                    <Box sx={{ height: 300, width: '100%' }}>
                      <Line
                        data={chartData.successRate}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 100,
                            },
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Provider Breakdown
                    </Typography>
                    <Box sx={{ height: 300, width: '100%' }}>
                      <Pie
                        data={chartData.providers}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Error Types Distribution
                    </Typography>
                    <Box sx={{ height: 250, width: '100%' }}>
                      <Bar
                        data={chartData.errorTypes}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                            },
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* Recent Calls Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent API Calls ({recentCalls.length})
            </Typography>
            {recentCalls.length === 0 ? (
              <Alert severity="info">
                <FontAwesomeIcon icon={faClock} /> No recent API calls available.
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Provider</TableCell>
                      <TableCell>Endpoint</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Response Time</TableCell>
                      <TableCell>Success</TableCell>
                      <TableCell>Rate Limited</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentCalls.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell>{new Date(call.timestamp).toLocaleTimeString()}</TableCell>
                        <TableCell>
                          <Chip
                            label={call.provider.toUpperCase()}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{call.endpointType}</TableCell>
                        <TableCell>
                          <Chip
                            label={call.statusCode}
                            size="small"
                            color={call.statusCode === 200 ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell>{call.responseTimeMs}ms</TableCell>
                        <TableCell>
                          {call.success ? (
                            <FontAwesomeIcon icon={faCheckCircle} style={{ color: 'green' }} />
                          ) : (
                            <FontAwesomeIcon icon={faTimesCircle} style={{ color: 'red' }} />
                          )}
                        </TableCell>
                        <TableCell>
                          {call.rateLimited ? (
                            <FontAwesomeIcon
                              icon={faExclamationTriangle}
                              style={{ color: 'orange' }}
                            />
                          ) : (
                            <FontAwesomeIcon icon={faCheck} style={{ color: 'green' }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Issues Tab */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Active Issues ({issues.length})
            </Typography>
            {issues.length === 0 ? (
              <Alert severity="success">
                <FontAwesomeIcon icon={faCheckCircle} /> No active issues! All systems running
                smoothly.
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Provider</TableCell>
                      <TableCell>Endpoint</TableCell>
                      <TableCell>Error</TableCell>
                      <TableCell>Response Time</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {issues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>{formatTimestamp(issue.timestamp)}</TableCell>
                        <TableCell>
                          <Chip
                            icon={<FontAwesomeIcon icon={getIssueIcon(issue.issueType)} />}
                            label={issue.issueType.replace('_', ' ').toUpperCase()}
                            color={getIssueColor(issue.issueType) as any}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{issue.provider}</TableCell>
                        <TableCell>{issue.endpointType}</TableCell>
                        <TableCell>
                          <Box>
                            {issue.errorCode && (
                              <Typography variant="caption" color="error">
                                {issue.errorCode}
                              </Typography>
                            )}
                            {issue.errorMessage && (
                              <Typography
                                variant="body2"
                                sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}
                              >
                                {issue.errorMessage}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{issue.responseTime}ms</TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => setSelectedIssue(issue)}>
                              <FontAwesomeIcon icon={faEye} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Mark Resolved">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => {
                                setSelectedIssue(issue);
                                setResolutionDialog(true);
                              }}
                            >
                              <FontAwesomeIcon icon={faCheck} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metrics Table Tab */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Daily Metrics
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell>Endpoint</TableCell>
                    <TableCell>Total Calls</TableCell>
                    <TableCell>Success Rate</TableCell>
                    <TableCell>Rate Limits</TableCell>
                    <TableCell>Avg Response Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell>{metric.date}</TableCell>
                      <TableCell>{metric.provider}</TableCell>
                      <TableCell>{metric.endpointType}</TableCell>
                      <TableCell>{metric.totalCalls}</TableCell>
                      <TableCell>
                        <Typography
                          color={
                            metric.totalCalls > 0 &&
                            (metric.successCount / metric.totalCalls) * 100 > 95
                              ? 'success.main'
                              : 'warning.main'
                          }
                        >
                          {Number(metric.totalCalls) > 0
                            ? (
                                (Number(metric.successCount) / Number(metric.totalCalls)) *
                                100
                              ).toFixed(1)
                            : 0}
                          %
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {metric.rateLimitHits > 0 ? (
                          <Chip label={metric.rateLimitHits} color="warning" size="small" />
                        ) : (
                          <Chip label="0" color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{Number(metric.avgResponseTime || 0).toFixed(0)}ms</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Issue Details Dialog */}
      <Dialog
        open={selectedIssue !== null && !resolutionDialog}
        onClose={() => setSelectedIssue(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedIssue && (
          <>
            <DialogTitle>
              Issue Details - {selectedIssue.issueType.replace('_', ' ').toUpperCase()}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Timestamp:</Typography>
                  <Typography variant="body2">
                    {formatTimestamp(selectedIssue.timestamp)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Provider:</Typography>
                  <Typography variant="body2">{selectedIssue.provider}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Endpoint Type:</Typography>
                  <Typography variant="body2">{selectedIssue.endpointType}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Response Time:</Typography>
                  <Typography variant="body2">{selectedIssue.responseTime}ms</Typography>
                </Grid>
                {selectedIssue.errorCode && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Error Code:</Typography>
                    <Typography variant="body2" color="error">
                      {selectedIssue.errorCode}
                    </Typography>
                  </Grid>
                )}
                {selectedIssue.errorMessage && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Error Message:</Typography>
                    <Typography variant="body2" color="error">
                      {selectedIssue.errorMessage}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Request Details:</Typography>
                  <Paper sx={{ p: 1, bgcolor: 'grey.100', maxHeight: 200, overflow: 'auto' }}>
                    <pre style={{ margin: 0, fontSize: '0.75rem' }}>
                      {JSON.stringify(selectedIssue.requestDetails, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Response Details:</Typography>
                  <Paper sx={{ p: 1, bgcolor: 'grey.100', maxHeight: 200, overflow: 'auto' }}>
                    <pre style={{ margin: 0, fontSize: '0.75rem' }}>
                      {JSON.stringify(selectedIssue.responseDetails, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedIssue(null)}>Close</Button>
              <Button variant="contained" color="success" onClick={() => setResolutionDialog(true)}>
                Mark Resolved
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Resolution Dialog */}
      <Dialog
        open={resolutionDialog}
        onClose={() => setResolutionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Resolve Issue</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Resolution Notes"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Describe how this issue was resolved..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolutionDialog(false)}>Cancel</Button>
          <Button
            onClick={() => selectedIssue && resolveIssue(selectedIssue.id, resolutionNotes)}
            variant="contained"
            color="success"
          >
            Mark Resolved
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedApiMonitoring;
