import { faSearch, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Avatar,
  Box,
  CircularProgress,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { friendsStore } from '@stores/index';
import { getUserDisplayName, getUserSecondaryName } from '@utils/userUtils';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import CustomModal from './CustomModal';

interface SendFriendRequestModalProps {
  open: boolean;
  onClose: () => void;
}

const SendFriendRequestModal: React.FC<SendFriendRequestModalProps> = observer(
  ({ open, onClose }) => {
    const theme = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      setSearchQuery(query);

      if (query.length >= 1) {
        friendsStore.searchUsers(query);
      } else {
        friendsStore.clearSearchResults();
      }
    };

    const handleSendRequest = async (userId: string) => {
      try {
        const result = await friendsStore.sendFriendRequest(userId);
        if (result.success) {
          // Clear search and close modal after successful request
          setSearchQuery('');
          friendsStore.clearSearchResults();
          onClose();
          // The FriendsList component will automatically update to show the sent request
        }
      } catch (error) {
        console.error('Failed to send friend request:', error);
      }
    };

    const handleClose = () => {
      setSearchQuery('');
      friendsStore.clearSearchResults();
      onClose();
    };

    return (
      <CustomModal
        open={open}
        onClose={handleClose}
        title="Send Friend Request"
        icon={<FontAwesomeIcon icon={faUserPlus} />}
        maxWidth="sm"
      >
        <Box sx={{ mt: 1, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by stage name or full name..."
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FontAwesomeIcon icon={faSearch} size="sm" />
                </InputAdornment>
              ),
              endAdornment: friendsStore.searchLoading && (
                <InputAdornment position="end">
                  <CircularProgress size={20} thickness={4} />
                </InputAdornment>
              ),
            }}
          />

          {/* Search Results - Fixed height container */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
            {searchQuery.length >= 1 &&
              !friendsStore.searchLoading &&
              friendsStore.safeSearchResults.length === 0 && (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 6,
                    px: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    borderRadius: 2,
                    backgroundColor: theme.palette.action.hover,
                    flex: 1,
                    justifyContent: 'center',
                  }}
                >
                  <FontAwesomeIcon
                    icon={faSearch}
                    style={{
                      fontSize: '48px',
                      color: theme.palette.text.disabled,
                      opacity: 0.5,
                    }}
                  />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    No Users Found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                    No users found matching "{searchQuery}"
                    <br />
                    Try searching by stage name
                  </Typography>
                </Box>
              )}

            {friendsStore.safeSearchResults.length > 0 && !friendsStore.searchLoading && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: theme.palette.success.main + '15',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faSearch}
                      style={{ color: theme.palette.success.main, fontSize: '16px' }}
                    />
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    Search Results
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({friendsStore.safeSearchResults.length} user
                    {friendsStore.safeSearchResults.length !== 1 ? 's' : ''} found)
                  </Typography>
                </Box>

                <List
                  sx={{
                    maxHeight: 300,
                    overflow: 'auto',
                    p: 0,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    '&::-webkit-scrollbar': {
                      width: 8,
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: theme.palette.action.hover,
                      borderRadius: 4,
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: theme.palette.action.selected,
                      borderRadius: 4,
                    },
                  }}
                >
                  {friendsStore.safeSearchResults.map((user, index) => (
                    <ListItem key={user.id} sx={{ p: 0 }}>
                      <ListItemButton
                        sx={{
                          p: 3,
                          borderBottom:
                            index < friendsStore.safeSearchResults.length - 1
                              ? `1px solid ${theme.palette.divider}`
                              : 'none',
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                          '&:last-child': {
                            borderBottom: 'none',
                          },
                        }}
                        onClick={() => handleSendRequest(user.id)}
                      >
                        <ListItemAvatar>
                          <Avatar
                            src={user.avatar}
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: theme.palette.primary.light,
                              color: theme.palette.primary.contrastText,
                            }}
                          >
                            {getUserDisplayName(user)?.charAt(0).toUpperCase() ||
                              user.name?.charAt(0).toUpperCase() ||
                              '?'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body1" fontWeight={500}>
                              {getUserDisplayName(user)}
                            </Typography>
                          }
                          secondary={
                            getUserSecondaryName(user) ? (
                              <Typography variant="body2" color="text.secondary">
                                {getUserSecondaryName(user)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Click to send friend request
                              </Typography>
                            )
                          }
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                          <FontAwesomeIcon
                            icon={faUserPlus}
                            style={{
                              color: theme.palette.primary.main,
                              fontSize: '16px',
                            }}
                          />
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {searchQuery.length === 0 && (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  px: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  borderRadius: 2,
                  backgroundColor: theme.palette.action.hover,
                  flex: 1,
                  justifyContent: 'center',
                }}
              >
                <FontAwesomeIcon
                  icon={faUserPlus}
                  style={{
                    fontSize: '48px',
                    color: theme.palette.text.disabled,
                    opacity: 0.5,
                  }}
                />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  Find Friends
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                  Start typing to search for users...
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </CustomModal>
    );
  },
);

export default SendFriendRequestModal;
