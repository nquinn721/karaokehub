import { CustomCard } from '@components/CustomCard';
import { MapComponent } from '@components/MapComponent';
import { faLocationDot, faMicrophone, faMobile, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Container, Grid, Typography, useTheme } from '@mui/material';
import { observer } from 'mobx-react-lite';
import React from 'react';

const HomePage: React.FC = observer(() => {
  const theme = useTheme();

  return (
    <Container maxWidth="lg">
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
