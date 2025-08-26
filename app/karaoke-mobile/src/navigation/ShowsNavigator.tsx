import { Ionicons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { colors } from '../theme';

// Import screens
import FavoriteShowsScreen from '../screens/shows/FavoriteShowsScreen';
import ShowDetailScreen from '../screens/shows/ShowDetailScreen';
import ShowsHomeScreen from '../screens/shows/ShowsHomeScreen';

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
          backgroundColor: '#FFFFFF', // White background for better status bar visibility
          elevation: 2, // Android shadow
          shadowOpacity: 0.1, // iOS shadow
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 2 },
        },
        headerTintColor: '#000000', // Black text for contrast
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
          color: '#000000',
        },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="ShowsList"
        component={ShowsHomeScreen}
        options={({ navigation }) => ({
          title: 'Karaoke Shows',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('FavoriteShows')}
              style={{
                marginRight: 16,
                padding: 8,
                borderRadius: 20,
                backgroundColor: 'rgba(0, 122, 255, 0.1)', // Light blue background
              }}
            >
              <Ionicons name="heart" size={24} color={colors.dark.primary} />
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
