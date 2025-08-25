import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import AuthGuard from '../components/AuthGuard';

// Import screens
import FavoriteSongsScreen from '../screens/music/FavoriteSongsScreen';
import MusicSearchScreen from '../screens/music/MusicSearchScreen';

export type MusicStackParamList = {
  MusicSearch: undefined;
  FavoriteSongs: undefined;
};

const Stack = createStackNavigator<MusicStackParamList>();

const MusicNavigator = () => {
  return (
    <AuthGuard routeName="music features">
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="MusicSearch"
          component={MusicSearchScreen}
          options={{
            title: 'Music Search',
          }}
        />
        <Stack.Screen
          name="FavoriteSongs"
          component={FavoriteSongsScreen}
          options={{
            title: 'Favorite Songs',
          }}
        />
      </Stack.Navigator>
    </AuthGuard>
  );
};

export default MusicNavigator;
