import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import React from 'react';

// Screens
import LoginScreen from '../screens/LoginScreen';
import MusicScreen from '../screens/MusicScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ShowsScreen from '../screens/ShowsScreen';
import SubmitScreen from '../screens/SubmitScreen';

// Import stores
import { authStore, uiStore } from '../stores';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Dark theme configuration
const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#007AFF',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    border: '#333333',
    notification: '#007AFF',
  },
};

// Auth Stack for login/register
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#121212' },
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Auth-required component wrapper
const AuthRequired = ({ component: Component, ...props }: any) => {
  if (!authStore.isAuthenticated) {
    return <AuthStack />;
  }
  return <Component {...props} />;
};

// Main Tab Navigator with mixed auth requirements
const MainTabs = () => (
  <Tab.Navigator
    initialRouteName="Shows"
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        switch (route.name) {
          case 'Shows':
            iconName = focused ? 'map' : 'map-outline';
            break;
          case 'Music':
            iconName = focused ? 'musical-notes' : 'musical-notes-outline';
            break;
          case 'Submit':
          case 'Submit':
            iconName = focused ? 'add-circle' : 'add-circle-outline';
            break;
          case 'Profile':
            iconName = focused ? 'person' : 'person-outline';
            break;
          default:
            iconName = 'ellipse-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: '#888888',
      tabBarStyle: {
        backgroundColor: '#1E1E1E',
        borderTopWidth: 1,
        borderTopColor: '#333333',
        height: 90,
        paddingBottom: 25,
        paddingTop: 10,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
      },
      headerShown: false,
    })}
  >
    {/* Public pages - no auth required */}
    <Tab.Screen name="Shows" component={ShowsScreen} options={{ title: 'Shows' }} />
    <Tab.Screen name="Submit" component={SubmitScreen} options={{ title: 'Submit' }} />
    
    {/* Auth-required pages */}
    <Tab.Screen 
      name="Music" 
      component={(props: any) => <AuthRequired component={MusicScreen} {...props} />}
      options={{ title: 'Music' }} 
    />
    <Tab.Screen 
      name="Profile" 
      component={(props: any) => <AuthRequired component={ProfileScreen} {...props} />}
      options={{ title: 'Profile' }} 
    />
  </Tab.Navigator>
);

// Root Navigator
const RootNavigator = observer(() => {
  // Show loading screen while initializing
  if (authStore.isInitializing) {
    return null; // You can return a loading screen component here
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      <MainTabs />
    </NavigationContainer>
  );
});

export default RootNavigator;
