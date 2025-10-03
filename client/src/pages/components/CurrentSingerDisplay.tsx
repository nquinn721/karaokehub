import { faClock, faHourglass, faMicrophone, faMusic } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Paper,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { QueueEntry } from '../../types/live-show.types';
// import { LiveShowUtils } from '../../utils/live-show.utils';

// Helper component for song duration display
interface SongDurationProps {
  currentSinger: QueueEntry;
  isDJ?: boolean;
  onSetSongDuration?: (userId: string, duration: number) => void;
  onStartSong?: (userId: string) => void;
}

const SongDurationDisplay: React.FC<SongDurationProps> = ({
  currentSinger,
  isDJ = false,
  onSetSongDuration,
  onStartSong,
}) => {
  const theme = useTheme();
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!currentSinger.songStartTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const start = new Date(currentSinger.songStartTime!);
      const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSinger.songStartTime]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show DJ controls even if no timing info is set yet
  const hasTimingInfo = currentSinger.songStartTime || currentSinger.songDuration;

  // If no song timing info and not a DJ, return null
  if (!hasTimingInfo && !isDJ) {
    return null;
  }

  const duration = currentSinger.songDuration || 0;
  const progress = duration > 0 ? Math.min(elapsedTime / duration, 1) : 0;
  const remainingTime = Math.max(duration - elapsedTime, 0);

  return (
    <Box sx={{ mb: 2, maxWidth: 400, mx: 'auto' }}>
      {/* Time Display */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon
            icon={faClock}
            style={{ color: theme.palette.text.secondary, fontSize: '0.9rem' }}
          />
          <Typography variant="body2" color="text.secondary" component="span">
            {formatTime(elapsedTime)}
          </Typography>
        </Box>
        {duration > 0 && (
          <Typography variant="body2" color="text.secondary" component="span">
            {formatTime(remainingTime)} remaining
          </Typography>
        )}
      </Box>

      {/* Progress Bar */}
      {duration > 0 && (
        <LinearProgress
          variant="determinate"
          value={progress * 100}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: `${theme.palette.primary.main}20`,
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            },
          }}
        />
      )}

      {/* DJ Controls */}
      {isDJ && (
        <DJSongControls
          currentSinger={currentSinger}
          onSetSongDuration={onSetSongDuration}
          onStartSong={onStartSong}
        />
      )}
    </Box>
  );
};

