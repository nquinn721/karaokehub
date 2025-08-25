import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { colors } from '../theme';

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
          backgroundColor: colors.dark.surface,
        },
        headerTintColor: colors.dark.text,
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
