import { faCrown, faPaperPlane, faReply, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  alpha,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  Menu,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, ChatMessageType, ShowParticipant } from '../../types/live-show.types';

interface ChatSystemProps {
  messages: ChatMessage[];
  participants: ShowParticipant[];
  currentUserId: string;
  isDJ: boolean;
  onSendMessage: (content: string, type?: ChatMessageType, targetUserId?: string) => void;
}

export const ChatSystem: React.FC<ChatSystemProps> = ({
  messages,
  participants,
  currentUserId,
  isDJ,
  onSendMessage,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [messageContent, setMessageContent] = useState('');
  const [replyToUser, setReplyToUser] = useState<ShowParticipant | null>(null);
  const [participantMenuAnchor, setParticipantMenuAnchor] = useState<null | HTMLElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageContent.trim()) return;

    let messageType = ChatMessageType.SINGER_CHAT;
    let targetUserId: string | undefined;

    if (activeTab === 1 && isDJ) {
      // DJ private message
      messageType = ChatMessageType.DJ_TO_SINGER;
      targetUserId = replyToUser?.userId;
    }

    onSendMessage(messageContent.trim(), messageType, targetUserId);
    setMessageContent('');
    setReplyToUser(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getFilteredMessages = () => {
    switch (activeTab) {
      case 0: // Singer Chat
        return messages.filter((msg) => msg.type === ChatMessageType.SINGER_CHAT);
      case 1: // DJ Chat (if DJ) or DJ Messages (if singer)
        if (isDJ) {
          return messages.filter((msg) => msg.type === ChatMessageType.DJ_TO_SINGER);
        } else {
          return messages.filter(
            (msg) =>
              msg.type === ChatMessageType.DJ_TO_SINGER &&
              (msg.recipientId === currentUserId || !msg.recipientId),
          );
        }
      default:
        return [];
    }
  };

  const getMessageDisplayName = (message: ChatMessage): string => {
    return message.senderStageName || message.senderName;
  };

  const getMessageBackgroundColor = (message: ChatMessage): string => {
    if (message.senderId === currentUserId) {
      return alpha(theme.palette.primary.main, 0.1);
    }
    if (message.type === ChatMessageType.DJ_TO_SINGER) {
      return alpha(theme.palette.warning.main, 0.1);
    }
    return 'transparent';
  };

  const getMessageBorderColor = (message: ChatMessage): string => {
    if (message.senderId === currentUserId) {
      return alpha(theme.palette.primary.main, 0.3);
    }
    if (message.type === ChatMessageType.DJ_TO_SINGER) {
      return alpha(theme.palette.warning.main, 0.3);
    }
    return 'transparent';
  };

  const handleParticipantMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setParticipantMenuAnchor(event.currentTarget);
  };

  const handleParticipantMenuClose = () => {
    setParticipantMenuAnchor(null);
  };

  const handleReplyToUser = (participant: ShowParticipant) => {
    setReplyToUser(participant);
    setActiveTab(1);
    handleParticipantMenuClose();
  };

  const singerParticipants = participants.filter((p) => !p.isDJ);
  const filteredMessages = getFilteredMessages();

  const tabs = [
    {
      label: 'Singer Chat',
      count: messages.filter((msg) => msg.type === ChatMessageType.SINGER_CHAT).length,
    },
    {
      label: isDJ ? 'DJ Messages' : 'DJ Chat',
      count: isDJ
        ? messages.filter((msg) => msg.type === ChatMessageType.DJ_TO_SINGER).length
        : messages.filter(
            (msg) =>
              msg.type === ChatMessageType.DJ_TO_SINGER &&
              (msg.recipientId === currentUserId || !msg.recipientId),
          ).length,
    },
  ];

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon
                    icon={index === 0 ? faUsers : faCrown}
                    style={{ fontSize: '0.9rem' }}
                  />
                  {tab.label}
                  {tab.count > 0 && (
                    <Chip
                      label={tab.count}
                      size="small"
                      color="primary"
                      sx={{ height: 20, minWidth: 20 }}
                    />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Messages Area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {filteredMessages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
              textAlign: 'center',
            }}
          >
            <FontAwesomeIcon
              icon={activeTab === 0 ? faUsers : faCrown}
              style={{ fontSize: '2rem', marginBottom: 16, opacity: 0.5 }}
            />
            <Typography variant="body1">
              {activeTab === 0 ? 'No messages yet' : 'No DJ messages yet'}
            </Typography>
            <Typography variant="body2">
              {activeTab === 0
                ? 'Start chatting with fellow singers!'
                : isDJ
                  ? 'Send messages to individual singers'
                  : 'DJ messages will appear here'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {filteredMessages.map((message) => {
              const displayName = getMessageDisplayName(message);
              const isOwnMessage = message.senderId === currentUserId;
              const isDJMessage = message.type === ChatMessageType.DJ_TO_SINGER;

              return (
                <ListItem
                  key={message.id}
                  sx={{
                    display: 'block',
                    py: 1,
                    px: 2,
                    mb: 1,
                    borderRadius: 2,
                    backgroundColor: getMessageBackgroundColor(message),
                    border: `1px solid ${getMessageBorderColor(message)}`,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.action.hover, 0.5),
                    },
                  }}
                >
                  {/* Message Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Avatar sx={{ width: 24, height: 24 }}>
                      {displayName.charAt(0).toUpperCase()}
                    </Avatar>

                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {displayName}
                    </Typography>

                    {isOwnMessage && (
                      <Chip label="You" size="small" color="secondary" sx={{ height: 18 }} />
                    )}

                    {isDJMessage && (
                      <Chip
                        label="DJ"
                        size="small"
                        color="warning"
                        sx={{ height: 18 }}
                        icon={<FontAwesomeIcon icon={faCrown} />}
                      />
                    )}

                    {message.recipientId && (
                      <Chip label="Private" size="small" variant="outlined" sx={{ height: 18 }} />
                    )}

                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </Box>

                  {/* Message Content */}
                  <Typography variant="body2" sx={{ ml: 4 }}>
                    {message.message}
                  </Typography>
                </ListItem>
              );
            })}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Box>

      {/* Message Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        {/* Reply Indicator */}
        {replyToUser && (
          <Box
            sx={{
              mb: 1,
              p: 1,
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              borderRadius: 1,
              border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={faReply} style={{ color: theme.palette.info.main }} />
              <Typography variant="caption">
                Replying to {replyToUser.stageName || replyToUser.userName}
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={() => setReplyToUser(null)}
              sx={{ minWidth: 'auto', p: 0.5 }}
            >
              ×
            </Button>
          </Box>
        )}

        {/* Input Field */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
            placeholder={
              activeTab === 0
                ? 'Message all singers...'
                : isDJ && replyToUser
                  ? `Message ${replyToUser.stageName || replyToUser.userName}...`
                  : isDJ
                    ? 'Select a singer to message...'
                    : 'This chat is for DJ messages'
            }
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={activeTab === 1 && isDJ && !replyToUser}
            variant="outlined"
            size="small"
          />

          {/* Participants Menu for DJ */}
          {isDJ && activeTab === 1 && (
            <>
              <IconButton
                color="primary"
                onClick={handleParticipantMenuOpen}
                disabled={singerParticipants.length === 0}
              >
                <FontAwesomeIcon icon={faUsers} />
              </IconButton>

              <Menu
                anchorEl={participantMenuAnchor}
                open={Boolean(participantMenuAnchor)}
                onClose={handleParticipantMenuClose}
              >
                <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 600 }}>
                  Message Singer:
                </Typography>
                <Divider />
                {singerParticipants.map((participant) => (
                  <MenuItem key={participant.userId} onClick={() => handleReplyToUser(participant)}>
                    <Avatar
                      src={participant.avatar?.imageUrl}
                      sx={{ width: 24, height: 24, mr: 1 }}
                    >
                      {(participant.stageName || participant.userName).charAt(0).toUpperCase()}
                    </Avatar>
                    {participant.stageName || participant.userName}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}

          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={
              !messageContent.trim() ||
              (activeTab === 1 && isDJ && !replyToUser) ||
              (activeTab === 1 && !isDJ)
            }
            sx={{ minWidth: 'auto', px: 2 }}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </Button>
        </Box>

        {/* Helper Text */}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {activeTab === 0
            ? 'Press Enter to send, Shift+Enter for new line'
            : isDJ
              ? 'Select a singer from the list to send a private message'
              : 'Only DJs can send messages in this chat'}
        </Typography>
      </Box>
    </Paper>
  );
};
