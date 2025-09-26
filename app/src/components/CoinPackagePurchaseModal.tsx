import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface CoinPackage {
  id: string;
  name: string;
  coinAmount: number;
  price: number;
  description?: string;
  bonusCoins?: number;
  isPopular?: boolean;
  originalPrice?: number;
}

interface CoinPackagePurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  coinPackages: CoinPackage[];
  isLoading: boolean;
  onPurchase: (packageId: string) => Promise<void>;
}

const CoinPackagePurchaseModal: React.FC<CoinPackagePurchaseModalProps> = ({
  visible,
  onClose,
  coinPackages,
  isLoading,
  onPurchase,
}) => {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async (pkg: CoinPackage) => {
    Alert.alert(
      'Confirm Purchase',
      `Purchase ${pkg.coinAmount}${pkg.bonusCoins ? ` (+${pkg.bonusCoins} bonus)` : ''} coins for $${pkg.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            setIsProcessing(true);
            setSelectedPackage(pkg.id);
            try {
              await onPurchase(pkg.id);
              onClose();
            } catch (error) {
              console.error('Purchase failed:', error);
              Alert.alert('Purchase Failed', 'Please try again later.');
            } finally {
              setIsProcessing(false);
              setSelectedPackage(null);
            }
          },
        },
      ],
    );
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  const getTotalCoins = (pkg: CoinPackage) => {
    return pkg.coinAmount + (pkg.bonusCoins || 0);
  };

  const renderPackage = (pkg: CoinPackage) => {
    const isSelected = selectedPackage === pkg.id;
    const totalCoins = getTotalCoins(pkg);
    const hasDiscount = pkg.originalPrice && pkg.originalPrice > pkg.price;

    return (
      <TouchableOpacity
        key={pkg.id}
        style={[
          styles.packageContainer,
          pkg.isPopular && styles.popularPackage,
          isSelected && styles.selectedPackage,
        ]}
        onPress={() => handlePurchase(pkg)}
        disabled={isProcessing}
      >
        {/* Popular Badge */}
        {pkg.isPopular && (
          <View style={styles.popularBadge}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.popularText}>BEST VALUE</Text>
          </View>
        )}

        <View style={styles.packageHeader}>
          <Text style={styles.packageName}>{pkg.name}</Text>
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {Math.round(((pkg.originalPrice! - pkg.price) / pkg.originalPrice!) * 100)}% OFF
              </Text>
            </View>
          )}
        </View>

        {/* Coin Display */}
        <View style={styles.coinDisplay}>
          <View style={styles.mainCoins}>
            <Ionicons name="diamond" size={32} color="#FFD700" />
            <Text style={styles.coinAmount}>{pkg.coinAmount.toLocaleString()}</Text>
          </View>

          {pkg.bonusCoins && (
            <View style={styles.bonusCoins}>
              <Text style={styles.bonusText}>+{pkg.bonusCoins.toLocaleString()} BONUS</Text>
            </View>
          )}

          <Text style={styles.totalCoins}>Total: {totalCoins.toLocaleString()} coins</Text>
        </View>

        {/* Price Display */}
        <View style={styles.priceContainer}>
          {hasDiscount && (
            <Text style={styles.originalPrice}>${formatPrice(pkg.originalPrice!)}</Text>
          )}
          <Text style={styles.price}>${formatPrice(pkg.price)}</Text>
        </View>

        {/* Description */}
        {pkg.description && <Text style={styles.description}>{pkg.description}</Text>}

        {/* Loading Indicator */}
        {isSelected && isProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#6C5CE7" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Buy Coins</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Choose a coin package to unlock avatars and premium features
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6C5CE7" />
              <Text style={styles.loadingMessage}>Loading packages...</Text>
            </View>
          ) : (
            <View style={styles.packagesContainer}>{coinPackages.map(renderPackage)}</View>
          )}

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={styles.securityText}>
              Secure payment powered by Stripe. Your payment information is protected.
            </Text>
          </View>
        </ScrollView>
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
    fontSize: 24,
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
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  loadingMessage: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  packagesContainer: {
    gap: 16,
    marginBottom: 30,
  },
  packageContainer: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  popularPackage: {
    borderColor: '#FFD700',
    backgroundColor: '#1f1a0f',
  },
  selectedPackage: {
    borderColor: '#6C5CE7',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  popularText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  packageName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  discountBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  coinDisplay: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  mainCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coinAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  bonusCoins: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bonusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalCoins: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  originalPrice: {
    fontSize: 16,
    color: '#AAAAAA',
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    color: '#4CAF50',
    lineHeight: 20,
  },
});

export default CoinPackagePurchaseModal;
