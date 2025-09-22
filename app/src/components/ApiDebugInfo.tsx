import { StyleSheet, Text, View } from 'react-native';
import { apiService } from '../services/ApiService';

const ApiDebugInfo = () => {
  const { baseURL, isDevelopment } = apiService.environmentInfo;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Configuration</Text>
      <Text style={styles.info}>Base URL: {baseURL}</Text>
      <Text style={styles.info}>Environment: {isDevelopment ? 'Development' : 'Production'}</Text>
      <Text style={styles.info}>Store Endpoints:</Text>
      <Text style={styles.endpoint}>• My Coins: {apiService.endpoints.store.myCoins}</Text>
      <Text style={styles.endpoint}>
        • Coin Packages: {apiService.endpoints.store.coinPackages}
      </Text>
      <Text style={styles.endpoint}>• Avatars: {apiService.endpoints.store.avatars}</Text>
      <Text style={styles.endpoint}>• Microphones: {apiService.endpoints.store.microphones}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  info: {
    color: '#AAAAAA',
    fontSize: 12,
    marginBottom: 4,
  },
  endpoint: {
    color: '#007AFF',
    fontSize: 11,
    marginLeft: 8,
    marginBottom: 2,
  },
});

export default ApiDebugInfo;
