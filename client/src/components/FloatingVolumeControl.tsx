import {
  faPause,
  faPlay,
  faVolumeDown,
  faVolumeMute,
  faVolumeUp,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Card,
  IconButton,
  Slide,
  Slider,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { audioStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';

export const FloatingVolumeControl: React.FC = observer(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    const volume = Array.isArray(newValue) ? newValue[0] : newValue;
    audioStore.setVolume(volume / 100); // Convert percentage to decimal
  };

  const getVolumeIcon = () => {
    if (audioStore.volume === 0) return faVolumeMute;
    if (audioStore.volume < 0.5) return faVolumeDown;
    return faVolumeUp;
  };

  // Don't render if no audio is playing
  if (!audioStore.currentlyPlaying || !audioStore.currentSong) {
    return null;
  }

  return (
    <Slide direction="up" in={!!audioStore.currentlyPlaying} mountOnEnter unmountOnExit>
      <Card
        sx={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1300,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          boxShadow: theme.shadows[8],
          overflow: 'visible',
          width: isMobile ? 'calc(100vw - 40px)' : 'auto',
          minWidth: isMobile ? 280 : 350,
          maxWidth: isMobile ? 320 : 450,
        }}
      >
        {/* Main control bar */}
        <Box
          sx={{
            p: isMobile ? 1.5 : 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? 1 : 2,
            flexDirection: isMobile ? 'column' : 'row',
          }}
        >
          {/* Song info and controls row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 1 : 2,
              width: isMobile ? '100%' : 'auto',
              flex: isMobile ? 'none' : 1,
            }}
          >
            {/* Song info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant={isMobile ? 'body2' : 'body1'}
                fontWeight={600}
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: isMobile ? '0.85rem' : '0.95rem',
                }}
              >
                {audioStore.currentSong.title}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                  fontSize: isMobile ? '0.7rem' : '0.75rem',
                }}
              >
                {audioStore.currentSong.artist}
              </Typography>
            </Box>

            {/* Control buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Play/Pause button */}
              <IconButton
                size="small"
                onClick={() => audioStore.togglePlayPause()}
                sx={{
                  backgroundColor: audioStore.isPlaying
                    ? theme.palette.success.main // Green for pause
                    : theme.palette.info.main, // Cyan/Blue for play
                  color: 'white',
                  '&:hover': {
                    backgroundColor: audioStore.isPlaying
                      ? theme.palette.success.dark // Darker green for pause hover
                      : theme.palette.info.dark, // Darker cyan for play hover
                  },
                  width: isMobile ? 32 : 36,
                  height: isMobile ? 32 : 36,
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <FontAwesomeIcon
                  icon={audioStore.isPlaying ? faPause : faPlay}
                  style={{ fontSize: isMobile ? '12px' : '14px' }}
                />
              </IconButton>

              {/* Stop button */}
              <IconButton
                size="small"
                onClick={() => audioStore.stopAudio()}
                sx={{
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                  width: isMobile ? 28 : 32,
                  height: isMobile ? 28 : 32,
                }}
              >
                <Typography variant="caption" sx={{ fontSize: isMobile ? '14px' : '16px' }}>
                  ✕
                </Typography>
              </IconButton>
            </Box>
          </Box>

          {/* Volume control row - always visible on desktop, compact on mobile */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              width: isMobile ? '100%' : 'auto',
              minWidth: isMobile ? 'auto' : 140,
              justifyContent: 'center',
              px: isMobile ? 0 : 1,
            }}
          >
            <FontAwesomeIcon
              icon={getVolumeIcon()}
              style={{
                fontSize: isMobile ? '12px' : '14px',
                color: theme.palette.text.secondary,
              }}
            />
            <Slider
              value={audioStore.volume * 100}
              onChange={handleVolumeChange}
              aria-labelledby="volume-slider"
              min={0}
              max={100}
              sx={{
                width: isMobile ? 100 : 80,
                '& .MuiSlider-thumb': {
                  width: isMobile ? 16 : 20,
                  height: isMobile ? 16 : 20,
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: '0px 0px 0px 8px rgba(25, 118, 210, 0.16)',
                  },
                },
                '& .MuiSlider-track': {
                  color: theme.palette.primary.main,
                },
                '& .MuiSlider-rail': {
                  color: theme.palette.grey[300],
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                minWidth: isMobile ? 24 : 30,
                textAlign: 'center',
                fontSize: isMobile ? '0.7rem' : '0.75rem',
                color: theme.palette.text.secondary,
              }}
            >
              {Math.round(audioStore.volume * 100)}%
            </Typography>
          </Box>
        </Box>
      </Card>
    </Slide>
  );
});

export default FloatingVolumeControl;
