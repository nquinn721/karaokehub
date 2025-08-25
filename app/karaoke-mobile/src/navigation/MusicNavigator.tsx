import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

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
  );
};

export default MusicNavigator;
