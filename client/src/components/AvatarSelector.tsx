import { faCheck, faLock, faSave, faUndo, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';

interface Avatar {
  id: string;
  name: string;
  description: string;
  spritePosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price?: number;
  owned: boolean;
  unlockLevel?: number;
}

// Define available avatars in your sprite sheet
const AVAILABLE_AVATARS: Avatar[] = [
  {
    id: 'avatar_1',
    name: 'Alex',
    description: 'Cool Performer',
    spritePosition: { x: 0, y: 0, width: 100, height: 100 },
    rarity: 'common',
    owned: true,
  },
  {
    id: 'avatar_2',
    name: 'Sam',
    description: 'Energetic Singer',
    spritePosition: { x: 100, y: 0, width: 100, height: 100 },
    rarity: 'common',
    owned: true,
  },
  {
    id: 'avatar_3',
    name: 'Jordan',
    description: 'Versatile Artist',
    spritePosition: { x: 200, y: 0, width: 100, height: 100 },
    rarity: 'rare',
    owned: true,
  },
  {
    id: 'avatar_4',
    name: 'Taylor',
    description: 'Dynamic Performer',
    spritePosition: { x: 300, y: 0, width: 100, height: 100 },
    rarity: 'rare',
    owned: true,
  },
  {
    id: 'avatar_5',
    name: 'Casey',
    description: 'Mysterious Vocalist',
    spritePosition: { x: 0, y: 100, width: 100, height: 100 },
    rarity: 'common',
    owned: true,
  },
  {
    id: 'avatar_6',
    name: 'Robin',
    description: 'Charismatic Performer',
    spritePosition: { x: 100, y: 100, width: 100, height: 100 },
    rarity: 'common',
    owned: true,
  },
  {
    id: 'avatar_7',
    name: 'Morgan',
    description: 'Soulful Singer',
    spritePosition: { x: 200, y: 100, width: 100, height: 100 },
    rarity: 'common',
    owned: true,
  },
  {
    id: 'avatar_8',
    name: 'Riley',
    description: 'Upbeat Artist',
    spritePosition: { x: 300, y: 100, width: 100, height: 100 },
    rarity: 'common',
    owned: true,
  },
  {
    id: 'avatar_9',
    name: 'Avery',
    description: 'Melodic Voice',
    spritePosition: { x: 0, y: 200, width: 100, height: 100 },
    rarity: 'rare',
    owned: false,
    price: 200,
  },
  {
    id: 'avatar_10',
    name: 'Blake',
    description: 'Powerful Vocalist',
    spritePosition: { x: 100, y: 200, width: 100, height: 100 },
    rarity: 'rare',
    owned: false,
    price: 200,
  },
  {
    id: 'avatar_11',
    name: 'Cameron',
    description: 'Smooth Performer',
    spritePosition: { x: 200, y: 200, width: 100, height: 100 },
    rarity: 'rare',
    owned: false,
    price: 250,
  },
  {
    id: 'avatar_12',
    name: 'Drew',
    description: 'Rhythmic Artist',
    spritePosition: { x: 300, y: 200, width: 100, height: 100 },
    rarity: 'rare',
    owned: false,
    price: 250,
  },
  {
    id: 'avatar_13',
    name: 'Emery',
    description: 'Passionate Singer',
    spritePosition: { x: 0, y: 300, width: 100, height: 100 },
    rarity: 'epic',
    owned: false,
    price: 400,
    unlockLevel: 15,
  },
  {
    id: 'avatar_14',
    name: 'Finley',
    description: 'Versatile Performer',
    spritePosition: { x: 100, y: 300, width: 100, height: 100 },
    rarity: 'epic',
    owned: false,
    price: 400,
    unlockLevel: 15,
  },
  {
    id: 'avatar_15',
    name: 'Gray',
    description: 'Dynamic Artist',
    spritePosition: { x: 200, y: 300, width: 100, height: 100 },
    rarity: 'epic',
    owned: false,
    price: 500,
    unlockLevel: 20,
  },
  {
    id: 'avatar_16',
    name: 'Hayden',
    description: 'Expressive Vocalist',
    spritePosition: { x: 300, y: 300, width: 100, height: 100 },
    rarity: 'epic',
    owned: false,
    price: 500,
    unlockLevel: 20,
  },
  {
    id: 'avatar_17',
    name: 'Indigo',
    description: 'Unique Style',
    spritePosition: { x: 0, y: 400, width: 100, height: 100 },
    rarity: 'epic',
    owned: false,
    price: 600,
    unlockLevel: 25,
  },
  {
    id: 'avatar_18',
    name: 'Jazz',
    description: 'Smooth Operator',
    spritePosition: { x: 100, y: 400, width: 100, height: 100 },
    rarity: 'legendary',
    owned: false,
    price: 800,
    unlockLevel: 30,
  },
  {
    id: 'avatar_19',
    name: 'Kai',
    description: 'Ocean Voice',
    spritePosition: { x: 200, y: 400, width: 100, height: 100 },
    rarity: 'legendary',
    owned: false,
    price: 800,
    unlockLevel: 30,
  },
  {
    id: 'avatar_20',
    name: 'Lyric',
    description: 'Poetic Performer',
    spritePosition: { x: 300, y: 400, width: 100, height: 100 },
    rarity: 'legendary',
    owned: false,
    price: 1000,
    unlockLevel: 35,
  },
  {
    id: 'avatar_21',
    name: 'Melody',
    description: 'Musical Genius',
    spritePosition: { x: 0, y: 500, width: 100, height: 100 },
    rarity: 'legendary',
    owned: false,
    price: 1000,
    unlockLevel: 40,
  },
  {
    id: 'avatar_22',
    name: 'Neo',
    description: 'Futuristic Artist',
    spritePosition: { x: 100, y: 500, width: 100, height: 100 },
    rarity: 'legendary',
    owned: false,
    price: 1200,
    unlockLevel: 45,
  },
  {
    id: 'avatar_23',
    name: 'Onyx',
    description: 'Dark Mystique',
    spritePosition: { x: 200, y: 500, width: 100, height: 100 },
    rarity: 'legendary',
    owned: false,
    price: 1200,
    unlockLevel: 50,
  },
  {
    id: 'avatar_24',
    name: 'Phoenix',
    description: 'Rising Star',
    spritePosition: { x: 300, y: 500, width: 100, height: 100 },
    rarity: 'legendary',
    owned: false,
    price: 1500,
    unlockLevel: 60,
  },
  {
    id: 'avatar_25',
    name: 'Quest',
    description: 'Legendary Performer',
    spritePosition: { x: 0, y: 600, width: 100, height: 100 },
    rarity: 'legendary',
    owned: false,
    price: 2000,
    unlockLevel: 75,
  },
];

const getRarityColor = (rarity: string, theme: any) => {
  switch (rarity) {
    case 'common':
      return theme.palette.grey[500];
    case 'rare':
      return theme.palette.info.main;
    case 'epic':
      return theme.palette.secondary.main;
    case 'legendary':
      return theme.palette.warning.main;
    default:
      return theme.palette.grey[500];
  }
};

const getRarityGradient = (rarity: string) => {
  switch (rarity) {
    case 'common':
      return 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)';
    case 'rare':
      return 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)';
    case 'epic':
      return 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)';
    case 'legendary':
      return 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';
    default:
      return 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)';
  }
};

