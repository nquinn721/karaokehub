import {
  faCamera,
  faDownload,
  faEye,
  faImage,
  faMagicWandSparkles,
  faPalette,
  faSave,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { storeGenerationStore } from '../stores/StoreGenerationStore';

const StoreItemGenerator: React.FC = observer(() => {
  const theme = useTheme();

  // Local state for UI
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [baseImageSource, setBaseImageSource] = useState<'upload' | 'existing'>('upload');
  const [selectedExistingItems, setSelectedExistingItems] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<any | null>(null);
  const [baseImageTabValue, setBaseImageTabValue] = useState(0);
  const [existingItemsTabValue, setExistingItemsTabValue] = useState(0);

  const [prompt, setPrompt] = useState('');

  // Load existing items when component mounts
  useEffect(() => {
    storeGenerationStore.loadExistingStoreItems();
  }, []);

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

  // Dropzone for image upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages: string[] = [];
    let completed = 0;
    
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newImages.push(reader.result as string);
        completed++;
        
        if (completed === acceptedFiles.length) {
          setUploadedImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  });



  const handleGenerate = async () => {
    if (!prompt || !prompt.trim()) {
      storeGenerationStore.setError('Please enter a prompt for generating items');
      return;
    }

    const selectedImages = baseImageSource === 'upload' ? uploadedImages : selectedExistingItems.map(item => item.imageUrl);
    
    if (selectedImages.length === 0) {
      storeGenerationStore.setError('Please select at least one base image');
      return;
    }

    // Clear previous results
    storeGenerationStore.generatedItems = [];

    // Create workers for each selected image
    const generationPromises = selectedImages.map(async (imageUrl, index) => {
      try {
        const result = await storeGenerationStore.generateStoreItems(imageUrl, {
          itemType: 'outfit',
          style: 'modern',
          theme: 'casual',
          variations: 1, // Generate 1 variation per image to avoid duplication
          quality: 'standard',
          customPrompt: prompt, // Send only the prompt without pre-explanation
        });
        return { success: true, imageIndex: index, result };
      } catch (error) {
        return { success: false, imageIndex: index, error };
      }
    });

    // Wait for all workers to complete
    try {
      const results = await Promise.allSettled(generationPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;
      
      if (successCount > 0) {
        storeGenerationStore.setSuccess(`Generated items for ${successCount} images${failureCount > 0 ? `, ${failureCount} failed` : ''}`);
      } else {
        storeGenerationStore.setError('Failed to generate items for all images');
      }
    } catch (error) {
      storeGenerationStore.setError('Failed to process generation workers');
    }
  };

  const handleExistingItemSelect = (item: any) => {
    setSelectedExistingItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
    

    
    setBaseImageSource('existing');
  };

  const handleUploadedImageSelect = () => {
    setBaseImageSource('upload');
    setSelectedExistingItems([]);
  };





  const handleSaveSelected = async () => {
    if (selectedImages.size === 0) {
      storeGenerationStore.setError('Please select at least one image to save');
      return;
    }

    const itemDetails = Array.from(selectedImages).map((id) => {
      const item = storeGenerationStore.generatedItems.find((item) => item.id === id);
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
      setSelectedImages(new Set(storeGenerationStore.generatedItems.map((item) => item.id)));
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
        Create amazing avatar store items using Gemini's AI image generation. Upload a base image
        and let AI create variations for your store.
      </Typography>

      {/* Error/Success Messages */}
      {storeGenerationStore.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => storeGenerationStore.clearError()}>
          {storeGenerationStore.error}
        </Alert>
      )}

      {storeGenerationStore.success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => storeGenerationStore.clearSuccess()}
        >
          {storeGenerationStore.success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Upload Section - Hidden */}
        <Grid item xs={12} md={4} sx={{ display: 'none' }}>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <FontAwesomeIcon icon={faCamera} />
                Select Base Image
              </Typography>

              <Tabs
                value={baseImageTabValue}
                onChange={(_, newValue) => setBaseImageTabValue(newValue)}
                sx={{ mb: 2 }}
              >
                <Tab label="Upload New" />
                <Tab
                  label={
                    <Badge
                      badgeContent={storeGenerationStore.getAllExistingItems()?.length || 0}
                      color="primary"
                    >
                      Browse Store Items
                    </Badge>
                  }
                />
              </Tabs>

              {baseImageTabValue === 0 && (
                <Paper
                  {...getRootProps()}
                  sx={{
                    border: `2px dashed ${theme.palette.primary.main}`,
                    borderColor: isDragActive
                      ? theme.palette.primary.dark
                      : theme.palette.primary.main,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: isDragActive ? theme.palette.primary.main + '10' : 'transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: theme.palette.primary.main + '05',
                    },
                  }}
                  onClick={handleUploadedImageSelect}
                >
                  <input {...getInputProps()} />
                  {uploadedImages.length > 0 ? (
                    <Box>
                      <Grid container spacing={1} sx={{ mb: 2 }}>
                        {uploadedImages.map((image, index) => (
                          <Grid item xs={6} key={index}>
                            <img
                              src={image}
                              alt={`Uploaded ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '80px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border:
                                  baseImageSource === 'upload'
                                    ? `3px solid ${theme.palette.primary.main}`
                                    : 'none',
                              }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Drop more images to add ({uploadedImages.length} selected)
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      <FontAwesomeIcon
                        icon={faImage}
                        size="3x"
                        color={theme.palette.primary.main}
                      />
                      <Typography variant="body1" sx={{ mt: 2 }}>
                        {isDragActive
                          ? 'Drop the image here...'
                          : 'Drag & drop an image here, or click to select'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Supports JPG, PNG, GIF
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {baseImageTabValue === 1 && (
                <Box>
                  <Tabs
                    value={existingItemsTabValue}
                    onChange={(_, newValue) => setExistingItemsTabValue(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ mb: 2 }}
                  >
                    <Tab
                      label={
                        <Badge
                          badgeContent={storeGenerationStore.existingAvatars?.length || 0}
                          color="secondary"
                        >
                          Avatars
                        </Badge>
                      }
                    />
                    <Tab
                      label={
                        <Badge
                          badgeContent={storeGenerationStore.existingMicrophones?.length || 0}
                          color="secondary"
                        >
                          Microphones
                        </Badge>
                      }
                    />
                  </Tabs>

                  {storeGenerationStore.isLoadingExisting ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <Grid container spacing={1}>
                        {/* Avatars Tab */}
                        {existingItemsTabValue === 0 && (
                          <>
                            {(storeGenerationStore.existingAvatars?.length || 0) === 0 ? (
                              <Grid item xs={12}>
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    No avatars found in database
                                  </Typography>
                                </Box>
                              </Grid>
                            ) : (
                              storeGenerationStore.existingAvatars?.map((item) => (
                                <Grid item xs={6} key={item.id}>
                                  <Card
                                    sx={{
                                      cursor: 'pointer',
                                      border:
                                        selectedExistingItems.some(i => i.id === item.id)
                                          ? `2px solid ${theme.palette.primary.main}`
                                          : '1px solid transparent',
                                      '&:hover': {
                                        borderColor: theme.palette.primary.light,
                                      },
                                    }}
                                    onClick={() => handleExistingItemSelect(item)}
                                  >
                                    <Box sx={{ position: 'relative' }}>
                                      <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        style={{
                                          width: '100%',
                                          height: '120px',
                                          objectFit: 'contain',
                                          backgroundColor: '#f5f5f5',
                                        }}
                                        onError={(e) => {
                                          // Fallback to a generic avatar placeholder instead of DiceBear
                                          e.currentTarget.src = '/images/avatar/base.982Z.png';
                                        }}
                                      />
                                      <Chip
                                        label={item.rarity}
                                        size="small"
                                        sx={{
                                          position: 'absolute',
                                          top: 4,
                                          right: 4,
                                          fontSize: '10px',
                                        }}
                                      />
                                    </Box>
                                    <CardContent sx={{ p: 1.5, pt: 1 }}>
                                      <Typography variant="caption" noWrap sx={{ fontWeight: 500 }}>
                                        {item.name}
                                      </Typography>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              ))
                            )}
                          </>
                        )}

                        {/* Microphones Tab */}
                        {existingItemsTabValue === 1 && (
                          <>
                            {(storeGenerationStore.existingMicrophones?.length || 0) === 0 ? (
                              <Grid item xs={12}>
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    No microphones found in database
                                  </Typography>
                                </Box>
                              </Grid>
                            ) : (
                              storeGenerationStore.existingMicrophones?.map((item) => (
                                <Grid item xs={6} key={item.id}>
                                  <Card
                                    sx={{
                                      cursor: 'pointer',
                                      border:
                                        selectedExistingItems.some(i => i.id === item.id)
                                          ? `2px solid ${theme.palette.primary.main}`
                                          : '1px solid transparent',
                                      '&:hover': {
                                        borderColor: theme.palette.primary.light,
                                      },
                                    }}
                                    onClick={() => handleExistingItemSelect(item)}
                                  >
                                    <Box sx={{ position: 'relative' }}>
                                      <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        style={{
                                          width: '100%',
                                          height: '120px',
                                          objectFit: 'contain',
                                          backgroundColor: '#f5f5f5',
                                        }}
                                      />
                                      <Chip
                                        label={item.rarity}
                                        size="small"
                                        sx={{
                                          position: 'absolute',
                                          top: 4,
                                          right: 4,
                                          fontSize: '10px',
                                        }}
                                      />
                                    </Box>
                                    <CardContent sx={{ p: 1.5, pt: 1 }}>
                                      <Typography variant="caption" noWrap sx={{ fontWeight: 500 }}>
                                        {item.name}
                                      </Typography>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              ))
                            )}
                          </>
                        )}
                      </Grid>
                    </Box>
                  )}
                </Box>
              )}

              {/* Selected base images preview */}
              {(uploadedImages.length > 0 || selectedExistingItems.length > 0) && (
                <Box sx={{ mt: 2, p: 2, bgcolor: theme.palette.background.paper, borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Selected Base Images ({baseImageSource === 'upload' ? uploadedImages.length : selectedExistingItems.length}):
                  </Typography>
                  <Grid container spacing={1}>
                    {baseImageSource === 'upload' ? (
                      uploadedImages.map((image, index) => (
                        <Grid item xs={4} key={index}>
                          <img
                            src={image}
                            alt={`Selected base ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '60px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: `2px solid ${theme.palette.primary.main}`,
                            }}
                          />
                        </Grid>
                      ))
                    ) : (
                      selectedExistingItems.map((item) => (
                        <Grid item xs={4} key={item.id}>
                          <Box sx={{ textAlign: 'center' }}>
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              style={{
                                width: '100%',
                                height: '60px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: `2px solid ${theme.palette.primary.main}`,
                              }}
                            />
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              {item.name}
                            </Typography>
                          </Box>
                        </Grid>
                      ))
                    )}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Prompt Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Enter your prompt"
                placeholder="Tell Nano Banana what you want to generate (e.g., 'create 5 yellow shirts and blue overalls outfits' or 'generate 3 red sneakers')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                helperText="Describe what you want to generate and Nano Banana will create it for you"
                sx={{ mb: 3 }}
              />

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || storeGenerationStore.isLoading}
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
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faImage} />
                    Generated Items ({storeGenerationStore.generatedItems.length})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" onClick={handleSelectAll} variant="outlined">
                      {selectedImages.size === storeGenerationStore.generatedItems.length
                        ? 'Deselect All'
                        : 'Select All'}
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

                <Grid container spacing={1}>
                  {storeGenerationStore.generatedItems.map((item) => (
                    <Grid item xs={4} sm={3} md={2} key={item.id}>
                      <Card sx={{ position: 'relative', height: '180px' }}>
                        <Box sx={{ position: 'relative', height: '140px' }}>
                          <img
                            src={item.imageUrl}
                            alt={item.prompt}
                            style={{
                              width: '100%',
                              height: '140px',
                              objectFit: 'contain',
                              backgroundColor: '#f5f5f5',
                            }}
                          />

                          <IconButton
                            onClick={() => handlePreview(item)}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'rgba(255,255,255,0.8)',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.9)',
                              },
                              transform: 'scale(0.8)',
                            }}
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </IconButton>
                        </Box>
                        <CardContent sx={{ p: 0.5, height: '40px', overflow: 'hidden' }}>
                          <Typography
                            variant="caption"
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '10px' }}
                          >
                            <FontAwesomeIcon icon={faPalette} size="xs" />
                            {item.style} {item.itemType}
                          </Typography>
                          <Typography variant="caption" noWrap sx={{ fontSize: '9px', opacity: 0.7 }}>
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
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
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
