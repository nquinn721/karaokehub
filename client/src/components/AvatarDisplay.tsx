import { Avatar } from '@mui/material';
import React from 'react';

interface AvatarDisplayProps {
  size?: number;
  configuration?: {
    microphone?: string;
    shirt?: string;
    pants?: string;
    shoes?: string;
    hair?: string;
    accessories?: string[];
  };
  fallbackSrc?: string;
  alt?: string;
  sx?: any;
}

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  size = 40,
  configuration: _configuration, // Prefix with underscore to indicate intentionally unused
  fallbackSrc,
  alt = 'Avatar',
  sx = {},
}) => {
  // For now, show the base avatar or fallback until we have actual part images
  // In the future, this will composite the avatar parts based on configuration
  
  return (
    <Avatar
      src={fallbackSrc || '/avatar/base.982Z.png'}
      alt={alt}
      sx={{
        width: size,
        height: size,
        border: '2px solid',
        borderColor: 'primary.main',
        ...sx,
      }}
    />
  );
};

export default AvatarDisplay;
