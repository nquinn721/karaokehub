import { Box } from '@mui/material';
import { subscriptionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { AdsterraAd } from '../AdsterraAd';

// Base ad wrapper that checks subscription status
const AdWrapper: React.FC<{
  children: React.ReactNode;
  className?: string;
  debug?: boolean;
}> = observer(({ children, className, debug = false }) => {
  // Don't show ads if user has ad-free access
  if (subscriptionStore.hasAdFreeAccess) {
    if (debug) {
      console.log('AdWrapper: Hiding ad - user has ad-free access');
    }
    return null;
  }

  return <Box className={className}>{children}</Box>;
});

// Mobile Ads (320x50) - For mobile devices
export const MobileAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = import.meta.env.DEV }) => (
    <AdWrapper className={className} debug={debug}>
      <AdsterraAd
        adKey="27549731" // Mobile banner 320x50
        width={320}
        height={50}
        debug={debug}
      />
    </AdWrapper>
  ),
);

// Banner Ads (468x60) - Standard banner for content sections
export const BannerAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = import.meta.env.DEV }) => (
    <AdWrapper className={className} debug={debug}>
      <AdsterraAd
        adKey="038a9ad9f4d055803f60e71662aaf093" // Standard banner 468x60
        width={468}
        height={60}
        debug={debug}
      />
    </AdWrapper>
  ),
);

// Native Banner Ads (300x250) - Better integration with content
export const NativeBannerAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = import.meta.env.DEV }) => (
    <AdWrapper className={className} debug={debug}>
      <AdsterraAd
        adKey="27549712" // Native banner 300x250
        width={300}
        height={250}
        debug={debug}
      />
    </AdWrapper>
  ),
);

// Square Ads (250x250) - For sidebars and content blocks
export const SquareAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = import.meta.env.DEV }) => (
    <AdWrapper className={className} debug={debug}>
      <AdsterraAd
        adKey="038a9ad9f4d055803f60e71662aaf093" // Square ad 250x250
        width={250}
        height={250}
        debug={debug}
      />
    </AdWrapper>
  ),
);

// Sidebar Ads (160x600) - Tall vertical ads for sidebars
export const SidebarAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = import.meta.env.DEV }) => (
    <AdWrapper className={className} debug={debug}>
      <AdsterraAd
        adKey="34ab6262a83446b76aea83e4e1c1347b" // Sidebar 160x600
        width={160}
        height={600}
        debug={debug}
      />
    </AdWrapper>
  ),
);

// Large Rectangle Ads (336x280) - For between content sections
export const LargeRectangleAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = import.meta.env.DEV }) => (
    <AdWrapper className={className} debug={debug}>
      <AdsterraAd
        adKey="27549712" // Using native banner key for large rectangle
        width={336}
        height={280}
        debug={debug}
      />
    </AdWrapper>
  ),
);

// Leaderboard Ads (728x90) - Full width banners for desktop
export const LeaderboardAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = import.meta.env.DEV }) => (
    <AdWrapper className={className} debug={debug}>
      <AdsterraAd
        adKey="038a9ad9f4d055803f60e71662aaf093" // Using banner key for leaderboard
        width={728}
        height={90}
        debug={debug}
      />
    </AdWrapper>
  ),
);

// Responsive ad component that picks the best ad based on screen size
export const ResponsiveAd: React.FC<{
  mobile?: 'mobile' | 'banner' | 'square';
  tablet?: 'banner' | 'native' | 'square' | 'large-rectangle';
  desktop?: 'banner' | 'native' | 'square' | 'large-rectangle' | 'leaderboard' | 'sidebar';
  className?: string;
  debug?: boolean;
}> = observer(
  ({
    mobile = 'mobile',
    tablet = 'native',
    desktop = 'native',
    className,
    debug = import.meta.env.DEV,
  }) => {
    // Don't show ads if user has ad-free access
    if (subscriptionStore.hasAdFreeAccess) {
      if (debug) {
        console.log('ResponsiveAd: Hiding ad - user has ad-free access');
      }
      return null;
    }

    const getAdComponent = (adType: string) => {
      switch (adType) {
        case 'mobile':
          return <MobileAd debug={debug} />;
        case 'banner':
          return <BannerAd debug={debug} />;
        case 'native':
          return <NativeBannerAd debug={debug} />;
        case 'square':
          return <SquareAd debug={debug} />;
        case 'large-rectangle':
          return <LargeRectangleAd debug={debug} />;
        case 'leaderboard':
          return <LeaderboardAd debug={debug} />;
        case 'sidebar':
          return <SidebarAd debug={debug} />;
        default:
          return <NativeBannerAd debug={debug} />;
      }
    };

    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          '& > *': {
            display: {
              xs: mobile ? 'block' : 'none',
              sm: tablet ? 'block' : 'none',
              md: desktop ? 'block' : 'none',
            },
          },
        }}
      >
        <Box sx={{ display: { xs: 'block', sm: 'none' } }}>{getAdComponent(mobile)}</Box>
        <Box sx={{ display: { xs: 'none', sm: 'block', md: 'none' } }}>
          {getAdComponent(tablet)}
        </Box>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>{getAdComponent(desktop)}</Box>
      </Box>
    );
  },
);

// Content separator with ad - for placing between content sections
export const ContentSeparatorAd: React.FC<{
  variant?: 'mobile' | 'responsive' | 'banner' | 'native';
  className?: string;
  debug?: boolean;
}> = observer(({ variant = 'responsive', className, debug = import.meta.env.DEV }) => {
  // Don't show ads if user has ad-free access
  if (subscriptionStore.hasAdFreeAccess) {
    return null;
  }

  const getAdContent = () => {
    switch (variant) {
      case 'mobile':
        return <MobileAd debug={debug} />;
      case 'banner':
        return <BannerAd debug={debug} />;
      case 'native':
        return <NativeBannerAd debug={debug} />;
      case 'responsive':
      default:
        return <ResponsiveAd mobile="mobile" tablet="native" desktop="banner" debug={debug} />;
    }
  };

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        my: 3,
        py: 2,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.02)',
      }}
    >
      {getAdContent()}
    </Box>
  );
});

// Export all ad types for easy importing
export {
  BannerAd as Banner,
  LargeRectangleAd as LargeRectangle,
  LeaderboardAd as Leaderboard,
  MobileAd as Mobile,
  NativeBannerAd as Native,
  SidebarAd as Sidebar,
  SquareAd as Square,
};
