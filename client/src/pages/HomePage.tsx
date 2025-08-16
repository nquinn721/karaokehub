import { BannerAdWithUpgrade, WideAdWithUpgrade } from '@components/AdWithUpgrade';
import { CustomCard } from '@components/CustomCard';
import { MapComponent } from '@components/MapComponent';
import { SEO, seoConfigs } from '@components/SEO';
import { faLocationDot, faMicrophone, faMobile, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Container, Grid, Typography, useTheme } from '@mui/material';
import { subscriptionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';

const HomePage: React.FC = observer(() => {
  const theme = useTheme();

  return (
    <Box data-homepage>
      <SEO {...seoConfigs.home} />

      {/* Hero Section with full-width purple gradient background */}
      <Box
        sx={{
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          background:
            theme.palette.mode === 'light'
              ? 'linear-gradient(90deg, #6B46C1 0%, #7C3AED 25%, #8B5CF6 50%, #A855F7 75%, #C084FC 100%)'
              : 'linear-gradient(90deg, #4C1D95 0%, #5B21B6 25%, #6B46C1 50%, #7C3AED 75%, #8B5CF6 100%)',
          py: { xs: 6, sm: 7, md: 8 }, // Responsive vertical padding
          mb: 0,
          mt: { xs: 0, md: 0 }, // No top margin adjustment needed now
          position: 'relative',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h1"
              component="h1"
              gutterBottom
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' }, // Better mobile scaling
                fontWeight: 'bold',
                mb: { xs: 1.5, md: 2 }, // Less margin on mobile
                color: 'white',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                lineHeight: { xs: 1.2, md: 1.1 }, // Better line height on mobile
              }}
            >
              Find the Best Karaoke Bars & Venues Near You
            </Typography>

            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' }, // Better mobile scaling
                fontWeight: 300,
                mb: { xs: 2, md: 3 }, // Less margin on mobile
                color: 'rgba(255, 255, 255, 0.95)',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                lineHeight: 1.4,
              }}
            >
              Discover Amazing Singing Spots, Browse Thousands of Karaoke Songs & Connect with
              Fellow Performers
            </Typography>

            <Typography
              variant="body1"
              paragraph
              sx={{
                mb: { xs: 3, md: 4 }, // Less margin on mobile
                maxWidth: '700px',
                mx: 'auto',
                fontSize: { xs: '0.95rem', sm: '1rem', md: '1.1rem' }, // Better mobile scaling
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.9)',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                px: { xs: 2, sm: 0 }, // Add horizontal padding on mobile
              }}
            >
              Whether you're looking for lively karaoke bars, intimate singing venues, or epic
              karaoke nights, KaraokeHub helps you find the perfect spot to unleash your inner rock
              star. Browse our extensive music library featuring hits from every genre and decade,
              connect with local singers, and never miss another karaoke show in your area.
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 6 }}>
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h3"
            component="h3"
            gutterBottom
            sx={{
              textAlign: 'center',
              mb: 4,
              color: theme.palette.text.primary,
              fontSize: { xs: '1.75rem', md: '2.125rem' },
            }}
          >
            Find Karaoke Shows Near You
          </Typography>
          <MapComponent />
        </Box>

        {/* Ad placement after map - only show if not ad-free */}
        {!subscriptionStore.hasAdFreeAccess && (
          <Box sx={{ mb: 6 }}>
            <BannerAdWithUpgrade />
          </Box>
        )}

        {/* How KaraokeHub Works - Inspired by SingSpot's 3-step process */}
        <Box
          sx={{
            py: 6,
            backgroundColor:
              theme.palette.mode === 'dark' ? 'grey.900' : theme.palette.surface.light,
            borderRadius: 4,
            mb: 8,
          }}
        >
          <Box sx={{ px: 3 }}>
            <Typography
              variant="h3"
              component="h2"
              textAlign="center"
              gutterBottom
              sx={{
                mb: 6,
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
              How to Find Your Perfect Karaoke Experience
            </Typography>

            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Box textAlign="center">
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      backgroundColor: theme.palette.primary.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faLocationDot}
                      style={{ fontSize: '2rem', color: 'white' }}
                    />
                  </Box>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    Find Local Karaoke Venues
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Discover karaoke bars, singing venues, and entertainment spots in your area
                    using our intelligent venue finder. Filter by distance, ratings, and karaoke
                    night schedules.
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box textAlign="center">
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      backgroundColor: theme.palette.secondary.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faMicrophone}
                      style={{ fontSize: '2rem', color: 'white' }}
                    />
                  </Box>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    Browse Songs & Connect
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Explore thousands of karaoke songs from every genre, read venue reviews, and
                    connect with fellow singers and performers in your area.
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box textAlign="center">
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      backgroundColor: theme.palette.success.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                    }}
                  >
                    <FontAwesomeIcon icon={faUsers} style={{ fontSize: '2rem', color: 'white' }} />
                  </Box>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    Perform & Share
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Take the stage at your chosen venue, perform your favorite songs, and share your
                    karaoke experiences with friends and the community.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>

        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid item xs={12} md={4}>
            <CustomCard
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon icon={faMicrophone} />
                  Massive Karaoke Song Library
                </Box>
              }
              hover
              sx={{ height: '100%' }}
            >
              <Typography color="text.secondary">
                Access over 100,000 karaoke tracks from every genre - classic rock hits, pop
                anthems, country favorites, R&B classics, and the latest chart-toppers. Perfect for
                every singing style and skill level.
              </Typography>
            </CustomCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <CustomCard
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon icon={faUsers} />
                  Social Karaoke Community
                </Box>
              }
              hover
              sx={{ height: '100%' }}
            >
              <Typography color="text.secondary">
                Connect with fellow singers, share your favorite performances, create karaoke
                groups, and discover singing partners. Join a vibrant community of karaoke
                enthusiasts near you.
              </Typography>
            </CustomCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <CustomCard
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon icon={faMobile} />
                  Live Venue Updates
                </Box>
              }
              hover
              sx={{ height: '100%' }}
            >
              <Typography color="text.secondary">
                Get real-time updates on karaoke show schedules, venue availability, wait times, and
                live announcements. Never miss karaoke night again with instant notifications.
              </Typography>
            </CustomCard>
          </Grid>
        </Grid>

        {/* Ad placement after feature cards - only show if not ad-free */}
        {!subscriptionStore.hasAdFreeAccess ? (
          <Box sx={{ mt: 6, mb: 8 }}>
            <WideAdWithUpgrade />
          </Box>
        ) : (
          // Add spacing for premium users who don't see ads
          <Box sx={{ mb: 8 }} />
        )}
      </Container>
    </Box>
  );
});

export default HomePage;
