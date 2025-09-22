import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { authStore, storeStore } from '../stores';

const CoinDisplay = observer(() => {
  const navigation = useNavigation();

  useEffect(() => {
    // Fetch user coins when component mounts and user is authenticated
    if (authStore.isAuthenticated) {
      storeStore.fetchUserCoins();
    }
  }, [authStore.isAuthenticated]);

  const handlePress = () => {
    navigation.navigate('Store' as never);
  };

  // Don't show if user is not authenticated
  if (!authStore.isAuthenticated) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.coinContainer}>
        <Ionicons name="diamond" size={16} color="#FFD700" style={styles.coinIcon} />
        <Text style={styles.coinText}>{storeStore.coins.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    marginRight: 16,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  coinIcon: {
    marginRight: 4,
  },
  coinText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CoinDisplay;
