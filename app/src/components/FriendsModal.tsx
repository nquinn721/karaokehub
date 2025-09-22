import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Friend {
  id: string;
  name: string;
  stageName: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface FriendsModalProps {
  visible: boolean;
  onClose: () => void;
  friends: Friend[];
  onAddFriend?: () => void;
  onViewProfile?: (friendId: string) => void;
  onRemoveFriend?: (friendId: string) => void;
}

const FriendsModal: React.FC<FriendsModalProps> = ({
  visible,
  onClose,
  friends,
  onAddFriend,
  onViewProfile,
  onRemoveFriend,
}) => {
  const handleRemoveFriend = (friend: Friend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.name} from your friends list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemoveFriend?.(friend.id),
        },
      ],
    );
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return '';
    // Simple formatting - you might want to use a proper date library
    const date = new Date(lastSeen);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Last seen recently';
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `Last seen ${diffDays}d ago`;
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Friends ({friends.length})</Text>
            <View style={styles.headerActions}>
              {onAddFriend && (
                <TouchableOpacity onPress={onAddFriend} style={styles.addButton}>
                  <Ionicons name="person-add" size={20} color="#007AFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.scrollView}>
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#666666" />
                <Text style={styles.emptyTitle}>No Friends Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Start adding friends to see who's singing karaoke!
                </Text>
                {onAddFriend && (
                  <TouchableOpacity style={styles.addFriendsButton} onPress={onAddFriend}>
                    <Ionicons name="person-add" size={20} color="#FFFFFF" />
                    <Text style={styles.addFriendsText}>Add Friends</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              friends.map((friend) => (
                <View key={friend.id} style={styles.friendItem}>
                  <TouchableOpacity
                    style={styles.friendInfo}
                    onPress={() => onViewProfile?.(friend.id)}
                  >
                    <View
                      style={[
                        styles.friendAvatar,
                        { backgroundColor: friend.isOnline ? '#4CAF50' : '#666666' },
                      ]}
                    >
                      <Ionicons name="person" size={20} color="#FFFFFF" />
                      {friend.isOnline && <View style={styles.onlineIndicator} />}
                    </View>
                    <View style={styles.friendText}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      <Text style={styles.friendStage}>@{friend.stageName}</Text>
                      {!friend.isOnline && friend.lastSeen && (
                        <Text style={styles.lastSeenText}>{formatLastSeen(friend.lastSeen)}</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.friendActions}>
                    <View style={styles.statusContainer}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: friend.isOnline ? '#4CAF50' : '#666666' },
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {friend.isOnline ? 'Online' : 'Offline'}
                      </Text>
                    </View>

                    {onRemoveFriend && (
                      <TouchableOpacity
                        onPress={() => handleRemoveFriend(friend)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="ellipsis-horizontal" size={16} color="#666666" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    marginRight: 16,
    padding: 4,
  },
  scrollView: {
    maxHeight: 400,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1E1E1E',
  },
  friendText: {
    flex: 1,
  },
  friendName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  friendStage: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 2,
  },
  lastSeenText: {
    color: '#666666',
    fontSize: 12,
    marginTop: 1,
  },
  friendActions: {
    alignItems: 'flex-end',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  addFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addFriendsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default FriendsModal;
