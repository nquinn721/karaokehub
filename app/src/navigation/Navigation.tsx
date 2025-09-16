import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { authStore } from '../stores';
import { theme } from '../theme/theme';
import { AuthStackParamList, MainTabParamList, RootStackParamList } from '../types';

// Components
import LoadingScreen from '../components/LoadingScreen';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// Main App Screens
import DashboardScreen from '../screens/main/DashboardScreen';
import MusicScreen from '../screens/main/MusicScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import ShowsScreen from '../screens/main/ShowsScreen';
import SubmitShowScreen from '../screens/main/SubmitShowScreen';

// Additional Screens
import AboutScreen from '../screens/AboutScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import SettingsScreen from '../screens/SettingsScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

// Auth Stack Navigator
const AuthStackNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false,
      gestureEnabled: true,
      animation: 'slide_from_right',
    }}
  >
    <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

// Main Tab Navigator
const MainTabNavigator = () => (
  <MainTabs.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        if (route.name === 'Shows') {
          iconName = focused ? 'map' : 'map-outline';
        } else if (route.name === 'SubmitShow') {
          iconName = focused ? 'add-circle' : 'add-circle-outline';
        } else if (route.name === 'Music') {
          iconName = focused ? 'musical-notes' : 'musical-notes-outline';
        } else if (route.name === 'Dashboard') {
          iconName = focused ? 'stats-chart' : 'stats-chart-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        } else {
          iconName = 'help-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: theme.colors.dark.primary,
      tabBarInactiveTintColor: theme.colors.dark.textMuted,
      tabBarStyle: {
        backgroundColor: theme.colors.dark.surface,
        borderTopColor: theme.colors.dark.border,
        borderTopWidth: 1,
        paddingTop: 5,
        paddingBottom: 5,
        height: 60,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
      },
    })}
  >
    <MainTabs.Screen name="Shows" component={ShowsScreen} options={{ tabBarLabel: 'Shows' }} />
    <MainTabs.Screen name="SubmitShow" component={SubmitShowScreen} options={{ tabBarLabel: 'Submit' }} />
    <MainTabs.Screen name="Music" component={MusicScreen} options={{ tabBarLabel: 'Music' }} />
    <MainTabs.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ tabBarLabel: 'Dashboard' }}
    />
    <MainTabs.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ tabBarLabel: 'Profile' }}
    />
  </MainTabs.Navigator>
);

// Root Navigator
const RootNavigator = observer(() => {
  if (authStore.isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {authStore.isAuthenticated ? (
        <>
          <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
          {/* Additional authenticated screens */}
          <RootStack.Group screenOptions={{ presentation: 'modal' }}>
            <RootStack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: 'Settings',
                headerStyle: {
                  backgroundColor: theme.colors.dark.surface,
                },
                headerTintColor: theme.colors.dark.text,
              }}
            />
            <RootStack.Screen
              name="About"
              component={AboutScreen}
              options={{
                headerShown: true,
                title: 'About',
                headerStyle: {
                  backgroundColor: theme.colors.dark.surface,
                },
                headerTintColor: theme.colors.dark.text,
              }}
            />
            <RootStack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
              options={{
                headerShown: true,
                title: 'Privacy Policy',
                headerStyle: {
                  backgroundColor: theme.colors.dark.surface,
                },
                headerTintColor: theme.colors.dark.text,
              }}
            />
          </RootStack.Group>
        </>
      ) : (
        <RootStack.Screen name="AuthStack" component={AuthStackNavigator} />
      )}
    </RootStack.Navigator>
  );
});

// Main Navigation Container
const Navigation = () => {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: theme.colors.dark.primary,
          background: theme.colors.dark.background,
          card: theme.colors.dark.surface,
          text: theme.colors.dark.text,
          border: theme.colors.dark.border,
          notification: theme.colors.dark.accent,
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: 'normal',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: 'bold',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '900',
          },
        },
      }}
    >
      <RootNavigator />
    </NavigationContainer>
  );
};

export default Navigation;
