import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import CustomHeader from '../components/CustomHeader';
import { authStore, uiStore } from '../stores';

const { width } = Dimensions.get('window');

// Mock profile data - in real app this would come from API
const mockProfile = {
  id: 'user_1',
  username: 'karaoke_star_2024',
  displayName: 'Sarah Chen',
  email: 'sarah.chen@email.com',
  avatarUrl: 'https://via.placeholder.com/120x120/4CAF50/FFFFFF?text=SC',
  bio: 'Karaoke enthusiast and weekend warrior! Love singing everything from classic rock to modern pop. Always looking for the best karaoke spots in town! 🎤✨',
  joinDate: '2024-03-15',
  location: 'San Francisco, CA',
  isDJ: false,
  verified: true,
  stats: {
    showsAttended: 47,
    songsPerformed: 123,
    favoritesCount: 34,
    reviewsWritten: 12,
    friendsCount: 89,
    achievementsCount: 15,
  },
  achievements: [
    {
      id: 'first_performance',
      name: 'First Timer',
      description: 'Performed your first karaoke song',
      icon: 'mic',
      unlockedDate: '2024-03-20',
      rarity: 'common',
    },
    {
      id: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Made 50+ friends on KaraokeHub',
      icon: 'people',
      unlockedDate: '2024-11-15',
      rarity: 'uncommon',
    },
    {
      id: 'critic',
      name: 'The Critic',
      description: 'Wrote 10+ helpful reviews',
      icon: 'star',
      unlockedDate: '2024-10-22',
      rarity: 'rare',
    },
    {
      id: 'rock_legend',
      name: 'Rock Legend',
      description: 'Performed 25+ rock songs',
      icon: 'musical-note',
      unlockedDate: '2024-08-10',
      rarity: 'epic',
    },
  ],
  recentActivity: [
    {
      id: 'activity_1',
      type: 'performance',
      title: 'Sang "Don\'t Stop Believin\'" at The Blue Moon',
      date: '2024-12-14',
      icon: 'musical-note',
    },
    {
      id: 'activity_2',
      type: 'review',
      title: 'Reviewed Friday Night Karaoke at Downtown Bar',
      date: '2024-12-12',
      icon: 'star',
    },
    {
      id: 'activity_3',
      type: 'friend',
      title: 'Became friends with Mike Rodriguez',
      date: '2024-12-10',
      icon: 'person-add',
    },
    {
      id: 'activity_4',
      type: 'achievement',
      title: 'Unlocked "Social Butterfly" achievement',
      date: '2024-11-15',
      icon: 'trophy',
    },
  ],
  favoriteGenres: ['Rock', 'Pop', 'R&B', 'Country'],
  socialLinks: {
    instagram: 'https://instagram.com/karaoke_star_2024',
    tiktok: 'https://tiktok.com/@karaoke_star',
    youtube: 'https://youtube.com/c/karaokestar2024',
  },
};

