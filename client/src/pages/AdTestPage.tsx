import { BannerAd, MobileAd, NativeBannerAd, SidebarAd, SquareAd } from '@components/AdsterraAd';
import { Box, Button, Container, Typography } from '@mui/material';
import React, { useState } from 'react';

const AdTestPage: React.FC = () => {
  const [showDebug, setShowDebug] = useState(true);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Multiple Ads Test Page
      </Typography>

      <Button variant="outlined" onClick={() => setShowDebug(!showDebug)} sx={{ mb: 4 }}>
        Debug Mode: {showDebug ? 'ON' : 'OFF'}
      </Button>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Box>
          <Typography variant="h6">Banner Ad #1</Typography>
          <BannerAd debug={showDebug} />
        </Box>

        <Box>
          <Typography variant="h6">Banner Ad #2</Typography>
          <BannerAd debug={showDebug} />
        </Box>

        <Box>
          <Typography variant="h6">Mobile Ad</Typography>
          <MobileAd debug={showDebug} />
        </Box>

        <Box>
          <Typography variant="h6">Square Ad</Typography>
          <SquareAd debug={showDebug} />
        </Box>

        <Box>
          <Typography variant="h6">Native Banner Ad</Typography>
          <NativeBannerAd debug={showDebug} />
        </Box>

        <Box>
          <Typography variant="h6">Sidebar Ad</Typography>
          <SidebarAd debug={showDebug} />
        </Box>
      </Box>
    </Container>
  );
};

export default AdTestPage;
