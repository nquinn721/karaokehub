import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ApiDebugInfo from '../components/ApiDebugInfo';
import CustomHeader from '../components/CustomHeader';
import { apiService } from '../services/ApiService';
import { storeStore } from '../stores';
import { CoinPackage } from '../stores/StoreStore';

const StoreScreen = observer(() => {
  const navigation = useNavigation();

  useEffect(() => {
    console.log('🌍 Store API Configuration:', {
      baseURL: apiService.environmentInfo.baseURL,
      isDevelopment: apiService.environmentInfo.isDevelopment,
      storeEndpoints: apiService.endpoints.store,
    });
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        storeStore.fetchUserCoins(),
        storeStore.fetchCoinPackages(),
        storeStore.fetchStoreAvatars(),
        storeStore.fetchStoreMicrophones(),
      ]);
    } catch (error) {
      console.error('Failed to load store data:', error);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleMenuPress = () => {
    // TODO: Implement menu/drawer navigation
    console.log('Menu pressed');
  };

  const renderCoinPackage = ({ item }: { item: CoinPackage }) => (
    <TouchableOpacity style={styles.packageCard} activeOpacity={0.7}>
      <View style={styles.packageHeader}>
        <Ionicons name="diamond" size={24} color="#FFD700" />
        <Text style={styles.packageName}>{item.name}</Text>
      </View>
      <Text style={styles.packageDescription}>{item.description}</Text>
      <View style={styles.packageFooter}>
        <Text style={styles.coinAmount}>{item.coinAmount.toLocaleString()} coins</Text>
        {item.bonusCoins > 0 && <Text style={styles.bonusCoins}>+{item.bonusCoins} bonus!</Text>}
        <Text style={styles.price}>${item.priceUSD}</Text>
      </View>
    </TouchableOpacity>
  );

  if (storeStore.isLoading && storeStore.coinPackages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader title="Store" onMenuPress={handleMenuPress} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading store...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title="Store" onMenuPress={handleMenuPress} />

      <FlatList
        data={storeStore.coinPackages}
        keyExtractor={(item) => item.id}
        renderItem={renderCoinPackage}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={storeStore.isLoading}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <ApiDebugInfo />
            <View style={styles.balanceCard}>
              <Ionicons name="diamond" size={32} color="#FFD700" />
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Your Balance</Text>
                <Text style={styles.balanceAmount}>{storeStore.coins.toLocaleString()} coins</Text>
              </View>
            </View>

            {/* Store Categories */}
            <View style={styles.categoriesContainer}>
              <TouchableOpacity
                style={styles.categoryCard}
                onPress={() => navigation.navigate('AvatarCustomization' as never)}
              >
                <Ionicons name="person" size={32} color="#6C5CE7" />
                <Text style={styles.categoryTitle}>Avatars</Text>
                <Text style={styles.categorySubtitle}>Customize your look</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.categoryCard}>
                <Ionicons name="mic" size={32} color="#FF6B6B" />
                <Text style={styles.categoryTitle}>Microphones</Text>
                <Text style={styles.categorySubtitle}>Premium audio gear</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Coin Packages</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={64} color="#666666" />
            <Text style={styles.emptyText}>No coin packages available</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333333',
  },
  balanceInfo: {
    marginLeft: 16,
  },
  balanceLabel: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  balanceAmount: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  packageCard: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  packageDescription: {
    color: '#AAAAAA',
    fontSize: 14,
    marginBottom: 12,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinAmount: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bonusCoins: {
    color: '#00FF00',
    fontSize: 12,
    fontWeight: 'bold',
  },
  price: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  categoryTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  categorySubtitle: {
    color: '#AAAAAA',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default StoreScreen;
