import { Box, Container, Grid, Link, Typography } from '@mui/material';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { uiStore } from '../stores';

const FooterComponent: React.FC = () => {
  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    uiStore.openFeedbackModal();
  };

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        py: 3,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="space-between" alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h6" color="primary" gutterBottom>
              KaraokeHub
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Discover karaoke shows in your area and connect with the karaoke community.
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <Link
                component={RouterLink}
                to="/about"
                color="inherit"
                underline="hover"
                variant="body2"
              >
                About
              </Link>

              <Link
                component={RouterLink}
                to="/privacy-policy"
                color="inherit"
                underline="hover"
                variant="body2"
              >
                Privacy Policy
              </Link>

              <Link
                href="#"
                onClick={handleContactClick}
                color="inherit"
                underline="hover"
                variant="body2"
              >
                Contact Us
              </Link>

              <Link
                component={RouterLink}
                to="/feedback"
                color="inherit"
                underline="hover"
                variant="body2"
              >
                Feedback
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} KaraokeHub. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default FooterComponent;
