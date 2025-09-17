import { Box } from '@mui/material';
import { subscriptionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';

interface AdsterraAdProps {
  adKey: string;
  width: number;
  height: number;
  className?: string;
  debug?: boolean;
  showPlaceholder?: boolean;
  disabled?: boolean; // Add option to completely disable ads
}

// Base Adsterra Ad Component (internal use)
const BaseAdsterraAd: React.FC<AdsterraAdProps> = ({
  adKey,
  width,
  height,
  className,
  debug = false,
  showPlaceholder = true,
  disabled = false,
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const [isAdLoaded, setIsAdLoaded] = React.useState<boolean>(false);
  const [hasError, setHasError] = React.useState<boolean>(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!adRef.current || !mountedRef.current || disabled) return;

    if (debug) {
      console.log('Loading Adsterra ad with key:', adKey);
    }

    // Clear any existing content
    adRef.current.innerHTML = '';
    scriptLoadedRef.current = false;
    setIsAdLoaded(false);
    setHasError(false);

    // Add global error handler for advertising script errors
    const handleGlobalError = (event: ErrorEvent) => {
      if (
        event.error &&
        event.error.message &&
        (event.error.message.includes('Js is not a function') ||
          event.error.message.includes('invoke.js'))
      ) {
        if (debug) {
          console.warn('Caught advertising script error:', event.error.message);
        }
        setHasError(true);
        event.preventDefault(); // Prevent the error from propagating
        return true;
      }
      return false;
    };

    // Add CSP violation event listener for debugging
    const handleCSPViolation = (e: SecurityPolicyViolationEvent) => {
      if (debug) {
        console.warn('CSP Violation in ad:', {
          blockedURI: e.blockedURI,
          violatedDirective: e.violatedDirective,
          originalPolicy: e.originalPolicy,
        });
      }
      setHasError(true);
    };

    window.addEventListener('error', handleGlobalError);
    document.addEventListener('securitypolicyviolation', handleCSPViolation);

    // Add a small delay to ensure DOM is ready
    const loadAd = () => {
      if (!adRef.current || !mountedRef.current) return;

      try {
        // Define missing Js function if not present to prevent "Js is not a function" errors
        if (typeof (window as any).Js === 'undefined') {
          (window as any).Js = function (...args: any[]) {
            if (debug) {
              console.warn(
                'Fallback Js function called - advertising script may have failed to load properly. Args:',
                args,
              );
            }
            // Fallback function - does nothing but prevents errors
            return null;
          };
        }

        // Special handling for native banner format
        if (adKey === '54560d75c04fd0479493b4cb2cef087d') {
          // Native banner uses different loading mechanism
          const script = document.createElement('script');
          script.async = true;
          script.setAttribute('data-cfasync', 'false');
          script.src = '//pl27650211.revenuecpmgate.com/54560d75c04fd0479493b4cb2cef087d/invoke.js';

          script.onload = () => {
            if (mountedRef.current) {
              scriptLoadedRef.current = true;
              setIsAdLoaded(true);
              if (debug) {
                console.log('Native banner script loaded successfully');
              }
            }
          };

          script.onerror = () => {
            if (mountedRef.current) {
              setHasError(true);
              if (debug) {
                console.error('Failed to load native banner script');
              }
            }
          };

          // Create container div for native banner
          const containerDiv = document.createElement('div');
          containerDiv.id = 'container-54560d75c04fd0479493b4cb2cef087d';

          adRef.current.appendChild(script);
          adRef.current.appendChild(containerDiv);
        } else {
          // Standard iframe banner format with unique container approach
          const uniqueAdId = `adsterra_${adKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Create unique container div for this ad
          const adContainer = document.createElement('div');
          adContainer.id = uniqueAdId;
          adRef.current.appendChild(adContainer);

          // Set up the global atOptions right before the script loads
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.async = true;

          // Set atOptions and load the script in one go to minimize conflicts
          script.innerHTML = `
            (function() {
              // Set atOptions with small delay to ensure proper loading
              setTimeout(function() {
                window.atOptions = {
                  'key': '${adKey}',
                  'format': 'iframe',
                  'height': ${height},
                  'width': ${width},
                  'params': {}
                };
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = '//www.highperformanceformat.com/${adKey}/invoke.js';
                script.async = true;
                document.getElementById('${uniqueAdId}').appendChild(script);
              }, Math.random() * 100 + 50); // Random delay 50-150ms to prevent conflicts
            })();
          `;

          script.onload = () => {
            if (mountedRef.current) {
              scriptLoadedRef.current = true;
              setIsAdLoaded(true);
              if (debug) {
                console.log('Adsterra script loaded successfully for container:', uniqueAdId);
              }
            }
          };

          script.onerror = () => {
            if (mountedRef.current) {
              setHasError(true);
              if (debug) {
                console.error('Failed to load Adsterra script for container:', uniqueAdId);
              }
            }
          };

          // Append the wrapper script to the main ad container
          adRef.current.appendChild(script);
        }

        // Timeout to detect if ad failed to load
        setTimeout(() => {
          if (!scriptLoadedRef.current && mountedRef.current) {
            setHasError(true);
            if (debug) {
              console.warn('Ad load timeout - may be blocked by CSP or ad blocker');
            }
          }
        }, 5000); // 5 second timeout
      } catch (error) {
        if (debug) {
          console.error('Error loading ad:', error);
        }
        setHasError(true);
      }
    };

    // Small delay to ensure proper loading after navigation
    const timeoutId = setTimeout(loadAd, 100);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('error', handleGlobalError);
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
      // Cleanup on unmount
      scriptLoadedRef.current = false;
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, [adKey, width, height, debug, disabled]);

  // If ads are disabled, return an empty placeholder
  if (disabled) {
    return showPlaceholder ? (
      <Box
        className={className}
        sx={{
          width: `${width}px`,
          height: `${height}px`,
          minWidth: `${width}px`,
          minHeight: `${height}px`,
          backgroundColor: 'rgba(200, 200, 200, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: 'text.disabled',
        }}
      >
        {debug ? 'Ad Disabled' : ''}
      </Box>
    ) : null;
  }

  return (
    <Box
      ref={adRef}
      className={className}
      sx={{
        width: `${width}px`,
        height: `${height}px`,
        minWidth: `${width}px`,
        minHeight: `${height}px`,
        maxWidth: '100%', // Allow responsive shrinking
        maxHeight: `${height}px`,
        display: 'block',
        backgroundColor:
          showPlaceholder && !isAdLoaded && !hasError
            ? 'rgba(200, 200, 200, 0.1)'
            : debug
              ? hasError
                ? 'rgba(255, 0, 0, 0.1)'
                : isAdLoaded
                  ? 'rgba(0, 255, 0, 0.1)'
                  : 'rgba(0, 150, 255, 0.1)'
              : 'transparent',
        border:
          showPlaceholder && !isAdLoaded && !hasError
            ? '1px solid rgba(200, 200, 200, 0.3)'
            : debug
              ? '1px dashed #0096ff'
              : 'none',
        borderRadius: 1,
        overflow: 'hidden',
        position: 'relative',
        margin: 0,
        padding: 0,
        flexShrink: 0, // Prevent the ad from shrinking in flex containers
        // Ensure content fits within bounds
        '& *': {
          maxWidth: '100%',
          maxHeight: '100%',
        },
        '& iframe': {
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        },
        // Placeholder content
        '&:empty::after':
          showPlaceholder || debug
            ? {
                content: debug
                  ? hasError
                    ? `"Ad Error (${adKey})"`
                    : isAdLoaded
                      ? `"Ad Loaded (${adKey})"`
                      : `"Loading Ad (${adKey})"`
                  : hasError
                    ? '"Advertisement"'
                    : isAdLoaded
                      ? '""'
                      : '"Advertisement"',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: debug
                  ? hasError
                    ? '#ff0000'
                    : isAdLoaded
                      ? '#00ff00'
                      : '#0096ff'
                  : 'rgba(150, 150, 150, 0.7)',
                fontSize: debug ? '12px' : '14px',
                textAlign: 'center',
                pointerEvents: 'none',
                fontFamily: 'Arial, sans-serif',
                letterSpacing: '0.5px',
              }
            : {},
      }}
    />
  );
};

// Subscription-aware wrapper for AdsterraAd
export const AdsterraAd: React.FC<AdsterraAdProps> = observer((props) => {
  // Don't show ads if user has ad-free access
  if (subscriptionStore.hasAdFreeAccess) {
    if (props.debug) {
      console.log('AdsterraAd: Hiding ad - user has ad-free access');
    }
    return null;
  }

  // Automatically disable ads in development if they cause script errors
  const isDevelopment = import.meta.env.DEV;
  const shouldDisableInDev = isDevelopment && import.meta.env.VITE_DISABLE_ADS === 'true';

  return <BaseAdsterraAd {...props} disabled={props.disabled || shouldDisableInDev} />;
});

// Banner 468x60 - Small horizontal ad for content sections
export const BannerAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = import.meta.env.DEV }) => {
    // Don't show anything if user has ad-free access
    if (subscriptionStore.hasAdFreeAccess) {
      return null;
    }

    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          minHeight: '60px',
          my: 1,
        }}
      >
        <AdsterraAd
          adKey="038a9ad9f4d055803f60e71662aaf093"
          width={468}
          height={60}
          debug={debug}
          showPlaceholder={true}
        />
      </Box>
    );
  },
);

// Banner 320x50 - Mobile banner format
export const MobileAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = import.meta.env.DEV }) => {
    // Don't show anything if user has ad-free access
    if (subscriptionStore.hasAdFreeAccess) {
      return null;
    }

    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          minHeight: '50px',
          my: 1,
        }}
      >
        <AdsterraAd
          adKey="b549f615190383a65d0304eb918564ae"
          width={320}
          height={50}
          debug={debug}
          showPlaceholder={true}
        />
      </Box>
    );
  },
);

// Banner 728x90 - Leaderboard format for headers and prominent placements
export const LeaderboardAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = import.meta.env.DEV }) => {
    // Don't show anything if user has ad-free access
    if (subscriptionStore.hasAdFreeAccess) {
      return null;
    }

    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          minHeight: '90px',
          my: 2,
        }}
      >
        <AdsterraAd
          adKey="536884b13bc4f27d5af920ce7cd25cb4"
          width={728}
          height={90}
          debug={debug}
          showPlaceholder={true}
        />
      </Box>
    );
  },
);

// Banner 160x600 - Skyscraper format for sidebars
export const SidebarAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = import.meta.env.DEV }) => {
    // Don't show anything if user has ad-free access
    if (subscriptionStore.hasAdFreeAccess) {
      return null;
    }

    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '100%', // Ensure it doesn't exceed container width
          minHeight: '600px',
          my: 2,
          overflow: 'hidden', // Prevent overflow
          boxSizing: 'border-box',
        }}
      >
        <AdsterraAd
          adKey="34ab6262a83446b76aea83e4e1c1347b"
          width={160}
          height={600}
          debug={debug}
          showPlaceholder={true}
        />
      </Box>
    );
  },
);

// Native Banner - Blends with content, responsive design
export const NativeBannerAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = import.meta.env.DEV }) => {
    // Don't show anything if user has ad-free access
    if (subscriptionStore.hasAdFreeAccess) {
      return null;
    }

    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: '100%', // Ensure it doesn't exceed container width
          minHeight: '250px',
          my: 2,
          overflow: 'hidden', // Prevent overflow
          boxSizing: 'border-box',
        }}
      >
        <AdsterraAd
          adKey="54560d75c04fd0479493b4cb2cef087d"
          width={300}
          height={250}
          debug={debug}
          showPlaceholder={true}
        />
      </Box>
    );
  },
);

// Square Ad - For smaller sidebar placements (300x250 format)
export const SquareAd: React.FC<{ className?: string; debug?: boolean }> = observer(
  ({ className, debug = import.meta.env.DEV }) => {
    // Don't show anything if user has ad-free access
    if (subscriptionStore.hasAdFreeAccess) {
      return null;
    }

    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          minHeight: '250px',
          my: 1.5,
        }}
      >
        <AdsterraAd
          adKey="54560d75c04fd0479493b4cb2cef087d" // Using native banner for square replacement
          width={300}
          height={250}
          debug={debug}
          showPlaceholder={true}
        />
      </Box>
    );
  },
);
