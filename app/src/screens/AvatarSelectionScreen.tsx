import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { authStore } from '../stores';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with 16px padding + 16px gap

// Mock avatar data - in real app this would come from the API
const mockAvatars = [
  {
    id: '1',
    name: 'Classic Rocker',
    imageUrl: 'https://via.placeholder.com/200x200/FF6B6B/FFFFFF?text=CR',
    category: 'Music Icons',
    description: 'Channel your inner rock star with this classic look',
    unlocked: true,
    price: 0,
    popularity: 95,
    tags: ['rock', 'guitar', 'classic'],
  },
  {
    id: '2',
    name: 'Pop Princess',
    imageUrl: 'https://via.placeholder.com/200x200/FF69B4/FFFFFF?text=PP',
    category: 'Music Icons',
    description: 'Sparkle and shine on stage like a true pop icon',
    unlocked: true,
    price: 0,
    popularity: 89,
    tags: ['pop', 'sparkle', 'princess'],
  },
  {
    id: '3',
    name: 'Country Cowboy',
    imageUrl: 'https://via.placeholder.com/200x200/8B4513/FFFFFF?text=CC',
    category: 'Music Icons',
    description: 'Yeehaw! Perfect for country karaoke nights',
    unlocked: false,
    price: 99,
    popularity: 78,
    tags: ['country', 'cowboy', 'hat'],
  },
  {
    id: '4',
    name: 'Jazz Legend',
    imageUrl: 'https://via.placeholder.com/200x200/4B0082/FFFFFF?text=JL',
    category: 'Music Icons',
    description: 'Smooth and sophisticated for those jazzy tunes',
    unlocked: false,
    price: 149,
    popularity: 72,
    tags: ['jazz', 'sophisticated', 'classic'],
  },
  {
    id: '5',
    name: 'Hip Hop Star',
    imageUrl: 'https://via.placeholder.com/200x200/FFD700/000000?text=HH',
    category: 'Music Icons',
    description: 'Bring the beats with this cool urban style',
    unlocked: false,
    price: 199,
    popularity: 85,
    tags: ['hip-hop', 'urban', 'cool'],
  },
  {
    id: '6',
    name: 'Disco Queen',
    imageUrl: 'https://via.placeholder.com/200x200/FF1493/FFFFFF?text=DQ',
    category: 'Retro',
    description: 'Boogie down with this groovy 70s style',
    unlocked: true,
    price: 0,
    popularity: 82,
    tags: ['disco', '70s', 'groovy'],
  },
  {
    id: '7',
    name: 'Punk Rebel',
    imageUrl: 'https://via.placeholder.com/200x200/000000/FF0000?text=PR',
    category: 'Alternative',
    description: 'Stick it to the man with this rebellious look',
    unlocked: false,
    price: 249,
    popularity: 68,
    tags: ['punk', 'rebel', 'edgy'],
  },
  {
    id: '8',
    name: 'Opera Singer',
    imageUrl: 'https://via.placeholder.com/200x200/800080/FFFFFF?text=OS',
    category: 'Classical',
    description: 'Elegant and powerful for dramatic performances',
    unlocked: false,
    price: 299,
    popularity: 55,
    tags: ['opera', 'elegant', 'dramatic'],
  },
];

