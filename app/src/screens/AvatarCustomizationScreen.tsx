import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarDetailModal from '../components/AvatarDetailModal';
import AvatarPurchaseModal from '../components/AvatarPurchaseModal';
import CustomHeader from '../components/CustomHeader';
import { storeStore } from '../stores';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 60) / 2; // 2 columns with padding

interface Avatar {
  id: string;
  name: string;
  description?: string;
  type: string;
  rarity: string;
  imageUrl: string;
  coinPrice: number;
  isFree: boolean;
  isAvailable: boolean;
}

const AvatarCustomizationScreen = observer(() => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        storeStore.fetchUserCoins(),
        storeStore.fetchStoreAvatars(),
        storeStore.fetchUserAvatars(),
      ]);
    } catch (error) {
      console.error('Failed to load avatar data:', error);
      Alert.alert('Error', 'Failed to load avatar data. Please try again.');
    }
  };

  const categories = [
    { key: 'all', label: 'All', icon: 'grid-outline' },
    { key: 'classic', label: 'Classic', icon: 'person-outline' },
    { key: 'rock', label: 'Rock', icon: 'musical-notes-outline' },
    { key: 'pop', label: 'Pop', icon: 'star-outline' },
    { key: 'owned', label: 'Owned', icon: 'checkmark-circle-outline' },
  ];

  const getFilteredAvatars = () => {
    let avatars = storeStore.storeAvatars;

    switch (selectedCategory) {
      case 'owned':
        return avatars.filter((avatar) =>
          storeStore.userAvatars.some((userAvatar) => userAvatar.avatarId === avatar.id),
        );
      case 'classic':
        return avatars.filter((avatar) => !avatar.type || avatar.type.toLowerCase() === 'classic');
      case 'rock':
        return avatars.filter(
          (avatar) => avatar.type && avatar.type.toLowerCase().includes('rock'),
        );
      case 'pop':
        return avatars.filter((avatar) => avatar.type && avatar.type.toLowerCase().includes('pop'));
      default:
        return avatars;
    }
  };

  const isAvatarOwned = (avatarId: string) => {
    return storeStore.userAvatars.some((userAvatar) => userAvatar.avatarId === avatarId);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return '#FFD700';
      case 'epic':
        return '#9C27B0';
      case 'rare':
        return '#2196F3';
      case 'uncommon':
        return '#4CAF50';
      default:
        return '#9E9E9E';
    }
  };

  const handleAvatarPress = (avatar: Avatar) => {
    setSelectedAvatar(avatar);
    setDetailModalVisible(true);
  };

  const handlePurchasePress = (avatar: Avatar) => {
    setSelectedAvatar(avatar);
    setDetailModalVisible(false);
    setPurchaseModalVisible(true);
  };

  const handlePurchaseConfirm = async (avatarId: string) => {
    try {
      // TODO: Implement purchaseAvatar method in StoreStore
      // For now, just show a placeholder
      Alert.alert(
        'Purchase Coming Soon',
        'Avatar purchase functionality will be implemented soon.',
      );
      await loadData(); // Refresh data
    } catch (error: any) {
      console.error('Purchase failed:', error);
      Alert.alert('Purchase Failed', error.message || 'Please try again.');
      throw error; // Re-throw to let the modal handle the error state
    }
  };

  const renderCategoryTab = ({ item }: { item: (typeof categories)[0] }) => (
    <TouchableOpacity
      style={[styles.categoryTab, selectedCategory === item.key && styles.activeCategoryTab]}
      onPress={() => setSelectedCategory(item.key)}
    >
      <Ionicons
        name={item.icon as any}
        size={20}
        color={selectedCategory === item.key ? '#6C5CE7' : '#AAAAAA'}
      />
      <Text
        style={[styles.categoryText, selectedCategory === item.key && styles.activeCategoryText]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderAvatar = ({ item }: { item: Avatar }) => {
    const isOwned = isAvatarOwned(item.id);
    const canAfford = storeStore.coins >= item.coinPrice;

    return (
      <TouchableOpacity style={styles.avatarCard} onPress={() => handleAvatarPress(item)}>
        {/* Avatar Image */}
        <View style={styles.avatarImageContainer}>
          <Image source={{ uri: item.imageUrl }} style={styles.avatarImage} resizeMode="contain" />

          {/* Rarity Border */}
          <View style={[styles.rarityBorder, { borderColor: getRarityColor(item.rarity) }]} />

          {/* Owned Badge */}
          {isOwned && (
            <View style={styles.ownedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            </View>
          )}

          {/* Rarity Badge */}
          <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(item.rarity) }]}>
            <Text style={styles.rarityText}>{item.rarity.charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        {/* Avatar Info */}
        <View style={styles.avatarInfo}>
          <Text style={styles.avatarName} numberOfLines={1}>
            {item.name}
          </Text>

          {!isOwned && (
            <View style={styles.priceContainer}>
              <Ionicons name="diamond-outline" size={14} color="#FFD700" />
              <Text style={[styles.priceText, !canAfford && styles.unaffordablePrice]}>
                {item.coinPrice}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filteredAvatars = getFilteredAvatars();

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title="Avatar Customization" showMenu={false} />

      {/* Category Tabs */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryTab}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Content */}
      {storeStore.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Loading avatars...</Text>
        </View>
      ) : (
        <>
          {/* Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {filteredAvatars.length} avatar{filteredAvatars.length !== 1 ? 's' : ''} available
            </Text>
            <Text style={styles.statsText}>{storeStore.userAvatars.length} owned</Text>
          </View>

          {/* Avatar Grid */}
          <FlatList
            data={filteredAvatars}
            renderItem={renderAvatar}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.avatarGrid}
            showsVerticalScrollIndicator={false}
            refreshing={storeStore.isLoading}
            onRefresh={loadData}
          />
        </>
      )}

      {/* Modals */}
      <AvatarDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        avatar={selectedAvatar}
        userCoins={storeStore.coins}
        isLoading={storeStore.isLoading}
        onPurchase={(avatarId) => handlePurchasePress(selectedAvatar!)}
        isOwned={selectedAvatar ? isAvatarOwned(selectedAvatar.id) : false}
      />

      <AvatarPurchaseModal
        visible={purchaseModalVisible}
        onClose={() => setPurchaseModalVisible(false)}
        avatar={selectedAvatar}
        userCoins={storeStore.coins}
        onConfirm={handlePurchaseConfirm}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  categoriesContainer: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  categoriesList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    gap: 6,
  },
  activeCategoryTab: {
    backgroundColor: '#6C5CE7',
  },
  categoryText: {
    fontSize: 14,
    color: '#AAAAAA',
    fontWeight: '600',
  },
  activeCategoryText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
  },
  statsText: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  avatarGrid: {
    padding: 20,
    paddingTop: 8,
    gap: 16,
  },
  avatarCard: {
    width: ITEM_WIDTH,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
    marginBottom: 16,
  },
  avatarImageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: ITEM_WIDTH - 24,
    height: ITEM_WIDTH - 24,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  rarityBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 10,
    borderWidth: 2,
  },
  ownedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  avatarInfo: {
    gap: 8,
  },
  avatarName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  unaffordablePrice: {
    color: '#F44336',
  },
});

export default AvatarCustomizationScreen;
