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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState } from 'react';
import { QueueEntry } from '../../types/live-show.types';
import { LiveShowUtils } from '../../utils/live-show.utils';

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
  onRemoveFromQueue,
  onSetCurrentSinger,
}) => {
  const theme = useTheme();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [songRequest, setSongRequest] = useState('');

  const handleJoinQueue = () => {
    onJoinQueue(songRequest.trim() || undefined);
    setSongRequest('');
    setJoinDialogOpen(false);
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
                onClick={() => setJoinDialogOpen(true)}
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
          <Typography variant="body1">No one in queue yet</Typography>
          <Typography variant="body2">Be the first to join and start singing!</Typography>
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
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  backgroundColor: isCurrentSinger
                    ? `${theme.palette.primary.main}15`
                    : isCurrentUser
                      ? `${theme.palette.secondary.main}10`
                      : 'transparent',
                  borderColor: isCurrentSinger ? theme.palette.primary.main : theme.palette.divider,
                  '&:hover': {
                    backgroundColor: isCurrentSinger
                      ? `${theme.palette.primary.main}20`
                      : `${theme.palette.action.hover}`,
                  },
                }}
              >
                {/* Drag Handle (DJ only) */}
                {isDJ && (
                  <Box sx={{ mr: 1, cursor: 'grab', color: 'text.secondary' }}>
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
            <Typography variant="body2" fontWeight={600}>
              DJ Controls
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            • Drag items to reorder the queue
            <br />
            • Click play button to set current singer
            <br />• Click minus to remove someone from queue
          </Typography>
        </Box>
      )}

      {/* Join Queue Dialog */}
      <Dialog
        open={joinDialogOpen}
        onClose={() => setJoinDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Join the Queue</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add yourself to the singing queue. Optionally, let everyone know what song you're
            planning to sing!
          </Typography>

          <TextField
            fullWidth
            label="Song Request (Optional)"
            placeholder="e.g., Bohemian Rhapsody - Queen"
            value={songRequest}
            onChange={(e) => setSongRequest(e.target.value)}
            InputProps={{
              startAdornment: (
                <FontAwesomeIcon
                  icon={faMusic}
                  style={{ marginRight: 8, color: theme.palette.text.secondary }}
                />
              ),
            }}
          />

          {queueStats && (
            <Box sx={{ mt: 2, p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                You'll be position #{queueStats.totalInQueue + 1} in the queue
                {queueStats.totalInQueue > 0 && (
                  <> • Estimated wait: ~{Math.ceil(queueStats.totalInQueue * 3.5)} minutes</>
                )}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleJoinQueue}>
            Join Queue
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
