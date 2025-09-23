import AdminBreadcrumb from '@components/AdminBreadcrumb';
import StoreManagement from '@components/StoreManagement';
import { faCoins, faUserShield } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { alpha, Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { authStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminStoreManagementPage: React.FC = observer(() => {
  const theme = useTheme();

  // Check if user is authenticated and admin
  if (!authStore.isAuthenticated || !authStore.user?.isAdmin) {
    return <Navigate to="/" replace />;
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
                label: 'Store Management',
                icon: faCoins,
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
                  <FontAwesomeIcon icon={faCoins} size="lg" />
                </Box>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                    Store Management
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                    Manage store items including avatars, microphones, and coin packages
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Store Management Component */}
        <Box sx={{ px: 3 }}>
          <StoreManagement />
        </Box>
      </Box>
    </Box>
  );
});

export default AdminStoreManagementPage;
