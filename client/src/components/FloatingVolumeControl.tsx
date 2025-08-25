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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    audioStore.setVolume(Array.isArray(newValue) ? newValue[0] : newValue);
  };

  const getVolumeIcon = () => {
    if (audioStore.volume === 0) return faVolumeMute;
    if (audioStore.volume < 0.5) return faVolumeDown;
    return faVolumeUp;
  };

  if (!audioStore.isPlaying && !audioStore.currentlyPlaying) {
    return null;
  }

  return (
    <Slide direction="up" in={audioStore.isPlaying || !!audioStore.currentlyPlaying} timeout={300}>
      <Card
        sx={{
          position: 'fixed',
          bottom: isMobile ? 16 : 24,
          left: `calc(50% - ${isMobile ? 160 : 200}px)`,
          zIndex: 1300,
          background: `linear-gradient(135deg, ${theme.palette.background.paper}dd, ${theme.palette.background.default}dd)`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          p: isMobile ? 1.5 : 2,
          width: isMobile ? 320 : 400,
          boxShadow: `0 8px 32px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Play/Pause Button */}
          <IconButton
            onClick={audioStore.isPlaying ? audioStore.pauseAudio : audioStore.resumeAudio}
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
              width: 40,
              height: 40,
            }}
          >
            <FontAwesomeIcon icon={audioStore.isPlaying ? faPause : faPlay} size="sm" />
          </IconButton>

          {/* Song Info */}
          <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}
            >
              {audioStore.currentSong?.title || 'Unknown Song'}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.1,
              }}
            >
              {audioStore.currentSong?.artist || 'Unknown Artist'}
            </Typography>
          </Box>

          {/* Volume Controls */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: isMobile ? 80 : 100 }}
          >
            <IconButton
              size="small"
              onClick={() => audioStore.setVolume(audioStore.volume === 0 ? 0.5 : 0)}
              sx={{ color: theme.palette.text.secondary }}
            >
              <FontAwesomeIcon icon={getVolumeIcon()} size="xs" />
            </IconButton>

            <Slider
              size="small"
              value={audioStore.volume}
              onChange={handleVolumeChange}
              min={0}
              max={1}
              step={0.1}
              sx={{
                width: isMobile ? 60 : 80,
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                },
                '& .MuiSlider-track': {
                  height: 3,
                },
                '& .MuiSlider-rail': {
                  height: 3,
                },
              }}
            />
          </Box>

          {/* Stop Button */}
          <IconButton
            size="small"
            onClick={audioStore.stopAudio}
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                color: theme.palette.error.main,
              },
            }}
          >
            <Box
              sx={{ width: 12, height: 12, backgroundColor: 'currentColor', borderRadius: 0.5 }}
            />
          </IconButton>
        </Box>
      </Card>
    </Slide>
  );
});

export default FloatingVolumeControl;
