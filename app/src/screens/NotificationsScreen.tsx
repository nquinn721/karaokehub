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

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  category: 'shows' | 'account' | 'marketing' | 'system';
  requiresAuth?: boolean;
  isPremium?: boolean;
}

const NotificationsScreen = observer(() => {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([
    // Show-related notifications
    {
      id: 'new-shows-nearby',
      title: 'New Shows Nearby',
      description: 'Get notified when new karaoke shows are posted in your area',
      enabled: true,
      category: 'shows',
    },
    {
      id: 'show-reminders',
      title: 'Show Reminders',
      description: 'Reminders about upcoming shows you\'re interested in',
      enabled: true,
      category: 'shows',
    },
    {
      id: 'show-updates',
      title: 'Show Updates',
      description: 'When show details change (time, location, cancellation)',
      enabled: true,
      category: 'shows',
    },
    {
      id: 'dj-messages',
      title: 'DJ Messages',
      description: 'Direct messages and updates from DJs',
      enabled: false,
      category: 'shows',
    },
    
    // DJ-specific notifications
    {
      id: 'show-submissions',
      title: 'New Show Submissions',
      description: 'When users submit information about your shows',
      enabled: true,
      category: 'shows',
      requiresAuth: true,
      isPremium: true,
    },
    {
      id: 'show-reviews',
      title: 'Show Reviews',
      description: 'When users leave reviews for your shows',
      enabled: true,
      category: 'shows',
      requiresAuth: true,
      isPremium: true,
    },
    {
      id: 'analytics-summary',
      title: 'Weekly Analytics',
      description: 'Weekly summary of your show performance and engagement',
      enabled: false,
      category: 'shows',
      requiresAuth: true,
      isPremium: true,
    },
    
    // Account notifications
    {
      id: 'login-alerts',
      title: 'Login Alerts',
      description: 'Security notifications for account access',
      enabled: true,
      category: 'account',
    },
    {
      id: 'subscription-updates',
      title: 'Subscription Updates',
      description: 'Billing, renewals, and subscription changes',
      enabled: true,
      category: 'account',
      requiresAuth: true,
    },
    {
      id: 'profile-views',
      title: 'Profile Views',
      description: 'When someone views your DJ profile',
      enabled: false,
      category: 'account',
      requiresAuth: true,
    },
    
    // Marketing notifications
    {
      id: 'promotions',
      title: 'Promotions & Offers',
      description: 'Special offers, discounts, and promotional content',
      enabled: false,
      category: 'marketing',
    },
    {
      id: 'feature-updates',
      title: 'Feature Updates',
      description: 'New app features and improvements',
      enabled: true,
      category: 'marketing',
    },
    {
      id: 'newsletters',
      title: 'Newsletters',
      description: 'Monthly newsletters and community highlights',
      enabled: false,
      category: 'marketing',
    },
    
    // System notifications
    {
      id: 'maintenance',
      title: 'Maintenance Notices',
      description: 'Scheduled maintenance and service updates',
      enabled: true,
      category: 'system',
    },
    {
      id: 'emergency',
      title: 'Emergency Alerts',
      description: 'Critical service disruptions and security alerts',
      enabled: true,
      category: 'system',
    },
  ]);

  const isDJ = authStore.user?.djId && authStore.user?.isDjSubscriptionActive;

  const handleToggleNotification = (id: string) => {
    const setting = notificationSettings.find(s => s.id === id);
    
    if (setting?.isPremium && !isDJ) {
      Alert.alert(
        'Premium Feature',
        'This notification setting is available for DJ subscribers only.',
        [
          { text: 'Cancel' },
          { text: 'Upgrade to DJ', onPress: () => Alert.alert('Redirect', 'Would redirect to subscription screen') }
        ]
      );
      return;
    }

    setNotificationSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { ...setting, enabled: !setting.enabled }
          : setting
      )
    );
  };

  const handleTogglePushNotifications = async (enabled: boolean) => {
    if (enabled) {
      // Request permission for notifications
      Alert.alert(
        'Enable Notifications',
        'Allow KaraokeHub to send you push notifications?',
        [
          { text: 'Don\'t Allow', onPress: () => setPushEnabled(false) },
          { text: 'Allow', onPress: () => setPushEnabled(true) }
        ]
      );
    } else {
      setPushEnabled(false);
    }
  };

  const handleTestNotification = () => {
    Alert.alert('Test Notification', 'This is how notifications will appear on your device!');
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // TODO: Save notification settings to backend
      Alert.alert('Settings Saved', 'Your notification preferences have been updated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'shows': return 'musical-note';
      case 'account': return 'person';
      case 'marketing': return 'megaphone';
      case 'system': return 'settings';
      default: return 'notifications';
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'shows': return 'Shows & Events';
      case 'account': return 'Account & Security';
      case 'marketing': return 'Marketing & Updates';
      case 'system': return 'System Notifications';
      default: return 'Other';
    }
  };

  const groupedSettings = notificationSettings.reduce((groups, setting) => {
    const category = setting.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(setting);
    return groups;
  }, {} as Record<string, NotificationSetting[]>);

  const NotificationItem = ({ setting }: { setting: NotificationSetting }) => {
    const isDisabled = setting.requiresAuth && !authStore.user;
    const isPremiumLocked = setting.isPremium && !isDJ;
    
    return (
      <View style={[styles.notificationItem, isDisabled && styles.disabledItem]}>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, isDisabled && styles.disabledText]}>
              {setting.title}
            </Text>
            {setting.isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.premiumBadgeText}>DJ</Text>
              </View>
            )}
          </View>
          <Text style={[styles.notificationDescription, isDisabled && styles.disabledText]}>
            {setting.description}
          </Text>
          {isPremiumLocked && (
            <Text style={styles.upgradeText}>Upgrade to DJ to access this feature</Text>
          )}
        </View>
        <Switch
          value={setting.enabled}
          onValueChange={() => handleToggleNotification(setting.id)}
          disabled={isDisabled || isPremiumLocked}
          trackColor={{ false: '#333333', true: '#007AFF' }}
          thumbColor="#FFFFFF"
        />
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="notifications" size={32} color="#007AFF" style={styles.headerIcon} />
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Manage how and when you receive notifications</Text>
        </View>
      </View>

      {/* Notification Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Methods</Text>
        <View style={styles.methodsContainer}>
          <View style={styles.methodItem}>
            <View style={styles.methodInfo}>
              <Ionicons name="phone-portrait" size={20} color="#007AFF" />
              <View style={styles.methodText}>
                <Text style={styles.methodTitle}>Push Notifications</Text>
                <Text style={styles.methodDescription}>Receive notifications on this device</Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePushNotifications}
              trackColor={{ false: '#333333', true: '#007AFF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.methodItem}>
            <View style={styles.methodInfo}>
              <Ionicons name="mail" size={20} color="#007AFF" />
              <View style={styles.methodText}>
                <Text style={styles.methodTitle}>Email Notifications</Text>
                <Text style={styles.methodDescription}>Receive notifications via email</Text>
              </View>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: '#333333', true: '#007AFF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.methodItem}>
            <View style={styles.methodInfo}>
              <Ionicons name="chatbubble" size={20} color="#007AFF" />
              <View style={styles.methodText}>
                <Text style={styles.methodTitle}>SMS Notifications</Text>
                <Text style={styles.methodDescription}>Receive critical updates via text</Text>
              </View>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={setSmsEnabled}
              trackColor={{ false: '#333333', true: '#007AFF' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.testButton} onPress={handleTestNotification}>
          <Ionicons name="paper-plane" size={16} color="#007AFF" />
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        </TouchableOpacity>
      </View>

      {/* Notification Categories */}
      {Object.entries(groupedSettings).map(([category, settings]) => (
        <View key={category} style={styles.section}>
          <View style={styles.categoryHeader}>
            <Ionicons name={getCategoryIcon(category) as any} size={20} color="#007AFF" />
            <Text style={styles.categoryTitle}>{getCategoryTitle(category)}</Text>
          </View>
          <View style={styles.notificationsList}>
            {settings.map(setting => (
              <NotificationItem key={setting.id} setting={setting} />
            ))}
          </View>
        </View>
      ))}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => {
              // Enable all show notifications
              setNotificationSettings(prev => 
                prev.map(setting => 
                  setting.category === 'shows' 
                    ? { ...setting, enabled: true }
                    : setting
                )
              );
            }}
          >
            <Ionicons name="musical-notes" size={20} color="#4CAF50" />
            <Text style={styles.quickActionText}>Enable All Show Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => {
              // Disable marketing notifications
              setNotificationSettings(prev => 
                prev.map(setting => 
                  setting.category === 'marketing' 
                    ? { ...setting, enabled: false }
                    : setting
                )
              );
            }}
          >
            <Ionicons name="volume-mute" size={20} color="#FF9800" />
            <Text style={styles.quickActionText}>Disable Marketing</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionButton, styles.dangerAction]}
            onPress={() => {
              Alert.alert(
                'Disable All Notifications',
                'This will turn off all notifications except critical system alerts. Are you sure?',
                [
                  { text: 'Cancel' },
                  { 
                    text: 'Disable All', 
                    style: 'destructive',
                    onPress: () => {
                      setNotificationSettings(prev => 
                        prev.map(setting => 
                          setting.category === 'system' 
                            ? setting  // Keep system notifications
                            : { ...setting, enabled: false }
                        )
                      );
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="notifications-off" size={20} color="#FF6B6B" />
            <Text style={[styles.quickActionText, styles.dangerText]}>Disable All (except system)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity 
        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
        onPress={handleSaveSettings}
        disabled={isLoading}
      >
        <Text style={styles.saveButtonText}>
          {isLoading ? 'Saving...' : 'Save Notification Settings'}
        </Text>
      </TouchableOpacity>

      {/* Info Footer */}
      <View style={styles.infoFooter}>
        <Text style={styles.infoText}>
          You can change these settings anytime. Critical security and system notifications cannot be disabled.
        </Text>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginBottom: 8,
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
    maxWidth: '90%',
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  methodsContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodText: {
    marginLeft: 12,
    flex: 1,
  },
  methodTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  methodDescription: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  categoryTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationsList: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  disabledItem: {
    opacity: 0.5,
  },
  notificationContent: {
    flex: 1,
    marginRight: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
    marginLeft: 8,
  },
  premiumBadgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationDescription: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 18,
  },
  upgradeText: {
    color: '#007AFF',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  disabledText: {
    color: '#666666',
  },
  quickActions: {
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    gap: 12,
  },
  quickActionText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  dangerAction: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: '#FF6B6B',
  },
  dangerText: {
    color: '#FF6B6B',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#333333',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1E1E1E',
    marginHorizontal: 16,
    borderRadius: 8,
  },
  infoText: {
    color: '#AAAAAA',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default NotificationsScreen;