import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import AuthGuard from '../components/AuthGuard';

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
    <AuthGuard routeName="friends">
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
    </AuthGuard>
  );
};

export default FriendsNavigator;
