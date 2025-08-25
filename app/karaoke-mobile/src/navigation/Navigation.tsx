import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { authStore } from '../stores';

// Import navigators
import FriendsNavigator from './FriendsNavigator';
import MusicNavigator from './MusicNavigator';
import ProfileNavigator from './ProfileNavigator';
import ShowsNavigator from './ShowsNavigator';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        switch (route.name) {
          case 'Shows':
            iconName = focused ? 'map' : 'map-outline';
            break;
          case 'Music':
            iconName = focused ? 'musical-notes' : 'musical-notes-outline';
            break;
          case 'Friends':
            iconName = focused ? 'people' : 'people-outline';
            break;
          case 'Profile':
            iconName = focused ? 'person' : 'person-outline';
            break;
          default:
            iconName = 'help-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
    })}
    initialRouteName="Shows"
  >
    <Tab.Screen
      name="Shows"
      component={ShowsNavigator}
      options={{
        tabBarLabel: 'Shows',
        tabBarBadge: undefined,
      }}
    />
    <Tab.Screen
      name="Music"
      component={MusicNavigator}
      options={{
        tabBarLabel: 'Music',
      }}
    />
    <Tab.Screen
      name="Friends"
      component={FriendsNavigator}
      options={{
        tabBarLabel: 'Friends',
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileNavigator}
      options={{
        tabBarLabel: 'Profile',
      }}
    />
  </Tab.Navigator>
);

const Navigation = observer(() => {
  return (
    <NavigationContainer>
      {authStore.isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
});

export default Navigation;
