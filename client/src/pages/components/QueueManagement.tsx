import {
  faCrown,
  faGripVertical,
  faMinus,
  faMusic,
  faPlay,
  faPlus,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Avatar,
  Box,
  Button,
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
import { LiveShowUtils } from '../../utils/live-show.utils';
import SongRequestModal from './SongRequestModal';
import { musicStore } from '../../stores/MusicStore';

interface QueueManagementProps {
  queue: QueueEntry[];
  currentSinger?: QueueEntry;
  isDJ: boolean;
  currentUserId: string;
  isUserInQueue: boolean;
  onJoinQueue: (songRequest?: string) => void;
  onLeaveQueue: () => void;
  onReorderQueue: (newOrder: string[]) => void;
  onRemoveFromQueue: (userId: string) => void;
  onSetCurrentSinger: (userId: string) => void;
}

export const QueueManagement: React.FC<QueueManagementProps> = ({
  queue,
  isDJ,
  currentUserId,
  isUserInQueue,
  onJoinQueue,
  onLeaveQueue,
  onReorderQueue,
  onRemoveFromQueue,
  onSetCurrentSinger,
}) => {
  const theme = useTheme();
  const [songRequestModalOpen, setSongRequestModalOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const handleJoinQueue = (songRequest: string) => {
    onJoinQueue(songRequest);
    setSongRequestModalOpen(false);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, userId: string) => {
    setDraggedItem(userId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', userId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetUserId: string) => {
    e.preventDefault();

    if (!draggedItem || draggedItem === targetUserId) {
      setDraggedItem(null);
      return;
    }

    // Reorder the queue
    const newQueue = [...sortedQueue];
    const draggedIndex = newQueue.findIndex((entry) => entry.userId === draggedItem);
    const targetIndex = newQueue.findIndex((entry) => entry.userId === targetUserId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    // Move the dragged item to the target position
    const [draggedEntry] = newQueue.splice(draggedIndex, 1);
    newQueue.splice(targetIndex, 0, draggedEntry);

    // Update positions and call onReorderQueue
    const reorderedIds = newQueue.map((entry) => entry.userId);
    onReorderQueue(reorderedIds);

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const sortedQueue = LiveShowUtils.sortQueueByPosition(queue);
  const queueStats = LiveShowUtils.getQueueStats(queue, currentUserId);

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon icon={faUsers} />
          <Typography variant="h6">Queue ({queue.length})</Typography>
        </Box>

        {/* Queue Actions */}
        {!isDJ && (
          <Box>
            {isUserInQueue ? (
              <Button
                variant="outlined"
                color="error"
                startIcon={<FontAwesomeIcon icon={faMinus} />}
                onClick={onLeaveQueue}
              >
                Leave Queue
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<FontAwesomeIcon icon={faPlus} />}
                onClick={() => setSongRequestModalOpen(true)}
              >
                Join Queue
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* Queue Stats */}
      {queueStats && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {LiveShowUtils.formatQueueStats(queueStats)}
          </Typography>
        </Box>
      )}

      {/* Queue List */}
      {sortedQueue.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            color: 'text.secondary',
          }}
        >
          <FontAwesomeIcon
            icon={faMusic}
            style={{ fontSize: '2rem', marginBottom: 16, opacity: 0.5 }}
          />
          <Typography variant="body1" component="div">
            No one in queue yet
          </Typography>
          <Typography variant="body2" component="div">
            Be the first to join and start singing!
          </Typography>
        </Box>
      ) : (
        <List sx={{ '& .MuiListItem-root': { mb: 1 } }}>
          {sortedQueue.map((entry) => {
            const displayName = entry.stageName || entry.userName;
            const isCurrentUser = entry.userId === currentUserId;
            const isCurrentSinger = entry.isCurrentSinger;

            return (
              <ListItem
                key={entry.id}
                draggable={isDJ && !isCurrentSinger}
                onDragStart={(e) => handleDragStart(e, entry.userId)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, entry.userId)}
                onDragEnd={handleDragEnd}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  backgroundColor: isCurrentSinger
                    ? `${theme.palette.primary.main}15`
                    : isCurrentUser
                      ? `${theme.palette.secondary.main}10`
                      : 'transparent',
                  borderColor: isCurrentSinger ? theme.palette.primary.main : theme.palette.divider,
                  opacity: draggedItem === entry.userId ? 0.5 : 1,
                  '&:hover': {
                    backgroundColor: isCurrentSinger
                      ? `${theme.palette.primary.main}20`
                      : `${theme.palette.action.hover}`,
                  },
                }}
              >
                {/* Drag Handle (DJ only) */}
                {isDJ && !isCurrentSinger && (
                  <Box
                    sx={{
                      mr: 1,
                      cursor: draggedItem === entry.userId ? 'grabbing' : 'grab',
                      color: 'text.secondary',
                      opacity: draggedItem === entry.userId ? 0.7 : 1,
                    }}
                  >
                    <FontAwesomeIcon icon={faGripVertical} />
                  </Box>
                )}

                {/* Position Number */}
                <Box
                  sx={{
                    minWidth: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: isCurrentSinger
                      ? theme.palette.primary.main
                      : theme.palette.background.paper,
                    color: isCurrentSinger
                      ? theme.palette.primary.contrastText
                      : theme.palette.text.secondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    mr: 2,
                    border: `2px solid ${isCurrentSinger ? 'transparent' : theme.palette.divider}`,
                  }}
                >
                  {isCurrentSinger ? (
                    <FontAwesomeIcon icon={faPlay} style={{ fontSize: '0.7rem' }} />
                  ) : (
                    entry.position
                  )}
                </Box>

                <ListItemAvatar>
                  <Avatar
                    src={entry.avatar?.imageUrl}
                    sx={{
                      border: isCurrentUser ? `2px solid ${theme.palette.secondary.main}` : 'none',
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: isCurrentSinger ? 700 : 500,
                          color: isCurrentSinger ? theme.palette.primary.main : 'text.primary',
                        }}
                      >
                        {displayName}
                      </Typography>
                      {isCurrentUser && <Chip label="You" size="small" color="secondary" />}
                      {isCurrentSinger && (
                        <Chip
                          icon={<FontAwesomeIcon icon={faPlay} />}
                          label="Now Singing"
                          size="small"
                          color="primary"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      {entry.songRequest && (
                        <Typography variant="body2" color="text.secondary">
                          🎵 {entry.songRequest}
                          {entry.songDuration && (
                            <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                              ({musicStore.formatDuration(entry.songDuration)})
                            </span>
                          )}
                        </Typography>
                      )}
                      {entry.microphone && (
                        <Typography variant="caption" color="text.secondary">
                          🎤 {entry.microphone.name}
                        </Typography>
                      )}
                    </Box>
                  }
                />

                {/* DJ Actions */}
                {isDJ && !isCurrentSinger && (
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Make Current Singer">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => onSetCurrentSinger(entry.userId)}
                        >
                          <FontAwesomeIcon icon={faPlay} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove from Queue">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onRemoveFromQueue(entry.userId)}
                        >
                          <FontAwesomeIcon icon={faMinus} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            );
          })}
        </List>
      )}

      {/* DJ Instructions */}
      {isDJ && sortedQueue.length > 0 && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            backgroundColor: `${theme.palette.info.main}10`,
            borderRadius: 1,
            border: `1px solid ${theme.palette.info.main}30`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <FontAwesomeIcon icon={faCrown} style={{ color: theme.palette.info.main }} />
            <Typography variant="body2" component="span" fontWeight={600}>
              DJ Controls
            </Typography>
          </Box>
          <Typography variant="caption" component="div" color="text.secondary">
            • Drag items to reorder the queue
            <br />
            • Click play button to set current singer
            <br />• Click minus to remove someone from queue
          </Typography>
        </Box>
      )}

      {/* Song Request Modal */}
      <SongRequestModal
        open={songRequestModalOpen}
        onClose={() => setSongRequestModalOpen(false)}
        onSubmit={handleJoinQueue}
        isForQueue={true}
      />
    </Paper>
  );
};
