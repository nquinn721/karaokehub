import { faAd } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Paper, Skeleton, Typography } from '@mui/material';
import React from 'react';

interface AdPlaceholderProps {
  size: 'banner' | 'square' | 'rectangle' | 'sidebar' | 'wide';
  className?: string;
}

const AD_SIZES = {
  banner: { width: '728px', height: '90px' }, // Leaderboard
  square: { width: '250px', height: '250px' }, // Medium Rectangle
  rectangle: { width: '300px', height: '250px' }, // Medium Rectangle
  sidebar: { width: '160px', height: '600px' }, // Wide Skyscraper
  wide: { width: '100%', height: '120px' }, // Full width ad
};

export const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ size, className }) => {
  const dimensions = AD_SIZES[size];

  return (
    <Box className={className} sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
      <Paper
        elevation={1}
        sx={{
          width: size === 'wide' ? '100%' : dimensions.width,
          height: dimensions.height,
          maxWidth: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          border: '1px dashed #ccc',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            opacity: 0.3,
          }}
        />

        {/* Content */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            zIndex: 1,
          }}
        >
          <FontAwesomeIcon
            icon={faAd}
            style={{ fontSize: size === 'banner' ? '24px' : '32px', color: '#999' }}
          />
          <Typography
            variant={size === 'banner' ? 'caption' : 'body2'}
            color="text.secondary"
            textAlign="center"
          >
            Advertisement
          </Typography>
          <Typography
            variant="caption"
            color="text.disabled"
            textAlign="center"
            sx={{ fontSize: size === 'banner' ? '10px' : '12px' }}
          >
            {dimensions.width} × {dimensions.height}
          </Typography>
        </Box>

        {/* Shimmer effect */}
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: 0.1,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      </Paper>
    </Box>
  );
};

// Specific ad components for common placements
export const BannerAd: React.FC<{ className?: string }> = ({ className }) => (
  <AdPlaceholder size="banner" className={className} />
);

export const SidebarAd: React.FC<{ className?: string }> = ({ className }) => (
  <AdPlaceholder size="sidebar" className={className} />
);

export const SquareAd: React.FC<{ className?: string }> = ({ className }) => (
  <AdPlaceholder size="square" className={className} />
);

export const RectangleAd: React.FC<{ className?: string }> = ({ className }) => (
  <AdPlaceholder size="rectangle" className={className} />
);

export const WideAd: React.FC<{ className?: string }> = ({ className }) => (
  <AdPlaceholder size="wide" className={className} />
);
