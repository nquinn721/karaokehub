import React, { useState, useEffect } from 'react';
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
  DialogActions,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
  useTheme,
  Checkbox,
  CircularProgress,
  Slider,
  FormHelperText,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import { storeGenerationStore } from '../stores/StoreGenerationStore';
import {
  faCamera,
  faImage,
  faMagicWandSparkles,
  faPalette,
  faSave,
  faEye,
  faTimes,
  faDownload,
  faCog,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const StoreItemGenerator: React.FC = observer(() => {
  const theme = useTheme();
  
  // Local state for UI
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<any | null>(null);
  
  const [settings, setSettings] = useState({
    itemType: 'outfit',
    style: 'modern',
    variations: 4,
    quality: 'standard',
    theme: 'casual',
  });

  // Clear messages after 5 seconds
  useEffect(() => {
    if (storeGenerationStore.error) {
      const timer = setTimeout(() => storeGenerationStore.clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [storeGenerationStore.error]);

  useEffect(() => {
    if (storeGenerationStore.success) {
      const timer = setTimeout(() => storeGenerationStore.clearSuccess(), 5000);
      return () => clearTimeout(timer);
    }
  }, [storeGenerationStore.success]);

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setUploadedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

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
    { value: 'sporty', label: 'Sporty' },
    { value: 'elegant', label: 'Elegant' },
    { value: 'punk', label: 'Punk' },
  ];

  const themes = [
    { value: 'casual', label: 'Casual Day' },
    { value: 'party', label: 'Party Night' },
    { value: 'professional', label: 'Professional' },
    { value: 'beach', label: 'Beach/Summer' },
    { value: 'winter', label: 'Winter/Cozy' },
    { value: 'festival', label: 'Festival/Concert' },
    { value: 'formal', label: 'Formal Event' },
    { value: 'retro', label: 'Retro/Vintage' },
  ];

  const qualityOptions = [
    { value: 'draft', label: 'Draft (Fast)' },
    { value: 'standard', label: 'Standard' },
    { value: 'high', label: 'High Quality' },
  ];

  const handleGenerate = async () => {
    if (!uploadedImage) {
      storeGenerationStore.setError('Please upload a base image first');
      return;
    }

    await storeGenerationStore.generateStoreItems(uploadedImage, settings);
  };

  const handleImageSelect = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const handleSaveSelected = async () => {
    if (selectedImages.size === 0) {
      storeGenerationStore.setError('Please select at least one image to save');
      return;
    }

    const itemDetails = Array.from(selectedImages).map(id => {
      const item = storeGenerationStore.generatedItems.find(item => item.id === id);
      return {
        id,
        name: `AI ${item?.itemType} - ${item?.style}`,
        description: item?.prompt || 'AI generated store item',
        rarity: 'common',
        cost: 100,
      };
    });

    await storeGenerationStore.saveStoreItems(Array.from(selectedImages), itemDetails);
    setSelectedImages(new Set());
  };

  const handlePreview = (image: any) => {
    setPreviewImage(image);
    setPreviewModalOpen(true);
  };

  const handleSelectAll = () => {
    if (selectedImages.size === storeGenerationStore.generatedItems.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(storeGenerationStore.generatedItems.map(item => item.id)));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FontAwesomeIcon icon={faMagicWandSparkles} />
        AI Store Item Generator
        <Chip label="Powered by Nano Banana" color="primary" size="small" />
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Create amazing avatar store items using Gemini's AI image generation. Upload a base image and let AI create variations for your store.
      </Typography>

      {/* Error/Success Messages */}
      {storeGenerationStore.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => storeGenerationStore.clearError()}>
          {storeGenerationStore.error}
        </Alert>
      )}

      {storeGenerationStore.success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => storeGenerationStore.clearSuccess()}>
          {storeGenerationStore.success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FontAwesomeIcon icon={faCamera} />
                Upload Base Image
              </Typography>

              <Paper
                sx={{
                  border: `2px dashed ${theme.palette.primary.main}`,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: theme.palette.primary.main + '05',
                  },
                }}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                {uploadedImage ? (
                  <Box>
                    <img
                      src={uploadedImage}
                      alt="Uploaded"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '200px',
                        borderRadius: '8px',
                      }}
                    />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Click to replace
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <FontAwesomeIcon icon={faImage} size="3x" color={theme.palette.primary.main} />
                    <Typography variant="body1" sx={{ mt: 2 }}>
                      Click here to select an image
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Supports JPG, PNG, GIF
                    </Typography>
                  </Box>
                )}
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* Settings Section */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FontAwesomeIcon icon={faCog} />
                Generation Settings
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Item Type</InputLabel>
                    <Select
                      value={settings.itemType}
                      label="Item Type"
                      onChange={(e) => setSettings(prev => ({ ...prev, itemType: e.target.value }))}
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
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Style</InputLabel>
                    <Select
                      value={settings.style}
                      label="Style"
                      onChange={(e) => setSettings(prev => ({ ...prev, style: e.target.value }))}
                    >
                      {styles.map((style) => (
                        <MenuItem key={style.value} value={style.value}>
                          {style.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Theme</InputLabel>
                    <Select
                      value={settings.theme}
                      label="Theme"
                      onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                    >
                      {themes.map((theme) => (
                        <MenuItem key={theme.value} value={theme.value}>
                          {theme.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Quality</InputLabel>
                    <Select
                      value={settings.quality}
                      label="Quality"
                      onChange={(e) => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                    >
                      {qualityOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Typography gutterBottom>Variations: {settings.variations}</Typography>
                  <Slider
                    value={settings.variations}
                    onChange={(_, value) => setSettings(prev => ({ ...prev, variations: value as number }))}
                    min={1}
                    max={8}
                    marks
                    valueLabelDisplay="auto"
                  />
                  <FormHelperText>More variations take longer to generate</FormHelperText>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleGenerate}
                  disabled={!uploadedImage || storeGenerationStore.isLoading}
                  sx={{ minWidth: 150 }}
                  startIcon={
                    storeGenerationStore.isLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      <FontAwesomeIcon icon={faMagicWandSparkles} />
                    )
                  }
                >
                  {storeGenerationStore.isLoading ? 'Generating...' : 'Generate Items'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Results Section */}
        {storeGenerationStore.generatedItems.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faImage} />
                    Generated Items ({storeGenerationStore.generatedItems.length})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      onClick={handleSelectAll}
                      variant="outlined"
                    >
                      {selectedImages.size === storeGenerationStore.generatedItems.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSaveSelected}
                      disabled={selectedImages.size === 0 || storeGenerationStore.isLoading}
                      startIcon={
                        storeGenerationStore.isLoading ? (
                          <CircularProgress size={16} />
                        ) : (
                          <FontAwesomeIcon icon={faSave} />
                        )
                      }
                    >
                      Save Selected ({selectedImages.size})
                    </Button>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  {storeGenerationStore.generatedItems.map((item) => (
                    <Grid item xs={6} sm={4} md={3} key={item.id}>
                      <Card sx={{ position: 'relative' }}>
                        <Box sx={{ position: 'relative' }}>
                          <img
                            src={item.imageUrl}
                            alt={item.prompt}
                            style={{
                              width: '100%',
                              height: '200px',
                              objectFit: 'cover',
                            }}
                          />
                          <Checkbox
                            checked={selectedImages.has(item.id)}
                            onChange={() => handleImageSelect(item.id)}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              bgcolor: 'rgba(255,255,255,0.8)',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.9)',
                              },
                            }}
                          />
                          <IconButton
                            onClick={() => handlePreview(item)}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              bgcolor: 'rgba(255,255,255,0.8)',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.9)',
                              },
                            }}
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </IconButton>
                        </Box>
                        <CardContent sx={{ p: 1 }}>
                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FontAwesomeIcon icon={faPalette} />
                            {item.style} {item.itemType}
                          </Typography>
                          <Typography variant="body2" noWrap>
                            {item.prompt}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Preview Modal */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Preview</Typography>
          <IconButton onClick={() => setPreviewModalOpen(false)}>
            <FontAwesomeIcon icon={faTimes} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {previewImage && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={previewImage.imageUrl}
                alt={previewImage.prompt}
                style={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  borderRadius: '8px',
                }}
              />
              <Typography variant="body1" sx={{ mt: 2 }}>
                <strong>Style:</strong> {previewImage.style} {previewImage.itemType}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Prompt:</strong> {previewImage.prompt}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewModalOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<FontAwesomeIcon icon={faDownload} />}
            onClick={() => {
              const link = document.createElement('a');
              link.href = previewImage?.imageUrl || '';
              link.download = `generated-${previewImage?.itemType}-${Date.now()}.png`;
              link.click();
            }}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default StoreItemGenerator;