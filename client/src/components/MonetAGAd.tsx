import { Box } from '@mui/material';
import React, { useEffect, useRef } from 'react';

interface MonetAGAdProps {
  zoneId: string;
  width?: number;
  height?: number;
  className?: string;
  debug?: boolean;
}

export const MonetAGAd: React.FC<MonetAGAdProps> = ({
  zoneId,
  width = 320,
  height = 250,
  className,
  debug = false,
}) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debug) {
      console.log('MonetAG Ad Component mounted with zone:', zoneId);
    }

    if (adRef.current) {
      // Clear any existing content
      adRef.current.innerHTML = '';
      
      // Create the ad script element directly in the container
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = `https://fpyf8.com/88/tag.min.js?z=${zoneId}`;
      
      // Alternative approach: inline script with zone configuration
      const configScript = document.createElement('script');
      configScript.type = 'text/javascript';
      configScript.innerHTML = `
        (function() {
          var script = document.createElement('script');
          script.src = 'https://fpyf8.com/88/tag.min.js';
          script.setAttribute('data-zone', '${zoneId}');
          script.async = true;
          script.setAttribute('data-cfasync', 'false');
          document.head.appendChild(script);
        })();
      `;
      
      // Try both approaches
      adRef.current.appendChild(script);
      
      if (debug) {
        console.log('Added MonetAG script to container');
        setTimeout(() => {
          console.log('Container content after 3s:', adRef.current?.innerHTML);
        }, 3000);
      }
    }

    return () => {
      // Cleanup - remove scripts when component unmounts
      if (adRef.current) {
        const scripts = adRef.current.querySelectorAll('script');
        scripts.forEach(script => script.remove());
      }
    };
  }, [zoneId, debug]);

  return (
    <Box
      ref={adRef}
      className={className}
      component="div"
      data-zone={zoneId}
      sx={{
        width,
        height,
        minWidth: width,
        minHeight: height,
        display: 'block',
        backgroundColor: debug ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.02)',
        border: debug ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: 1,
        overflow: 'hidden',
        position: 'relative',
        '& iframe': {
          width: '100%',
          height: '100%',
          border: 'none',
        },
        '& > div': {
          width: '100%',
          height: '100%',
        },
        // Loading indicator
        '&:empty::after': {
          content: debug ? `"Debug: Zone ${zoneId} - Loading..."` : '"Loading ad..."',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: debug ? 'red' : 'rgba(0, 0, 0, 0.3)',
          fontSize: '12px',
          textAlign: 'center',
          pointerEvents: 'none',
        },
      }}
    />
  );
};

// Pre-configured ad components for common placements
export const BannerAd: React.FC<{ className?: string; debug?: boolean }> = ({ className, debug }) => (
  <MonetAGAd zoneId="169589" width={728} height={90} className={className} debug={debug} />
);

export const SidebarAd: React.FC<{ className?: string; debug?: boolean }> = ({ className, debug }) => (
  <MonetAGAd zoneId="169589" width={300} height={250} className={className} debug={debug} />
);

export const MobileAd: React.FC<{ className?: string; debug?: boolean }> = ({ className, debug }) => (
  <MonetAGAd zoneId="169589" width={320} height={50} className={className} debug={debug} />
);

export const SquareAd: React.FC<{ className?: string; debug?: boolean }> = ({ className, debug }) => (
  <MonetAGAd zoneId="169589" width={250} height={250} className={className} debug={debug} />
);
