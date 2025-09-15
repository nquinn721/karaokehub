import { Box, useMediaQuery, useTheme } from '@mui/material';
import { subscriptionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { BannerAd, MobileAd, NativeBannerAd, SidebarAd, SquareAd } from './AdsterraAd';

// Responsive ad component that automatically selects the best ad format based on available space
export const ResponsiveAd: React.FC<{
  placement: 'header' | 'content' | 'sidebar' | 'footer' | 'inline';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  debug?: boolean;
}> = observer(({ placement, size = 'medium', className, debug = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // Don't show ads if user has ad-free access
  if (subscriptionStore.hasAdFreeAccess) {
    if (debug) {
      console.log(`ResponsiveAd[${placement}]: Hidden due to ad-free subscription`);
    }
    return null;
  }

  const getAdComponent = () => {
    // Mobile: Always use mobile-optimized ads
    if (isMobile) {
      switch (placement) {
        case 'header':
        case 'footer':
        case 'content':
        case 'inline':
          return <MobileAd debug={debug} />;
        case 'sidebar':
          return <SquareAd debug={debug} />; // Square fits better in mobile sidebars
        default:
          return <MobileAd debug={debug} />;
      }
    }

    // Tablet: Mix of mobile and desktop formats
    if (isTablet) {
      switch (placement) {
        case 'header':
        case 'footer':
          return <BannerAd debug={debug} />;
        case 'content':
        case 'inline':
          return size === 'large' ? <NativeBannerAd debug={debug} /> : <BannerAd debug={debug} />;
        case 'sidebar':
          return <SquareAd debug={debug} />;
        default:
          return <BannerAd debug={debug} />;
      }
    }

    // Desktop: Full range of ad formats
    if (isDesktop) {
      switch (placement) {
        case 'header':
          return <BannerAd debug={debug} />;
        case 'footer':
          return <BannerAd debug={debug} />;
        case 'content':
          return size === 'large' ? <NativeBannerAd debug={debug} /> : <BannerAd debug={debug} />;
        case 'inline':
          return <NativeBannerAd debug={debug} />;
        case 'sidebar':
          return size === 'large' ? <SidebarAd debug={debug} /> : <SquareAd debug={debug} />;
        default:
          return <NativeBannerAd debug={debug} />;
      }
    }

    return <BannerAd debug={debug} />;
  };

  const getContainerStyles = () => {
    const baseStyles = {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    };

    switch (placement) {
      case 'header':
        return {
          ...baseStyles,
          position: 'sticky' as const,
          top: 0,
          zIndex: 1100,
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          py: 1,
        };
      case 'footer':
        return {
          ...baseStyles,
          position: 'sticky' as const,
          bottom: 0,
          zIndex: 1100,
          backgroundColor: theme.palette.background.paper,
          borderTop: `1px solid ${theme.palette.divider}`,
          py: 1,
          // Add margin for mobile floating buttons
          mb: isMobile ? '80px' : 0,
        };
      case 'content':
        return {
          ...baseStyles,
          my: 3,
          py: 2,
          backgroundColor: 'rgba(255,255,255,0.02)',
          borderRadius: 1,
          border: `1px solid rgba(255,255,255,0.1)`,
        };
      case 'inline':
        return {
          ...baseStyles,
          my: 2,
        };
      case 'sidebar':
        return {
          ...baseStyles,
          flexDirection: 'column' as const,
          gap: 2,
          position: 'sticky' as const,
          top: 20,
        };
      default:
        return baseStyles;
    }
  };

  return (
    <Box className={className} sx={getContainerStyles()}>
      {getAdComponent()}
    </Box>
  );
});

// Specific ad placement components for common scenarios
export const HeaderAd = observer((props: { className?: string; debug?: boolean }) => (
  <ResponsiveAd placement="header" {...props} />
));

export const FooterAd = observer((props: { className?: string; debug?: boolean }) => (
  <ResponsiveAd placement="footer" {...props} />
));

export const ContentSeparatorAd = observer(
  (props: { className?: string; debug?: boolean; size?: 'small' | 'medium' | 'large' }) => (
    <ResponsiveAd placement="content" {...props} />
  ),
);

export const InlineAd = observer((props: { className?: string; debug?: boolean }) => (
  <ResponsiveAd placement="inline" {...props} />
));

export const SidebarAdContainer = observer(
  (props: { className?: string; debug?: boolean; size?: 'small' | 'medium' | 'large' }) => (
    <ResponsiveAd placement="sidebar" {...props} />
  ),
);

// Smart ad spacing component that provides consistent spacing around ads
export const AdSpace: React.FC<{
  children: React.ReactNode;
  spacing?: 'none' | 'small' | 'medium' | 'large';
  variant?: 'bordered' | 'highlighted' | 'subtle' | 'none';
}> = observer(({ children, spacing = 'medium', variant = 'subtle' }) => {
  const theme = useTheme();

  // Don't show any spacing if user has ad-free access
  if (subscriptionStore.hasAdFreeAccess) {
    return null;
  }

  const getSpacing = () => {
    switch (spacing) {
      case 'none':
        return 0;
      case 'small':
        return 1;
      case 'medium':
        return 2;
      case 'large':
        return 4;
      default:
        return 2;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'bordered':
        return {
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          p: 2,
        };
      case 'highlighted':
        return {
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          borderRadius: 1,
          p: 2,
        };
      case 'subtle':
        return {
          backgroundColor: 'rgba(255,255,255,0.02)',
          borderRadius: 1,
          p: 1,
        };
      case 'none':
      default:
        return {};
    }
  };

  return (
    <Box
      sx={{
        my: getSpacing(),
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        ...getVariantStyles(),
      }}
    >
      {children}
    </Box>
  );
});

// Enhanced MobileBanner replacement with better responsive behavior
export const ResponsiveBanner: React.FC<{
  position?: 'top' | 'bottom' | 'between';
  variant?: 'banner' | 'native' | 'auto';
  className?: string;
  debug?: boolean;
}> = observer(({ position = 'between', variant = 'auto', className, debug = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Don't show ads if user has ad-free access
  if (subscriptionStore.hasAdFreeAccess) {
    if (debug) {
      console.log('ResponsiveBanner: Hidden due to ad-free subscription');
    }
    return null;
  }

  const getAdComponent = () => {
    if (variant === 'auto') {
      return isMobile ? <MobileAd debug={debug} /> : <NativeBannerAd debug={debug} />;
    }
    return variant === 'banner' ? <MobileAd debug={debug} /> : <NativeBannerAd debug={debug} />;
  };

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
      {getAdComponent()}
    </Box>
  );
});

function alpha(color: string, opacity: number): string {
  // Simple alpha implementation - in real code you'd use MUI's alpha
  return `${color}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

export default ResponsiveAd;
