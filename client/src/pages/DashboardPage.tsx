import { BannerAd, WideAd } from '@components/AdPlaceholder';
import { CustomCard } from '@components/CustomCard';
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
import { Box, Container, Grid, Typography } from '@mui/material';
import { authStore, subscriptionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';

const DashboardPage: React.FC = observer(() => {
  return (
    <>
      <SEO {...seoConfigs.dashboard} />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
            Welcome back, {authStore.user?.name}!
          </Typography>

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
        </Box>
      </Container>
    </>
  );
});

export default DashboardPage;
