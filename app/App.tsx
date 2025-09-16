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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});

export default App;
