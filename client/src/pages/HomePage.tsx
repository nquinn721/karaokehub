import { BannerAdWithUpgrade, WideAdWithUpgrade } from '@components/AdWithUpgrade';
import { CustomCard } from '@components/CustomCard';
import GoogleOneTap from '@components/GoogleOneTap';
import { SEO, seoConfigs } from '@components/SEO';
import { faLocationDot, faMicrophone, faMobile, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Button, Container, Grid, Typography, useTheme } from '@mui/material';
import { authStore, subscriptionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = observer(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  // Hero content that will rotate
  const heroSections = [
    {
      title: "Find the Best Karaoke Bars & Venues Near You",
      subtitle: "Discover Amazing Singing Spots, Browse Thousands of Karaoke Songs & Connect with Fellow Performers",
      emoji: "🎤",
      buttonText: "Find Karaoke Shows Near Me",
      action: () => navigate('/shows')
    },
    {
      title: "Browse 100,000+ Karaoke Songs",
      subtitle: "From Classic Rock to Modern Pop - Find Your Perfect Song for Every Karaoke Night",
      emoji: "🎵",
      buttonText: "Explore Music Library",
      action: () => navigate('/music')
    },
    {
      title: "Connect with the Karaoke Community",
      subtitle: "Share Your Performances, Make New Friends & Discover Local Singing Talent",
      emoji: "👥",
      buttonText: "Join the Community",
      action: () => navigate('/register')
    },
    {
      title: "Submit Your Favorite Venue",
      subtitle: "Help Others Discover Great Karaoke Spots by Adding Venues & Show Schedules",
      emoji: "📍",
      buttonText: "Submit a Venue",
      action: () => navigate('/submit')
    }
  ];

  // Auto-scroll through hero sections
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSections.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [heroSections.length]);

  const currentHero = heroSections[currentHeroIndex];

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

      {/* Auto-scrolling Hero Section with full-width purple gradient background */}
      <Box
        sx={{
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          background:
            theme.palette.mode === 'light'
              ? 'linear-gradient(90deg, #6B46C1 0%, #7C3AED 25%, #8B5CF6 50%, #A855F7 75%, #C084FC 100%)'
              : 'linear-gradient(90deg, #4C1D95 0%, #5B21B6 25%, #6B46C1 50%, #7C3AED 75%, #8B5CF6 100%)',
          py: { xs: 6, sm: 7, md: 8 },
          mb: 0,
          mt: { xs: 0, md: 0 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
            {/* Emoji indicator */}
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '3rem', md: '4rem' },
                mb: 2,
                opacity: 0.9,
                animation: 'fadeInScale 0.8s ease-out',
                '@keyframes fadeInScale': {
                  '0%': { opacity: 0, transform: 'scale(0.5)' },
                  '100%': { opacity: 0.9, transform: 'scale(1)' }
                }
              }}
              key={`emoji-${currentHeroIndex}`}
            >
              {currentHero.emoji}
            </Typography>

            <Typography
              variant="h1"
              component="h1"
              gutterBottom
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
                fontWeight: 'bold',
                mb: { xs: 1.5, md: 2 },
                color: 'white',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                lineHeight: { xs: 1.2, md: 1.1 },
                opacity: 0,
                animation: 'slideInFromTop 1s ease-out 0.2s forwards',
                '@keyframes slideInFromTop': {
                  '0%': { opacity: 0, transform: 'translateY(-30px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
              key={`title-${currentHeroIndex}`}
            >
              {currentHero.title}
            </Typography>

            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
                fontWeight: 300,
                mb: { xs: 3, md: 4 },
                color: 'rgba(255, 255, 255, 0.95)',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                lineHeight: 1.4,
                opacity: 0,
                animation: 'slideInFromBottom 1s ease-out 0.4s forwards',
                '@keyframes slideInFromBottom': {
                  '0%': { opacity: 0, transform: 'translateY(30px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
              key={`subtitle-${currentHeroIndex}`}
            >
              {currentHero.subtitle}
            </Typography>

            <Box
              sx={{
                opacity: 0,
                animation: 'fadeInUp 1s ease-out 0.6s forwards',
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(20px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
              key={`button-${currentHeroIndex}`}
            >
              <Button
                variant="contained"
                size="large"
                onClick={currentHero.action}
                sx={{
                  background:
                    'linear-gradient(45deg, #FF6B6B 0%, #FF8E53 25%, #FF6B9D 50%, #C44569 75%, #F8B500 100%)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: { xs: '1rem', md: '1.2rem' },
                  px: { xs: 3, md: 4 },
                  py: { xs: 1.5, md: 2 },
                  borderRadius: 3,
                  textTransform: 'none',
                  boxShadow: '0 8px 32px rgba(255, 107, 107, 0.4)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    background:
                      'linear-gradient(45deg, #FF5252 0%, #FF7043 25%, #E91E63 50%, #AD1457 75%, #FFA000 100%)',
                    transform: 'translateY(-3px) scale(1.02)',
                    boxShadow: '0 12px 40px rgba(255, 107, 107, 0.6)',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                  },
                  '&:active': {
                    transform: 'translateY(-1px) scale(1.01)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {currentHero.buttonText}
              </Button>
            </Box>
          </Box>

          {/* Progress indicators */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 1,
              mt: 4,
              opacity: 0.7
            }}
          >
            {heroSections.map((_, index) => (
              <Box
                key={index}
                onClick={() => setCurrentHeroIndex(index)}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: index === currentHeroIndex ? 'white' : 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'white',
                    transform: 'scale(1.2)'
                  }
                }}
              />
            ))}
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
              background: 'radial-gradient(circle at center, white 1px, transparent 1px)',
              backgroundSize: '50px 50px',
              animation: 'float 20s linear infinite',
              '@keyframes float': {
                '0%': { transform: 'translateX(-50px) translateY(-50px)' },
                '100%': { transform: 'translateX(50px) translateY(50px)' }
              }
            }
          }}
        />
      </Box>

      <Container maxWidth="lg" sx={{ mt: 6 }}>
        {/* Ad placement - only show if not ad-free */}
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
                  Start with songs you know well and love singing. Choose tracks in your vocal range and practice 
                  at home first. Remember, confidence matters more than perfect pitch - the audience wants you to succeed!
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h5" gutterBottom fontWeight={600} color="secondary">
                  🎵 Song Selection
                </Typography>
                <Typography color="text.secondary">
                  Pick crowd favorites like "Sweet Caroline," "Don't Stop Believin'," or current hits everyone knows. 
                  Avoid overly complex songs with difficult key changes. Duets are perfect for sharing the spotlight!
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h5" gutterBottom fontWeight={600} color="success">
                  🌟 Performance Tips
                </Typography>
                <Typography color="text.secondary">
                  Make eye contact with the audience, use the microphone properly (6 inches from your mouth), 
                  and don't be afraid to move around. Engage the crowd - they're rooting for you!
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

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
