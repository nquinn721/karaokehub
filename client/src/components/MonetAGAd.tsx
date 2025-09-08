import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface MonetAGAdProps {
  zoneId: string;
  width?: number;
  height?: number;
  className?: string;
}

export const MonetAGAd: React.FC<MonetAGAdProps> = ({ 
  zoneId, 
  width = 320, 
  height = 250, 
  className 
}) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load MonetAG ad script for specific zone
    const script = document.createElement('script');
    script.src = 'https://fpyf8.com/88/tag.min.js';
    script.setAttribute('data-zone', zoneId);
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    if (adRef.current) {
      adRef.current.appendChild(script);
    }

    return () => {
      // Cleanup on unmount
      if (adRef.current && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [zoneId]);

  return (
    <Box
      ref={adRef}
      className={className}
      sx={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: 1,
        overflow: 'hidden',
        '& iframe': {
          width: '100%',
          height: '100%',
          border: 'none',
        }
      }}
    />
  );
};

// Pre-configured ad components for common placements
export const BannerAd: React.FC<{ className?: string }> = ({ className }) => (
  <MonetAGAd zoneId="169589" width={728} height={90} className={className} />
);

export const SidebarAd: React.FC<{ className?: string }> = ({ className }) => (
  <MonetAGAd zoneId="169589" width={300} height={250} className={className} />
);

export const MobileAd: React.FC<{ className?: string }> = ({ className }) => (
  <MonetAGAd zoneId="169589" width={320} height={50} className={className} />
);

export const SquareAd: React.FC<{ className?: string }> = ({ className }) => (
  <MonetAGAd zoneId="169589" width={250} height={250} className={className} />
);
