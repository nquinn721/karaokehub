import { Box, Container, Typography } from '@mui/material';
import React from 'react';

const SettingsPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography color="text.secondary">
          Settings page content coming soon...
        </Typography>
      </Box>
    </Container>
  );
};

export default SettingsPage;
