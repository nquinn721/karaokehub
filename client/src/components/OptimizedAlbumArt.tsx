import { faMusic } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Skeleton } from '@mui/material';
import React from 'react';
import { getOptimizedAlbumArt, useProgressiveImage } from '../utils/imageOptimization';

interface OptimizedAlbumArtProps {
  albumArt?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  size?: 'thumbnail' | 'card' | 'detail';
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
  sx?: any;
}

export const OptimizedAlbumArt: React.FC<OptimizedAlbumArtProps> = ({
  albumArt,
  size = 'thumbnail',
  width = 48,
  height = 48,
  alt = 'Album artwork',
  className,
  sx = {},
}) => {
  const optimizedSrc = getOptimizedAlbumArt(albumArt, size);
  const { src: currentSrc, isLoading } = useProgressiveImage(optimizedSrc);

  // Default dimensions based on size
  const dimensions = {
    thumbnail: { width: 48, height: 48 },
    card: { width: 200, height: 200 },
    detail: { width: 400, height: 400 },
  };

  const { width: defaultWidth, height: defaultHeight } = dimensions[size];
  const finalWidth = width || defaultWidth;
  const finalHeight = height || defaultHeight;

  // If no image source available, show music icon placeholder
  if (!optimizedSrc) {
    return (
      <Box
        className={className}
        sx={{
          width: finalWidth,
          height: finalHeight,
          borderRadius: size === 'thumbnail' ? 1 : 2,
          backgroundColor: 'grey.200',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...sx,
        }}
      >
        <FontAwesomeIcon
          icon={faMusic}
          style={{
            fontSize: size === 'thumbnail' ? '16px' : '24px',
            color: '#999',
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      className={className}
      sx={{
        position: 'relative',
        width: finalWidth,
        height: finalHeight,
        borderRadius: size === 'thumbnail' ? 1 : 2,
        overflow: 'hidden',
        ...sx,
      }}
    >
      {isLoading && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            borderRadius: 'inherit',
          }}
        />
      )}

      <img
        src={currentSrc}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 'inherit',
          transition: 'opacity 0.3s ease',
          opacity: isLoading ? 0.7 : 1,
        }}
        loading="lazy" // Native lazy loading
        decoding="async" // Non-blocking decoding
        onError={(e) => {
          // Fallback to placeholder on error
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
    </Box>
  );
};

// Specialized components for common use cases
export const ThumbnailAlbumArt: React.FC<{
  albumArt?: OptimizedAlbumArtProps['albumArt'];
  alt?: string;
  sx?: any;
}> = ({ albumArt, alt, sx }) => (
  <OptimizedAlbumArt
    albumArt={albumArt}
    size="thumbnail"
    width={48}
    height={48}
    alt={alt}
    sx={sx}
  />
);

export const CardAlbumArt: React.FC<{
  albumArt?: OptimizedAlbumArtProps['albumArt'];
  alt?: string;
  sx?: any;
}> = ({ albumArt, alt, sx }) => (
  <OptimizedAlbumArt albumArt={albumArt} size="card" width={200} height={200} alt={alt} sx={sx} />
);

export const DetailAlbumArt: React.FC<{
  albumArt?: OptimizedAlbumArtProps['albumArt'];
  alt?: string;
  sx?: any;
}> = ({ albumArt, alt, sx }) => (
  <OptimizedAlbumArt albumArt={albumArt} size="detail" width={400} height={400} alt={alt} sx={sx} />
);
