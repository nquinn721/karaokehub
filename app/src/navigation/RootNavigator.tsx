import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import { Alert, StyleSheet, Text, View } from 'react-native';

// Screens
import AvatarCustomizationScreen from '../screens/AvatarCustomizationScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ImageUploadScreen from '../screens/ImageUploadScreen';
import LoginScreen from '../screens/LoginScreen';
import ManageShowsScreen from '../screens/ManageShowsScreen';
import ManualEntryScreen from '../screens/ManualEntryScreen';
import MusicScreen from '../screens/MusicScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ShowsScreen from '../screens/ShowsScreen';
import StoreScreen from '../screens/StoreScreen';
import SubmitScreen from '../screens/SubmitScreen';

// Import stores
import { authStore } from '../stores';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

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

// Helper function to check if user is DJ
const isDJ = () => {
  return !!(authStore.user?.djId && authStore.user?.isDjSubscriptionActive);
};

// Custom Drawer Content for authenticated users
const CustomDrawerContent = (props: any) => {
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => authStore.logout(),
      },
    ]);
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      <View style={styles.drawerHeader}>
        <Ionicons name="person-circle" size={60} color="#007AFF" />
        <Text style={styles.drawerUserName}>{authStore.user?.name}</Text>
        {authStore.user?.stageName && (
          <Text style={styles.drawerStageName}>@{authStore.user.stageName}</Text>
        )}
        {isDJ() && (
          <View style={styles.djBadge}>
            <Ionicons name="musical-notes" size={12} color="#FFFFFF" />
            <Text style={styles.djBadgeText}>DJ</Text>
          </View>
        )}
      </View>

      <View style={styles.drawerItems}>
        <DrawerItem
          label="Dashboard"
          icon={({ color, size }) => (
            <Ionicons name="speedometer-outline" size={size} color={color} />
          )}
          onPress={() => props.navigation.navigate('Dashboard')}
          labelStyle={styles.drawerItemLabel}
          activeTintColor="#007AFF"
        />

        <DrawerItem
          label="Profile"
          icon={({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />}
          onPress={() => props.navigation.navigate('Profile')}
          labelStyle={styles.drawerItemLabel}
          activeTintColor="#007AFF"
        />

        <DrawerItem
          label="Store"
          icon={({ color, size }) => (
            <Ionicons name="storefront-outline" size={size} color={color} />
          )}
          onPress={() => props.navigation.navigate('Store')}
          labelStyle={styles.drawerItemLabel}
          activeTintColor="#007AFF"
        />

        {/* DJ-only screens */}
        {isDJ() && (
          <>
            <View style={styles.sectionSeparator}>
              <Text style={styles.sectionTitle}>DJ Tools</Text>
            </View>

            <DrawerItem
              label="Manage My Shows"
              icon={({ color, size }) => (
                <Ionicons name="calendar-outline" size={size} color={color} />
              )}
              onPress={() => props.navigation.navigate('ManageShows')}
              labelStyle={styles.drawerItemLabel}
              activeTintColor="#007AFF"
            />
          </>
        )}

        <View style={styles.sectionSeparator}>
          <Text style={styles.sectionTitle}>Account</Text>
        </View>

        <DrawerItem
          label="Settings"
          icon={({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />}
          onPress={() => {
            // Navigate to settings when implemented
            Alert.alert('Coming Soon', 'Settings screen will be implemented soon!');
          }}
          labelStyle={styles.drawerItemLabel}
          activeTintColor="#007AFF"
        />

        <DrawerItem
          label="Sign Out"
          icon={({ color, size }) => <Ionicons name="log-out-outline" size={size} color={color} />}
          onPress={handleLogout}
          labelStyle={[styles.drawerItemLabel, { color: '#FF6B6B' }]}
          activeTintColor="#FF6B6B"
        />
      </View>
    </DrawerContentScrollView>
  );
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

// Submit Stack for submission flow
const SubmitStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: {
        backgroundColor: '#1E1E1E',
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: '600',
      },
      cardStyle: { backgroundColor: '#121212' },
    }}
  >
    <Stack.Screen
      name="SubmitHome"
      component={SubmitScreen}
      options={{
        title: 'Submit Show',
        headerShown: false,
      }}
    />
    <Stack.Screen
      name="ImageUpload"
      component={ImageUploadScreen}
      options={{ title: 'Upload Images' }}
    />
    <Stack.Screen
      name="ManualEntry"
      component={ManualEntryScreen}
      options={{ title: 'Manual Entry' }}
    />
  </Stack.Navigator>
);

// Store Stack for store-related screens
const StoreStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: {
        backgroundColor: '#1E1E1E',
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: '600',
      },
      cardStyle: { backgroundColor: '#121212' },
    }}
  >
    <Stack.Screen
      name="StoreHome"
      component={StoreScreen}
      options={{
        title: 'Store',
        headerShown: false,
      }}
    />
    <Stack.Screen
      name="AvatarCustomization"
      component={AvatarCustomizationScreen}
      options={{ title: 'Avatar Customization' }}
    />
  </Stack.Navigator>
);

// Clean Bottom Tabs - Only essential screens
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
            iconName = focused ? 'add-circle' : 'add-circle-outline';
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
    {/* Core public screens - always visible */}
    <Tab.Screen name="Shows" component={ShowsScreen} options={{ title: 'Shows' }} />
    <Tab.Screen name="Music" component={MusicScreen} options={{ title: 'Music' }} />
    <Tab.Screen name="Submit" component={SubmitStack} options={{ title: 'Submit' }} />
  </Tab.Navigator>
);

// Authenticated Drawer Navigator
const AuthenticatedDrawer = () => (
  <Drawer.Navigator
    drawerContent={(props) => <CustomDrawerContent {...props} />}
    screenOptions={{
      headerShown: false,
      drawerStyle: {
        backgroundColor: '#1E1E1E',
        width: 280,
      },
      drawerType: 'slide',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
    }}
  >
    <Drawer.Screen name="MainTabs" component={MainTabs} />
    <Drawer.Screen name="Dashboard" component={DashboardScreen} />
    <Drawer.Screen name="Profile" component={ProfileScreen} />
    <Drawer.Screen name="Store" component={StoreStack} />

    {/* DJ-only screens - only add if user is DJ */}
    {isDJ() && (
      <Drawer.Screen
        name="ManageShows"
        component={ManageShowsScreen}
        options={{ title: 'Manage My Shows' }}
      />
    )}
  </Drawer.Navigator>
);

// Root Navigator
const RootNavigator = observer(() => {
  // Show loading screen while initializing
  if (authStore.isInitializing) {
    return null; // You can return a loading screen component here
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      {authStore.isAuthenticated ? <AuthenticatedDrawer /> : <MainTabs />}
    </NavigationContainer>
  );
});

// Styles for drawer content
const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  drawerHeader: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    marginBottom: 10,
  },
  drawerUserName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  drawerStageName: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 4,
  },
  djBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  djBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  drawerItems: {
    flex: 1,
    paddingTop: 10,
  },
  drawerItemLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  sectionSeparator: {
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default RootNavigator;
