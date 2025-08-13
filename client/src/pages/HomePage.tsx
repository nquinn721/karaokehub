import { CustomCard } from '@components/CustomCard';
import { MapComponent } from '@components/MapComponent';
import { faLocationDot, faMicrophone, faMobile, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Button, Container, Grid, Typography, useTheme } from '@mui/material';
import { authStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = observer(() => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      {/* Hero Section - Inspired by SingSpot */}
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          background:
            theme.palette.mode === 'light'
              ? `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`
              : 'transparent',
          borderRadius: theme.palette.mode === 'light' ? 4 : 0,
          mb: theme.palette.mode === 'light' ? 4 : 0,
          mx: theme.palette.mode === 'light' ? -2 : 0,
          px: theme.palette.mode === 'light' ? 4 : 0,
        }}
      >
        <Typography
          variant="h1"
          component="h1"
          gutterBottom
          sx={{
            fontSize: { xs: '2.5rem', md: '4rem' },
            fontWeight: 'bold',
            mb: 2,
            color: theme.palette.text.primary, // Use solid color instead of gradient
          }}
        >
          Sing. Discover. Connect.
        </Typography>

        <Typography
          variant="h4"
          color="text.primary"
          gutterBottom
          sx={{
            fontWeight: 300,
            mb: 2,
          }}
        >
          Your Karaoke Spot
        </Typography>

        <Typography
          variant="h6"
          color="text.secondary"
          paragraph
          sx={{ mb: 6, maxWidth: '600px', mx: 'auto' }}
        >
          Discover amazing karaoke venues, connect with fellow singers, and make every night
          unforgettable
        </Typography>

        <Box sx={{ mb: 6 }}>
          {!authStore.isAuthenticated ? (
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/register')}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                }}
              >
                Get Started
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                }}
              >
                Sign In
              </Button>
            </Box>
          ) : (
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/dashboard')}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1.1rem',
              }}
            >
              Go to Dashboard
            </Button>
          )}
        </Box>
      </Box>

      {/* Map Section - Moved up to be the main feature */}
      <Box sx={{ mb: 8 }}>
        <Typography
          variant="h4"
          component="h2"
          gutterBottom
          sx={{
            textAlign: 'center',
            mb: 4,
            color: theme.palette.text.primary,
          }}
        >
          Find Karaoke Shows Near You
        </Typography>
        <MapComponent />
      </Box>

      {/* How KaraokeHub Works - Inspired by SingSpot's 3-step process */}
      <Box
        sx={{
          py: 6,
          backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : theme.palette.surface.light,
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
            How KaraokeHub Works
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
                  Find & Discover
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Search for karaoke venues near you with our smart location finder
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
                  Browse & Connect
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Explore venues, read reviews, and connect with fellow karaoke enthusiasts
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
                  Sing & Enjoy
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Join rooms, share performances, and create unforgettable memories
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
                Song Library
              </Box>
            }
            hover
            sx={{ height: '100%' }}
          >
            <Typography color="text.secondary">
              Access thousands of karaoke tracks from various genres and decades.
            </Typography>
          </CustomCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <CustomCard
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FontAwesomeIcon icon={faUsers} />
                Social Features
              </Box>
            }
            hover
            sx={{ height: '100%' }}
          >
            <Typography color="text.secondary">
              Connect with friends, share performances, and compete in karaoke battles.
            </Typography>
          </CustomCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <CustomCard
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FontAwesomeIcon icon={faMobile} />
                Real-time Updates
              </Box>
            }
            hover
            sx={{ height: '100%' }}
          >
            <Typography color="text.secondary">
              Get live updates on room activities and instant notifications.
            </Typography>
          </CustomCard>
        </Grid>
      </Grid>
    </Container>
  );
});

export default HomePage;
