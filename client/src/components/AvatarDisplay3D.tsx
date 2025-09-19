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
    name: 'Alex',
    description: 'Cool Performer',
    gender: 'male',
    ethnicity: 'Caucasian',
    imagePath: '/images/avatar/avatar_1.png',
  },
  {
    id: 'avatar_2',
    name: 'Sam',
    description: 'Energetic Singer',
    gender: 'female',
    ethnicity: 'African American',
    imagePath: '/images/avatar/avatar_2.png',
  },
  {
    id: 'avatar_3',
    name: 'Jordan',
    description: 'Versatile Artist',
    gender: 'male',
    ethnicity: 'Asian',
    imagePath: '/images/avatar/avatar_3.png',
  },
  {
    id: 'avatar_4',
    name: 'Taylor',
    description: 'Dynamic Performer',
    gender: 'female',
    ethnicity: 'Hispanic',
    imagePath: '/images/avatar/avatar_4.png',
  },
  {
    id: 'avatar_5',
    name: 'Casey',
    description: 'Mysterious Vocalist',
    gender: 'male',
    ethnicity: 'Caucasian',
    imagePath: '/images/avatar/avatar_5.png',
  },
  {
    id: 'avatar_6',
    name: 'Robin',
    description: 'Charismatic Performer',
    gender: 'female',
    ethnicity: 'African American',
    imagePath: '/images/avatar/avatar_6.png',
  },
  {
    id: 'avatar_7',
    name: 'Morgan',
    description: 'Soulful Singer',
    gender: 'male',
    ethnicity: 'Asian',
    imagePath: '/images/avatar/avatar_7.png',
  },
  {
    id: 'avatar_8',
    name: 'Riley',
    description: 'Upbeat Artist',
    gender: 'female',
    ethnicity: 'Hispanic',
    imagePath: '/images/avatar/avatar_8.png',
  },
  {
    id: 'avatar_9',
    name: 'Avery',
    description: 'Melodic Voice',
    gender: 'male',
    ethnicity: 'Caucasian',
    imagePath: '/images/avatar/avatar_9.png',
  },
  {
    id: 'avatar_10',
    name: 'Blake',
    description: 'Powerful Vocalist',
    gender: 'female',
    ethnicity: 'African American',
    imagePath: '/images/avatar/avatar_10.png',
  },
  {
    id: 'avatar_11',
    name: 'Cameron',
    description: 'Smooth Performer',
    gender: 'male',
    ethnicity: 'Asian',
    imagePath: '/images/avatar/avatar_11.png',
  },
  {
    id: 'avatar_12',
    name: 'Drew',
    description: 'Rhythmic Artist',
    gender: 'female',
    ethnicity: 'Hispanic',
    imagePath: '/images/avatar/avatar_12.png',
  },
  {
    id: 'avatar_13',
    name: 'Emery',
    description: 'Passionate Singer',
    gender: 'male',
    ethnicity: 'Caucasian',
    imagePath: '/images/avatar/avatar_13.png',
  },
  {
    id: 'avatar_14',
    name: 'Finley',
    description: 'Versatile Performer',
    gender: 'female',
    ethnicity: 'African American',
    imagePath: '/images/avatar/avatar_14.png',
  },
  {
    id: 'avatar_15',
    name: 'Gray',
    description: 'Dynamic Artist',
    gender: 'male',
    ethnicity: 'Asian',
    imagePath: '/images/avatar/avatar_15.png',
  },
  {
    id: 'avatar_16',
    name: 'Hayden',
    description: 'Expressive Vocalist',
    gender: 'female',
    ethnicity: 'Hispanic',
    imagePath: '/images/avatar/avatar_16.png',
  },
  {
    id: 'avatar_17',
    name: 'Indigo',
    description: 'Unique Style',
    gender: 'male',
    ethnicity: 'Caucasian',
    imagePath: '/images/avatar/avatar_17.png',
  },
  {
    id: 'avatar_18',
    name: 'Jazz',
    description: 'Smooth Operator',
    gender: 'female',
    ethnicity: 'African American',
    imagePath: '/images/avatar/avatar_18.png',
  },
  {
    id: 'avatar_19',
    name: 'Kai',
    description: 'Ocean Voice',
    gender: 'male',
    ethnicity: 'Asian',
    imagePath: '/images/avatar/avatar_19.png',
  },
  {
    id: 'avatar_20',
    name: 'Lyric',
    description: 'Poetic Performer',
    gender: 'female',
    ethnicity: 'Hispanic',
    imagePath: '/images/avatar/avatar_20.png',
  },
  {
    id: 'avatar_21',
    name: 'Melody',
    description: 'Musical Genius',
    gender: 'male',
    ethnicity: 'Caucasian',
    imagePath: '/images/avatar/avatar_21.png',
  },
  {
    id: 'avatar_22',
    name: 'Neo',
    description: 'Futuristic Artist',
    gender: 'female',
    ethnicity: 'African American',
    imagePath: '/images/avatar/avatar_22.png',
  },
  {
    id: 'avatar_23',
    name: 'Onyx',
    description: 'Dark Mystique',
    gender: 'male',
    ethnicity: 'Asian',
    imagePath: '/images/avatar/avatar_23.png',
  },
  {
    id: 'avatar_24',
    name: 'Phoenix',
    description: 'Rising Star',
    gender: 'female',
    ethnicity: 'Hispanic',
    imagePath: '/images/avatar/avatar_24.png',
  },
  {
    id: 'avatar_25',
    name: 'Quest',
    description: 'Legendary Performer',
    gender: 'male',
    ethnicity: 'Caucasian',
    imagePath: '/images/avatar/avatar_25.png',
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
