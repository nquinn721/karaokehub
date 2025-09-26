import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
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
}

interface AvatarPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  avatar: Avatar | null;
  userCoins: number;
  onConfirm: (avatarId: string) => Promise<void>;
}

const AvatarPurchaseModal: React.FC<AvatarPurchaseModalProps> = ({
  visible,
  onClose,
  avatar,
  userCoins,
  onConfirm,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!avatar) return null;

  const canAfford = userCoins >= avatar.coinPrice;
  const remainingCoins = userCoins - avatar.coinPrice;

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

  const handleConfirm = async () => {
    if (!canAfford || isProcessing) return;

    setIsProcessing(true);
    try {
      await onConfirm(avatar.id);
      onClose();
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Purchase Avatar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Avatar Preview */}
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: avatar.imageUrl }}
                style={styles.avatarImage}
                resizeMode="contain"
              />
              <View
                style={[styles.rarityBadge, { backgroundColor: getRarityColor(avatar.rarity) }]}
              >
                <Text style={styles.rarityText}>{avatar.rarity.toUpperCase()}</Text>
              </View>
            </View>

            {/* Avatar Info */}
            <View style={styles.infoContainer}>
              <Text style={styles.avatarName}>{avatar.name}</Text>
              {avatar.description && <Text style={styles.description}>{avatar.description}</Text>}
            </View>

            {/* Transaction Details */}
            <View style={styles.transactionContainer}>
              <Text style={styles.transactionTitle}>Purchase Summary</Text>

              <View style={styles.transactionRow}>
                <Text style={styles.transactionLabel}>Avatar:</Text>
                <Text style={styles.transactionValue}>{avatar.name}</Text>
              </View>

              <View style={styles.transactionRow}>
                <Text style={styles.transactionLabel}>Price:</Text>
                <View style={styles.priceContainer}>
                  <Ionicons name="diamond-outline" size={16} color="#FFD700" />
                  <Text style={styles.priceText}>{avatar.coinPrice} coins</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.transactionRow}>
                <Text style={styles.transactionLabel}>Current Balance:</Text>
                <Text style={styles.balanceText}>{userCoins} coins</Text>
              </View>

              <View style={styles.transactionRow}>
                <Text style={styles.transactionLabel}>After Purchase:</Text>
                <Text
                  style={[
                    styles.remainingText,
                    { color: remainingCoins >= 0 ? '#4CAF50' : '#F44336' },
                  ]}
                >
                  {remainingCoins} coins
                </Text>
              </View>

              {!canAfford && (
                <View style={styles.errorContainer}>
                  <Ionicons name="warning" size={20} color="#F44336" />
                  <Text style={styles.errorText}>
                    Insufficient coins! You need {avatar.coinPrice - userCoins} more coins.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, (!canAfford || isProcessing) && styles.disabledButton]}
              onPress={handleConfirm}
              disabled={!canAfford || isProcessing}
            >
              {isProcessing ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Processing...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="cart" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Confirm Purchase</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#121212',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
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
    padding: 20,
    gap: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rarityText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 10,
  },
  infoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  avatarName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  transactionContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLabel: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  transactionValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  remainingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#F44336',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
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
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default AvatarPurchaseModal;
