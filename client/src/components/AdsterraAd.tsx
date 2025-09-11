import { Box } from '@mui/material';
import React, { useEffect, useRef } from 'react';

interface AdsterraAdProps {
  adKey: string;
  width?: number;
  height?: number;
  className?: string;
  debug?: boolean;
}

export const AdsterraAd: React.FC<AdsterraAdProps> = ({
  adKey,
  width = 468,
  height = 60,
  className,
  debug = false,
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!adRef.current || !mountedRef.current) return;

    if (debug) {
      console.log('Loading Adsterra ad with key:', adKey);
    }

    // Clear any existing content
    adRef.current.innerHTML = '';
    scriptLoadedRef.current = false;

    // Add CSP violation event listener for debugging
    const handleCSPViolation = (e: SecurityPolicyViolationEvent) => {
      if (debug) {
        console.warn('CSP Violation in ad:', {
          blockedURI: e.blockedURI,
          violatedDirective: e.violatedDirective,
          originalPolicy: e.originalPolicy,
        });
      }
    };

    document.addEventListener('securitypolicyviolation', handleCSPViolation);

    // Add a small delay to ensure DOM is ready
    const loadAd = () => {
      if (!adRef.current || !mountedRef.current) return;

      try {
        // Set up the global atOptions for this ad
        (window as any).atOptions = {
          key: adKey,
          format: 'iframe',
          height: height,
          width: width,
          params: {},
        };

        // Create and load the Adsterra script
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = `//www.highperformanceformat.com/${adKey}/invoke.js`;
        script.async = true;

        script.onload = () => {
          if (mountedRef.current) {
            scriptLoadedRef.current = true;
            if (debug) {
              console.log('Adsterra script loaded successfully');
            }
          }
        };

        script.onerror = () => {
          if (debug) {
            console.error('Failed to load Adsterra script');
          }
        };

        // Append script to the ad container
        adRef.current.appendChild(script);
      } catch (error) {
        if (debug) {
          console.error('Error loading ad:', error);
        }
      }
    };

    // Small delay to ensure proper loading after navigation
    const timeoutId = setTimeout(loadAd, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
      // Cleanup on unmount
      scriptLoadedRef.current = false;
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, [adKey, width, height, debug]);

  return (
    <Box
      ref={adRef}
      className={className}
      sx={{
        width,
        height,
        minWidth: width,
        minHeight: height,
        display: 'block',
        backgroundColor: debug ? 'rgba(0, 150, 255, 0.1)' : 'transparent',
        border: debug ? '1px dashed #0096ff' : 'none',
        borderRadius: 1,
        overflow: 'hidden',
        position: 'relative',
        '& iframe': {
          width: '100%',
          height: '100%',
          border: 'none',
        },
        // Loading indicator
        '&:empty::after': debug
          ? {
              content: `"Loading Adsterra Ad (${adKey})"`,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#0096ff',
              fontSize: '12px',
              textAlign: 'center',
              pointerEvents: 'none',
            }
          : {},
      }}
    />
  );
};

// Pre-configured ad components for common placements
// BannerAd: 468x60 - Used between content sections, at bottom of pages
export const BannerAd: React.FC<{ className?: string; debug?: boolean }> = ({
  className,
  debug,
}) => (
  <AdsterraAd
    adKey="038a9ad9f4d055803f60e71662aaf093"
    width={468}
    height={60}
    className={className}
    debug={debug}
  />
);

// SidebarAd: 160x600 - Tall sidebar ad for music list and similar pages
export const SidebarAd: React.FC<{ className?: string; debug?: boolean }> = ({
  className,
  debug,
}) => (
  <AdsterraAd
    adKey="34ab6262a83446b76aea83e4e1c1347b"
    width={160}
    height={600}
    className={className}
    debug={debug}
  />
);

export const MobileAd: React.FC<{ className?: string; debug?: boolean }> = ({
  className,
  debug,
}) => (
  <AdsterraAd
    adKey="038a9ad9f4d055803f60e71662aaf093"
    width={320}
    height={50}
    className={className}
    debug={debug}
  />
);

export const SquareAd: React.FC<{ className?: string; debug?: boolean }> = ({
  className,
  debug,
}) => (
  <AdsterraAd
    adKey="038a9ad9f4d055803f60e71662aaf093"
    width={250}
    height={250}
    className={className}
    debug={debug}
  />
);
