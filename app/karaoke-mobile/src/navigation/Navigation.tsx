import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { authStore } from '../stores';
import { colors } from '../theme';

// Import navigators
import FriendsNavigator from './FriendsNavigator';
import MusicNavigator from './MusicNavigator';
import ProfileNavigator from './ProfileNavigator';
import ShowsNavigator from './ShowsNavigator';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import SubmitShowScreen from '../screens/shows/SubmitShowScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Auth Stack for login/register
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Main App Stack - includes both MainTabs and Auth screens
const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={MainTabs} />
    <Stack.Screen name="Auth" component={AuthStack} />
  </Stack.Navigator>
);

const MainTabs = observer(() => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        switch (route.name) {
          case 'Shows':
            iconName = focused ? 'map' : 'map-outline';
            break;
          case 'SubmitShow':
            iconName = focused ? 'add-circle' : 'add-circle-outline';
            break;
          case 'LoginTab':
            iconName = focused ? 'log-in' : 'log-in-outline';
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
      tabBarActiveTintColor: colors.dark.tabBarActive,
      tabBarInactiveTintColor: colors.dark.tabBarInactive,
      tabBarStyle: {
        backgroundColor: colors.dark.tabBarBackground,
        borderTopWidth: 1,
        borderTopColor: colors.dark.tabBarBorder,
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
    })}
    initialRouteName="Shows"
  >
    {/* Always visible tabs */}
    <Tab.Screen
      name="Shows"
      component={ShowsNavigator}
      options={{
        tabBarLabel: 'Shows',
      }}
    />
    <Tab.Screen
      name="SubmitShow"
      component={SubmitShowScreen}
      options={{
        tabBarLabel: 'Submit Show',
      }}
    />

    {/* Conditional tabs based on auth status */}
    {authStore.isAuthenticated ? (
      <>
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
      </>
    ) : (
      <Tab.Screen
        name="LoginTab"
        component={AuthStack}
        options={{
          tabBarLabel: 'Login',
        }}
      />
    )}
  </Tab.Navigator>
));

const Navigation = observer(() => {
  return (
    <NavigationContainer>
      <AppStack />
    </NavigationContainer>
  );
});

export default Navigation;
