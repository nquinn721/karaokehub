import { Box } from '@mui/material';
import React from 'react';

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
  // DISABLED: MonetAG causes pop-under ads and click redirects
  // This creates a poor user experience for users

  return (
    <Box
      className={className}
      sx={{
        width,
        height,
        minWidth: width,
        minHeight: height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: 1,
        color: 'rgba(0, 0, 0, 0.5)',
        fontSize: '14px',
        textAlign: 'center',
        p: 2,
        fontFamily: 'monospace',
      }}
    >
      {debug ? (
        <div>
          <div>⚠️ MonetAG Disabled</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            Zone: {zoneId} | Size: {width}x{height}
          </div>
          <div style={{ fontSize: '10px', marginTop: '4px', color: 'red' }}>
            Removed due to pop-under/redirect ads
          </div>
        </div>
      ) : (
        '📊 Ad Space Reserved'
      )}
    </Box>
  );
};

// Pre-configured ad components for common placements
export const BannerAd: React.FC<{ className?: string; debug?: boolean }> = ({
  className,
  debug,
}) => <MonetAGAd zoneId="169589" width={728} height={90} className={className} debug={debug} />;

export const SidebarAd: React.FC<{ className?: string; debug?: boolean }> = ({
  className,
  debug,
}) => <MonetAGAd zoneId="169589" width={300} height={250} className={className} debug={debug} />;

export const MobileAd: React.FC<{ className?: string; debug?: boolean }> = ({
  className,
  debug,
}) => <MonetAGAd zoneId="169589" width={320} height={50} className={className} debug={debug} />;

export const SquareAd: React.FC<{ className?: string; debug?: boolean }> = ({
  className,
  debug,
}) => <MonetAGAd zoneId="169589" width={250} height={250} className={className} debug={debug} />;
