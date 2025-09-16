import { StatusBar } from 'expo-status-bar';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { rootStore } from './src/stores';
import { testProductionAPI } from './src/utils/apiTest';

// Initialize stores when app starts
const App = observer(() => {
  useEffect(() => {
    // Any additional app-level initialization can go here
    console.log('KaraokeHub Mobile App Started');
    
    // HMR debug logging
    if (__DEV__) {
      console.log('🔥 Development mode - HMR enabled');
      console.log('📱 Fast Refresh should work for component changes');
      
      // Test production API connection in development
      setTimeout(() => {
        testProductionAPI().then((result) => {
          if (result.success) {
            console.log(`🎉 Production API working! ${result.showCount} shows available`);
          } else {
            console.warn('⚠️ Production API test failed:', result.error);
          }
        });
      }, 2000); // Wait 2 seconds after app start
    }

    return () => {
      // Cleanup when app is destroyed
      rootStore.cleanup();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" backgroundColor="#121212" />
      <RootNavigator />
    </GestureHandlerRootView>
  );
});

// Enable Fast Refresh for this component
if (__DEV__) {
  App.displayName = 'App';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});

export default App;
