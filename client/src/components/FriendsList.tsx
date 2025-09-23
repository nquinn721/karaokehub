import {
  faCheck,
  faClock,
  faPlus,
  faSearch,
  faTimes,
  faUserFriends,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { authStore, friendsStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import SendFriendRequestModal from './SendFriendRequestModal';
import { FriendInfoModal } from './modals/FriendInfoModal';

interface FriendsListProps {
  onUserSelect?: (userId: string) => void;
}

const FriendsList: React.FC<FriendsListProps> = observer(({ onUserSelect }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showSentRequests, setShowSentRequests] = useState(false);
  const [showSendRequestModal, setShowSendRequestModal] = useState(false);
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);

  useEffect(() => {
    if (authStore.isAuthenticated) {
      friendsStore.loadAllData();
    }
  }, [authStore.isAuthenticated]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    // This search is for filtering existing friends only
    // For adding new friends, use the + button
  };

  const handleAcceptRequest = async (requestId: string) => {
    await friendsStore.acceptFriendRequest(requestId);
  };

  const handleDeclineRequest = async (requestId: string) => {
    await friendsStore.declineFriendRequest(requestId);
  };

  const handleFriendClick = (friend: any) => {
    setSelectedFriend(friend);
    setShowFavoriteModal(true);
    // Call the original onUserSelect if provided
    onUserSelect?.(friend.id);
  };

  const getDisplayName = (user: any) => {
    return user.stageName || user.name || user.email;
  };

  const getAvatarInitials = (user: any) => {
    const name = getDisplayName(user);
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter friends based on search query
  const filteredFriends = React.useMemo(() => {
    if (!searchQuery || !friendsStore.friends) {
      return friendsStore.friends;
    }
    const query = searchQuery.toLowerCase();
    return friendsStore.friends.filter(
      (friend) =>
        friend.stageName?.toLowerCase().includes(query) ||
        friend.name?.toLowerCase().includes(query) ||
        friend.email?.toLowerCase().includes(query),
    );
  }, [searchQuery, friendsStore.friends]);

  if (!authStore.isAuthenticated) {
    return (
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FontAwesomeIcon icon={faUserFriends} color={theme.palette.text.secondary} />
            <Typography variant="h6" fontWeight={600}>
              Friends
            </Typography>
          </Box>
          <Alert severity="info">Please log in to connect with friends</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FontAwesomeIcon icon={faUserFriends} color={theme.palette.primary.main} />
            <Typography variant="h6" fontWeight={600}>
              Friends
            </Typography>
            <Chip
              label={friendsStore.stats?.friendsCount || 0}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Send Friend Request">
              <IconButton
                size="small"
                color="primary"
                onClick={() => setShowSendRequestModal(true)}
              >
                <FontAwesomeIcon icon={faPlus} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Search Friends">
              <IconButton
                size="small"
                color={showSearch ? 'primary' : 'default'}
                onClick={() => setShowSearch(!showSearch)}
              >
                <FontAwesomeIcon icon={faSearch} />
              </IconButton>
            </Tooltip>
            {(friendsStore.stats?.pendingRequestsCount || 0) > 0 && (
              <Tooltip title="Friend Requests">
                <IconButton
                  size="small"
                  color={showRequests ? 'primary' : 'default'}
                  onClick={() => setShowRequests(!showRequests)}
                >
                  <Badge badgeContent={friendsStore.stats?.pendingRequestsCount || 0} color="error">
                    <FontAwesomeIcon icon={faUserPlus} />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}
            {(friendsStore.sentRequests || []).length > 0 && (
              <Tooltip title="Sent Requests">
                <IconButton
                  size="small"
                  color={showSentRequests ? 'primary' : 'default'}
                  onClick={() => setShowSentRequests(!showSentRequests)}
                >
                  <Badge badgeContent={(friendsStore.sentRequests || []).length} color="warning">
                    <FontAwesomeIcon icon={faClock} />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Search Section */}
        <Collapse in={showSearch}>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search your friends..."
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faSearch} size="sm" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />
          </Box>
        </Collapse>

        {/* Friend Requests Section */}
        <Collapse in={showRequests}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Friend Requests ({friendsStore.stats?.pendingRequestsCount || 0})
            </Typography>
            {(friendsStore.pendingRequests || []).map((request) => (
              <Box
                key={request.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {request.requester.userAvatar?.imageUrl ? (
                      <img
                        src={request.requester.userAvatar.imageUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt={getDisplayName(request.requester)}
                      />
                    ) : (
                      getAvatarInitials(request.requester)
                    )}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={500} noWrap>
                      {getDisplayName(request.requester)}
                    </Typography>
                    {request.message && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {request.message}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() => handleAcceptRequest(request.id)}
                    disabled={friendsStore.loading}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeclineRequest(request.id)}
                    disabled={friendsStore.loading}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        </Collapse>

        {/* Sent Requests Section */}
        <Collapse in={showSentRequests}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Sent Requests ({(friendsStore.sentRequests || []).length})
            </Typography>
            {(friendsStore.sentRequests || []).map((request) => (
              <Box
                key={request.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  mb: 1,
                  backgroundColor: theme.palette.action.hover,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {request.recipient.userAvatar?.imageUrl ? (
                      <img
                        src={request.recipient.userAvatar.imageUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt={getDisplayName(request.recipient)}
                      />
                    ) : (
                      getAvatarInitials(request.recipient)
                    )}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={500} noWrap>
                      {getDisplayName(request.recipient)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      Request sent • Waiting for approval
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label="Pending"
                    size="small"
                    color="warning"
                    variant="outlined"
                    icon={<FontAwesomeIcon icon={faClock} style={{ fontSize: '12px' }} />}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Collapse>

        {friendsStore.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {friendsStore.error}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Friends List */}
        {friendsStore.loading && (!friendsStore.friends || friendsStore.friends.length === 0) ? (
          <Stack spacing={1}>
            {[...Array(3)].map((_, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="60%" />
                </Box>
              </Box>
            ))}
          </Stack>
        ) : !friendsStore.friends || friendsStore.friends.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <FontAwesomeIcon
              icon={faUserFriends}
              size="3x"
              color={theme.palette.text.secondary}
              style={{ marginBottom: 16 }}
            />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No friends yet
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Search for users to send friend requests
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ p: 0 }}>
            {(filteredFriends || []).slice(0, 8).map((friend) => (
              <ListItem key={friend.id} disablePadding>
                <ListItemButton
                  onClick={() => handleFriendClick(friend)}
                  sx={{ borderRadius: 1, px: 1 }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 36, height: 36 }}>
                      <img
                        src={friend.equippedAvatar?.imageUrl || '/images/avatar/avatars/alex.png'}
                        alt={getDisplayName(friend)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/avatar/avatars/alex.png';
                        }}
                      />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {getDisplayName(friend)}
                      </Typography>
                    }
                    secondary={
                      friend.stageName && friend.name !== friend.stageName ? (
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {friend.name}
                        </Typography>
                      ) : undefined
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}

            {filteredFriends && filteredFriends.length > 8 && (
              <ListItem>
                <Button fullWidth variant="text" size="small" sx={{ justifyContent: 'center' }}>
                  View all {filteredFriends?.length || 0} friends
                </Button>
              </ListItem>
            )}
          </List>
        )}
      </CardContent>

      {/* Send Friend Request Modal */}
      <SendFriendRequestModal
        open={showSendRequestModal}
        onClose={() => setShowSendRequestModal(false)}
      />

      {/* Friend Info Modal */}
      {selectedFriend && (
        <FriendInfoModal
          open={showFavoriteModal}
          onClose={() => {
            setShowFavoriteModal(false);
            setSelectedFriend(null);
          }}
          friend={selectedFriend}
        />
      )}
    </Card>
  );
});

export default FriendsList;
