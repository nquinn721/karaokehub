import AdminBreadcrumb from '@components/AdminBreadcrumb';
import AdminDataTables from '@components/AdminDataTables';
import DataUploadModal from '@components/DataUploadModal';
import { faPlus, faSync, faUpload, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  alpha,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import { adminStore, authStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import UrlApprovalComponent from '../components/UrlApprovalComponent';

const AdminDashboardPage = observer(() => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

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
      <Box
        sx={{
          minHeight: '100vh',
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.primary.main, 0.1)} 0%, 
            ${alpha(theme.palette.secondary.main, 0.05)} 50%, 
            ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

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
      <Container maxWidth="xl" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
        {/* Breadcrumbs */}
        <AdminBreadcrumb
          items={[
            {
              label: 'Admin',
              icon: faUsers,
              isActive: true,
            },
          ]}
        />

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
            p: 4,
            mb: 4,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            },
          }}
        >
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
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
                <FontAwesomeIcon icon={faUsers} size="lg" />
              </Box>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                  Admin Dashboard
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                  Manage users, venues, shows and parse new content
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<FontAwesomeIcon icon={faSync} />}
                onClick={() => adminStore.fetchStatistics()}
                disabled={adminStore.isLoading}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                }}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                startIcon={<FontAwesomeIcon icon={faUpload} />}
                onClick={() => setUploadModalOpen(true)}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                }}
              >
                Upload Data
              </Button>
              <Button
                variant="contained"
                startIcon={<FontAwesomeIcon icon={faPlus} />}
                onClick={() => navigate('/admin/parser')}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                  },
                }}
              >
                Use Parser
              </Button>
            </Box>
          </Box>

          {/* Quick Stats Banner */}
          {adminStore.statistics && (
            <Box
              sx={{
                display: 'flex',
                gap: 3,
                mt: 3,
                pt: 3,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: theme.palette.primary.main }}
                >
                  {adminStore.statistics.totalUsers?.toLocaleString() || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Users
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: theme.palette.success.main }}
                >
                  {adminStore.statistics.totalVenues?.toLocaleString() || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Venues
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: theme.palette.warning.main }}
                >
                  {adminStore.statistics.totalShows?.toLocaleString() || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Shows
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                  {adminStore.statistics.totalDJs?.toLocaleString() || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  DJs
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                  {adminStore.statistics.totalFeedback?.toLocaleString() || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Feedback
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>

        {adminStore.error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {adminStore.error}
          </Alert>
        )}

        {/* Main Content - URL Approval Queue as Centerpiece */}
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
            overflow: 'hidden',
            position: 'relative',
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
          <UrlApprovalComponent />
        </Paper>

        {/* Data Management Tables */}
        <Paper
          elevation={0}
          sx={{
            background: `linear-gradient(135deg, 
              ${alpha(theme.palette.background.paper, 0.95)} 0%, 
              ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
            },
          }}
        >
          <AdminDataTables />
        </Paper>

        {/* Data Upload Modal */}
        <DataUploadModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />
      </Container>
    </Box>
  );
});

export default AdminDashboardPage;
