import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AvatarSelectionModal from '../components/AvatarSelectionModal';
import CustomHeader from '../components/CustomHeader';
import FriendsModal from '../components/FriendsModal';
import MicrophoneSelectionModal from '../components/MicrophoneSelectionModal';
import { authStore, storeStore } from '../stores';

// Mock avatar data (you'll want to fetch this from the API)
const AVAILABLE_AVATARS = [
  { id: 'alex', name: 'Alex', isFree: true },
  { id: 'blake', name: 'Blake', isFree: true },
  { id: 'cameron', name: 'Cameron', isFree: true },
  { id: 'joe', name: 'Joe', isFree: true },
  { id: 'juan', name: 'Juan', isFree: true },
  { id: 'kai', name: 'Kai', isFree: true },
  { id: 'onyx', name: 'Onyx', isFree: false, price: 100 },
  { id: 'tyler', name: 'Tyler', isFree: false, price: 100 },
];

// Mock microphone data
const AVAILABLE_MICROPHONES = [
  { id: 'basic', name: 'Basic Mic', isFree: true, rarity: 'common' },
  { id: 'silver', name: 'Silver Mic', isFree: true, rarity: 'common' },
  { id: 'black', name: 'Black Mic', isFree: true, rarity: 'common' },
  { id: 'blue', name: 'Blue Mic', isFree: true, rarity: 'common' },
  { id: 'red', name: 'Red Mic', isFree: true, rarity: 'common' },
  { id: 'emerald', name: 'Emerald Mic', isFree: false, price: 50, rarity: 'rare' },
  { id: 'ruby', name: 'Ruby Mic', isFree: false, price: 100, rarity: 'epic' },
  { id: 'gold', name: 'Gold Mic', isFree: false, price: 250, rarity: 'epic' },
  { id: 'diamond', name: 'Diamond Mic', isFree: false, price: 500, rarity: 'legendary' },
];

// Mock friends data
const MOCK_FRIENDS = [
  { id: '1', name: 'Sarah Johnson', stageName: 'SingingSarah', isOnline: true },
  { id: '2', name: 'Mike Chen', stageName: 'MicDrop', isOnline: false },
  { id: '3', name: 'Emma Davis', stageName: 'VocalVixen', isOnline: true },
  { id: '4', name: 'Carlos Rodriguez', stageName: 'CarlosKaraoke', isOnline: false },
];

