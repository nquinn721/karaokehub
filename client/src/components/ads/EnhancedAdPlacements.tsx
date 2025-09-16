import { Box, Container, useMediaQuery, useTheme } from '@mui/material';
import { subscriptionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { BannerAd, LeaderboardAd, MobileAd, NativeBannerAd, SidebarAd } from '../AdsterraAd';

// Sticky header ad that follows user while scrolling
export const StickyHeaderAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = false }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    if (subscriptionStore.hasAdFreeAccess) return null;

    return (
      <Box
        className={className}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          py: 1,
          px: 2,
          boxShadow: theme.shadows[2],
        }}
      >
        <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center' }}>
          {isMobile ? <MobileAd debug={debug} /> : <LeaderboardAd debug={debug} />}
        </Container>
      </Box>
    );
  },
);

// Content separator with ads between sections
export const ContentSectionAd: React.FC<{
  variant?: 'subtle' | 'prominent' | 'native';
  spacing?: 'small' | 'medium' | 'large';
  className?: string;
  debug?: boolean;
}> = observer(({ variant = 'subtle', spacing = 'medium', className, debug = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (subscriptionStore.hasAdFreeAccess) return null;

  const getSpacing = () => {
    switch (spacing) {
      case 'small':
        return { my: 2 };
      case 'large':
        return { my: 6 };
      default:
        return { my: 4 };
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'prominent':
        return {
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: 2,
          p: 2,
          border: `1px solid rgba(255,255,255,0.1)`,
        };
      case 'native':
        return {
          // Seamless integration with content
        };
      default:
        return {
          backgroundColor: 'rgba(255,255,255,0.01)',
          borderRadius: 1,
          py: 1,
        };
    }
  };

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        ...getSpacing(),
        ...getVariantStyles(),
      }}
    >
      {variant === 'native' || !isMobile ? (
        <NativeBannerAd debug={debug} />
      ) : (
        <MobileAd debug={debug} />
      )}
    </Box>
  );
});

// Sidebar ad container with multiple ad slots
export const SidebarAdContainer: React.FC<{
  slots?: 1 | 2 | 3;
  spacing?: number;
  className?: string;
  debug?: boolean;
}> = observer(({ slots = 2, spacing = 3, className, debug = false }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  if (subscriptionStore.hasAdFreeAccess || !isDesktop) return null;

  const renderAdSlots = () => {
    const ads = [];
    for (let i = 0; i < slots; i++) {
      ads.push(
        <Box key={i} sx={{ mb: i < slots - 1 ? spacing : 0 }}>
          {i === 0 ? <SidebarAd debug={debug} /> : <NativeBannerAd debug={debug} />}
        </Box>,
      );
    }
    return ads;
  };

  return (
    <Box
      className={className}
      sx={{
        position: 'sticky',
        top: 20,
        maxHeight: 'calc(100vh - 40px)',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {renderAdSlots()}
    </Box>
  );
});

// Infinite scroll ad injector - injects ads every N items
export const InfiniteScrollAdInjector: React.FC<{
  itemIndex: number;
  adFrequency?: number;
  adVariant?: 'native' | 'banner' | 'auto';
  className?: string;
  debug?: boolean;
}> = observer(({ itemIndex, adFrequency = 5, adVariant = 'auto', className, debug = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (subscriptionStore.hasAdFreeAccess) return null;
  if (itemIndex === 0 || itemIndex % adFrequency !== 0) return null;

  const getAdComponent = () => {
    if (adVariant === 'auto') {
      return isMobile ? <MobileAd debug={debug} /> : <NativeBannerAd debug={debug} />;
    }
    if (adVariant === 'native') {
      return <NativeBannerAd debug={debug} />;
    }
    return <BannerAd debug={debug} />;
  };

  return (
    <Box
      className={className}
      sx={{
        my: 3,
        py: 2,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 1,
        display: 'flex',
        justifyContent: 'center',
        border: `1px solid rgba(255,255,255,0.05)`,
      }}
    >
      {getAdComponent()}
    </Box>
  );
});

// Loading screen ad - shows while content loads
export const LoadingScreenAd: React.FC<{
  isLoading: boolean;
  minDisplayTime?: number;
  className?: string;
  debug?: boolean;
}> = observer(({ isLoading, minDisplayTime = 2000, className, debug = false }) => {
  const [showAd, setShowAd] = React.useState(isLoading);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  React.useEffect(() => {
    if (isLoading) {
      setShowAd(true);
    } else {
      // Keep ad visible for minimum time even after loading completes
      const timer = setTimeout(() => setShowAd(false), minDisplayTime);
      return () => clearTimeout(timer);
    }
  }, [isLoading, minDisplayTime]);

  if (subscriptionStore.hasAdFreeAccess || !showAd) return null;

  return (
    <Box
      className={className}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          p: 3,
          maxWidth: '90vw',
          textAlign: 'center',
        }}
      >
        {isMobile ? <MobileAd debug={debug} /> : <NativeBannerAd debug={debug} />}
      </Box>
    </Box>
  );
});

// Article/content ad that appears after user scrolls through content
export const ReadProgressAd: React.FC<{
  triggerPercentage?: number;
  className?: string;
  debug?: boolean;
}> = observer(({ triggerPercentage = 50, className, debug = false }) => {
  const [showAd, setShowAd] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollPercentage =
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercentage >= triggerPercentage && !showAd) {
        setShowAd(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [triggerPercentage, showAd]);

  if (subscriptionStore.hasAdFreeAccess || !showAd) return null;

  return (
    <Box
      className={className}
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1200,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
        p: 2,
        boxShadow: theme.shadows[8],
        border: `1px solid ${theme.palette.divider}`,
        maxWidth: isMobile ? '90vw' : '350px',
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Box
          onClick={() => setShowAd(false)}
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 24,
            height: 24,
            backgroundColor: theme.palette.error.main,
            color: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            cursor: 'pointer',
            zIndex: 1,
          }}
        >
          ×
        </Box>
        <NativeBannerAd debug={debug} />
      </Box>
    </Box>
  );
});

export { BannerAd, LeaderboardAd, MobileAd, NativeBannerAd, SidebarAd } from '../AdsterraAd';
