import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Slider,
  Typography,
  useTheme,
  TextField,
  Checkbox,
  CircularProgress,
  DialogActions,
  Tabs,
  Tab,
  Avatar,
  FormHelperText,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { observer } from 'mobx-react-lite';
import { storeGenerationStore } from '../stores/StoreGenerationStore';
import {
  faCamera,
  faImage,
  faMagicWandSparkles,
  faPalette,
  faSave,
  faTimes,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CloudUpload } from '@mui/icons-material';

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  itemType: string;
  style: string;
  selected: boolean;
}

interface GenerationSettings {
  itemType: string;
  style: string;
  variations: number;
  quality: string;
  theme: string;
}

const StoreItemGenerator: React.FC = () => {
  const theme = useTheme();
  const [baseImage, setBaseImage] = useState<File | null>(null);
  const [baseImagePreview, setBaseImagePreview] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  const [settings, setSettings] = useState<GenerationSettings>({
    itemType: 'outfit',
    style: 'modern',
    variations: 4,
    quality: 'standard',
    theme: 'casual',
  });

  const itemTypes = [
    { value: 'outfit', label: 'Outfits', icon: '👔' },
    { value: 'shoes', label: 'Shoes', icon: '👟' },
    { value: 'microphone', label: 'Microphones', icon: '🎤' },
    { value: 'hair', label: 'Hair Accessories', icon: '💇' },
    { value: 'hat', label: 'Hats & Headwear', icon: '🎩' },
    { value: 'jewelry', label: 'Jewelry', icon: '💎' },
  ];

  const styles = [
    { value: 'modern', label: 'Modern' },
    { value: 'vintage', label: 'Vintage' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'casual', label: 'Casual' },
    { value: 'formal', label: 'Formal' },
    { value: 'stage', label: 'Stage Performance' },
    { value: 'steampunk', label: 'Steampunk' },
    { value: 'cyberpunk', label: 'Cyberpunk' },
  ];

  const themes = [
    { value: 'casual', label: 'Casual' },
    { value: 'elegant', label: 'Elegant' },
    { value: 'rockstar', label: 'Rock Star' },
    { value: 'popstar', label: 'Pop Star' },
    { value: 'country', label: 'Country' },
    { value: 'hip-hop', label: 'Hip-Hop' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'classical', label: 'Classical' },
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Image file size must be less than 10MB');
        return;
      }
      
      setBaseImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setBaseImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleSettingChange = (field: keyof GenerationSettings) => 
    (event: SelectChangeEvent<string>) => {
      setSettings(prev => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleVariationsChange = (_event: Event, newValue: number | number[]) => {
    setSettings(prev => ({
      ...prev,
      variations: newValue as number,
    }));
  };

  const generateImages = async () => {
    if (!baseImage) {
      setError('Please upload a base image first');
      return;
    }

    setIsGenerating(true);
    setError('');
    
    try {
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock generated images
      const mockImages: GeneratedImage[] = Array.from({ length: settings.variations }, (_, i) => ({
        id: `generated-${Date.now()}-${i}`,
        url: `https://picsum.photos/400/400?random=${Date.now() + i}`,
        prompt: `${settings.style} ${settings.itemType} for ${settings.theme} theme`,
        itemType: settings.itemType,
        style: settings.style,
        selected: false,
      }));
      
      setGeneratedImages(prev => [...prev, ...mockImages]);
      setSuccess(`Generated ${settings.variations} new ${settings.itemType} variations!`);
    } catch (err) {
      setError('Failed to generate images. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const openPreview = (image: GeneratedImage) => {
    setPreviewImage(image);
    setPreviewModalOpen(true);
  };

  const saveSelectedItems = async () => {
    if (selectedImages.size === 0) {
      setError('Please select at least one image to save');
      return;
    }

    try {
      // Here we would implement the actual API call to save items to the database
      console.log('Saving selected items:', Array.from(selectedImages));
      setSuccess(`Successfully saved ${selectedImages.size} items to the store!`);
      setSelectedImages(new Set());
    } catch (err) {
      setError('Failed to save items. Please try again.');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper
        elevation={2}
        sx={{
          p: 4,
          mb: 4,
          background: `linear-gradient(135deg, 
            ${theme.palette.primary.main}20 0%, 
            ${theme.palette.secondary.main}10 100%)`,
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FontAwesomeIcon
            icon={faPalette}
            style={{ fontSize: '2rem', color: theme.palette.primary.main }}
          />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            AI Store Item Generator
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Create amazing avatar store items using advanced AI image generation. Upload a base avatar
          image and generate multiple variations of outfits, accessories, and more with different
          themes and styles.
        </Typography>
      </Paper>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Left Column - Upload & Settings */}
        <Grid item xs={12} md={4}>
          {/* Image Upload */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FontAwesomeIcon icon={faUpload} />
                Base Avatar Image
              </Typography>
              
              <Box
                sx={{
                  border: `2px dashed ${theme.palette.divider}`,
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  mb: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                {baseImagePreview ? (
                  <img
                    src={baseImagePreview}
                    alt="Base avatar"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 200,
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <Box>
                    <CloudUpload sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      Click to upload base avatar image
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      PNG, JPG up to 10MB
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </CardContent>
          </Card>

          {/* Generation Settings */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FontAwesomeIcon icon={faMagicWandSparkles} />
                Generation Settings
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Item Type */}
                <FormControl fullWidth>
                  <InputLabel>Item Type</InputLabel>
                  <Select
                    value={settings.itemType}
                    label="Item Type"
                    onChange={handleSettingChange('itemType')}
                  >
                    {itemTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{type.icon}</span>
                          {type.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Style */}
                <FormControl fullWidth>
                  <InputLabel>Style</InputLabel>
                  <Select
                    value={settings.style}
                    label="Style"
                    onChange={handleSettingChange('style')}
                  >
                    {styles.map((style) => (
                      <MenuItem key={style.value} value={style.value}>
                        {style.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Theme */}
                <FormControl fullWidth>
                  <InputLabel>Theme</InputLabel>
                  <Select
                    value={settings.theme}
                    label="Theme"
                    onChange={handleSettingChange('theme')}
                  >
                    {themes.map((theme) => (
                      <MenuItem key={theme.value} value={theme.value}>
                        {theme.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Variations */}
                <Box>
                  <Typography gutterBottom>
                    Number of Variations: {settings.variations}
                  </Typography>
                  <Slider
                    value={settings.variations}
                    onChange={handleVariationsChange}
                    min={1}
                    max={8}
                    marks
                    step={1}
                    valueLabelDisplay="auto"
                  />
                </Box>

                {/* Quality */}
                <FormControl fullWidth>
                  <InputLabel>Quality</InputLabel>
                  <Select
                    value={settings.quality}
                    label="Quality"
                    onChange={handleSettingChange('quality')}
                  >
                    <MenuItem value="standard">Standard</MenuItem>
                    <MenuItem value="high">High Quality</MenuItem>
                    <MenuItem value="ultra">Ultra High</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={generateImages}
                disabled={!baseImage || isGenerating}
                startIcon={<FontAwesomeIcon icon={faMagicWandSparkles} />}
                sx={{
                  py: 1.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                  },
                }}
              >
                {isGenerating ? 'Generating...' : 'Generate Items'}
              </Button>

              {isGenerating && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    AI is creating amazing variations for you...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Generated Results */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon icon={faImage} />
                  Generated Items ({generatedImages.length})
                </Typography>
                
                {selectedImages.size > 0 && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={`${selectedImages.size} selected`}
                      color="primary"
                      size="small"
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={saveSelectedItems}
                      startIcon={<FontAwesomeIcon icon={faSave} />}
                    >
                      Save Selected
                    </Button>
                  </Box>
                )}
              </Box>

              {generatedImages.length === 0 ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 8,
                    color: 'text.secondary',
                  }}
                >
                  <FontAwesomeIcon icon={faCamera} style={{ fontSize: '4rem', marginBottom: 16 }} />
                  <Typography variant="h6" gutterBottom>
                    No items generated yet
                  </Typography>
                  <Typography variant="body2">
                    Upload a base image and click "Generate Items" to get started
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {generatedImages.map((image) => (
                    <Grid item xs={6} sm={4} md={3} key={image.id}>
                      <Paper
                        elevation={selectedImages.has(image.id) ? 8 : 2}
                        sx={{
                          position: 'relative',
                          borderRadius: 2,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          border: selectedImages.has(image.id) ? 
                            `3px solid ${theme.palette.primary.main}` : 
                            'none',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: theme.shadows[8],
                          },
                        }}
                        onClick={() => toggleImageSelection(image.id)}
                      >
                        <img
                          src={image.url}
                          alt={image.prompt}
                          style={{
                            width: '100%',
                            height: 200,
                            objectFit: 'cover',
                          }}
                        />
                        
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            display: 'flex',
                            gap: 1,
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPreview(image);
                            }}
                            sx={{
                              bgcolor: 'rgba(0,0,0,0.7)',
                              color: 'white',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
                            }}
                          >
                            <FontAwesomeIcon icon={faImage} style={{ fontSize: '0.8rem' }} />
                          </IconButton>
                        </Box>

                        <Box sx={{ p: 1 }}>
                          <Typography variant="caption" noWrap>
                            {image.prompt}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Preview Modal */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Item Preview</Typography>
          <IconButton onClick={() => setPreviewModalOpen(false)}>
            <FontAwesomeIcon icon={faTimes} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {previewImage && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={previewImage.url}
                alt={previewImage.prompt}
                style={{
                  maxWidth: '100%',
                  maxHeight: 400,
                  borderRadius: 8,
                }}
              />
              <Typography variant="body1" sx={{ mt: 2 }}>
                {previewImage.prompt}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Chip label={previewImage.itemType} color="primary" />
                <Chip label={previewImage.style} color="secondary" />
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default StoreItemGenerator;