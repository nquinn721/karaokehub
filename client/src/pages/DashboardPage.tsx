import { CustomCard } from '@components/CustomCard';
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
import { apiStore, authStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';

const DashboardPage: React.FC = observer(() => {
  const handleMakeAdmin = async () => {
    try {
      const response = await apiStore.post('/auth/make-me-admin', {});
      if (response.success) {
        // Refresh the user profile to get updated isAdmin status
        await authStore.fetchProfile();
        alert('You are now an admin! Refresh the page to see the admin dropdown.');
      }
    } catch (error) {
      console.error('Failed to promote to admin:', error);
      alert('Failed to promote to admin');
    }
  };

  return (
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
      </Box>
    </Container>
  );
});

export default DashboardPage;
