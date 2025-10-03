import {
  faCrown,
  faGripVertical,
  faMusic,
  faPlay,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState } from 'react';
import { QueueEntry } from '../../types/live-show.types';

interface UniqueSinger {
  userId: string;
  userName: string;
  stageName?: string;
  avatar?: any;
  songCount: number;
  nextSong?: string;
  isCurrentSinger: boolean;
}

interface DJRotationManagementProps {
  queue: QueueEntry[];
  isDJ: boolean;
  onReorderSingers: (newOrder: string[]) => void;
  onSetCurrentSinger: (userId: string) => void;
}

export const DJRotationManagement: React.FC<DJRotationManagementProps> = ({
  queue,
  isDJ,
  onReorderSingers,
  onSetCurrentSinger,
}) => {
  const theme = useTheme();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Group queue entries by unique singers
  const getUniqueSingers = (): UniqueSinger[] => {
    const singerMap = new Map<string, UniqueSinger>();

    queue.forEach((entry) => {
      if (singerMap.has(entry.userId)) {
        const singer = singerMap.get(entry.userId)!;
        singer.songCount++;
        // Keep the earliest song as the "next song"
        if (!singer.nextSong) {
          singer.nextSong = entry.songRequest;
        }
        if (entry.isCurrentSinger) {
          singer.isCurrentSinger = true;
        }
      } else {
        singerMap.set(entry.userId, {
          userId: entry.userId,
          userName: entry.userName,
          stageName: entry.stageName,
          avatar: entry.avatar,
          songCount: 1,
          nextSong: entry.songRequest,
          isCurrentSinger: entry.isCurrentSinger,
        });
      }
    });

    // Sort by queue position (first occurrence of each singer)
    const sortedSingers = Array.from(singerMap.values()).sort((a, b) => {
      const aFirstEntry = queue.find((entry) => entry.userId === a.userId);
      const bFirstEntry = queue.find((entry) => entry.userId === b.userId);
      return (aFirstEntry?.position || 0) - (bFirstEntry?.position || 0);
    });

    return sortedSingers;
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, userId: string) => {
    if (!isDJ) return;
    setDraggedItem(userId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', userId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDJ) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetUserId: string) => {
    if (!isDJ) return;
    e.preventDefault();

    if (!draggedItem || draggedItem === targetUserId) {
      setDraggedItem(null);
      return;
    }

    // Reorder the singers
    const singers = getUniqueSingers();
    const draggedIndex = singers.findIndex((singer) => singer.userId === draggedItem);
    const targetIndex = singers.findIndex((singer) => singer.userId === targetUserId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    // Move the dragged singer to the target position
    const newSingers = [...singers];
    const [draggedSinger] = newSingers.splice(draggedIndex, 1);
    newSingers.splice(targetIndex, 0, draggedSinger);

    // Call the reorder callback with the new singer order
    const reorderedIds = newSingers.map((singer) => singer.userId);
    onReorderSingers(reorderedIds);

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const uniqueSingers = getUniqueSingers();

  if (!isDJ) {
    return null; // Only show to DJs
  }

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon icon={faCrown} />
          <Typography variant="h6">Singer Rotation ({uniqueSingers.length})</Typography>
        </Box>
        <Tooltip title="Drag singers to reorder the rotation">
          <Chip
            icon={<FontAwesomeIcon icon={faGripVertical} />}
            label="Drag to Reorder"
            size="small"
            variant="outlined"
          />
        </Tooltip>
      </Box>

      {/* Singer List */}
      {uniqueSingers.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            color: 'text.secondary',
          }}
        >
          <FontAwesomeIcon icon={faUsers} style={{ fontSize: '2rem', marginBottom: '16px' }} />
          <Typography variant="body1">No singers in queue yet</Typography>
          <Typography variant="body2">
            Singers will appear here once they submit song requests
          </Typography>
        </Box>
      ) : (
        <List sx={{ '& .MuiListItem-root': { mb: 1 } }}>
          {uniqueSingers.map((singer) => (
            <ListItem
              key={singer.userId}
              draggable={isDJ}
              onDragStart={(e) => handleDragStart(e, singer.userId)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, singer.userId)}
              onDragEnd={handleDragEnd}
              sx={{
                border: `2px solid ${
                  singer.isCurrentSinger
                    ? theme.palette.primary.main
                    : draggedItem === singer.userId
                      ? theme.palette.secondary.main
                      : 'transparent'
                }`,
                borderRadius: 2,
                backgroundColor: singer.isCurrentSinger
                  ? `${theme.palette.primary.main}10`
                  : draggedItem === singer.userId
                    ? `${theme.palette.secondary.main}10`
                    : theme.palette.background.paper,
                cursor: isDJ ? 'grab' : 'default',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: `${theme.palette.action.hover}`,
                  transform: isDJ ? 'translateY(-1px)' : 'none',
                },
                '&:active': {
                  cursor: isDJ ? 'grabbing' : 'default',
                },
              }}
            >
              <ListItemAvatar>
                <Avatar
                  src={singer.avatar?.imageUrl}
                  sx={{
                    border: singer.isCurrentSinger
                      ? `3px solid ${theme.palette.primary.main}`
                      : 'none',
                  }}
                >
                  {singer.stageName?.[0] || singer.userName[0]}
                </Avatar>
              </ListItemAvatar>

              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" component="div">
                      {singer.stageName || singer.userName}
                    </Typography>
                    {singer.isCurrentSinger && (
                      <Chip
                        icon={<FontAwesomeIcon icon={faPlay} />}
                        label="Now Singing"
                        size="small"
                        sx={{
                          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    )}
                    <Chip
                      label={`${singer.songCount} song${singer.songCount !== 1 ? 's' : ''}`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={faMusic} style={{ fontSize: '0.8rem' }} />
                    <Typography variant="body2" component="div">
                      Next: {singer.nextSong || 'No song specified'}
                    </Typography>
                  </Box>
                }
              />

              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {!singer.isCurrentSinger && (
                    <Tooltip title="Set as current singer">
                      <IconButton
                        size="small"
                        onClick={() => onSetCurrentSinger(singer.userId)}
                        sx={{
                          color: theme.palette.primary.main,
                          '&:hover': {
                            backgroundColor: `${theme.palette.primary.main}20`,
                          },
                        }}
                      >
                        <FontAwesomeIcon icon={faPlay} />
                      </IconButton>
                    </Tooltip>
                  )}

                  {isDJ && (
                    <Tooltip title="Drag to reorder">
                      <IconButton
                        size="small"
                        sx={{
                          cursor: 'grab',
                          color: theme.palette.text.secondary,
                          '&:active': { cursor: 'grabbing' },
                        }}
                      >
                        <FontAwesomeIcon icon={faGripVertical} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Instructions */}
      <Box sx={{ mt: 2, p: 2, backgroundColor: `${theme.palette.info.main}10`, borderRadius: 2 }}>
        <Typography variant="caption" color="text.secondary" component="div">
          <strong>DJ Rotation Management:</strong>
          <br />
          • Drag singers to change the order of who sings next
          <br />
          • Each singer's song count shows their total queue entries
          <br />
          • Click the play button to make a singer current
          <br />• The rotation affects the order in which singers are called up
        </Typography>
      </Box>
    </Paper>
  );
};

export default DJRotationManagement;
