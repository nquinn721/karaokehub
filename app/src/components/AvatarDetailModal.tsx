import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface Avatar {
  id: string;
  name: string;
  description?: string;
  rarity: string;
  coinPrice: number;
  imageUrl: string;
  theme?: string;
  isUnlocked?: boolean;
}

interface AvatarDetailModalProps {
  visible: boolean;
  onClose: () => void;
  avatar: Avatar | null;
  userCoins: number;
  isLoading: boolean;
  onPurchase: (avatarId: string) => void;
  isOwned: boolean;
}

const AvatarDetailModal: React.FC<AvatarDetailModalProps> = ({
  visible,
  onClose,
  avatar,
  userCoins,
  isLoading,
  onPurchase,
  isOwned,
}) => {
  if (!avatar) return null;

  const canAfford = userCoins >= avatar.coinPrice;

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return '#FFD700'; // Gold
      case 'epic':
        return '#9C27B0'; // Purple
      case 'rare':
        return '#2196F3'; // Blue
      case 'uncommon':
        return '#4CAF50'; // Green
      default:
        return '#9E9E9E'; // Grey
    }
  };

  const getRarityStars = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return 5;
      case 'epic':
        return 4;
      case 'rare':
        return 3;
      case 'uncommon':
        return 2;
      default:
        return 1;
    }
  };

  const handlePurchaseClick = () => {
    if (avatar && !isOwned && canAfford) {
      Alert.alert(
        'Purchase Avatar',
        `Do you want to buy ${avatar.name} for ${avatar.coinPrice} coins?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy', onPress: () => onPurchase(avatar.id) },
        ],
      );
    } else if (!canAfford) {
      Alert.alert('Insufficient Coins', 'You need more coins to purchase this avatar.');
    }
  };

  const renderStars = () => {
    const stars = getRarityStars(avatar.rarity);
    return (
      <View style={styles.starsContainer}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Ionicons
            key={index}
            name={index < stars ? 'star' : 'star-outline'}
            size={16}
            color={index < stars ? getRarityColor(avatar.rarity) : '#666'}
          />
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{avatar.name}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar Image */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: avatar.imageUrl }}
              style={styles.avatarImage}
              resizeMode="contain"
            />

            {/* Rarity Badge */}
            <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(avatar.rarity) }]}>
              <Text style={styles.rarityText}>{avatar.rarity.toUpperCase()}</Text>
            </View>

            {/* Owned Badge */}
            {isOwned && (
              <View style={styles.ownedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.ownedText}>OWNED</Text>
              </View>
            )}
          </View>

          {/* Details Section */}
          <View style={styles.detailsContainer}>
            {/* Name and Stars */}
            <View style={styles.nameSection}>
              <Text style={styles.avatarName}>{avatar.name}</Text>
              {renderStars()}
            </View>

            {/* Description */}
            {avatar.description && <Text style={styles.description}>{avatar.description}</Text>}

            {/* Theme */}
            {avatar.theme && (
              <View style={styles.themeContainer}>
                <Text style={styles.themeLabel}>Theme:</Text>
                <Text style={styles.themeValue}>{avatar.theme}</Text>
              </View>
            )}

            {/* Price Section */}
            <View style={styles.priceContainer}>
              <View style={styles.priceRow}>
                <Ionicons name="diamond-outline" size={20} color="#FFD700" />
                <Text style={styles.priceText}>{avatar.coinPrice} coins</Text>
              </View>

              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Your balance:</Text>
                <Text style={[styles.balanceText, { color: canAfford ? '#4CAF50' : '#F44336' }]}>
                  {userCoins} coins
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          {isOwned ? (
            <View style={styles.ownedButton}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.ownedButtonText}>Already Owned</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.purchaseButton, !canAfford && styles.disabledButton]}
              onPress={handlePurchaseClick}
              disabled={isLoading || !canAfford}
            >
              {isLoading ? (
                <Text style={styles.buttonText}>Purchasing...</Text>
              ) : (
                <>
                  <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Buy for {avatar.coinPrice} coins</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  avatarImage: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
  },
  rarityBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rarityText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  ownedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  ownedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  detailsContainer: {
    gap: 20,
  },
  nameSection: {
    alignItems: 'center',
    gap: 8,
  },
  avatarName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  description: {
    fontSize: 16,
    color: '#CCCCCC',
    lineHeight: 24,
    textAlign: 'center',
  },
  themeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  themeLabel: {
    fontSize: 16,
    color: '#AAAAAA',
  },
  themeValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  priceContainer: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  priceText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionContainer: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  purchaseButton: {
    backgroundColor: '#6C5CE7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ownedButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  ownedButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AvatarDetailModal;
