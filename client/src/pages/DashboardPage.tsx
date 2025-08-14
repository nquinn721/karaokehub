import { BannerAd, WideAd } from '@components/AdPlaceholder';
import { CustomCard } from '@components/CustomCard';
import { NotificationDialog, NotificationType } from '@components/NotificationDialog';
import { SEO, seoConfigs } from '@components/SEO';
import {
  faCog,
  faHeadphones,
  faMicrophone,
  faMusic,
  faTrophy,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Box, Button, Container, Grid, Typography } from '@mui/material';
import { apiStore, authStore, subscriptionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

const DashboardPage: React.FC = observer(() => {
  const [notificationDialog, setNotificationDialog] = useState<{
    open: boolean;
    type: NotificationType;
    title: string;
    message: string;
  }>({
    open: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showNotification = (type: NotificationType, title: string, message: string) => {
    setNotificationDialog({
      open: true,
      type,
      title,
      message,
    });
  };

  const handleMakeAdmin = async () => {
    try {
      const response = await apiStore.post('/auth/make-me-admin', {});
      if (response.success) {
        // Refresh the user profile to get updated isAdmin status
        await authStore.fetchProfile();
        showNotification(
          'success',
          'Admin Access Granted',
          'You are now an admin! Refresh the page to see the admin dropdown.',
        );
      }
    } catch (error) {
      console.error('Failed to promote to admin:', error);
      showNotification('error', 'Promotion Failed', 'Failed to promote to admin');
    }
  };

  return (
    <>
      <SEO {...seoConfigs.dashboard} />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
            Welcome back, {authStore.user?.name}!
          </Typography>

          {/* Temporary Admin Promotion Button - Remove in production */}
          {!authStore.isAdmin && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2">Test feature: Promote yourself to admin</Typography>
                <Button variant="contained" size="small" onClick={handleMakeAdmin}>
                  Make Me Admin
                </Button>
              </Box>
            </Alert>
          )}

          {/* Ad placement after welcome section - only show if not ad-free */}
          {!subscriptionStore.hasAdFreeAccess && (
            <Box sx={{ mb: 4 }}>
              <BannerAd />
            </Box>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={4}>
              <CustomCard
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faMusic} />
                    My Songs
                  </Box>
                }
                hover
                sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}
              >
                <Typography color="text.secondary">
                  Manage your favorite karaoke songs and create custom playlists.
                </Typography>
              </CustomCard>
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <CustomCard
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faMicrophone} />
                    Active Rooms
                  </Box>
                }
                hover
                sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}
              >
                <Typography color="text.secondary">
                  Join live karaoke sessions with friends around the world.
                </Typography>
              </CustomCard>
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <CustomCard
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faUsers} />
                    Friends
                  </Box>
                }
                hover
                sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}
              >
                <Typography color="text.secondary">
                  Connect with other karaoke enthusiasts and share performances.
                </Typography>
              </CustomCard>
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <CustomCard
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faTrophy} />
                    Achievements
                  </Box>
                }
                hover
                sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}
              >
                <Typography color="text.secondary">
                  Track your karaoke progress and unlock new achievements.
                </Typography>
              </CustomCard>
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <CustomCard
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faHeadphones} />
                    Recent Activity
                  </Box>
                }
                hover
                sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}
              >
                <Typography color="text.secondary">
                  View your recent songs, performances, and interactions.
                </Typography>
              </CustomCard>
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <CustomCard
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faCog} />
                    Quick Settings
                  </Box>
                }
                hover
                sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}
              >
                <Typography color="text.secondary">
                  Adjust your audio preferences and profile settings.
                </Typography>
              </CustomCard>
            </Grid>
          </Grid>

          {/* Ad placement at bottom - only show if not ad-free */}
          {!subscriptionStore.hasAdFreeAccess && (
            <Box sx={{ mt: 4, mb: 2 }}>
              <WideAd />
            </Box>
          )}

          {/* Notification Dialog */}
          <NotificationDialog
            open={notificationDialog.open}
            onClose={() => setNotificationDialog((prev) => ({ ...prev, open: false }))}
            type={notificationDialog.type}
            title={notificationDialog.title}
            message={notificationDialog.message}
          />
        </Box>
      </Container>
    </>
  );
});

export default DashboardPage;
