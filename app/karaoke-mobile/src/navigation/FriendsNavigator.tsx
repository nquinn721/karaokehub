import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { colors } from '../theme';

// Import screens
import FriendRequestsScreen from '../screens/friends/FriendRequestsScreen';
import FriendsListScreen from '../screens/friends/FriendsListScreen';

export type FriendsStackParamList = {
  FriendsList: undefined;
  FriendRequests: undefined;
};

const Stack = createStackNavigator<FriendsStackParamList>();

const FriendsNavigator = () => {
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
        name="FriendsList"
        component={FriendsListScreen}
        options={{
          title: 'Friends',
        }}
      />
      <Stack.Screen
        name="FriendRequests"
        component={FriendRequestsScreen}
        options={{
          title: 'Friend Requests',
        }}
      />
    </Stack.Navigator>
  );
};

export default FriendsNavigator;
