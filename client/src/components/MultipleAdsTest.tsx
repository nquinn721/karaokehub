import { Box, Typography } from '@mui/material';
import React from 'react';
import { BannerAd, LeaderboardAd, MobileAd, SidebarAd } from './AdsterraAd';

export const MultipleAdsTest: React.FC = () => {
  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Multiple Ads Test Page
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        This page tests multiple Adsterra ads loading simultaneously to verify the fix for single-ad-per-page limitation.
      </Typography>

      {/* Top Leaderboard */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          1. Leaderboard Ad (728x90)
        </Typography>
        <LeaderboardAd debug={true} />
      </Box>

      {/* Content with Banner Ads */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            2. Banner Ad #1 (468x60)
          </Typography>
          <BannerAd debug={true} />
          
          <Typography variant="body1" sx={{ my: 2 }}>
            This is some content between ads to simulate real page layout.
          </Typography>
          
          <Typography variant="h6" gutterBottom>
            3. Banner Ad #2 (468x60)
          </Typography>
          <BannerAd debug={true} />
        </Box>
        
        {/* Sidebar Ad */}
        <Box sx={{ width: 160 }}>
          <Typography variant="h6" gutterBottom>
            4. Sidebar Ad (160x600)
          </Typography>
          <SidebarAd debug={true} />
        </Box>
      </Box>

      {/* Mobile Ad */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          5. Mobile Ad (320x50)
        </Typography>
        <MobileAd debug={true} />
      </Box>

      <Typography variant="body2" color="text.secondary">
        If the multiple ads fix is working correctly, you should see ads loading in all 5 positions above.
        Check the browser console for debugging information about ad loading.
      </Typography>
    </Box>
  );
};
