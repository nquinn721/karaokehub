import { CustomCard } from '@components/CustomCard';
import { SEO } from '@components/SEO';
import { faLocationDot, faMicrophone, faMusic, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Container, Grid, Typography, useTheme } from '@mui/material';
import React from 'react';

const AboutPage: React.FC = () => {
  const theme = useTheme();

  const seoConfig = {
    title: 'About KaraokeHub - Find Your Perfect Karaoke Experience',
    description:
      "Learn about KaraokeHub's mission to connect singers with the best karaoke venues, shows, and community experiences. Discover how we help you find your stage.",
    keywords: [
      'about karaoke hub',
      'karaoke community',
      'singing venues',
      'karaoke mission',
      'music platform',
    ],
    canonical: 'https://karaoke-hub.com/about',
  };

  return (
    <Box>
      <SEO {...seoConfig} />

      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
          py: 8,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center">
            <Typography variant="h2" component="h1" gutterBottom fontWeight={700}>
              About KaraokeHub
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
              Connecting singers with amazing karaoke experiences since 2024
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Mission Statement */}
        <Box sx={{ mb: 8, textAlign: 'center' }}>
          <Typography variant="h3" component="h2" gutterBottom fontWeight={600}>
            Our Mission
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ maxWidth: '800px', mx: 'auto', lineHeight: 1.6 }}
          >
            KaraokeHub exists to bring people together through the joy of singing. We believe
            everyone has a voice worth sharing, and we're here to help you find the perfect stage to
            share it on. Whether you're a seasoned performer or just starting your karaoke journey,
            we connect you with venues, songs, and communities that celebrate the magic of music.
          </Typography>
        </Box>

        {/* What We Offer */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            textAlign="center"
            fontWeight={600}
            sx={{ mb: 6 }}
          >
            What We Offer
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <CustomCard
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faLocationDot} />
                    Venue Discovery
                  </Box>
                }
                hover
                sx={{ height: '100%' }}
              >
                <Typography color="text.secondary" paragraph>
                  Find karaoke bars, pubs, and entertainment venues near you with detailed
                  information about their karaoke nights, equipment, song selection, and atmosphere.
                </Typography>
                <Typography color="text.secondary">
                  Our comprehensive database includes everything from intimate neighborhood bars to
                  large entertainment complexes, helping you find the perfect venue for your mood
                  and group size.
                </Typography>
              </CustomCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <CustomCard
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faMusic} />
                    Song Library
                  </Box>
                }
                hover
                sx={{ height: '100%' }}
              >
                <Typography color="text.secondary" paragraph>
                  Browse our extensive catalog of over 100,000 karaoke songs spanning every genre
                  and era. From classic rock anthems to modern pop hits, country favorites to R&B
                  classics.
                </Typography>
                <Typography color="text.secondary">
                  Search by artist, song title, or genre to plan your perfect karaoke setlist before
                  you even arrive at the venue.
                </Typography>
              </CustomCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <CustomCard
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faMicrophone} />
                    Show Schedules
                  </Box>
                }
                hover
                sx={{ height: '100%' }}
              >
                <Typography color="text.secondary" paragraph>
                  Stay updated with real-time karaoke show schedules, special events, themed nights,
                  and competitions happening at venues in your area.
                </Typography>
                <Typography color="text.secondary">
                  Never miss a karaoke night again with our up-to-date event calendar and
                  notification system.
                </Typography>
              </CustomCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <CustomCard
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faUsers} />
                    Community
                  </Box>
                }
                hover
                sx={{ height: '100%' }}
              >
                <Typography color="text.secondary" paragraph>
                  Connect with fellow karaoke enthusiasts, share your favorite performances, and
                  build a network of singing friends in your local area.
                </Typography>
                <Typography color="text.secondary">
                  Join a supportive community that celebrates all skill levels and musical tastes,
                  from beginners to seasoned performers.
                </Typography>
              </CustomCard>
            </Grid>
          </Grid>
        </Box>

        {/* How It Started */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            textAlign="center"
            fontWeight={600}
            sx={{ mb: 4 }}
          >
            How It Started
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: '800px', mx: 'auto', lineHeight: 1.8, fontSize: '1.1rem' }}
          >
            KaraokeHub was born from a simple frustration: finding great karaoke nights shouldn't be
            so difficult. Too often, we'd show up to venues only to discover they'd canceled
            karaoke, changed their schedule, or didn't have the songs we wanted to sing.
          </Typography>
          <br />
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: '800px', mx: 'auto', lineHeight: 1.8, fontSize: '1.1rem' }}
          >
            We realized that the karaoke community needed a centralized platform where singers could
            find reliable, up-to-date information about venues, songs, and events. What started as a
            local directory has grown into a comprehensive platform serving karaoke communities
            across the country.
          </Typography>
        </Box>

        {/* Why Karaoke Matters */}
        <Box sx={{ mb: 8, textAlign: 'center' }}>
          <Typography variant="h3" component="h2" gutterBottom fontWeight={600} sx={{ mb: 4 }}>
            Why Karaoke Matters
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ maxWidth: '800px', mx: 'auto', lineHeight: 1.6 }}
          >
            Karaoke is more than just entertainment—it's therapy, it's community building, it's
            personal expression. It's the one place where your voice matters most, where strangers
            become friends over shared songs, and where confidence grows with every performance.
          </Typography>
          <br />
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ maxWidth: '800px', mx: 'auto', lineHeight: 1.6 }}
          >
            Whether you're celebrating a birthday, bonding with coworkers, making new friends, or
            just having fun on a Friday night, karaoke creates memories and connections that last
            long after the final note fades.
          </Typography>
        </Box>

        {/* Contact/Community */}
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            background: theme.palette.background.paper,
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" component="h2" gutterBottom fontWeight={600}>
            Join Our Community
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 3, maxWidth: '600px', mx: 'auto' }}
          >
            Ready to discover your next favorite karaoke spot? Connect with thousands of singers who
            share your passion for music and performance.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Have a venue to add or feedback to share? We'd love to hear from you at
            hello@karaoke-hub.com
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default AboutPage;
