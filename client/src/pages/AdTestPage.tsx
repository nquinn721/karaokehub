import { BannerAd, MobileAd, SidebarAd, SquareAd } from '@components/MonetAGAd';
import { Box, Button, Container, Typography } from '@mui/material';
import React, { useState } from 'react';

const AdTestPage: React.FC = () => {
  const [showDebug, setShowDebug] = useState(true);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        MonetAG Ad Testing
      </Typography>

      <Button variant="outlined" onClick={() => setShowDebug(!showDebug)} sx={{ mb: 4 }}>
        Toggle Debug Mode: {showDebug ? 'ON' : 'OFF'}
      </Button>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Banner Ad (728x90)
          </Typography>
          <BannerAd debug={showDebug} />
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Sidebar Ad (300x250)
          </Typography>
          <SidebarAd debug={showDebug} />
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Mobile Ad (320x50)
          </Typography>
          <MobileAd debug={showDebug} />
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Square Ad (250x250)
          </Typography>
          <SquareAd debug={showDebug} />
        </Box>

        <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Debug Information
          </Typography>
          <Typography variant="body2">
            Check the browser console for MonetAG debug messages.
          </Typography>
          <Typography variant="body2">Red borders indicate debug mode is active.</Typography>
          <Typography variant="body2">Zone ID: 169589</Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default AdTestPage;
