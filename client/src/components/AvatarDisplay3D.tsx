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

// Define avatars using individual image files
const AVAILABLE_AVATARS: Avatar[] = [
  {
    id: 'avatar_1',
    name: 'Marcus',
    description: 'Confident Male Singer',
    gender: 'male',
    ethnicity: 'African American',
    imagePath: '/avatar/avatar_1.png',
  },
  {
    id: 'avatar_2',
    name: 'Elena',
    description: 'Dynamic Female Performer',
    gender: 'female',
    ethnicity: 'Hispanic',
    imagePath: '/avatar/avatar_2.png',
  },
  {
    id: 'avatar_3',
    name: 'Kai',
    description: 'Energetic Male Artist',
    gender: 'male',
    ethnicity: 'Asian',
    imagePath: '/avatar/avatar_3.png',
  },
  {
    id: 'avatar_4',
    name: 'Sophie',
    description: 'Elegant Female Singer',
    gender: 'female',
    ethnicity: 'Caucasian',
    imagePath: '/avatar/avatar_4.png',
  },
  {
    id: 'avatar_5',
    name: 'Diego',
    description: 'Passionate Male Vocalist',
    gender: 'male',
    ethnicity: 'Mixed Heritage',
    imagePath: '/avatar/avatar_5.png',
  },
  {
    id: 'avatar_6',
    name: 'Amara',
    description: 'Powerful Female Artist',
    gender: 'female',
    ethnicity: 'Middle Eastern',
    imagePath: '/avatar/avatar_6.png',
  },
  {
    id: 'avatar_7',
    name: 'Jin',
    description: 'Creative Male Performer',
    gender: 'male',
    ethnicity: 'Native American',
    imagePath: '/avatar/avatar_7.png',
  },
  {
    id: 'avatar_8',
    name: 'Isabella',
    description: 'Charismatic Female Singer',
    gender: 'female',
    ethnicity: 'South Asian',
    imagePath: '/avatar/avatar_8.png',
  },
  {
    id: 'avatar_9',
    name: 'Alex',
    description: 'Versatile Performer',
    gender: 'male',
    ethnicity: 'Pacific Islander',
    imagePath: '/avatar/avatar_9.png',
  },
  {
    id: 'avatar_10',
    name: 'Maya',
    description: 'Soulful Artist',
    gender: 'female',
    ethnicity: 'African',
    imagePath: '/avatar/avatar_10.png',
  },
  {
    id: 'avatar_11',
    name: 'Zion',
    description: 'Bold Male Star',
    gender: 'male',
    ethnicity: 'European',
    imagePath: '/avatar/avatar_11.png',
  },
  {
    id: 'avatar_12',
    name: 'Luna',
    description: 'Graceful Female Singer',
    gender: 'female',
    ethnicity: 'Caribbean',
    imagePath: '/avatar/avatar_12.png',
  },
  {
    id: 'avatar_13',
    name: 'Dante',
    description: 'Intense Male Performer',
    gender: 'male',
    ethnicity: 'African American',
    imagePath: '/avatar/avatar_13.png',
  },
  {
    id: 'avatar_14',
    name: 'Aria',
    description: 'Melodic Female Artist',
    gender: 'female',
    ethnicity: 'Hispanic',
    imagePath: '/avatar/avatar_14.png',
  },
  {
    id: 'avatar_15',
    name: 'Jaxon',
    description: 'Rhythmic Male Singer',
    gender: 'male',
    ethnicity: 'Asian',
    imagePath: '/avatar/avatar_15.png',
  },
  {
    id: 'avatar_16',
    name: 'Nyla',
    description: 'Harmonic Female Star',
    gender: 'female',
    ethnicity: 'Caucasian',
    imagePath: '/avatar/avatar_16.png',
  },
  {
    id: 'avatar_17',
    name: 'Phoenix',
    description: 'Fierce Male Artist',
    gender: 'male',
    ethnicity: 'Mixed Heritage',
    imagePath: '/avatar/avatar_17.png',
  },
  {
    id: 'avatar_18',
    name: 'Sage',
    description: 'Serene Female Performer',
    gender: 'female',
    ethnicity: 'Middle Eastern',
    imagePath: '/avatar/avatar_18.png',
  },
  {
    id: 'avatar_19',
    name: 'River',
    description: 'Dynamic Male Singer',
    gender: 'male',
    ethnicity: 'Native American',
    imagePath: '/avatar/avatar_19.png',
  },
  {
    id: 'avatar_20',
    name: 'Nova',
    description: 'Cosmic Female Artist',
    gender: 'female',
    ethnicity: 'South Asian',
    imagePath: '/avatar/avatar_20.png',
  },
  {
    id: 'avatar_21',
    name: 'Atlas',
    description: 'Strong Male Performer',
    gender: 'male',
    ethnicity: 'Pacific Islander',
    imagePath: '/avatar/avatar_21.png',
  },
  {
    id: 'avatar_22',
    name: 'Iris',
    description: 'Colorful Female Singer',
    gender: 'female',
    ethnicity: 'African',
    imagePath: '/avatar/avatar_22.png',
  },
  {
    id: 'avatar_23',
    name: 'Orion',
    description: 'Stellar Male Artist',
    gender: 'male',
    ethnicity: 'European',
    imagePath: '/avatar/avatar_23.png',
  },
  {
    id: 'avatar_24',
    name: 'Zara',
    description: 'Exotic Female Star',
    gender: 'female',
    ethnicity: 'Caribbean',
    imagePath: '/avatar/avatar_24.png',
  },
  {
    id: 'avatar_25',
    name: 'Blaze',
    description: 'Fiery Male Singer',
    gender: 'male',
    ethnicity: 'African American',
    imagePath: '/avatar/avatar_25.png',
  },
];

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  width = 200,
  height = 250,
  avatarId,
  show3D = true,
  sx = {},
}) => {
  const [currentAvatarId, setCurrentAvatarId] = useState(avatarId || 'avatar_1');

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
            if (target.src !== '/avatar/avatar_1.png') {
              target.src = '/avatar/avatar_1.png';
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
