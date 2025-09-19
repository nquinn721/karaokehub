import { Box } from '@mui/material';
import React from 'react';

interface AvatarDisplayProps {
  userAvatar?: {
    baseAvatarId: string;
    microphone?: any;
    outfit?: any;
    shoes?: any;
  } | null;
  size?: number;
  sx?: any;
  fallbackAvatarId?: string;
}

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  userAvatar,
  size = 120,
  sx = {},
  fallbackAvatarId = 'avatar_1',
}) => {
  const avatarId = userAvatar?.baseAvatarId || fallbackAvatarId;

  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '3px solid',
        borderColor: 'primary.main',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.1))',
        flexShrink: 0,
        ...sx,
      }}
    >
      {/* Base Avatar */}
      <img
        src={`/avatar/${avatarId}.png`}
        alt="Avatar"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
        }}
        onError={(e) => {
          // Fallback to default avatar if image fails to load
          (e.target as HTMLImageElement).src = `/avatar/${fallbackAvatarId}.png`;
        }}
      />

      {/* Additional avatar accessories could be layered here in the future */}
      {userAvatar?.microphone && (
        <img
          src={`/avatar/microphones/${userAvatar.microphone.imagePath || 'mic_basic.png'}`}
          alt="Microphone"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 10,
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}

      {userAvatar?.outfit && (
        <img
          src={`/avatar/outfits/${userAvatar.outfit.imagePath || 'outfit_casual.png'}`}
          alt="Outfit"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 5,
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}

      {userAvatar?.shoes && (
        <img
          src={`/avatar/shoes/${userAvatar.shoes.imagePath || 'shoes_sneakers.png'}`}
          alt="Shoes"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 3,
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
    </Box>
  );
};

export default AvatarDisplay;
