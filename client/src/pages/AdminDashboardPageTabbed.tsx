import AdminBreadcrumb from '@components/AdminBreadcrumb';
import AdminDataTables from '@components/AdminDataTables';
import DataUploadModal from '@components/DataUploadModal';
import UrlApprovalComponent from '@components/UrlApprovalComponent';
import {
  faDatabase,
  faGlobe,
  faPlus,
  faSync,
  faUpload,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, alpha, Box, Button, Paper, Tab, Tabs, Typography, useTheme } from '@mui/material';
import { adminStore, authStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ px: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminDashboardPageTabbed = observer(() => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
                icon: faUsers,
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
              background: `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
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
                  <FontAwesomeIcon icon={faUsers} size="lg" />
                </Box>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                    Admin Dashboard
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                    Manage content approval and platform data
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

            {adminStore.error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {adminStore.error}
              </Alert>
            )}

            {/* Tab Navigation */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{
                  '& .MuiTab-root': {
                    minHeight: 70,
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '1rem',
                    py: 2,
                  },
                  '& .Mui-selected': {
                    color: theme.palette.primary.main,
                  },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  },
                }}
              >
                <Tab
                  icon={<FontAwesomeIcon icon={faDatabase} />}
                  label="Data Management"
                  iconPosition="start"
                  sx={{ gap: 1 }}
                />
                <Tab
                  icon={<FontAwesomeIcon icon={faGlobe} />}
                  label="URL Approval Queue"
                  iconPosition="start"
                  sx={{ gap: 1 }}
                />
              </Tabs>
            </Box>
          </Box>

          {/* Tab Content */}
          <TabPanel value={tabValue} index={0}>
            <AdminDataTables />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <UrlApprovalComponent />
          </TabPanel>
        </Paper>

        {/* Data Upload Modal */}
        <DataUploadModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />
      </Box>
    </Box>
  );
});

export default AdminDashboardPageTabbed;