const AvatarSelectionScreen = observer(() => {
  const [avatars, setAvatars] = useState(mockAvatars);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'popularity' | 'price'>('popularity');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const categories = ['All', 'Music Icons', 'Retro', 'Alternative', 'Classical', 'Fantasy', 'Seasonal'];

  // Get current user's selected avatar
  const currentAvatarId = authStore.user?.avatar || '1';

  // Filter and sort avatars
  const filteredAvatars = React.useMemo(() => {
    let result = avatars.filter(avatar => {
      // Search filter
      const matchesSearch = !searchQuery || 
        avatar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        avatar.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        avatar.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category filter
      const matchesCategory = selectedCategory === 'All' || avatar.category === selectedCategory;

      // Unlocked filter
      const matchesUnlocked = !showUnlockedOnly || avatar.unlocked;

      return matchesSearch && matchesCategory && matchesUnlocked;
    });

    // Sort results
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popularity':
          return b.popularity - a.popularity;
        case 'price':
          if (a.unlocked && !b.unlocked) return -1;
          if (!a.unlocked && b.unlocked) return 1;
          return a.price - b.price;
        default:
          return 0;
      }
    });

    return result;
  }, [avatars, searchQuery, selectedCategory, sortBy, showUnlockedOnly]);

  const handleSelectAvatar = async (avatar: any) => {
    if (!avatar.unlocked) {
      Alert.alert(
        'Avatar Locked',
        `"${avatar.name}" costs ${avatar.price} coins. Would you like to unlock it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: `Unlock for ${avatar.price} coins`, onPress: () => handlePurchaseAvatar(avatar) }
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement actual avatar selection API call
      Alert.alert('Avatar Selected', `You are now using "${avatar.name}"!`);
      
      // Update local state
      if (authStore.user) {
        authStore.user.avatar = avatar.id;
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchaseAvatar = async (avatar: any) => {
    setIsLoading(true);
    try {
      // TODO: Implement actual purchase API call
      Alert.alert('Purchase Successful', `You have unlocked "${avatar.name}"!`);
      
      // Update local state
      setAvatars(prev => prev.map(a => 
        a.id === avatar.id ? { ...a, unlocked: true } : a
      ));
    } catch (error) {
      Alert.alert('Purchase Failed', 'Not enough coins or purchase failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewAvatar = (avatar: any) => {
    setSelectedAvatar(avatar);
    setShowPreview(true);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `${price} coins`;
  };

  const AvatarCard = ({ item }: { item: any }) => {
    const isSelected = currentAvatarId === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.avatarCard, isSelected && styles.selectedAvatarCard]}
        onPress={() => handleSelectAvatar(item)}
        onLongPress={() => handlePreviewAvatar(item)}
      >
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
        )}
        
        <View style={styles.avatarImageContainer}>
          <Image source={{ uri: item.imageUrl }} style={styles.avatarImage} />
          {!item.unlocked && (
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={24} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.avatarInfo}>
          <Text style={styles.avatarName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.avatarCategory} numberOfLines={1}>{item.category}</Text>
          
          <View style={styles.avatarMeta}>
            <View style={styles.popularityContainer}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.popularityText}>{item.popularity}%</Text>
            </View>
            <Text style={[
              styles.priceText,
              item.unlocked ? styles.freeText : styles.paidText
            ]}>
              {formatPrice(item.price)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => handlePreviewAvatar(item)}
        >
          <Ionicons name="eye" size={16} color="#007AFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const PreviewModal = () => (
    <Modal
      visible={showPreview}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowPreview(false)}
    >
      {selectedAvatar && (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <Text style={styles.previewCloseText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Avatar Preview</Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={styles.previewContent}>
            <View style={styles.previewImageContainer}>
              <Image source={{ uri: selectedAvatar.imageUrl }} style={styles.previewImage} />
            </View>

            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>{selectedAvatar.name}</Text>
              <Text style={styles.previewCategory}>{selectedAvatar.category}</Text>
              <Text style={styles.previewDescription}>{selectedAvatar.description}</Text>

              <View style={styles.previewTags}>
                {selectedAvatar.tags.map((tag: string, index: number) => (
                  <View key={index} style={styles.tagBadge}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.previewStats}>
                <View style={styles.statItem}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.statText}>{selectedAvatar.popularity}% popularity</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name={selectedAvatar.unlocked ? 'checkmark-circle' : 'lock-closed'} size={16} color={selectedAvatar.unlocked ? '#4CAF50' : '#FF6B6B'} />
                  <Text style={styles.statText}>
                    {selectedAvatar.unlocked ? 'Unlocked' : formatPrice(selectedAvatar.price)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.selectAvatarButton,
                  !selectedAvatar.unlocked && styles.purchaseButton,
                  currentAvatarId === selectedAvatar.id && styles.currentButton,
                ]}
                onPress={() => {
                  setShowPreview(false);
                  handleSelectAvatar(selectedAvatar);
                }}
                disabled={isLoading || currentAvatarId === selectedAvatar.id}
              >
                <Text style={styles.selectAvatarButtonText}>
                  {currentAvatarId === selectedAvatar.id 
                    ? 'Currently Selected'
                    : selectedAvatar.unlocked 
                      ? 'Select Avatar' 
                      : `Unlock for ${selectedAvatar.price} coins`
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Choose Your Avatar</Text>
          <Text style={styles.subtitle}>Express yourself on stage with unique avatars</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#AAAAAA" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search avatars..."
            placeholderTextColor="#AAAAAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={20} color="#AAAAAA" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.selectedCategoryChip
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === item && styles.selectedCategoryChipText
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Sort by:</Text>
          {['popularity', 'name', 'price'].map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.sortOption, sortBy === option && styles.sortOptionActive]}
              onPress={() => setSortBy(option as any)}
            >
              <Text style={[
                styles.sortOptionText,
                sortBy === option && styles.sortOptionTextActive
              ]}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity
          style={[styles.filterToggle, showUnlockedOnly && styles.filterToggleActive]}
          onPress={() => setShowUnlockedOnly(!showUnlockedOnly)}
        >
          <Ionicons 
            name={showUnlockedOnly ? 'checkmark-circle' : 'checkmark-circle-outline'} 
            size={16} 
            color={showUnlockedOnly ? '#FFFFFF' : '#AAAAAA'} 
          />
          <Text style={[
            styles.filterToggleText,
            showUnlockedOnly && styles.filterToggleTextActive
          ]}>
            Unlocked only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredAvatars.length} avatar{filteredAvatars.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Avatars Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Updating avatar...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAvatars}
          renderItem={AvatarCard}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.avatarsGrid}
          columnWrapperStyle={styles.avatarRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={64} color="#333333" />
              <Text style={styles.emptyTitle}>No avatars found</Text>
              <Text style={styles.emptyDescription}>
                Try adjusting your search or filter criteria
              </Text>
            </View>
          )}
        />
      )}

      <PreviewModal />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    padding: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  selectedCategoryChipText: {
    color: '#FFFFFF',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  filterLabel: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E1E1E',
  },
  sortOptionActive: {
    backgroundColor: '#007AFF',
  },
  sortOptionText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  sortOptionTextActive: {
    color: '#FFFFFF',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1E1E1E',
    gap: 6,
  },
  filterToggleActive: {
    backgroundColor: '#007AFF',
  },
  filterToggleText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  filterToggleTextActive: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  avatarsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  avatarRow: {
    justifyContent: 'space-between',
  },
  avatarCard: {
    width: CARD_WIDTH,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    position: 'relative',
  },
  selectedAvatarCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  avatarImageContainer: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatarImage: {
    width: CARD_WIDTH - 24,
    height: CARD_WIDTH - 24,
    borderRadius: 8,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInfo: {
    flex: 1,
    marginBottom: 8,
  },
  avatarName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  avatarCategory: {
    color: '#AAAAAA',
    fontSize: 12,
    marginBottom: 8,
  },
  avatarMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  popularityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularityText: {
    color: '#AAAAAA',
    fontSize: 10,
  },
  priceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  freeText: {
    color: '#4CAF50',
  },
  paidText: {
    color: '#FFD700',
  },
  previewButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#AAAAAA',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  previewCloseText: {
    color: '#007AFF',
    fontSize: 16,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewContent: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  previewImageContainer: {
    marginBottom: 24,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  previewInfo: {
    alignItems: 'center',
    maxWidth: '100%',
  },
  previewName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewCategory: {
    color: '#AAAAAA',
    fontSize: 16,
    marginBottom: 16,
  },
  previewDescription: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  tagBadge: {
    backgroundColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  previewStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  selectAvatarButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  purchaseButton: {
    backgroundColor: '#FFD700',
  },
  currentButton: {
    backgroundColor: '#4CAF50',
  },
  selectAvatarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AvatarSelectionScreen;