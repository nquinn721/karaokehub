import {
  faCog,
  faMicrophone,
  faPaintBrush,
  faSave,
  faShirt,
  faShoePrints,
  faTshirt,
  faUndo,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { authStore, userStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useState } from 'react';

interface AvatarPart {
  id: string;
  name: string;
  category: 'microphone' | 'shirt' | 'pants' | 'shoes' | 'hair' | 'accessories';
  imagePath: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price?: number; // For future store integration
  owned: boolean;
  zIndex: number; // For layering
}

interface AvatarConfiguration {
  microphone?: string;
  shirt?: string;
  pants?: string;
  shoes?: string;
  hair?: string;
  accessories?: string[];
}

const AVATAR_PARTS: AvatarPart[] = [
  // Microphones
  {
    id: 'mic_basic',
    name: 'Basic Microphone',
    category: 'microphone',
    imagePath: '/images/images/avatar/parts/microphones/basic.png',
    rarity: 'common',
    owned: true,
    zIndex: 100,
  },
  {
    id: 'mic_wireless',
    name: 'Wireless Headset',
    category: 'microphone',
    imagePath: '/images/avatar/parts/microphones/wireless.png',
    rarity: 'rare',
    owned: true,
    zIndex: 100,
  },
  {
    id: 'mic_vintage',
    name: 'Vintage Chrome Mic',
    category: 'microphone',
    imagePath: '/images/avatar/parts/microphones/vintage.png',
    rarity: 'epic',
    owned: false,
    price: 500,
    zIndex: 100,
  },
  {
    id: 'mic_neon',
    name: 'Neon LED Mic',
    category: 'microphone',
    imagePath: '/images/avatar/parts/microphones/neon.png',
    rarity: 'legendary',
    owned: false,
    price: 1000,
    zIndex: 100,
  },
  {
    id: 'mic_studio',
    name: 'Studio Condenser Mic',
    category: 'microphone',
    imagePath: '/images/avatar/parts/microphones/studio.png',
    rarity: 'rare',
    owned: false,
    price: 300,
    zIndex: 100,
  },
  {
    id: 'mic_ribbon',
    name: 'Classic Ribbon Mic',
    category: 'microphone',
    imagePath: '/images/avatar/parts/microphones/ribbon.png',
    rarity: 'epic',
    owned: false,
    price: 600,
    zIndex: 100,
  },
  {
    id: 'mic_crystal',
    name: 'Crystal Clear Mic',
    category: 'microphone',
    imagePath: '/images/avatar/parts/microphones/crystal.png',
    rarity: 'legendary',
    owned: false,
    price: 1200,
    zIndex: 100,
  },
  {
    id: 'mic_gold',
    name: 'Golden Performance Mic',
    category: 'microphone',
    imagePath: '/images/avatar/parts/microphones/gold.png',
    rarity: 'legendary',
    owned: false,
    price: 1500,
    zIndex: 100,
  },
  {
    id: 'mic_dynamic',
    name: 'Dynamic Handheld Mic',
    category: 'microphone',
    imagePath: '/images/avatar/parts/microphones/dynamic.png',
    rarity: 'common',
    owned: true,
    zIndex: 100,
  },
  {
    id: 'mic_lavalier',
    name: 'Lavalier Clip Mic',
    category: 'microphone',
    imagePath: '/images/avatar/parts/microphones/lavalier.png',
    rarity: 'rare',
    owned: false,
    price: 250,
    zIndex: 100,
  },

  // Shirts
  {
    id: 'shirt_casual',
    name: 'Casual T-Shirt',
    category: 'shirt',
    imagePath: '/images/avatar/parts/shirts/casual.png',
    rarity: 'common',
    owned: true,
    zIndex: 20,
  },
  {
    id: 'shirt_karaoke',
    name: 'Karaoke Star Shirt',
    category: 'shirt',
    imagePath: '/images/avatar/parts/shirts/karaoke.png',
    rarity: 'rare',
    owned: true,
    zIndex: 20,
  },
  {
    id: 'shirt_sequin',
    name: 'Sequin Performance Top',
    category: 'shirt',
    imagePath: '/images/avatar/parts/shirts/sequin.png',
    rarity: 'epic',
    owned: false,
    price: 300,
    zIndex: 20,
  },
  {
    id: 'shirt_leather',
    name: 'Rock Star Leather Jacket',
    category: 'shirt',
    imagePath: '/images/avatar/parts/shirts/leather.png',
    rarity: 'legendary',
    owned: false,
    price: 750,
    zIndex: 20,
  },

  // Pants
  {
    id: 'pants_jeans',
    name: 'Classic Jeans',
    category: 'pants',
    imagePath: '/images/avatar/parts/pants/jeans.png',
    rarity: 'common',
    owned: true,
    zIndex: 10,
  },
  {
    id: 'pants_dress',
    name: 'Dress Pants',
    category: 'pants',
    imagePath: '/images/avatar/parts/pants/dress.png',
    rarity: 'rare',
    owned: true,
    zIndex: 10,
  },
  {
    id: 'pants_glitter',
    name: 'Glitter Performance Pants',
    category: 'pants',
    imagePath: '/images/avatar/parts/pants/glitter.png',
    rarity: 'epic',
    owned: false,
    price: 400,
    zIndex: 10,
  },

  // Shoes
  {
    id: 'shoes_sneakers',
    name: 'Comfortable Sneakers',
    category: 'shoes',
    imagePath: '/images/avatar/parts/shoes/sneakers.png',
    rarity: 'common',
    owned: true,
    zIndex: 5,
  },
  {
    id: 'shoes_boots',
    name: 'Performance Boots',
    category: 'shoes',
    imagePath: '/images/avatar/parts/shoes/boots.png',
    rarity: 'rare',
    owned: false,
    price: 200,
    zIndex: 5,
  },
  {
    id: 'shoes_platform',
    name: 'Platform Stage Shoes',
    category: 'shoes',
    imagePath: '/images/avatar/parts/shoes/platform.png',
    rarity: 'legendary',
    owned: false,
    price: 600,
    zIndex: 5,
  },

  // Hair
  {
    id: 'hair_default',
    name: 'Natural Hair',
    category: 'hair',
    imagePath: '/images/avatar/parts/hair/default.png',
    rarity: 'common',
    owned: true,
    zIndex: 30,
  },
  {
    id: 'hair_mohawk',
    name: 'Rock Star Mohawk',
    category: 'hair',
    imagePath: '/images/avatar/parts/hair/mohawk.png',
    rarity: 'epic',
    owned: false,
    price: 350,
    zIndex: 30,
  },

  // Accessories
  {
    id: 'acc_sunglasses',
    name: 'Cool Sunglasses',
    category: 'accessories',
    imagePath: '/images/avatar/parts/accessories/sunglasses.png',
    rarity: 'rare',
    owned: false,
    price: 150,
    zIndex: 50,
  },
  {
    id: 'acc_hat',
    name: 'Performance Hat',
    category: 'accessories',
    imagePath: '/images/avatar/parts/accessories/hat.png',
    rarity: 'epic',
    owned: false,
    price: 250,
    zIndex: 40,
  },
];

const AvatarCustomizer: React.FC = observer(() => {
  const theme = useTheme();
  const [currentConfig, setCurrentConfig] = useState<AvatarConfiguration>({
    microphone: 'mic_basic',
    shirt: 'shirt_karaoke_tee',
    pants: 'pants_jeans',
    shoes: 'shoes_sneakers',
    hair: 'hair_short',
    accessories: [],
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('microphone');
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const categories = [
    { id: 'microphone', name: 'Microphones', icon: faMicrophone },
    { id: 'shirt', name: 'Shirts', icon: faShirt },
    { id: 'pants', name: 'Pants', icon: faTshirt },
    { id: 'shoes', name: 'Shoes', icon: faShoePrints },
    { id: 'hair', name: 'Hair', icon: faPaintBrush },
    { id: 'accessories', name: 'Accessories', icon: faCog },
  ];

  const getRarityColor = (rarity: string) => {
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

  const getPartsForCategory = (category: string) => {
    return AVATAR_PARTS.filter((part) => part.category === category);
  };

  const isPartEquipped = (partId: string) => {
    return Object.values(currentConfig).flat().includes(partId);
  };

  const equipPart = useCallback((part: AvatarPart) => {
    if (!part.owned) return;

    setCurrentConfig((prev) => {
      const newConfig = { ...prev };

      if (part.category === 'accessories') {
        const accessories = prev.accessories || [];
        if (accessories.includes(part.id)) {
          // Remove if already equipped
          newConfig.accessories = accessories.filter((id) => id !== part.id);
        } else {
          // Add to accessories (max 3)
          if (accessories.length < 3) {
            newConfig.accessories = [...accessories, part.id];
          }
        }
      } else {
        // Single slot categories
        if (newConfig[part.category as keyof AvatarConfiguration] === part.id) {
          // Remove if already equipped
          newConfig[part.category as keyof AvatarConfiguration] = undefined;
        } else {
          // Equip new part
          (newConfig as any)[part.category] = part.id;
        }
      }

      return newConfig;
    });
  }, []);

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      // Get the current equipped avatar
      const currentAvatar = authStore.user?.equippedAvatar?.id;
      
      if (currentAvatar) {
        // Re-equip the same avatar to trigger a refresh of the header
        const success = await userStore.updateEquippedAvatar(currentAvatar);
        
        if (success) {
          console.log('Avatar configuration refreshed successfully');
          setSuccessMessage('Avatar refreshed! The header should now show your current avatar.');
          setTimeout(() => setSuccessMessage(''), 4000);
        } else {
          throw new Error('Failed to refresh avatar');
        }
      } else {
        // If no avatar is equipped, equip a default one
        const success = await userStore.updateEquippedAvatar('alex');
        
        if (success) {
          console.log('Default avatar equipped successfully');
          setSuccessMessage('Avatar updated! Check the header for the change.');
          setTimeout(() => setSuccessMessage(''), 4000);
        } else {
          throw new Error('Failed to equip avatar');
        }
      }
    } catch (error) {
      console.error('Failed to save avatar configuration:', error);
      setSuccessMessage('Failed to refresh avatar. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setCurrentConfig({
      microphone: 'mic_basic',
      shirt: 'shirt_casual',
      pants: 'pants_jeans',
      shoes: 'shoes_sneakers',
      hair: 'hair_default',
      accessories: [],
    });
  };

  const renderAvatarPreview = () => {
    const equippedParts = [
      // Get parts in z-index order
      ...AVATAR_PARTS.filter((part) => isPartEquipped(part.id)).sort((a, b) => a.zIndex - b.zIndex),
    ];

    return (
      <Box
        sx={{
          position: 'relative',
          width: 200,
          height: 200,
          mx: 'auto',
          mb: 3,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `3px solid ${theme.palette.primary.main}`,
          background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.secondary.light})`,
        }}
      >
        {/* Base Avatar */}
        <img
          src="/avatar/base.982Z.png"
          alt="Base Avatar"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
          }}
        />

        {/* Equipped Parts */}
        {equippedParts.map((part) => (
          <img
            key={part.id}
            src={part.imagePath}
            alt={part.name}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: part.zIndex,
            }}
            onError={(e) => {
              // Hide broken images
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ))}
      </Box>
    );
  };

  const renderPartCard = (part: AvatarPart) => {
    const isEquipped = isPartEquipped(part.id);
    const rarityColor = getRarityColor(part.rarity);

    return (
      <Card
        key={part.id}
        sx={{
          cursor: part.owned ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          border: isEquipped ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
          opacity: part.owned ? 1 : 0.6,
          '&:hover': {
            transform: part.owned ? 'translateY(-2px)' : 'none',
            boxShadow: part.owned ? theme.shadows[4] : 'none',
          },
          position: 'relative',
        }}
        onClick={() => equipPart(part)}
      >
        <CardContent sx={{ p: 2, textAlign: 'center' }}>
          {/* Rarity Indicator */}
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: rarityColor,
              border: '2px solid white',
            }}
          />

          {/* Part Preview */}
          <Box
            sx={{
              width: 60,
              height: 60,
              mx: 'auto',
              mb: 1,
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: 'background.default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={part.imagePath}
              alt={part.name}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
              onError={(e) => {
                // Show placeholder icon for missing images
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <FontAwesomeIcon
              icon={categories.find((cat) => cat.id === part.category)?.icon || faUser}
              style={{
                fontSize: '24px',
                color: theme.palette.text.secondary,
              }}
            />
          </Box>

          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            {part.name}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: rarityColor,
              textTransform: 'capitalize',
              fontWeight: 500,
            }}
          >
            {part.rarity}
          </Typography>

          {!part.owned && part.price && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'warning.main' }}>
              💰 {part.price} coins
            </Typography>
          )}

          {isEquipped && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✓
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <FontAwesomeIcon
            icon={faUser}
            style={{ fontSize: '24px', color: theme.palette.primary.main }}
          />
          <Typography variant="h5" fontWeight={600}>
            Avatar Customizer
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Tooltip title="Reset to Default">
              <IconButton onClick={resetToDefault} size="small">
                <FontAwesomeIcon icon={faUndo} />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faSave} />}
              onClick={saveConfiguration}
              disabled={loading}
              size="small"
            >
              Save
            </Button>
          </Box>
        </Box>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Avatar Preview */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Preview
              </Typography>
              {renderAvatarPreview()}
              <Typography variant="body2" color="text.secondary">
                {authStore.user?.stageName || authStore.user?.name || 'Karaoke Star'}
              </Typography>
            </Paper>
          </Grid>

          {/* Customization Panel */}
          <Grid item xs={12} md={8}>
            <Paper elevation={1} sx={{ height: 'fit-content' }}>
              <Tabs
                value={selectedTab}
                onChange={(_, newValue) => setSelectedTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
              >
                {categories.map((category) => (
                  <Tab
                    key={category.id}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FontAwesomeIcon icon={category.icon} />
                        {category.name}
                      </Box>
                    }
                  />
                ))}
              </Tabs>

              <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  {getPartsForCategory(categories[selectedTab].id).map((part) => (
                    <Grid item xs={6} sm={4} md={3} key={part.id}>
                      {renderPartCard(part)}
                    </Grid>
                  ))}
                </Grid>

                {getPartsForCategory(categories[selectedTab].id).length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No {categories[selectedTab].name.toLowerCase()} available yet.
                      <br />
                      Check back later for new items! 🎤
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Store Coming Soon */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            🏪 Avatar Store Coming Soon!
          </Typography>
          <Typography variant="body2">
            Unlock new microphones, outfits, and accessories by earning coins through karaoke
            performances!
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
});

export default AvatarCustomizer;
