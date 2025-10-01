import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { authStore } from '../stores';

const SettingsScreen = observer(() => {
  // Local state for settings
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [locationServices, setLocationServices] = useState(true);
  const [autoLogin, setAutoLogin] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => authStore.logout()
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Coming Soon', 'Account deletion will be implemented soon.');
          }
        }
      ]
    );
  };

  const SettingsSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const SettingsItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true,
    rightComponent 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity 
      style={styles.settingsItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingsItemLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={20} color="#007AFF" />
        </View>
        <View style={styles.settingsItemText}>
          <Text style={styles.settingsItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingsItemRight}>
        {rightComponent}
        {showArrow && onPress && (
          <Ionicons name="chevron-forward" size={20} color="#666666" />
        )}
      </View>
    </TouchableOpacity>
  );

  const ToggleItem = ({ 
    icon, 
    title, 
    subtitle, 
    value, 
    onValueChange 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <SettingsItem
      icon={icon}
      title={title}
      subtitle={subtitle}
      showArrow={false}
      rightComponent={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#333333', true: '#007AFF' }}
          thumbColor="#FFFFFF"
        />
      }
    />
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="settings" size={32} color="#007AFF" style={styles.headerIcon} />
        <View>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your app preferences and account</Text>
        </View>
      </View>

      {/* Account Section */}
      <SettingsSection title="Account">
        <SettingsItem
          icon="person-outline"
          title="Profile"
          subtitle="Edit your profile information"
          onPress={() => Alert.alert('Coming Soon', 'Profile editing will be implemented soon.')}
        />
        
        <SettingsItem
          icon="card-outline"
          title="Subscription"
          subtitle={authStore.user?.isDjSubscriptionActive ? 'DJ Plan Active' : 'Free Plan'}
          onPress={() => Alert.alert('Coming Soon', 'Subscription management will be implemented soon.')}
        />
        
        <SettingsItem
          icon="wallet-outline"
          title="Payment Methods"
          subtitle="Manage your payment options"
          onPress={() => Alert.alert('Coming Soon', 'Payment management will be implemented soon.')}
        />
      </SettingsSection>

      {/* Notifications Section */}
      <SettingsSection title="Notifications">
        <ToggleItem
          icon="notifications-outline"
          title="Push Notifications"
          subtitle="Receive notifications about shows and updates"
          value={pushNotifications}
          onValueChange={setPushNotifications}
        />
        
        <ToggleItem
          icon="mail-outline"
          title="Email Notifications"
          subtitle="Receive email updates about new features"
          value={emailNotifications}
          onValueChange={setEmailNotifications}
        />
      </SettingsSection>

      {/* Privacy & Security Section */}
      <SettingsSection title="Privacy & Security">
        <ToggleItem
          icon="location-outline"
          title="Location Services"
          subtitle="Allow app to access your location for nearby shows"
          value={locationServices}
          onValueChange={setLocationServices}
        />
        
        <ToggleItem
          icon="log-in-outline"
          title="Stay Signed In"
          subtitle="Automatically sign in when you open the app"
          value={autoLogin}
          onValueChange={setAutoLogin}
        />
        
        <SettingsItem
          icon="shield-checkmark-outline"
          title="Privacy Policy"
          subtitle="Read our privacy policy"
          onPress={() => Alert.alert('Coming Soon', 'Privacy policy will be implemented soon.')}
        />
      </SettingsSection>

      {/* App Preferences Section */}
      <SettingsSection title="App Preferences">
        <ToggleItem
          icon="moon-outline"
          title="Dark Mode"
          subtitle="Use dark theme (recommended)"
          value={darkMode}
          onValueChange={setDarkMode}
        />
        
        <SettingsItem
          icon="language-outline"
          title="Language"
          subtitle="English (US)"
          onPress={() => Alert.alert('Coming Soon', 'Language selection will be implemented soon.')}
        />
        
        <SettingsItem
          icon="download-outline"
          title="Auto-Update"
          subtitle="Automatically download app updates"
          onPress={() => Alert.alert('Coming Soon', 'Auto-update settings will be implemented soon.')}
        />
      </SettingsSection>

      {/* Help & Support Section */}
      <SettingsSection title="Help & Support">
        <SettingsItem
          icon="help-circle-outline"
          title="Help Center"
          subtitle="Get answers to common questions"
          onPress={() => Alert.alert('Coming Soon', 'Help center will be implemented soon.')}
        />
        
        <SettingsItem
          icon="chatbubble-outline"
          title="Contact Support"
          subtitle="Get help from our support team"
          onPress={() => Alert.alert('Coming Soon', 'Contact support will be implemented soon.')}
        />
        
        <SettingsItem
          icon="star-outline"
          title="Rate the App"
          subtitle="Leave a review in the app store"
          onPress={() => Alert.alert('Coming Soon', 'App rating will be implemented soon.')}
        />
      </SettingsSection>

      {/* Account Actions Section */}
      <SettingsSection title="Account Actions">
        <SettingsItem
          icon="log-out-outline"
          title="Sign Out"
          subtitle="Sign out of your account"
          onPress={handleLogout}
        />
        
        <SettingsItem
          icon="trash-outline"
          title="Delete Account"
          subtitle="Permanently delete your account"
          onPress={handleDeleteAccount}
        />
      </SettingsSection>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>KaraokeHub v1.0.0</Text>
        <Text style={styles.appInfoText}>© 2025 KaraokeHub. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  headerIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsItemText: {
    flex: 1,
  },
  settingsItemTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    color: '#AAAAAA',
    fontSize: 13,
    lineHeight: 18,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
    gap: 4,
  },
  appInfoText: {
    color: '#666666',
    fontSize: 12,
  },
});

export default SettingsScreen;