// DJ Controls component for managing song timing
const DJSongControls: React.FC<{
  currentSinger: QueueEntry;
  onSetSongDuration?: (userId: string, duration: number) => void;
  onStartSong?: (userId: string) => void;
}> = ({ currentSinger, onSetSongDuration, onStartSong }) => {
  const theme = useTheme();
  const [durationInput, setDurationInput] = useState('');

  const handleStartSong = () => {
    if (onStartSong) {
      onStartSong(currentSinger.userId);
    }
  };

  const handleSetDuration = () => {
    const duration = parseInt(durationInput);
    if (onSetSongDuration && duration > 0) {
      onSetSongDuration(currentSinger.userId, duration);
      setDurationInput('');
    }
  };

  return (
    <Box sx={{ mt: 2, p: 2, backgroundColor: `${theme.palette.warning.main}10`, borderRadius: 2 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        component="div"
        sx={{ mb: 1, display: 'block' }}
      >
        DJ Controls
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {!currentSinger.songStartTime && (
          <Button size="small" variant="contained" color="success" onClick={handleStartSong}>
            Start Song
          </Button>
        )}

        <TextField
          size="small"
          type="number"
          value={durationInput}
          onChange={(e) => setDurationInput(e.target.value)}
          placeholder="Duration (seconds)"
          sx={{ width: 140 }}
        />

        <Button
          size="small"
          variant="outlined"
          onClick={handleSetDuration}
          disabled={!durationInput || parseInt(durationInput) <= 0}
        >
          Set Duration
        </Button>
      </Box>
    </Box>
  );
};

interface CurrentSingerDisplayProps {
  currentSinger?: QueueEntry;
  nextInQueue?: QueueEntry[];
  isDJ?: boolean;
  onSetSongDuration?: (userId: string, duration: number) => void;
  onStartSong?: (userId: string) => void;
}

export const CurrentSingerDisplay: React.FC<CurrentSingerDisplayProps> = ({
  currentSinger,
  nextInQueue = [],
  isDJ = false,
  onSetSongDuration,
  onStartSong,
}) => {
  const theme = useTheme();

  if (!currentSinger) {
    return (
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`
              : `linear-gradient(135deg, ${theme.palette.primary.main}10, ${theme.palette.secondary.main}05)`,
        }}
      >
        <Box sx={{ mb: 2 }}>
          <FontAwesomeIcon
            icon={faMicrophone}
            style={{
              fontSize: '4rem',
              color: theme.palette.text.secondary,
              opacity: 0.5,
            }}
          />
        </Box>
        <Typography variant="h5" color="text.secondary" component="div" gutterBottom>
          No one is singing yet
        </Typography>
        <Typography variant="body2" color="text.secondary" component="div">
          Waiting for the first performer to take the stage
        </Typography>
      </Paper>
    );
  }

  const displayName = currentSinger.stageName || currentSinger.userName;

  return (
    <Box>
      {/* Current Singer */}
      <Paper
        sx={{
          p: 3,
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${theme.palette.primary.main}25, ${theme.palette.secondary.main}15)`
              : `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}08)`,
          border: `2px solid ${theme.palette.primary.main}40`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Spotlight Effect */}
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            background: `radial-gradient(circle, ${theme.palette.primary.main}20, transparent)`,
            borderRadius: '50%',
            animation: 'pulse 2s infinite',
          }}
        />

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, py: 4 }}>
          {/* Now Singing Label */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: '#ff4444',
                animation: 'pulse 1.5s infinite',
              }}
            />
            <Typography
              variant="h4"
              sx={{
                color: theme.palette.primary.main,
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              🎤 NOW SINGING
            </Typography>
          </Box>

          {/* Main Avatar and Microphone Display */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 6, mb: 3 }}>
            {/* Large Avatar */}
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={currentSinger.avatar?.imageUrl}
                sx={{
                  width: 200,
                  height: 200,
                  border: `6px solid ${theme.palette.primary.main}`,
                  fontSize: '4rem',
                  fontWeight: 800,
                  boxShadow: `0 0 40px ${theme.palette.primary.main}60, 0 0 80px ${theme.palette.primary.main}30`,
                  background:
                    theme.palette.mode === 'dark'
                      ? `linear-gradient(135deg, ${theme.palette.grey[800]}, ${theme.palette.grey[700]})`
                      : `linear-gradient(135deg, ${theme.palette.grey[200]}, ${theme.palette.grey[300]})`,
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </Avatar>

              {/* Spotlight Effect */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  left: -20,
                  right: -20,
                  bottom: -20,
                  borderRadius: '50%',
                  background: `conic-gradient(from 0deg, ${theme.palette.primary.main}20, transparent, ${theme.palette.secondary.main}20, transparent, ${theme.palette.primary.main}20)`,
                  animation: 'spotlightRotate 4s linear infinite',
                  zIndex: -1,
                }}
              />
            </Box>

            {/* Large Microphone Display */}
            {currentSinger.microphone && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: 3,
                    backgroundColor: theme.palette.background.paper,
                    border: `4px solid ${theme.palette.secondary.main}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 30px ${theme.palette.secondary.main}40`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    component="img"
                    src={currentSinger.microphone.imageUrl}
                    alt={currentSinger.microphone.name}
                    sx={{
                      width: 80,
                      height: 80,
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                    }}
                  />
                  {/* Shine Effect */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background:
                        'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                      animation: 'shine 3s ease-in-out infinite',
                    }}
                  />
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    color: theme.palette.secondary.main,
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  {currentSinger.microphone.name}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Singer Name */}
          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              mb: 2,
              color: theme.palette.text.primary,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1,
              textAlign: 'center',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {displayName}
          </Typography>

          {/* Song Request */}
          {currentSinger.songRequest && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <FontAwesomeIcon
                icon={faMusic}
                style={{ color: theme.palette.secondary.main, fontSize: '1.5rem' }}
              />
              <Typography
                variant="h5"
                sx={{
                  color: theme.palette.text.primary,
                  fontStyle: 'italic',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                "{currentSinger.songRequest}"
              </Typography>
            </Box>
          )}

          {/* Song Duration and Progress */}
          <SongDurationDisplay
            currentSinger={currentSinger}
            isDJ={isDJ}
            onSetSongDuration={onSetSongDuration}
            onStartSong={onStartSong}
          />
        </Box>
      </Paper>

      {/* Next in Queue */}
      {nextInQueue.length > 0 && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FontAwesomeIcon icon={faHourglass} style={{ color: theme.palette.text.secondary }} />
            <Typography variant="h6" color="text.secondary">
              Up Next
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {nextInQueue.map((singer, index) => {
              const nextDisplayName = singer.stageName || singer.userName;

              return (
                <Card
                  key={singer.id}
                  variant="outlined"
                  sx={{
                    backgroundColor:
                      index === 0 ? `${theme.palette.warning.main}15` : 'transparent',
                  }}
                >
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ position: 'relative' }}>
                        <Avatar
                          src={singer.avatar?.imageUrl}
                          sx={{
                            width: 48,
                            height: 48,
                            fontSize: '1.2rem',
                            border: `2px solid ${index === 0 ? theme.palette.warning.main : theme.palette.primary.main}`,
                          }}
                        >
                          {nextDisplayName.charAt(0).toUpperCase()}
                        </Avatar>

                        {/* Small Microphone Badge */}
                        {singer.microphone && (
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: -4,
                              right: -4,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              backgroundColor: theme.palette.background.paper,
                              border: `1px solid ${theme.palette.primary.main}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Box
                              component="img"
                              src={singer.microphone.imageUrl}
                              alt={singer.microphone.name}
                              sx={{
                                width: 12,
                                height: 12,
                                objectFit: 'contain',
                              }}
                            />
                          </Box>
                        )}
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>
                            #{singer.position}
                          </Typography>
                          <Typography variant="body1" fontWeight={600}>
                            {nextDisplayName}
                          </Typography>
                          {index === 0 && (
                            <Chip
                              label="Next Up"
                              size="small"
                              color="warning"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>

                        {singer.songRequest && (
                          <Typography
                            variant="caption"
                            component="div"
                            color="text.secondary"
                            sx={{ fontStyle: 'italic' }}
                          >
                            "{singer.songRequest}"
                          </Typography>
                        )}

                        {singer.microphone && (
                          <Typography
                            variant="caption"
                            component="div"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            🎤 {singer.microphone.name}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Paper>
      )}

      {/* CSS Animations */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.1); }
            100% { opacity: 0.4; transform: scale(1); }
          }
          
          @keyframes spotlightRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes shine {
            0% { left: -100%; }
            50% { left: 100%; }
            100% { left: 100%; }
          }
        `}
      </style>
    </Box>
  );
};
