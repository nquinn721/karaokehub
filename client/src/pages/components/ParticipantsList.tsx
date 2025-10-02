import {
  faChevronDown,
  faChevronRight,
  faCircle,
  faComment,
  faCrown,
  faEllipsisV,
  faMicrophone,
  faUserMinus,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  alpha,
  Avatar,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState } from 'react';
import { ShowParticipant } from '../../types/live-show.types';

interface ParticipantsListProps {
  participants: ShowParticipant[];
  currentUserId: string;
  isDJ: boolean;
  onSendPrivateMessage?: (userId: string, userName: string) => void;
  onRemoveParticipant?: (userId: string) => void;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  currentUserId,
  isDJ,
  onSendPrivateMessage,
  onRemoveParticipant,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<ShowParticipant | null>(null);

  const djParticipants = participants.filter((p) => p.isDJ);
  const singerParticipants = participants.filter((p) => !p.isDJ);
  const onlineCount = participants.filter((p) => p.isOnline).length;

  const handleActionMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    participant: ShowParticipant,
  ) => {
    event.stopPropagation();
    setActionMenuAnchor(event.currentTarget);
    setSelectedParticipant(participant);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedParticipant(null);
  };

  const handleSendMessage = () => {
    if (selectedParticipant && onSendPrivateMessage) {
      onSendPrivateMessage(
        selectedParticipant.userId,
        selectedParticipant.stageName || selectedParticipant.userName,
      );
    }
    handleActionMenuClose();
  };

  const handleRemoveParticipant = () => {
    if (selectedParticipant && onRemoveParticipant) {
      onRemoveParticipant(selectedParticipant.userId);
    }
    handleActionMenuClose();
  };

  const renderParticipant = (participant: ShowParticipant) => {
    const displayName = participant.stageName || participant.userName;
    const isCurrentUser = participant.userId === currentUserId;
    const showActions = isDJ && !isCurrentUser && !participant.isDJ;

    return (
      <ListItem
        key={participant.userId}
        sx={{
          py: 1.5,
          borderRadius: 1,
          backgroundColor: isCurrentUser ? alpha(theme.palette.secondary.main, 0.1) : 'transparent',
          border: isCurrentUser
            ? `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`
            : '1px solid transparent',
          mb: 0.5,
          '&:hover': {
            backgroundColor: isCurrentUser
              ? alpha(theme.palette.secondary.main, 0.15)
              : alpha(theme.palette.action.hover, 0.5),
          },
        }}
      >
        <ListItemAvatar>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={participant.avatar?.imageUrl}
              sx={{
                width: 40,
                height: 40,
                border: isCurrentUser ? `2px solid ${theme.palette.secondary.main}` : 'none',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </Avatar>

            {/* Online Status Indicator */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: participant.isOnline
                  ? theme.palette.success.main
                  : theme.palette.error.main,
                border: `2px solid ${theme.palette.background.paper}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesomeIcon
                icon={faCircle}
                style={{
                  fontSize: '6px',
                  color: participant.isOnline
                    ? theme.palette.success.main
                    : theme.palette.error.main,
                }}
              />
            </Box>
          </Box>
        </ListItemAvatar>

        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body1"
                fontWeight={isCurrentUser ? 600 : 500}
                color={isCurrentUser ? theme.palette.secondary.main : 'text.primary'}
              >
                {displayName}
              </Typography>

              {isCurrentUser && <Chip label="You" size="small" color="secondary" />}

              {participant.isDJ && (
                <Chip
                  icon={<FontAwesomeIcon icon={faCrown} />}
                  label="DJ"
                  size="small"
                  color="warning"
                />
              )}
            </Box>
          }
          secondary={
            <Box sx={{ mt: 0.5 }}>
              {/* Microphone Info */}
              {participant.microphone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <FontAwesomeIcon
                    icon={faMicrophone}
                    style={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {participant.microphone.name}
                  </Typography>
                </Box>
              )}

              {/* Queue Position */}
              {participant.queuePosition && (
                <Typography variant="caption" color="text.secondary">
                  Queue position: #{participant.queuePosition}
                </Typography>
              )}

              {/* Join Time */}
              <Typography variant="caption" color="text.secondary" display="block">
                Joined{' '}
                {new Date(participant.joinedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>
          }
        />

        {/* Actions Menu */}
        {showActions && (
          <ListItemSecondaryAction>
            <Tooltip title="Actions">
              <IconButton size="small" onClick={(e) => handleActionMenuOpen(e, participant)}>
                <FontAwesomeIcon icon={faEllipsisV} />
              </IconButton>
            </Tooltip>
          </ListItemSecondaryAction>
        )}
      </ListItem>
    );
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon icon={faUsers} />
          <Typography variant="h6">Participants ({participants.length})</Typography>
          <Chip
            label={`${onlineCount} online`}
            size="small"
            color="success"
            variant={onlineCount === participants.length ? 'filled' : 'outlined'}
          />
        </Box>

        <FontAwesomeIcon
          icon={expanded ? faChevronDown : faChevronRight}
          style={{ transition: 'transform 0.2s' }}
        />
      </Box>

      {/* Participants List */}
      <Collapse in={expanded}>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* DJ Section */}
          {djParticipants.length > 0 && (
            <Box sx={{ p: 2 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <FontAwesomeIcon icon={faCrown} />
                DJ ({djParticipants.length})
              </Typography>
              <List sx={{ py: 0 }}>{djParticipants.map(renderParticipant)}</List>
            </Box>
          )}

          {/* Divider */}
          {djParticipants.length > 0 && singerParticipants.length > 0 && <Divider />}

          {/* Singers Section */}
          {singerParticipants.length > 0 && (
            <Box sx={{ p: 2 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <FontAwesomeIcon icon={faUsers} />
                Singers ({singerParticipants.length})
              </Typography>
              <List sx={{ py: 0 }}>
                {singerParticipants
                  .sort((a, b) => {
                    // Sort by online status first, then by join time
                    if (a.isOnline !== b.isOnline) {
                      return a.isOnline ? -1 : 1;
                    }
                    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
                  })
                  .map(renderParticipant)}
              </List>
            </Box>
          )}

          {/* Empty State */}
          {participants.length === 0 && (
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
                color: 'text.secondary',
              }}
            >
              <FontAwesomeIcon
                icon={faUsers}
                style={{ fontSize: '2rem', marginBottom: 16, opacity: 0.5 }}
              />
              <Typography variant="body1">No participants yet</Typography>
              <Typography variant="body2">Share the show link to get people singing!</Typography>
            </Box>
          )}
        </Box>
      </Collapse>

      {/* Actions Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        {onSendPrivateMessage && (
          <MenuItem onClick={handleSendMessage}>
            <FontAwesomeIcon icon={faComment} style={{ marginRight: 8 }} />
            Send Message
          </MenuItem>
        )}

        {onRemoveParticipant && (
          <MenuItem onClick={handleRemoveParticipant} sx={{ color: 'error.main' }}>
            <FontAwesomeIcon icon={faUserMinus} style={{ marginRight: 8 }} />
            Remove from Show
          </MenuItem>
        )}
      </Menu>

      {/* Collapse/Expand Button */}
      {!expanded && (
        <Box sx={{ p: 1, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
          <Button
            size="small"
            onClick={() => setExpanded(true)}
            startIcon={<FontAwesomeIcon icon={faChevronDown} />}
          >
            Show Participants
          </Button>
        </Box>
      )}
    </Paper>
  );
};
