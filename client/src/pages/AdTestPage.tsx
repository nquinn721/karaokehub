import { BannerAd, MobileAd, NativeBannerAd, SidebarAd, SquareAd } from '@components/AdsterraAd';
import MobileBanner from '@components/MobileBanner';
import { Box, Button, Container, Typography } from '@mui/material';
import React, { useState } from 'react';

const AdTestPage: React.FC = () => {
  const [showDebug, setShowDebug] = useState(true);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Adsterra Ad Testing
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

        <Box>
          <Typography variant="h6" gutterBottom>
            Native Banner Ad (300x250)
          </Typography>
          <NativeBannerAd debug={showDebug} />
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Responsive Mobile Banner Component
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This component automatically shows 320x50 on mobile, native banner on tablet+
          </Typography>
          <MobileBanner position="between" variant="banner" debug={showDebug} />
        </Box>

        <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Ad Unit Information
          </Typography>
          <Typography variant="body2">Check the browser console for debug messages.</Typography>
          <Typography variant="body2">Red borders indicate debug mode is active.</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Ad Units:</strong>
          </Typography>
          <Typography variant="body2">
            • Banner (468x60): 038a9ad9f4d055803f60e71662aaf093
          </Typography>
          <Typography variant="body2">• Mobile (320x50): 27549731</Typography>
          <Typography variant="body2">
            • Sidebar (160x600): 34ab6262a83446b76aea83e4e1c1347b
          </Typography>
          <Typography variant="body2">• Native Banner: 27549712</Typography>
          <Typography variant="body2">
            • Square (250x250): 038a9ad9f4d055803f60e71662aaf093
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default AdTestPage;