const DashboardScreen = observer(() => {
  const { user } = authStore;
  const [currentAvatar, setCurrentAvatar] = useState('alex');
  const [currentMicrophone, setCurrentMicrophone] = useState('basic');
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [microphoneModalVisible, setMicrophoneModalVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load user's current avatar and microphone
  useEffect(() => {
    loadUserEquipment();
  }, []);

  const loadUserEquipment = async () => {
    try {
      setLoading(true);
      // TODO: Fetch user's current avatar and microphone from API
      // For now using defaults
      setCurrentAvatar('alex');
      setCurrentMicrophone('basic');
    } catch (error) {
      console.error('Failed to load user equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = async (avatarId: string) => {
    const selectedAvatar = AVAILABLE_AVATARS.find((a) => a.id === avatarId);
    if (!selectedAvatar) return;

    if (!selectedAvatar.isFree && selectedAvatar.price) {
      if (storeStore.coins < selectedAvatar.price) {
        Alert.alert(
          'Insufficient Coins',
          `You need ${selectedAvatar.price} coins to purchase this avatar. Visit the store to buy more coins.`,
          [{ text: 'OK' }],
        );
        return;
      }
    }

    try {
      setLoading(true);
      // TODO: Call API to equip avatar
      setCurrentAvatar(avatarId);
      setAvatarModalVisible(false);

      if (!selectedAvatar.isFree) {
        // TODO: Deduct coins from user account
        Alert.alert('Success', `${selectedAvatar.name} avatar equipped!`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to equip avatar. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrophoneSelect = async (microphoneId: string) => {
    const selectedMicrophone = AVAILABLE_MICROPHONES.find((m) => m.id === microphoneId);
    if (!selectedMicrophone) return;

    if (!selectedMicrophone.isFree && selectedMicrophone.price) {
      if (storeStore.coins < selectedMicrophone.price) {
        Alert.alert(
          'Insufficient Coins',
          `You need ${selectedMicrophone.price} coins to purchase this microphone. Visit the store to buy more coins.`,
          [{ text: 'OK' }],
        );
        return;
      }
    }

    try {
      setLoading(true);
      // TODO: Call API to equip microphone
      setCurrentMicrophone(microphoneId);
      setMicrophoneModalVisible(false);

      if (!selectedMicrophone.isFree) {
        // TODO: Deduct coins from user account
        Alert.alert('Success', `${selectedMicrophone.name} equipped!`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to equip microphone. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentAvatarName = () => {
    return AVAILABLE_AVATARS.find((a) => a.id === currentAvatar)?.name || 'Unknown';
  };

  const getCurrentMicrophoneName = () => {
    return AVAILABLE_MICROPHONES.find((m) => m.id === currentMicrophone)?.name || 'Unknown';
  };

  const renderAvatarModal = () => (
    <AvatarSelectionModal
      visible={avatarModalVisible}
      onClose={() => setAvatarModalVisible(false)}
      onSelect={handleAvatarSelect}
      currentAvatar={currentAvatar}
      avatars={AVAILABLE_AVATARS}
      userCoins={storeStore.coins || 0}
    />
  );

  const renderMicrophoneModal = () => (
    <MicrophoneSelectionModal
      visible={microphoneModalVisible}
      onClose={() => setMicrophoneModalVisible(false)}
      onSelect={handleMicrophoneSelect}
      currentMicrophone={currentMicrophone}
      microphones={AVAILABLE_MICROPHONES}
      userCoins={storeStore.coins || 0}
    />
  );

  const renderFriendsModal = () => (
    <FriendsModal
      visible={friendsModalVisible}
      onClose={() => setFriendsModalVisible(false)}
      friends={MOCK_FRIENDS}
      onAddFriend={() => {
        // TODO: Implement add friend functionality
        Alert.alert('Add Friends', 'Friend request functionality coming soon!');
      }}
      onViewProfile={(friendId) => {
        // TODO: Implement view profile functionality
        Alert.alert('View Profile', `Viewing profile for friend: ${friendId}`);
      }}
      onRemoveFriend={(friendId) => {
        // TODO: Implement remove friend functionality
        Alert.alert('Remove Friend', `Removing friend: ${friendId}`);
      }}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader title="Dashboard" showMenu={false} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={32} color="#007AFF" />
            </View>
            <View style={styles.userText}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userStage}>@{user?.stageName || 'no-stage-name'}</Text>
            </View>
          </View>
          <View style={styles.coinDisplay}>
            <Ionicons name="diamond" size={16} color="#FFD700" />
            <Text style={styles.coinText}>{storeStore.coins || 0}</Text>
          </View>
        </View>

        {/* Equipment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Equipment</Text>

          <TouchableOpacity
            style={styles.equipmentCard}
            onPress={() => setAvatarModalVisible(true)}
          >
            <View style={styles.equipmentInfo}>
              <Ionicons name="person" size={24} color="#007AFF" />
              <View style={styles.equipmentText}>
                <Text style={styles.equipmentLabel}>Avatar</Text>
                <Text style={styles.equipmentValue}>{getCurrentAvatarName()}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#AAAAAA" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.equipmentCard}
            onPress={() => setMicrophoneModalVisible(true)}
          >
            <View style={styles.equipmentInfo}>
              <Ionicons name="mic" size={24} color="#007AFF" />
              <View style={styles.equipmentText}>
                <Text style={styles.equipmentLabel}>Microphone</Text>
                <Text style={styles.equipmentValue}>{getCurrentMicrophoneName()}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#AAAAAA" />
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="musical-notes" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Songs Sung</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="trophy" size={24} color="#FFD700" />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Shows Attended</Text>
            </View>
          </View>
        </View>

        {/* Friends Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friends</Text>
            <TouchableOpacity onPress={() => setFriendsModalVisible(true)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.friendsPreview}>
            {MOCK_FRIENDS.slice(0, 3).map((friend) => (
              <View key={friend.id} style={styles.friendPreviewItem}>
                <View
                  style={[
                    styles.friendPreviewAvatar,
                    { backgroundColor: friend.isOnline ? '#4CAF50' : '#666666' },
                  ]}
                >
                  <Ionicons name="person" size={16} color="#FFFFFF" />
                </View>
                <Text style={styles.friendPreviewName}>{friend.name.split(' ')[0]}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addFriendButton}
              onPress={() => setFriendsModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="calendar" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Find Shows Near Me</Text>
            <Ionicons name="chevron-forward" size={20} color="#AAAAAA" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="musical-notes" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Browse Songs</Text>
            <Ionicons name="chevron-forward" size={20} color="#AAAAAA" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="people" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Find Friends</Text>
            <Ionicons name="chevron-forward" size={20} color="#AAAAAA" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      {renderAvatarModal()}
      {renderMicrophoneModal()}
      {renderFriendsModal()}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  userSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    backgroundColor: '#007AFF20',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userText: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  userStage: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 2,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coinText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  viewAllText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  equipmentCard: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equipmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  equipmentText: {
    marginLeft: 12,
  },
  equipmentLabel: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  equipmentValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 0.48,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    color: '#AAAAAA',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  friendsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendPreviewItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  friendPreviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  friendPreviewName: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  addFriendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#007AFF20',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  actionButton: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
});

export default DashboardScreen;
