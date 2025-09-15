import { Box, useMediaQuery, useTheme } from '@mui/material';
import { subscriptionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { MobileAd, NativeBannerAd } from './AdsterraAd';

interface MobileBannerProps {
  className?: string;
  debug?: boolean;
  position?: 'top' | 'bottom' | 'between'; // Where the ad should appear
  variant?: 'banner' | 'native'; // Type of ad to show
}

/**
 * Mobile-optimized banner component that shows appropriate ads based on screen size
 * - Shows 320x50 banner on mobile devices
 * - Shows native banner on larger screens for better integration
 * - Automatically hides on desktop unless forced
 * - Respects subscription status and hides ads for premium users
 */
export const MobileBanner: React.FC<MobileBannerProps> = observer(
  ({ className, debug = false, position = 'bottom', variant = 'banner' }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

    // Don't show ads if user has ad-free access
    if (subscriptionStore.hasAdFreeAccess) {
      return null;
    }

    // Don't show on desktop unless it's a native ad
    if (!isMobile && !isTablet && variant === 'banner') {
      return null;
    }

    const getPositionStyles = () => {
      switch (position) {
        case 'top':
          return {
            position: 'sticky' as const,
            top: 0,
            zIndex: 1100,
            mb: 2,
          };
        case 'bottom':
          return {
            position: 'sticky' as const,
            bottom: 0,
            zIndex: 1100,
            mt: 2,
            // Ensure it doesn't interfere with floating action buttons
            mb: isMobile ? '80px' : 2,
          };
        case 'between':
        default:
          return {
            my: 2,
          };
      }
    };

    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          backgroundColor: theme.palette.background.paper,
          borderRadius: position === 'between' ? 1 : 0,
          boxShadow: position !== 'between' ? theme.shadows[1] : 'none',
          ...getPositionStyles(),
        }}
      >
        {isMobile ? (
          // Use 320x50 banner for mobile
          <MobileAd debug={debug} />
        ) : (
          // Use native banner for tablets and forced desktop views
          <NativeBannerAd debug={debug} />
        )}
      </Box>
    );
  },
);

export default MobileBanner;