export const AvatarSelector: React.FC = observer(() => {
  const theme = useTheme();
  const [selectedAvatar, setSelectedAvatar] = useState<string>('avatar_1');
  const [savedAvatar, setSavedAvatar] = useState<string>('avatar_1');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [userLevel] = useState(25); // Mock user level - integrate with your user system

  // Load saved avatar on component mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedAvatar');
    if (saved && AVAILABLE_AVATARS.find((a) => a.id === saved)) {
      setSelectedAvatar(saved);
      setSavedAvatar(saved);
    }
  }, []);

  const handleAvatarSelect = useCallback((avatarId: string) => {
    const avatar = AVAILABLE_AVATARS.find((a) => a.id === avatarId);
    if (avatar && (avatar.owned || !avatar.price)) {
      setSelectedAvatar(avatarId);
    }
  }, []);

  const handleSaveAvatar = useCallback(() => {
    localStorage.setItem('selectedAvatar', selectedAvatar);
    setSavedAvatar(selectedAvatar);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  }, [selectedAvatar]);

  const handleResetToSaved = useCallback(() => {
    setSelectedAvatar(savedAvatar);
  }, [savedAvatar]);

  const isAvatarUnlocked = useCallback(
    (avatar: Avatar) => {
      if (avatar.owned) return true;
      if (avatar.unlockLevel && userLevel < avatar.unlockLevel) return false;
      return true;
    },
    [userLevel],
  );

  const selectedAvatarData = AVAILABLE_AVATARS.find((a) => a.id === selectedAvatar);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <FontAwesomeIcon icon={faUser} style={{ marginRight: '12px' }} />
          Choose Your Avatar
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select your karaoke persona and stand out on stage!
        </Typography>
      </Box>

      {/* Success Message */}
      {showSuccessMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <FontAwesomeIcon icon={faCheck} style={{ marginRight: '8px' }} />
          Avatar saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Avatar Preview */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: getRarityGradient(selectedAvatarData?.rarity || 'common'),
              color: 'white',
              position: 'sticky',
              top: 20,
            }}
          >
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Current Selection
              </Typography>

              {/* Avatar Preview */}
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  position: 'relative',
                  background: 'rgba(255,255,255,0.1)',
                }}
              >
                <Box
                  component="img"
                  src="/avatar/base.982Z.png"
                  alt="Avatar Sprite Sheet"
                  sx={{
                    position: 'absolute',
                    left: selectedAvatarData ? -selectedAvatarData.spritePosition.x : 0,
                    top: selectedAvatarData ? -selectedAvatarData.spritePosition.y : 0,
                    width: 'auto',
                    height: 'auto',
                    imageRendering: 'pixelated',
                    transform: 'scale(1.2)', // Adjust scale as needed
                  }}
                />
              </Box>

              {selectedAvatarData && (
                <>
                  <Typography variant="h6" gutterBottom>
                    {selectedAvatarData.name}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                    {selectedAvatarData.description}
                  </Typography>
                  <Chip
                    label={selectedAvatarData.rarity.toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 'bold',
                      mb: 2,
                    }}
                  />
                </>
              )}

              {/* Action Buttons */}
              <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  onClick={handleSaveAvatar}
                  disabled={selectedAvatar === savedAvatar}
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
                    '&:disabled': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  <FontAwesomeIcon icon={faSave} style={{ marginRight: '8px' }} />
                  Save
                </Button>
                <IconButton
                  onClick={handleResetToSaved}
                  disabled={selectedAvatar === savedAvatar}
                  sx={{
                    color: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                    '&:disabled': { color: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  <Tooltip title="Reset to saved">
                    <FontAwesomeIcon icon={faUndo} />
                  </Tooltip>
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Avatar Grid */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            {AVAILABLE_AVATARS.map((avatar) => {
              const isSelected = avatar.id === selectedAvatar;
              const isUnlocked = isAvatarUnlocked(avatar);
              const canSelect = isUnlocked && (avatar.owned || !avatar.price);

              return (
                <Grid item xs={6} sm={4} md={3} key={avatar.id}>
                  <Card
                    sx={{
                      cursor: canSelect ? 'pointer' : 'not-allowed',
                      transition: 'all 0.3s ease',
                      border: isSelected ? '3px solid' : '2px solid transparent',
                      borderColor: isSelected
                        ? getRarityColor(avatar.rarity, theme)
                        : 'transparent',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      opacity: canSelect ? 1 : 0.6,
                      background: isSelected ? getRarityGradient(avatar.rarity) : 'inherit',
                      color: isSelected ? 'white' : 'inherit',
                      '&:hover': canSelect
                        ? {
                            transform: 'scale(1.03)',
                            boxShadow: theme.shadows[8],
                          }
                        : {},
                    }}
                    onClick={() => canSelect && handleAvatarSelect(avatar.id)}
                  >
                    <CardContent sx={{ p: 2, textAlign: 'center' }}>
                      {/* Avatar Preview */}
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          mx: 'auto',
                          mb: 1,
                          border: '2px solid',
                          borderColor: isSelected
                            ? 'rgba(255,255,255,0.5)'
                            : getRarityColor(avatar.rarity, theme),
                          borderRadius: '50%',
                          overflow: 'hidden',
                          position: 'relative',
                          background: 'rgba(0,0,0,0.1)',
                        }}
                      >
                        <Box
                          component="img"
                          src="/avatar/base.982Z.png"
                          alt="Avatar Sprite Sheet"
                          sx={{
                            position: 'absolute',
                            left: -avatar.spritePosition.x,
                            top: -avatar.spritePosition.y,
                            width: 'auto',
                            height: 'auto',
                            imageRendering: 'pixelated',
                            transform: 'scale(0.6)', // Adjust scale as needed for thumbnails
                          }}
                        />

                        {/* Lock overlay */}
                        {!canSelect && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'rgba(0,0,0,0.7)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                            }}
                          >
                            <FontAwesomeIcon icon={faLock} color="white" size="sm" />
                          </Box>
                        )}
                      </Box>

                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ fontWeight: 'bold', mb: 0.5 }}
                      >
                        {avatar.name}
                      </Typography>

                      <Chip
                        label={avatar.rarity}
                        size="small"
                        sx={{
                          fontSize: '0.7rem',
                          height: 20,
                          backgroundColor: isSelected
                            ? 'rgba(255,255,255,0.2)'
                            : getRarityColor(avatar.rarity, theme),
                          color: isSelected ? 'white' : 'white',
                        }}
                      />

                      {/* Price/Unlock Info */}
                      {!avatar.owned && avatar.price && (
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ mt: 0.5, fontWeight: 'bold' }}
                        >
                          {avatar.price} coins
                        </Typography>
                      )}

                      {avatar.unlockLevel && userLevel < avatar.unlockLevel && (
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ mt: 0.5, color: 'warning.main' }}
                        >
                          Unlock at level {avatar.unlockLevel}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
});

export default AvatarSelector;