const ProfileScreen = observer(() => {
  const { user } = authStore;
  const [profile, setProfile] = useState(mockProfile);
  const [activeTab, setActiveTab] = useState<'about' | 'activity' | 'achievements'>('about');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedBio, setEditedBio] = useState(profile.bio);
  const [editedDisplayName, setEditedDisplayName] = useState(profile.displayName);
  const [editedLocation, setEditedLocation] = useState(profile.location);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return '#AAAAAA';
      case 'uncommon':
        return '#4CAF50';
      case 'rare':
        return '#2196F3';
      case 'epic':
        return '#9C27B0';
      case 'legendary':
        return '#FF6B6B';
      default:
        return '#AAAAAA';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return 'musical-note';
      case 'review':
        return 'star';
      case 'friend':
        return 'person-add';
      case 'achievement':
        return 'trophy';
      default:
        return 'information-circle';
    }
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleSaveProfile = () => {
    setProfile((prev) => ({
      ...prev,
      bio: editedBio,
      displayName: editedDisplayName,
      location: editedLocation,
    }));
    setShowEditModal(false);
    Alert.alert('Profile Updated', 'Your profile has been updated successfully!');
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => authStore.logout(),
      },
    ]);
  };

  const handleShareProfile = () => {
    Alert.alert('Share Profile', 'Sharing profile link...');
  };

  const StatItem = ({ label, value }: { label: string; value: number }) => (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const AchievementItem = ({ achievement }: { achievement: any }) => (
    <TouchableOpacity style={styles.achievementItem}>
      <View style={[styles.achievementIcon, { borderColor: getRarityColor(achievement.rarity) }]}>
        <Ionicons
          name={achievement.icon as any}
          size={24}
          color={getRarityColor(achievement.rarity)}
        />
      </View>
      <View style={styles.achievementInfo}>
        <Text style={styles.achievementName}>{achievement.name}</Text>
        <Text style={styles.achievementDescription}>{achievement.description}</Text>
        <Text style={styles.achievementDate}>Unlocked {formatDate(achievement.unlockedDate)}</Text>
      </View>
      <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(achievement.rarity) }]}>
        <Text style={styles.rarityText}>{achievement.rarity}</Text>
      </View>
    </TouchableOpacity>
  );

  const ActivityItem = ({ activity }: { activity: any }) => (
    <View style={styles.activityItem}>
      <View style={styles.activityIcon}>
        <Ionicons name={getActivityIcon(activity.type) as any} size={20} color="#007AFF" />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activityDate}>{formatDate(activity.date)}</Text>
      </View>
    </View>
  );

  const EditModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowEditModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowEditModal(false)}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSaveProfile}>
            <Text style={styles.modalSaveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.editSection}>
            <Text style={styles.editLabel}>Display Name</Text>
            <TextInput
              style={styles.editInput}
              value={editedDisplayName}
              onChangeText={setEditedDisplayName}
              placeholder="Your display name"
              placeholderTextColor="#AAAAAA"
            />
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editLabel}>Location</Text>
            <TextInput
              style={styles.editInput}
              value={editedLocation}
              onChangeText={setEditedLocation}
              placeholder="Your location"
              placeholderTextColor="#AAAAAA"
            />
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editLabel}>Bio</Text>
            <TextInput
              style={[styles.editInput, styles.bioInput]}
              value={editedBio}
              onChangeText={setEditedBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#AAAAAA"
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const AboutTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Bio Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bioText}>{profile.bio}</Text>
      </View>

      {/* Favorite Genres */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite Genres</Text>
        <View style={styles.genresContainer}>
          {profile.favoriteGenres.map((genre, index) => (
            <View key={index} style={styles.genreTag}>
              <Text style={styles.genreText}>{genre}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionItem}>
            <Ionicons name="heart-outline" size={20} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Favorites</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => uiStore.openSubscriptionModal()}
          >
            <Ionicons name="card-outline" size={20} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Subscription</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionItem}>
            <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Member Since */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Member Since</Text>
        <Text style={styles.memberSinceText}>{formatDate(profile.joinDate)}</Text>
      </View>

      {/* App Version */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const ActivityTab = () => (
    <FlatList
      data={profile.recentActivity}
      renderItem={({ item }) => <ActivityItem activity={item} />}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={() => (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={48} color="#333333" />
          <Text style={styles.emptyTitle}>No Recent Activity</Text>
          <Text style={styles.emptyDescription}>
            Start attending karaoke shows to see your activity here!
          </Text>
        </View>
      )}
    />
  );

  const AchievementsTab = () => (
    <FlatList
      data={profile.achievements}
      renderItem={({ item }) => <AchievementItem achievement={item} />}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={() => (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={48} color="#333333" />
          <Text style={styles.emptyTitle}>No Achievements Yet</Text>
          <Text style={styles.emptyDescription}>
            Start participating in karaoke events to unlock achievements!
          </Text>
        </View>
      )}
    />
  );

  return (
    <View style={styles.container}>
      <CustomHeader title="Profile" showMenu={false} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image source={{ uri: profile.avatarUrl }} style={styles.profileImage} />
          {profile.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.displayName}>{profile.displayName}</Text>
            {profile.isDJ && (
              <View style={styles.djBadge}>
                <Ionicons name="musical-note" size={12} color="#FFFFFF" />
                <Text style={styles.djBadgeText}>DJ</Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={14} color="#AAAAAA" />
              <Text style={styles.location}>{profile.location}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Ionicons name="create" size={16} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleShareProfile}>
            <Ionicons name="share" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <StatItem label="Shows" value={profile.stats.showsAttended} />
        <StatItem label="Songs" value={profile.stats.songsPerformed} />
        <StatItem label="Reviews" value={profile.stats.reviewsWritten} />
        <StatItem label="Friends" value={profile.stats.friendsCount} />
        <StatItem label="Achievements" value={profile.stats.achievementsCount} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'about', label: 'About', icon: 'person' },
          { key: 'activity', label: 'Activity', icon: 'time' },
          { key: 'achievements', label: 'Achievements', icon: 'trophy' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? '#FFFFFF' : '#AAAAAA'}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'about' && <AboutTab />}
        {activeTab === 'activity' && <ActivityTab />}
        {activeTab === 'achievements' && <AchievementsTab />}
      </View>

      <EditModal />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    backgroundColor: '#1E1E1E',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 18,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1E1E1E',
  },
  profileInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  djBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  djBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  username: {
    color: '#AAAAAA',
    fontSize: 14,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    backgroundColor: '#1E1E1E',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bioText: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreTag: {
    backgroundColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  memberSinceText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  versionText: {
    color: '#666666',
    fontSize: 12,
  },
  logoutSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  achievementDescription: {
    color: '#AAAAAA',
    fontSize: 12,
    marginBottom: 4,
  },
  achievementDate: {
    color: '#666666',
    fontSize: 10,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rarityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDate: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyDescription: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalCloseText: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSaveText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  editSection: {
    marginBottom: 24,
  },
  editLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
});

export default ProfileScreen;
