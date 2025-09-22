import {
  faCog,
  faDownload,
  faEraser,
  faFileArchive,
  faFileImage,
  faMagic,
  faSun,
  faTh,
  faTimes,
  faUndo,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Slider,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import JSZip from 'jszip';
import { observer } from 'mobx-react-lite';
import React, { useRef, useState } from 'react';
import { uiStore } from '../stores';

interface ProcessedAvatar {
  canvas: HTMLCanvasElement;
  name: string;
  sourceX: number;
  sourceY: number;
  width: number;
  height: number;
}

const SpriteCutter: React.FC = observer(() => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedAvatars, setProcessedAvatars] = useState<ProcessedAvatar[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRemovingBackgrounds, setIsRemovingBackgrounds] = useState(false);
  const [originalUnmodifiedImage, setOriginalUnmodifiedImage] = useState<HTMLImageElement | null>(
    null,
  );
  const [originalFileName, setOriginalFileName] = useState<string>('');

  // Configuration
  const [columns, setColumns] = useState(5);
  const [rows, setRows] = useState(5);
  const [tolerance, setTolerance] = useState(50);
  const [outputSize, setOutputSize] = useState(200);
  const [baseName, setBaseName] = useState('sprite');

  // UI States
  const [dragActive, setDragActive] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Function to update individual avatar names
  const updateAvatarName = (index: number, newName: string) => {
    const updatedAvatars = [...processedAvatars];
    updatedAvatars[index] = { ...updatedAvatars[index], name: newName };
    setProcessedAvatars(updatedAvatars);
  };

  // Function to apply base name to all avatars
  const applyBulkRename = () => {
    const updatedAvatars = processedAvatars.map((avatar, index) => ({
      ...avatar,
      name: `${baseName}_${index + 1}`,
    }));
    setProcessedAvatars(updatedAvatars);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      uiStore.addNotification('Please select a valid image file (PNG, JPG, JPEG)', 'error');
      return;
    }

    // Store original filename
    setOriginalFileName(file.name.split('.')[0]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setOriginalUnmodifiedImage(img); // Store unmodified copy
        setProcessedAvatars([]); // Clear previous results
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const autoDetectGrid = () => {
    if (!originalImage) {
      uiStore.addNotification('Please upload an image first!', 'warning');
      return;
    }

    const width = originalImage.width;
    const height = originalImage.height;
    const aspectRatio = width / height;

    let suggestedCols, suggestedRows;

    // For 25 avatars (5x5 is common)
    if (aspectRatio >= 0.8 && aspectRatio <= 1.2) {
      suggestedCols = 5;
      suggestedRows = 5;
    }
    // For rectangular layouts
    else if (aspectRatio > 1.5) {
      // Wide format - more columns
      suggestedCols = Math.ceil(Math.sqrt(25 * aspectRatio));
      suggestedRows = Math.ceil(25 / suggestedCols);
    } else if (aspectRatio < 0.7) {
      // Tall format - more rows
      suggestedRows = Math.ceil(Math.sqrt(25 / aspectRatio));
      suggestedCols = Math.ceil(25 / suggestedRows);
    } else {
      // Default to 5x5
      suggestedCols = 5;
      suggestedRows = 5;
    }

    setColumns(suggestedCols);
    setRows(suggestedRows);

    alert(
      `Auto-detected grid: ${suggestedCols} columns × ${suggestedRows} rows\nImage dimensions: ${width} × ${height}px\nTotal avatars: ${suggestedCols * suggestedRows}`,
    );
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

  const processSprite = async () => {
    if (!originalImage) {
      uiStore.addNotification('Please upload an image first!', 'warning');
      return;
    }

    setIsProcessing(true);

    const cellWidth = originalImage.width / columns;
    const cellHeight = originalImage.height / rows;

    const newProcessedAvatars: ProcessedAvatar[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const avatarIndex = row * columns + col + 1;

        // Extract sprite
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = cellWidth;
        canvas.height = cellHeight;

        const sourceX = col * cellWidth;
        const sourceY = row * cellHeight;

        ctx.drawImage(
          originalImage,
          sourceX,
          sourceY,
          cellWidth,
          cellHeight,
          0,
          0,
          cellWidth,
          cellHeight,
        );

        // Remove background
        const imageData = ctx.getImageData(0, 0, cellWidth, cellHeight);
        const cleanedData = removeBackground(imageData, tolerance);
        ctx.putImageData(cleanedData, 0, 0);

        // Scale to output size
        const outputCanvas = document.createElement('canvas');
        const outputCtx = outputCanvas.getContext('2d')!;
        outputCanvas.width = outputSize;
        outputCanvas.height = outputSize;

        outputCtx.drawImage(canvas, 0, 0, outputSize, outputSize);

        // Store processed avatar
        newProcessedAvatars.push({
          canvas: outputCanvas,
          name: `${baseName}_${avatarIndex}`,
          sourceX: sourceX,
          sourceY: sourceY,
          width: cellWidth,
          height: cellHeight,
        });
      }
    }

    setProcessedAvatars(newProcessedAvatars);
    setIsProcessing(false);
    alert(
      `Successfully processed ${newProcessedAvatars.length} avatars from ${rows}x${columns} grid!`,
    );
  };

  const downloadAll = () => {
    if (processedAvatars.length === 0) {
      uiStore.addNotification('Please process the sprite sheet first!', 'warning');
      return;
    }

    // Download with delays to avoid browser blocking
    processedAvatars.forEach((avatar, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.download = `${avatar.name}.png`;
        link.href = avatar.canvas.toDataURL();

        // Force download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 200); // 200ms delay between downloads
    });

    alert(`Downloading ${processedAvatars.length} avatars with delays to avoid browser limits...`);
  };

  const downloadAsZip = async () => {
    if (processedAvatars.length === 0) {
      alert('Please process the sprite sheet first!');
      return;
    }

    setIsDownloading(true);

    try {
      const zip = new JSZip();

      // Add all avatars to ZIP
      processedAvatars.forEach((avatar) => {
        const dataURL = avatar.canvas.toDataURL();
        // Remove the data:image/png;base64, prefix
        const base64Data = dataURL.split(',')[1];
        zip.file(`${avatar.name}.png`, base64Data, { base64: true });
      });

      // Generate ZIP file
      const content = await zip.generateAsync({ type: 'blob' });

      // Download ZIP
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'avatars.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`Successfully downloaded ${processedAvatars.length} avatars as ZIP file!`);
    } catch (error) {
      console.error('Error creating ZIP:', error);
      alert('Error creating ZIP file. Please try individual downloads.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Function to save processed sprite using browser's native Save As dialog with directory picker
  // Uses modern File System Access API when available (Chrome, Edge) for true directory picker
  // Falls back to traditional download for other browsers (Firefox, Safari)
  const saveProcessedSprite = async () => {
    if (!originalImage) {
      alert('Please upload a sprite sheet first!');
      return;
    }

    try {
      // Convert image to blob
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        alert('Canvas not supported');
        return;
      }

      canvas.width = originalImage.naturalWidth;
      canvas.height = originalImage.naturalHeight;
      ctx.drawImage(originalImage, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!blob) {
        alert('Failed to create image file');
        return;
      }

      // Check if File System Access API is supported (modern browsers)
      if ('showSaveFilePicker' in window && window.showSaveFilePicker) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: originalFileName || `${baseName}.png`,
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

          alert('File saved successfully!');
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error('Error saving file:', err);
            // Fallback to traditional download
            fallbackDownload(blob);
          }
        }
      } else {
        // Fallback for browsers that don't support File System Access API
        fallbackDownload(blob);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image');
    }
  };

  // Fallback download method for older browsers
  const fallbackDownload = (blob: Blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = originalFileName || `${baseName}.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the blob URL
    URL.revokeObjectURL(link.href);
  };

  // Function to undo changes to original image
  const undoChanges = () => {
    if (!originalUnmodifiedImage) {
      alert('No original image to restore!');
      return;
    }

    setOriginalImage(originalUnmodifiedImage);
    alert('✅ Image restored to original state!');
  };

  // Function to remove background from the original sprite image
  const removeBackgroundsFromAvatars = async () => {
    if (!originalImage) {
      alert('Please upload a sprite sheet first!');
      return;
    }

    setIsRemovingBackgrounds(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      ctx.drawImage(originalImage, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Sample corner pixels to find background color
      // const corners = [
      //   [0, 0],
      //   [canvas.width - 1, 0],
      //   [0, canvas.height - 1],
      //   [canvas.width - 1, canvas.height - 1],
      // ];

      let bgColor = [255, 255, 255]; // Default to white
      const tolerance = 50;

      // Use first corner as background color
      const firstCornerIndex = 0;
      bgColor = [data[firstCornerIndex], data[firstCornerIndex + 1], data[firstCornerIndex + 2]];

      // Remove background
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const colorDistance = Math.sqrt(
          Math.pow(r - bgColor[0], 2) + Math.pow(g - bgColor[1], 2) + Math.pow(b - bgColor[2], 2),
        );

        if (colorDistance <= tolerance) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Create new image from canvas
      const newImg = new Image();
      newImg.onload = () => {
        setOriginalImage(newImg);
        alert('✅ Background removed from sprite sheet!');
      };
      newImg.src = canvas.toDataURL();
    } catch (error) {
      console.error('Error removing background:', error);
      alert('❌ Failed to remove background. Please try again.');
    } finally {
      setIsRemovingBackgrounds(false);
    }
  };

  // Function to remove shadows from the original sprite image
  const removeShadowsFromAvatars = async () => {
    if (!originalImage) {
      alert('Please upload a sprite sheet first!');
      return;
    }

    setIsRemovingBackgrounds(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      ctx.drawImage(originalImage, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Enhanced shadow detection algorithm
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip already transparent pixels
        if (a === 0) continue;

        // Calculate luminance
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        // Calculate saturation to preserve colored clothing
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;

        // Enhanced shadow detection criteria
        const isDarkEnough = luminance < 80; // Darker threshold
        const hasLowSaturation = saturation < 0.3; // Low saturation indicates shadow
        const hasLowVariance = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;

        // Multi-layer validation for shadow detection
        const isLikelyShadow = isDarkEnough && hasLowSaturation && hasLowVariance;

        // Additional context check - examine surrounding pixels for validation
        const x = (i / 4) % canvas.width;
        const y = Math.floor(i / 4 / canvas.width);

        let shadowConfidence = 0;

        // Check nearby pixels to confirm shadow characteristics
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
              const ni = (ny * canvas.width + nx) * 4;
              const nr = data[ni];
              const ng = data[ni + 1];
              const nb = data[ni + 2];

              const nLuminance = 0.299 * nr + 0.587 * ng + 0.114 * nb;
              const nMax = Math.max(nr, ng, nb);
              const nMin = Math.min(nr, ng, nb);
              const nSaturation = nMax === 0 ? 0 : (nMax - nMin) / nMax;

              if (nLuminance < 80 && nSaturation < 0.3) {
                shadowConfidence++;
              }
            }
          }
        }

        // Only remove if high confidence it's a shadow and in likely shadow areas
        const isInShadowArea = y > canvas.height * 0.7; // Bottom portion more likely to have shadows
        const hasHighShadowConfidence = shadowConfidence >= 5;

        if (isLikelyShadow && (isInShadowArea || hasHighShadowConfidence)) {
          data[i + 3] = 0; // Make transparent
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Create new image from canvas
      const newImg = new Image();
      newImg.onload = () => {
        setOriginalImage(newImg);
        alert('✅ Shadows removed from sprite sheet!');
      };
      newImg.src = canvas.toDataURL();
    } catch (error) {
      console.error('Error removing shadows:', error);
      alert('❌ Failed to remove shadows. Please try again.');
    } finally {
      setIsRemovingBackgrounds(false);
    }
  };

  const generateConfig = () => {
    if (processedAvatars.length === 0) {
      alert('Please process the sprite sheet first!');
      return;
    }

    // Extended avatar names for up to 30 avatars
    const avatarNames = [
      'Marcus',
      'Elena',
      'Kai',
      'Sophie',
      'Diego',
      'Amara',
      'Jin',
      'Isabella',
      'Alex',
      'Maya',
      'Zion',
      'Luna',
      'Dante',
      'Aria',
      'Jaxon',
      'Nyla',
      'Phoenix',
      'Sage',
      'River',
      'Nova',
      'Atlas',
      'Iris',
      'Orion',
      'Zara',
      'Blaze',
      'Skye',
      'Storm',
      'Jade',
      'Neo',
      'Raven',
    ];

    const descriptions = [
      'Confident Male Singer',
      'Dynamic Female Performer',
      'Energetic Male Artist',
      'Elegant Female Singer',
      'Passionate Male Vocalist',
      'Powerful Female Artist',
      'Creative Male Performer',
      'Charismatic Female Singer',
      'Versatile Performer',
      'Soulful Artist',
      'Bold Male Star',
      'Graceful Female Singer',
      'Intense Male Performer',
      'Melodic Female Artist',
      'Rhythmic Male Singer',
      'Harmonic Female Star',
      'Fierce Male Artist',
      'Serene Female Performer',
      'Dynamic Male Singer',
      'Cosmic Female Artist',
      'Strong Male Performer',
      'Colorful Female Singer',
      'Stellar Male Artist',
      'Exotic Female Star',
      'Fiery Male Singer',
      'Ethereal Female Performer',
      'Electric Male Artist',
      'Natural Female Singer',
      'Modern Male Star',
      'Mysterious Female Artist',
    ];

    const ethnicities = [
      'African American',
      'Hispanic',
      'Asian',
      'Caucasian',
      'Mixed Heritage',
      'Middle Eastern',
      'Native American',
      'South Asian',
      'Pacific Islander',
      'African',
      'European',
      'Caribbean',
    ];

    let config = 'const AVAILABLE_AVATARS = [\n';

    processedAvatars.forEach((avatar, index) => {
      const name = avatarNames[index] || `Avatar${index + 1}`;
      const description = descriptions[index] || `Performer ${index + 1}`;
      const gender = index % 2 === 0 ? 'male' : 'female';
      const ethnicity = ethnicities[index % ethnicities.length] || 'Mixed Heritage';

      config += `  {\n`;
      config += `    id: '${avatar.name}',\n`;
      config += `    name: '${name}',\n`;
      config += `    description: '${description}',\n`;
      config += `    gender: '${gender}',\n`;
      config += `    ethnicity: '${ethnicity}',\n`;
      config += `    imagePath: '/images/avatar/${avatar.name}.png',\n`;
      config += `  },\n`;
    });

    config += '];';

    // Copy to clipboard
    navigator.clipboard.writeText(config).then(() => {
      alert('Configuration copied to clipboard!');
    });

    setShowConfig(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            mb: 1,
          }}
        >
          🎭 Avatar Sprite Cutter
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload your sprite sheet and automatically cut it into individual avatars with background
          removal
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              border: `2px dashed ${dragActive ? theme.palette.primary.main : theme.palette.divider}`,
              backgroundColor: dragActive
                ? alpha(theme.palette.primary.main, 0.05)
                : 'background.paper',
              transition: 'all 0.3s ease',
            }}
          >
            <CardContent
              sx={{
                p: 4,
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpg,image/jpeg"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              <Box
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                sx={{ cursor: 'pointer', py: 4 }}
              >
                <FontAwesomeIcon
                  icon={faFileImage}
                  size="3x"
                  style={{
                    color: dragActive ? theme.palette.primary.main : theme.palette.text.secondary,
                    marginBottom: 16,
                  }}
                />
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Drop your sprite sheet here
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to browse files
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: 'block' }}
                >
                  Supports PNG, JPG, JPEG
                </Typography>
              </Box>

              {originalImage && (
                <Box sx={{ mt: 3 }}>
                  <Chip
                    icon={<FontAwesomeIcon icon={faFileImage} />}
                    label={`${originalImage.width} × ${originalImage.height}px`}
                    color="success"
                    variant="outlined"
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Configuration Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <FontAwesomeIcon
                  icon={faCog}
                  style={{ marginRight: 8, color: theme.palette.primary.main }}
                />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Configuration
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <TextField
                    label="Grid Columns"
                    type="number"
                    value={columns}
                    onChange={(e) =>
                      setColumns(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))
                    }
                    fullWidth
                    size="small"
                    inputProps={{ min: 1, max: 20 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Grid Rows"
                    type="number"
                    value={rows}
                    onChange={(e) =>
                      setRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))
                    }
                    fullWidth
                    size="small"
                    inputProps={{ min: 1, max: 20 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Background Tolerance: {tolerance}
                  </Typography>
                  <Slider
                    value={tolerance}
                    onChange={(_, value) => setTolerance(value as number)}
                    min={0}
                    max={255}
                    step={5}
                    marks={[
                      { value: 0, label: '0' },
                      { value: 50, label: '50' },
                      { value: 100, label: '100' },
                      { value: 255, label: '255' },
                    ]}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Output Size (px)"
                    type="number"
                    value={outputSize}
                    onChange={(e) =>
                      setOutputSize(Math.max(50, Math.min(500, parseInt(e.target.value) || 200)))
                    }
                    fullWidth
                    size="small"
                    inputProps={{ min: 50, max: 500 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Base File Name"
                    value={baseName}
                    onChange={(e) => setBaseName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    fullWidth
                    size="small"
                    placeholder="e.g., mic_base, avatar, icon"
                    helperText={`Files will be named: ${baseName}_1.png, ${baseName}_2.png, ${baseName}_3.png, etc.`}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<FontAwesomeIcon icon={faMagic} />}
                  onClick={autoDetectGrid}
                  disabled={!originalImage}
                  size="small"
                >
                  Auto-Detect
                </Button>
                <Button
                  variant="contained"
                  startIcon={<FontAwesomeIcon icon={faTh} />}
                  onClick={processSprite}
                  disabled={!originalImage || isProcessing}
                  size="small"
                >
                  {isProcessing ? <CircularProgress size={16} color="inherit" /> : 'Process'}
                </Button>
                {/* Enhanced Controls */}
                <Button
                  variant="outlined"
                  startIcon={<FontAwesomeIcon icon={faEraser} />}
                  onClick={removeBackgroundsFromAvatars}
                  disabled={!originalImage || isRemovingBackgrounds}
                  size="small"
                  color="secondary"
                >
                  {isRemovingBackgrounds ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    'Remove Background'
                  )}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FontAwesomeIcon icon={faSun} />}
                  onClick={removeShadowsFromAvatars}
                  disabled={!originalImage || isRemovingBackgrounds}
                  size="small"
                  color="warning"
                >
                  {isRemovingBackgrounds ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    'Remove Shadow'
                  )}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Original Image Preview */}
        {originalImage && (
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
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Original Sprite Sheet
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      startIcon={<FontAwesomeIcon icon={faUndo} />}
                      onClick={undoChanges}
                      disabled={!originalUnmodifiedImage}
                      size="small"
                      color="warning"
                    >
                      Undo
                    </Button>
                    <Tooltip title="Save image to your chosen location (modern browsers support directory picker)">
                      <Button
                        variant="outlined"
                        startIcon={<FontAwesomeIcon icon={faFileImage} />}
                        onClick={saveProcessedSprite}
                        disabled={!originalImage}
                        size="small"
                        color="info"
                      >
                        Save To...
                      </Button>
                    </Tooltip>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <img
                    src={originalImage.src}
                    alt="Original sprite sheet"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain',
                      borderRadius: 8,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block' }}
                  >
                    {originalImage.width} × {originalImage.height} pixels • {columns * rows} total
                    avatars
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Results Section */}
        {processedAvatars.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Processed Avatars ({processedAvatars.length})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      startIcon={<FontAwesomeIcon icon={faMagic} />}
                      onClick={applyBulkRename}
                      size="small"
                      disabled={!baseName.trim()}
                    >
                      Rename All
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<FontAwesomeIcon icon={faDownload} />}
                      onClick={downloadAll}
                      size="small"
                    >
                      Download All
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<FontAwesomeIcon icon={faFileArchive} />}
                      onClick={downloadAsZip}
                      disabled={isDownloading}
                      size="small"
                    >
                      {isDownloading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        'Download ZIP'
                      )}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<FontAwesomeIcon icon={faCog} />}
                      onClick={generateConfig}
                      size="small"
                    >
                      Generate Config
                    </Button>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  {processedAvatars.map((avatar, index) => (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
                      <Paper
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 2,
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: theme.shadows[4],
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <canvas
                          ref={(canvas) => {
                            if (canvas && avatar.canvas) {
                              const ctx = canvas.getContext('2d');
                              canvas.width = 100;
                              canvas.height = 100;
                              ctx?.drawImage(avatar.canvas, 0, 0, 100, 100);
                            }
                          }}
                          style={{
                            borderRadius: 8,
                            border: `1px solid ${theme.palette.divider}`,
                            backgroundColor: alpha(theme.palette.grey[100], 0.5),
                          }}
                        />
                        <TextField
                          value={avatar.name}
                          onChange={(e) =>
                            updateAvatarName(index, e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))
                          }
                          size="small"
                          sx={{
                            mt: 1,
                            '& .MuiInputBase-input': {
                              textAlign: 'center',
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                            },
                          }}
                          placeholder="filename"
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Configuration Output */}
        {showConfig && (
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
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Generated Configuration
                  </Typography>
                  <IconButton onClick={() => setShowConfig(false)} size="small">
                    <FontAwesomeIcon icon={faTimes} />
                  </IconButton>
                </Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Configuration has been copied to your clipboard!
                </Alert>
                <Typography variant="caption" color="text.secondary">
                  Use this configuration in your avatar system to define the processed avatars.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
});

export default SpriteCutter;
