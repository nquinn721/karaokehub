import { NativeBannerAd } from '@components/AdsterraAd';
import { CustomCard } from '@components/CustomCard';
import GoogleOneTap from '@components/GoogleOneTap';
import MobileBanner from '@components/MobileBanner';
import { SEO, seoConfigs } from '@components/SEO';
import {
  faArrowUp,
  faLocationDot,
  faMicrophone,
  faMobile,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Button, Container, Grid, Typography, useTheme } from '@mui/material';
import { authStore, subscriptionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = observer(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <Box data-homepage>
      <SEO {...seoConfigs.home} />

      {/* Google One Tap for non-authenticated users */}
      {!authStore.isAuthenticated && (
        <GoogleOneTap
          onSuccess={() => {
            // User will be redirected by the One Tap component
            console.log('Google One Tap success on homepage');
          }}
          showButton={false} // Only show the prompt, no button
          context="signin"
        />
      )}

      {/* Main Hero Section - Find Karaoke Shows */}
      <Box
        sx={{
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          background:
            'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #7209b7 100%)',
          py: { xs: 8, sm: 10, md: 12 },
          position: 'relative',
          overflow: 'hidden',
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle at 30% 20%, rgba(83, 52, 131, 0.4) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(114, 9, 183, 0.3) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(45deg, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)',
            backgroundSize: '60px 60px',
            animation: 'shimmer 8s ease-in-out infinite',
            pointerEvents: 'none',
            '@keyframes shimmer': {
              '0%, 100%': { opacity: 0 },
              '50%': { opacity: 1 },
            },
          },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '4rem', md: '5rem' },
                mb: 3,
                opacity: 0.9,
                textShadow: '0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(48, 43, 99, 0.3)',
                animation: 'glow 3s ease-in-out infinite alternate',
                '@keyframes glow': {
                  '0%': {
                    textShadow: '0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(48, 43, 99, 0.3)',
                    transform: 'scale(1)',
                  },
                  '100%': {
                    textShadow: '0 0 30px rgba(0, 212, 255, 0.8), 0 0 60px rgba(48, 43, 99, 0.5)',
                    transform: 'scale(1.05)',
                  },
                },
              }}
            >
              🎤
            </Typography>

            <Typography
              variant="h1"
              component="h1"
              gutterBottom
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                fontWeight: 'bold',
                mb: { xs: 2, md: 3 },
                color: 'white',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                lineHeight: 1.1,
              }}
            >
              Find the Best Karaoke Shows Near You
            </Typography>

            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                fontWeight: 300,
                mb: { xs: 4, md: 5 },
                color: 'rgba(255, 255, 255, 0.95)',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                lineHeight: 1.4,
                maxWidth: '800px',
                mx: 'auto',
              }}
            >
              Discover Amazing Karaoke Venues, Browse Thousands of Songs & Connect with Fellow
              Performers
            </Typography>

            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/shows')}
              sx={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #090979 50%, #020024 100%)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: { xs: '1.1rem', md: '1.3rem' },
                px: { xs: 4, md: 6 },
                py: { xs: 2, md: 2.5 },
                borderRadius: 3,
                textTransform: 'none',
                boxShadow: '0 8px 32px rgba(0, 212, 255, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  transition: 'left 0.6s',
                },
                '&:hover': {
                  background: 'linear-gradient(135deg, #00B4D8 0%, #0077B6 50%, #001D3D 100%)',
                  transform: 'translateY(-3px) scale(1.02)',
                  boxShadow: '0 12px 40px rgba(0, 212, 255, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  '&::before': {
                    left: '100%',
                  },
                },
                '&:active': {
                  transform: 'translateY(-1px) scale(1.01)',
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Find Karaoke Shows Near Me
            </Button>
          </Box>
        </Container>

        {/* Animated background elements */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            pointerEvents: 'none',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background:
                'radial-gradient(circle at center, rgba(0, 212, 255, 0.8) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
              animation: 'float 25s linear infinite',
              '@keyframes float': {
                '0%': { transform: 'translateX(-60px) translateY(-60px) rotate(0deg)' },
                '100%': { transform: 'translateX(60px) translateY(60px) rotate(360deg)' },
              },
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: '-25%',
              right: '-25%',
              width: '150%',
              height: '150%',
              background:
                'radial-gradient(circle at center, rgba(48, 43, 99, 0.6) 2px, transparent 2px)',
              backgroundSize: '80px 80px',
              animation: 'floatReverse 30s linear infinite',
              '@keyframes floatReverse': {
                '0%': { transform: 'translateX(40px) translateY(40px) rotate(360deg)' },
                '100%': { transform: 'translateX(-40px) translateY(-40px) rotate(0deg)' },
              },
            },
          }}
        />
      </Box>

      {/* Banner Ad Placement */}
      {!subscriptionStore.hasAdFreeAccess && (
        <Box
          sx={{
            py: 4,
            display: 'flex',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
          }}
        >
          <MobileBanner position="between" variant="banner" />
        </Box>
      )}

      {/* Music Library Hero Section */}
      <Box
        sx={{
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          background:
            'linear-gradient(135deg, #533483 0%, #7209b7 25%, #a663cc 50%, #4c956c 75%, #2f9df5 100%)',
          py: { xs: 8, md: 10 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle at 80% 30%, rgba(47, 157, 245, 0.3) 0%, transparent 50%), radial-gradient(circle at 20% 70%, rgba(166, 99, 204, 0.4) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  fontWeight: 'bold',
                  color: 'white',
                  mb: 3,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                🎵 Massive Song Library
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  mb: 4,
                  lineHeight: 1.4,
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                }}
              >
                Access over 100,000 karaoke tracks from every genre. From classic rock anthems to
                today's hottest hits, find the perfect song for your vocal range and style.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Typography sx={{ color: 'white', fontWeight: 600 }}>Rock & Pop</Typography>
                </Box>
                <Box
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Typography sx={{ color: 'white', fontWeight: 600 }}>Country & Folk</Typography>
                </Box>
                <Box
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Typography sx={{ color: 'white', fontWeight: 600 }}>R&B & Soul</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center' }}>
                <FontAwesomeIcon
                  icon={faMicrophone}
                  style={{
                    fontSize: '8rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Community Hero Section */}
      <Box
        sx={{
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          background:
            'linear-gradient(135deg, #4c956c 0%, #2f9df5 25%, #61a5c2 50%, #a9c1a1 75%, #f4a261 100%)',
          py: { xs: 8, md: 10 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle at 25% 25%, rgba(244, 162, 97, 0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(76, 149, 108, 0.4) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center' }}>
                <FontAwesomeIcon
                  icon={faUsers}
                  style={{
                    fontSize: '8rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  fontWeight: 'bold',
                  color: 'white',
                  mb: 3,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                👥 Join the Community
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  mb: 4,
                  lineHeight: 1.4,
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                }}
              >
                Connect with fellow karaoke enthusiasts, share your performances, and discover
                singing partners. Build lasting friendships through the universal language of music.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/register')}
                sx={{
                  background: 'linear-gradient(135deg, #264653 0%, #2a9d8f 50%, #e9c46a 100%)',
                  color: 'white',
                  fontWeight: 'bold',
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1d3b47 0%, #238b7e 50%, #e76f51 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(76, 149, 108, 0.4)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Join Now - It's Free!
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Venue Discovery Hero Section */}
      <Box
        sx={{
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          background:
            'linear-gradient(135deg, #f4a261 0%, #e76f51 25%, #e9c46a 50%, #2a9d8f 75%, #264653 100%)',
          py: { xs: 8, md: 10 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle at 15% 85%, rgba(38, 70, 83, 0.3) 0%, transparent 50%), radial-gradient(circle at 85% 15%, rgba(244, 162, 97, 0.4) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  fontWeight: 'bold',
                  color: 'white',
                  mb: 3,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                📍 Discover Great Venues
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  mb: 4,
                  lineHeight: 1.4,
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                }}
              >
                From intimate piano bars to lively sports pubs, find the perfect karaoke venue for
                every mood. Read reviews, check schedules, and never miss karaoke night again.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/submit')}
                sx={{
                  background: 'linear-gradient(135deg, #264653 0%, #2a9d8f 50%, #f4a261 100%)',
                  color: 'white',
                  fontWeight: 'bold',
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1d3b47 0%, #238b7e 50%, #e76f51 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(38, 70, 83, 0.4)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Submit Your Venue
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center' }}>
                <FontAwesomeIcon
                  icon={faLocationDot}
                  style={{
                    fontSize: '8rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 8 }}>
        {/* Ad placement - only show if not ad-free */}
        {!subscriptionStore.hasAdFreeAccess && (
          <Box sx={{ mb: 6 }}>
            <MobileBanner position="between" variant="banner" />
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

        {/* Horizontal Banner Ad */}
        {!subscriptionStore.hasAdFreeAccess && (
          <Box sx={{ my: 6, display: 'flex', justifyContent: 'center' }}>
            <MobileBanner position="between" variant="banner" />
          </Box>
        )}

        {/* Native Banner - Content-style ad */}
        {!subscriptionStore.hasAdFreeAccess && (
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <NativeBannerAd />
          </Container>
        )}

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

        {/* Second Ad placement - after features */}
        {!subscriptionStore.hasAdFreeAccess && (
          <Box sx={{ my: 8, display: 'flex', justifyContent: 'center' }}>
            <MobileBanner position="between" variant="banner" />
          </Box>
        )}

        {/* Karaoke Tips Section - Great for SEO */}
        <Box sx={{ mt: 8, mb: 6 }}>
          <Typography
            variant="h3"
            component="h2"
            textAlign="center"
            gutterBottom
            sx={{ mb: 6, fontWeight: 600 }}
          >
            Karaoke Tips for Every Singer
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h5" gutterBottom fontWeight={600} color="primary">
                  🎤 For Beginners
                </Typography>
                <Typography color="text.secondary">
                  Start with songs you know well and love singing. Choose tracks in your vocal range
                  and practice at home first. Remember, confidence matters more than perfect pitch -
                  the audience wants you to succeed!
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h5" gutterBottom fontWeight={600} color="secondary">
                  🎵 Song Selection
                </Typography>
                <Typography color="text.secondary">
                  Pick crowd favorites like "Sweet Caroline," "Don't Stop Believin'," or current
                  hits everyone knows. Avoid overly complex songs with difficult key changes. Duets
                  are perfect for sharing the spotlight!
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h5" gutterBottom fontWeight={600} color="success">
                  🌟 Performance Tips
                </Typography>
                <Typography color="text.secondary">
                  Make eye contact with the audience, use the microphone properly (6 inches from
                  your mouth), and don't be afraid to move around. Engage the crowd - they're
                  rooting for you!
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Ad placement after feature cards - only show if not ad-free */}
        {!subscriptionStore.hasAdFreeAccess ? (
          <Box sx={{ mt: 6, mb: 8 }}>
            <MobileBanner position="between" variant="banner" />
          </Box>
        ) : (
          // Add spacing for premium users who don't see ads
          <Box sx={{ mb: 8 }} />
        )}
      </Container>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            zIndex: 1000,
          }}
        >
          <Button
            onClick={scrollToTop}
            sx={{
              minWidth: 56,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0F0C29 0%, #24243e 50%, #302B63 100%)',
              color: 'white',
              boxShadow: '0 4px 20px rgba(15, 12, 41, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              '&:hover': {
                background: 'linear-gradient(135deg, #302B63 0%, #0F3460 50%, #0E4B99 100%)',
                transform: 'translateY(-2px) scale(1.05)',
                boxShadow: '0 6px 25px rgba(15, 12, 41, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <FontAwesomeIcon icon={faArrowUp} />
          </Button>
        </Box>
      )}
    </Box>
  );
});

export default HomePage;
