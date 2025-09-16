import { StatusBar } from 'expo-status-bar';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { rootStore } from './src/stores';

// Initialize stores when app starts
const App = observer(() => {
  useEffect(() => {
    // Any additional app-level initialization can go here
    console.log('KaraokeHub Mobile App Started');
    
    // HMR debug logging
    if (__DEV__) {
      console.log('🔥 Development mode - HMR enabled');
      console.log('📱 Fast Refresh should work for component changes');
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
