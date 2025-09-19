import {
  faCog,
  faDownload,
  faFileArchive,
  faFileImage,
  faMagic,
  faTh,
  faTimes,
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
  Typography,
  useTheme,
} from '@mui/material';
import JSZip from 'jszip';
import { observer } from 'mobx-react-lite';
import React, { useRef, useState } from 'react';

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
      alert('Please select a valid image file (PNG, JPG, JPEG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
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
      alert('Please upload an image first!');
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
      alert('Please upload an image first!');
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
      alert('Please process the sprite sheet first!');
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
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Original Image Preview */}
        {originalImage && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Original Sprite Sheet
                </Typography>
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
