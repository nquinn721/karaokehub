import {
  faCamera,
  faDownload,
  faEye,
  faImage,
  faMagicWandSparkles,
  faPalette,
  faSave,
  faScissors,
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
import CustomModal from './CustomModal';

const StoreItemGenerator: React.FC = observer(() => {
  const theme = useTheme();

  // Local state for UI
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [baseImageSource, setBaseImageSource] = useState<'upload' | 'existing'>('upload');
  const [selectedExistingItems, setSelectedExistingItems] = useState<any[]>([]);

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

  // Keyboard shortcut for generate button (Ctrl+Enter)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        if (!storeGenerationStore.isLoading && prompt.trim()) {
          handleGenerate();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [prompt, storeGenerationStore.isLoading]);

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
          setUploadedImages((prev) => [...prev, ...newImages]);
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

    const selectedImages =
      baseImageSource === 'upload'
        ? uploadedImages
        : selectedExistingItems.map((item) => item.imageUrl);

    // Clear previous results
    storeGenerationStore.generatedItems = [];

    // If no images selected, generate based on prompt alone
    if (selectedImages.length === 0) {
      try {
        const result = await storeGenerationStore.generateStoreItems('', {
          itemType: 'outfit',
          style: 'modern',
          theme: 'casual',
          variations: 1,
          quality: 'standard',
          customPrompt: prompt,
        });

        if (result.success) {
          storeGenerationStore.setSuccess('Generated items based on your prompt');
        } else {
          storeGenerationStore.setError('Failed to generate items');
        }
      } catch (error) {
        storeGenerationStore.setError('Failed to generate items');
      }
      return;
    }

    // Create workers for each selected image
    const generationPromises = selectedImages.map(async (imageUrl, index) => {
      try {
        // Convert image URL to base64 for proper Gemini context
        let baseImageData = '';
        let sourceItem = null;

        // Find the source item if this came from existing items
        if (baseImageSource === 'existing') {
          sourceItem = selectedExistingItems.find((item) => item.imageUrl === imageUrl);
        }

        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          baseImageData = base64;
        } catch (imageError) {
          console.error('Failed to convert image to base64:', imageError);
          baseImageData = imageUrl; // Fallback to URL
        }

        const result = await storeGenerationStore.generateStoreItems(baseImageData, {
          itemType: 'outfit',
          style: 'modern',
          theme: 'casual',
          variations: 1, // Generate 1 variation per image to avoid duplication
          quality: 'standard',
          customPrompt: prompt, // Send only the prompt without pre-explanation
        });

        // Add source filename to generated items if we have source info
        if (result.success && result.data && sourceItem) {
          // Extract filename from URL - handle both full URLs and filenames
          let sourceFileName = '';
          if (sourceItem.imageUrl.includes('/')) {
            // Extract filename from URL path
            const urlParts = sourceItem.imageUrl.split('/');
            sourceFileName = urlParts[urlParts.length - 1];
          } else {
            sourceFileName = sourceItem.imageUrl;
          }

          // If we still don't have a good filename, create one from the item name
          if (!sourceFileName || sourceFileName.length < 3) {
            // Convert display name like "Rockstar Alexa" to "alexa-rock"
            const nameParts = sourceItem.name?.toLowerCase().split(' ') || [];
            if (nameParts.length >= 2) {
              // Reverse the order and join with dash (e.g., "Rockstar Alexa" -> "alexa-rock")
              sourceFileName = nameParts.reverse().join('-') + '.png';
            } else {
              sourceFileName = sourceItem.name?.toLowerCase().replace(/\s+/g, '-') + '.png';
            }
          }

          result.data.items?.forEach((generatedItem: any) => {
            generatedItem.sourceFileName = sourceFileName;
          });
        }
        return { success: true, imageIndex: index, result, sourceItem };
      } catch (error) {
        return { success: false, imageIndex: index, error };
      }
    });

    // Wait for all workers to complete
    try {
      const results = await Promise.allSettled(generationPromises);
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failureCount = results.filter((r) => r.status === 'rejected').length;

      if (successCount > 0) {
        storeGenerationStore.setSuccess(
          `Generated items for ${successCount} images${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
        );
      } else {
        storeGenerationStore.setError('Failed to generate items for all images');
      }
    } catch (error) {
      storeGenerationStore.setError('Failed to process generation workers');
    }
  };

  const handleExistingItemSelect = (item: any) => {
    setSelectedExistingItems((prev) => {
      const isSelected = prev.some((i) => i.id === item.id);
      if (isSelected) {
        return prev.filter((i) => i.id !== item.id);
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

  const handlePreview = (image: any) => {
    setPreviewImage(image);
    setPreviewModalOpen(true);
  };

  const handleSaveAs = async (item: any) => {
    try {
      // Convert image URL to blob
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();

      if (!blob) {
        storeGenerationStore.setError('Failed to fetch image for saving');
        return;
      }

      // Generate suggested filename based on source item if available
      let suggestedName = `AI-${item.itemType}-${item.style}-${Date.now()}.png`;

      // If this item has source information, use the original filename pattern
      const sourceFileName = (item as any).sourceFileName;
      if (sourceFileName) {
        // Extract the base name without extension and add timestamp
        const baseName = sourceFileName.replace(/\.(png|jpg|jpeg|gif)$/i, '');
        suggestedName = `${baseName}-modified-${Date.now()}.png`;
      }

      // Check if File System Access API is supported (modern browsers)
      if ('showSaveFilePicker' in window && (window as any).showSaveFilePicker) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName,
            types: [
              {
                description: 'PNG images',
                accept: {
                  'image/png': ['.png'],
                },
              },
            ],
          });

          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();

          storeGenerationStore.setSuccess(`Successfully saved ${suggestedName}`);
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('Error saving with File System Access API:', error);
            // Fall back to traditional download
            fallbackDownload(blob, suggestedName);
          }
        }
      } else {
        // Fallback for browsers without File System Access API
        fallbackDownload(blob, suggestedName);
      }
    } catch (error) {
      console.error('Error in handleSaveAs:', error);
      storeGenerationStore.setError('Failed to save image');
    }
  };

  const fallbackDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    storeGenerationStore.setSuccess(`Downloaded ${filename}`);
  };

  const removeBackground = (imageData: ImageData, tolerance: number = 50): ImageData => {
    const data = imageData.data;

    // Sample corner pixels to determine background color
    const corners = [
      [0, 0], // top-left
      [imageData.width - 1, 0], // top-right
      [0, imageData.height - 1], // bottom-left
      [imageData.width - 1, imageData.height - 1], // bottom-right
    ];

    let bgColor: number[] | null = null;
    for (let corner of corners) {
      const index = (corner[1] * imageData.width + corner[0]) * 4;
      const color = [data[index], data[index + 1], data[index + 2]];

      if (!bgColor) {
        bgColor = color;
      } else {
        // Use the most common corner color as background
        const diff =
          Math.abs(bgColor[0] - color[0]) +
          Math.abs(bgColor[1] - color[1]) +
          Math.abs(bgColor[2] - color[2]);
        if (diff < tolerance) {
          bgColor = color;
          break;
        }
      }
    }

    if (!bgColor) bgColor = [255, 255, 255]; // Default to white

    // Remove background
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const diff = Math.abs(r - bgColor[0]) + Math.abs(g - bgColor[1]) + Math.abs(b - bgColor[2]);

      if (diff < tolerance) {
        data[i + 3] = 0; // Make transparent
      }
    }

    return imageData;
  };

  const handleRemoveBackground = async (item: any) => {
    try {
      storeGenerationStore.setSuccess('Processing background removal...');

      // Create a new image element
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = item.imageUrl;
      });

      // Create canvas and get image data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas not supported');
      }

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const cleanedData = removeBackground(imageData, 50);

      // Put cleaned data back on canvas
      ctx.putImageData(cleanedData, 0, 0);

      // Update the item's imageUrl with the processed version
      const processedDataUrl = canvas.toDataURL('image/png');

      // Find and update the item in the store
      const itemIndex = storeGenerationStore.generatedItems.findIndex((i) => i.id === item.id);
      if (itemIndex !== -1) {
        storeGenerationStore.generatedItems[itemIndex].imageUrl = processedDataUrl;
      }

      storeGenerationStore.setSuccess('Background removed successfully!');
    } catch (error) {
      console.error('Error removing background:', error);
      storeGenerationStore.setError('Failed to remove background');
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
        Create amazing images using Gemini's AI. Use base images for context/modification, or
        generate from prompts alone.
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
        {/* Base Image Selection */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <FontAwesomeIcon icon={faCamera} />
                Select Base Images
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Optional: Choose images to use as context, or leave empty to generate from prompt
                alone
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
                                      border: selectedExistingItems.some((i) => i.id === item.id)
                                        ? `2px solid ${theme.palette.primary.main}`
                                        : '1px solid transparent',
                                      '&:hover': {
                                        borderColor: theme.palette.primary.light,
                                      },
                                      bgcolor:
                                        theme.palette.mode === 'dark' ? '#1e1e1e' : '#f8f8f8',
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
                                          backgroundColor: '#2a2a2a',
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
                                      border: selectedExistingItems.some((i) => i.id === item.id)
                                        ? `2px solid ${theme.palette.primary.main}`
                                        : '1px solid transparent',
                                      '&:hover': {
                                        borderColor: theme.palette.primary.light,
                                      },
                                      bgcolor:
                                        theme.palette.mode === 'dark' ? '#1e1e1e' : '#f8f8f8',
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
                                          backgroundColor: '#2a2a2a',
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
                    Selected Base Images (
                    {baseImageSource === 'upload'
                      ? uploadedImages.length
                      : selectedExistingItems.length}
                    ):
                  </Typography>
                  <Grid container spacing={1}>
                    {baseImageSource === 'upload'
                      ? uploadedImages.map((image, index) => (
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
                      : selectedExistingItems.map((item) => (
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
                        ))}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Prompt Section */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Enter your prompt"
                placeholder="Tell Nano Banana what you want to generate (e.g., 'create 5 yellow shirts and blue overalls outfits' or 'generate 3 red sneakers')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                helperText="Describe what you want to generate and Nano Banana will create it for you. Press Ctrl+Enter to generate."
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
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faImage} />
                    Generated Items ({storeGenerationStore.generatedItems.length})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use the preview button to see full details and save individual items
                  </Typography>
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

                          <Box
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              display: 'flex',
                              gap: 0.5,
                            }}
                          >
                            <IconButton
                              onClick={() => handleRemoveBackground(item)}
                              sx={{
                                bgcolor: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: 'rgba(0,0,0,0.85)',
                                },
                                transform: 'scale(0.8)',
                              }}
                              title="Remove Background"
                            >
                              <FontAwesomeIcon icon={faScissors} />
                            </IconButton>
                            <IconButton
                              onClick={() => handleSaveAs(item)}
                              sx={{
                                bgcolor: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: 'rgba(0,0,0,0.85)',
                                },
                                transform: 'scale(0.8)',
                              }}
                              title="Save As"
                            >
                              <FontAwesomeIcon icon={faSave} />
                            </IconButton>
                            <IconButton
                              onClick={() => handlePreview(item)}
                              sx={{
                                bgcolor: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: 'rgba(0,0,0,0.85)',
                                },
                                transform: 'scale(0.8)',
                              }}
                              title="Preview"
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </IconButton>
                          </Box>
                        </Box>
                        <CardContent sx={{ p: 0.5, height: '40px', overflow: 'hidden' }}>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              fontSize: '10px',
                            }}
                          >
                            <FontAwesomeIcon icon={faPalette} size="xs" />
                            {(item as any).sourceFileName
                              ? (item as any).sourceFileName.replace(/\.(png|jpg|jpeg|gif)$/i, '')
                              : `${item.style} ${item.itemType}`}
                          </Typography>
                          <Typography
                            variant="caption"
                            noWrap
                            sx={{ fontSize: '9px', opacity: 0.7 }}
                          >
                            {(item as any).sourceFileName ? 'Modified from original' : item.prompt}
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
      <CustomModal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Preview"
      >
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
              <strong>Style:</strong>{' '}
              {(previewImage as any).sourceFileName
                ? `${(previewImage as any).sourceFileName.replace(/\.(png|jpg|jpeg|gif)$/i, '')}`
                : `${previewImage.style} ${previewImage.itemType}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Prompt:</strong> {previewImage.prompt}
            </Typography>

            <Box
              sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}
            >
              <Button onClick={() => setPreviewModalOpen(false)}>Close</Button>
              <Button
                variant="outlined"
                startIcon={<FontAwesomeIcon icon={faScissors} />}
                onClick={() => {
                  if (previewImage) {
                    handleRemoveBackground(previewImage);
                  }
                }}
              >
                Remove Background
              </Button>
              <Button
                variant="outlined"
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
              <Button
                variant="contained"
                startIcon={<FontAwesomeIcon icon={faSave} />}
                onClick={() => {
                  if (previewImage) {
                    handleSaveAs(previewImage);
                    setPreviewModalOpen(false);
                  }
                }}
              >
                Save As
              </Button>
            </Box>
          </Box>
        )}
      </CustomModal>
    </Box>
  );
});

export default StoreItemGenerator;
