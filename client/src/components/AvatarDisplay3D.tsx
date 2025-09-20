import { Box } from '@mui/material';
import React, { useEffect, useState } from 'react';

interface AvatarDisplayProps {
  width?: number;
  height?: number;
  avatarId?: string;
  show3D?: boolean;
  sx?: any;
}

interface Avatar {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  ethnicity: string;
  imagePath: string;
}

// Define avatars using individual image files from the new location
const AVAILABLE_AVATARS: Avatar[] = [
  {
    id: 'alex',
    name: 'Alex',
    description: 'A friendly and versatile performer with a warm personality',
    gender: 'male',
    ethnicity: 'Mixed',
    imagePath: '/images/avatar/avatars/alex.png',
  },
  {
    id: 'blake',
    name: 'Blake',
    description: 'A confident artist with modern style and great stage presence',
    gender: 'female',
    ethnicity: 'African American',
    imagePath: '/images/avatar/avatars/blake.png',
  },
  {
    id: 'cameron',
    name: 'Cameron',
    description: 'A dynamic performer with classic appeal and natural charisma',
    gender: 'male',
    ethnicity: 'Caucasian',
    imagePath: '/images/avatar/avatars/cameron.png',
  },
  {
    id: 'joe',
    name: 'Joe',
    description: 'A reliable and steady performer with authentic charm',
    gender: 'male',
    ethnicity: 'Caucasian',
    imagePath: '/images/avatar/avatars/joe.png',
  },
  {
    id: 'juan',
    name: 'Juan',
    description: 'A passionate singer with vibrant energy and cultural flair',
    gender: 'male',
    ethnicity: 'Hispanic',
    imagePath: '/images/avatar/avatars/juan.png',
  },
  {
    id: 'kai',
    name: 'Kai',
    description: 'A creative artist with unique style and artistic vision',
    gender: 'male',
    ethnicity: 'Asian',
    imagePath: '/images/avatar/avatars/kai.png',
  },
  {
    id: 'onyx',
    name: 'Onyx',
    description: 'A bold performer with striking features and commanding presence',
    gender: 'female',
    ethnicity: 'African American',
    imagePath: '/images/avatar/avatars/onyx.png',
  },
  {
    id: 'tyler',
    name: 'Tyler',
    description: 'A versatile entertainer with contemporary appeal and smooth vocals',
    gender: 'male',
    ethnicity: 'Mixed',
    imagePath: '/images/avatar/avatars/tyler.png',
  },
];

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  width = 200,
  height = 250,
  avatarId,
  show3D = true,
  sx = {},
}) => {
  const [currentAvatarId, setCurrentAvatarId] = useState(avatarId || 'alex');

  // Load saved avatar if no specific avatarId is provided
  useEffect(() => {
    if (avatarId) {
      setCurrentAvatarId(avatarId);
    }
    // Remove localStorage fallback to prevent cross-user contamination
  }, [avatarId]);

  const avatar = AVAILABLE_AVATARS.find((a) => a.id === currentAvatarId) || AVAILABLE_AVATARS[0];

  return (
    <Box
      sx={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: show3D
          ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
          : 'transparent',
        borderRadius: show3D ? '16px' : '0',
        border: show3D ? '1px solid rgba(255,255,255,0.1)' : 'none',
        backdropFilter: show3D ? 'blur(10px)' : 'none',
        boxShadow: show3D ? '0 8px 32px rgba(0,0,0,0.1)' : 'none',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {/* 3D Background Effect */}
      {show3D && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(ellipse at center bottom, rgba(100,200,255,0.1) 0%, transparent 70%)',
            zIndex: 0,
          }}
        />
      )}

      {/* Avatar Image */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '90%',
          height: '95%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Box
          component="img"
          src={avatar.imagePath}
          alt={avatar.name}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            imageRendering: 'auto', // Better quality for individual PNGs
            filter: show3D ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
            transition: 'all 0.3s ease',
          }}
          onError={(e) => {
            // Fallback to first avatar if image fails to load
            const target = e.target as HTMLImageElement;
            if (target.src !== '/images/avatar/avatars/alex.png') {
              target.src = '/images/avatar/avatars/alex.png';
            }
          }}
        />
      </Box>

      {/* 3D Highlight Effect */}
      {show3D && (
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '20%',
            width: '30%',
            height: '40%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
            borderRadius: '50%',
            filter: 'blur(20px)',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      )}
    </Box>
  );
};

export { AVAILABLE_AVATARS };
export default AvatarDisplay;
