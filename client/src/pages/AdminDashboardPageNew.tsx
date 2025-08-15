import AdminBreadcrumb from '@components/AdminBreadcrumb';
import {
  faDatabase,
  faMapMarkerAlt,
  faMusic,
  faPlus,
  faSync,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import { adminStore, authStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

// Simple stat card component
const StatCard = ({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: any;
  color: 'primary' | 'success' | 'warning' | 'error';
}) => {
  const theme = useTheme();

  return (
    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 600, color: `${color}.main` }}>
              {value.toLocaleString()}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: `${color}.main`,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesomeIcon icon={icon} size="lg" />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const AdminDashboardPage = observer(() => {
  const theme = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authStore.isAuthenticated || !authStore.user?.isAdmin) {
      return;
    }

    adminStore.fetchStatistics();
  }, []);

  if (!authStore.isAuthenticated || !authStore.user?.isAdmin) {
    return <Navigate to="/auth/login" replace />;
  }

  if (adminStore.isLoading && !adminStore.statistics) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
          }}
        >
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <AdminBreadcrumb />

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Admin Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FontAwesomeIcon icon={faSync} />}
              onClick={() => adminStore.fetchStatistics()}
              disabled={adminStore.isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faPlus} />}
              onClick={() => navigate('/admin/parser')}
            >
              Use Parser
            </Button>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage users, venues, shows and parse new content
        </Typography>
      </Box>

      {adminStore.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {adminStore.error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {adminStore.statistics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <StatCard
              title="Total Users"
              value={adminStore.statistics.totalUsers || 0}
              icon={faUsers}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard
              title="Total Venues"
              value={adminStore.statistics.totalVendors || 0}
              icon={faMapMarkerAlt}
              color="success"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard
              title="Total Shows"
              value={adminStore.statistics.totalShows || 0}
              icon={faMusic}
              color="warning"
            />
          </Grid>
        </Grid>
      )}

      {/* Management Tools */}
      <Paper
        elevation={0}
        sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}
      >
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Management Tools
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<FontAwesomeIcon icon={faUsers} />}
              onClick={() => navigate('/admin/users')}
              sx={{ py: 2 }}
            >
              Manage Users
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<FontAwesomeIcon icon={faMapMarkerAlt} />}
              onClick={() => navigate('/admin/venues')}
              sx={{ py: 2 }}
            >
              Manage Venues
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<FontAwesomeIcon icon={faMusic} />}
              onClick={() => navigate('/admin/shows')}
              sx={{ py: 2 }}
            >
              Manage Shows
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<FontAwesomeIcon icon={faDatabase} />}
              onClick={() => navigate('/admin/parser')}
              sx={{ py: 2 }}
            >
              Content Parser
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
});

export default AdminDashboardPage;
