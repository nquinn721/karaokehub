import { CustomCard } from '@components/CustomCard';
import {
  faChartLine,
  faCog,
  faDatabase,
  faGlobe,
  faUsers,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Box, Container, Grid, Typography } from '@mui/material';
import { authStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

const AdminDashboardPage: React.FC = observer(() => {
  const navigate = useNavigate();

  // Redirect non-admin users
  if (!authStore.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            <FontAwesomeIcon icon={faUserShield} style={{ marginRight: '12px' }} />
            Admin Dashboard
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Welcome to the admin panel. Here you can manage users, venues, and system settings.
          </Alert>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={4}>
            <CustomCard
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon icon={faUsers} />
                  User Management
                </Box>
              }
              hover
              sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}
            >
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Manage user accounts, roles, and permissions.
              </Typography>
              <Typography variant="body2" color="primary">
                • View all users
                <br />
                • Promote/demote admins
                <br />• Activate/deactivate accounts
              </Typography>
            </CustomCard>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <CustomCard
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon icon={faDatabase} />
                  Venue Management
                </Box>
              }
              hover
              sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}
            >
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Manage karaoke venues and DJ assignments.
              </Typography>
              <Typography variant="body2" color="primary">
                • Add/edit venues
                <br />
                • Manage DJ schedules
                <br />• Venue verification
              </Typography>
            </CustomCard>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <CustomCard
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon icon={faChartLine} />
                  Analytics
                </Box>
              }
              hover
              sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}
            >
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                View system analytics and usage statistics.
              </Typography>
              <Typography variant="body2" color="primary">
                • User activity metrics
                <br />
                • Popular venues
                <br />• Performance reports
              </Typography>
            </CustomCard>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <CustomCard
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon icon={faCog} />
                  System Settings
                </Box>
              }
              hover
              sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}
            >
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Configure system-wide settings and preferences.
              </Typography>
              <Typography variant="body2" color="primary">
                • Global configurations
                <br />
                • Feature toggles
                <br />• Maintenance mode
              </Typography>
            </CustomCard>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <CustomCard
              title="🚨 Moderation Tools"
              hover
              sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}
            >
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Content moderation and safety tools.
              </Typography>
              <Typography variant="body2" color="primary">
                • Report management
                <br />
                • Content filtering
                <br />• User safety tools
              </Typography>
            </CustomCard>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <CustomCard
              title="📊 System Health"
              hover
              sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}
            >
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Monitor system performance and health.
              </Typography>
              <Typography variant="body2" color="primary">
                • Server status
                <br />
                • Database health
                <br />• Error monitoring
              </Typography>
            </CustomCard>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <Box sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/parser')}>
              <CustomCard
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faGlobe} />
                    Karaoke Parser
                  </Box>
                }
                hover
                sx={{
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Parse websites for karaoke schedules and review AI findings.
                </Typography>
                <Typography variant="body2" color="primary">
                  • Parse karaoke websites
                  <br />
                  • AI-powered extraction
                  <br />• Review and approve data
                </Typography>
              </CustomCard>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
});

export default AdminDashboardPage;
