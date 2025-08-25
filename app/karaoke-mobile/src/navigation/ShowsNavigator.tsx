import { Ionicons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { colors } from '../theme';

// Import screens
import FavoriteShowsScreen from '../screens/shows/FavoriteShowsScreen';
import ShowDetailScreen from '../screens/shows/ShowDetailScreen';
import ShowsListScreen from '../screens/shows/ShowsListScreen';

export type ShowsStackParamList = {
  ShowsList: undefined;
  ShowDetail: { showId: string };
  FavoriteShows: undefined;
};

const Stack = createStackNavigator<ShowsStackParamList>();

const ShowsNavigator = () => {
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
        name="ShowsList"
        component={ShowsListScreen}
        options={({ navigation }) => ({
          title: 'Karaoke Shows',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('FavoriteShows')}
              style={{ marginRight: 16, padding: 4 }}
            >
              <Ionicons name="heart" size={24} color={colors.dark.text} />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="ShowDetail"
        component={ShowDetailScreen}
        options={{
          title: 'Show Details',
        }}
      />
      <Stack.Screen
        name="FavoriteShows"
        component={FavoriteShowsScreen}
        options={{
          title: 'Favorite Shows',
        }}
      />
    </Stack.Navigator>
  );
};

export default ShowsNavigator;
