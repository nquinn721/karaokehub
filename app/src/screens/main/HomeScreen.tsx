import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { authStore, showStore } from '../../stores';
import { theme } from '../../theme/theme';

const { width } = Dimensions.get('window');

const HomeScreen = observer(() => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      // Load initial data for home screen
      await Promise.all([
        showStore.fetchShows(),
        // Could add featured music, stats, etc.
      ]);
    } catch (error) {
      console.error('Error loading home data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const navigateToShows = () => {
    // @ts-ignore - Navigation types will be handled by the actual navigation setup
    navigation.navigate('Shows');
  };

  const navigateToMusic = () => {
    // @ts-ignore
    navigation.navigate('Music');
  };

  const navigateToDashboard = () => {
    // @ts-ignore
    navigation.navigate('Dashboard');
  };

  const todaysShows = showStore.getTodaysShows();
  const upcomingShows = showStore.getUpcomingShows();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>
              {authStore.user?.stageName || authStore.user?.name || 'User'}!
            </Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle-outline" size={32} color={theme.colors.dark.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={navigateToShows}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.gradients.shows[0], theme.colors.gradients.shows[1]]}
                style={styles.quickActionGradient}
              >
                <Ionicons name="map" size={24} color="#fff" />
                <Text style={styles.quickActionText}>Find Shows</Text>
                <Text style={styles.quickActionSubtext}>
                  {showStore.filteredShows.length} nearby
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={navigateToMusic}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.gradients.music[0], theme.colors.gradients.music[1]]}
                style={styles.quickActionGradient}
              >
                <Ionicons name="musical-notes" size={24} color="#fff" />
                <Text style={styles.quickActionText}>Browse Music</Text>
                <Text style={styles.quickActionSubtext}>Discover songs</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Shows */}
        {todaysShows.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Shows</Text>
              <TouchableOpacity onPress={navigateToShows}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {todaysShows.slice(0, 5).map((show) => (
                <TouchableOpacity key={show.id} style={styles.showCard} activeOpacity={0.8}>
                  <View style={styles.showCardContent}>
                    <Text style={styles.showTime}>{showStore.formatTime(show.startTime)}</Text>
                    <Text style={styles.showVenue} numberOfLines={1}>
                      {show.venue?.name}
                    </Text>
                    <Text style={styles.showDJ} numberOfLines={1}>
                      {show.dj?.name}
                    </Text>
                    <Text style={styles.showLocation} numberOfLines={1}>
                      {show.venue?.city}, {show.venue?.state}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Upcoming Shows */}
        {upcomingShows.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <TouchableOpacity onPress={navigateToShows}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.upcomingList}>
              {upcomingShows.slice(0, 3).map((show) => (
                <TouchableOpacity key={show.id} style={styles.upcomingItem} activeOpacity={0.8}>
                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingDay}>{showStore.getDayDisplayName(show.day)}</Text>
                    <Text style={styles.upcomingTime}>{showStore.formatTime(show.startTime)}</Text>
                  </View>
                  <View style={styles.upcomingDetails}>
                    <Text style={styles.upcomingVenue} numberOfLines={1}>
                      {show.venue?.name}
                    </Text>
                    <Text style={styles.upcomingDJ} numberOfLines={1}>
                      {show.dj?.name}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.dark.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <TouchableOpacity
            style={styles.statsCard}
            onPress={navigateToDashboard}
            activeOpacity={0.8}
          >
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Shows Attended</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Favorite Songs</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Favorite Shows</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
            </View>
            <View style={styles.statsFooter}>
              <Text style={styles.viewDashboardText}>View Dashboard</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.dark.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.dark.background,
  },
  header: {
    backgroundColor: theme.colors.dark.surface,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.dark.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  greeting: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark.textSecondary,
  },
  userName: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.dark.text,
  },
  profileButton: {
    padding: theme.spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.dark.text,
  },
  seeAllText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark.primary,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  quickActionGradient: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: '#fff',
    marginTop: theme.spacing.sm,
  },
  quickActionSubtext: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: theme.spacing.xs,
  },
  horizontalScroll: {
    paddingRight: theme.spacing.lg,
  },
  showCard: {
    backgroundColor: theme.colors.dark.surface,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.md,
    width: width * 0.7,
    ...theme.shadows.small,
  },
  showCardContent: {
    padding: theme.spacing.md,
  },
  showTime: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.dark.primary,
    marginBottom: theme.spacing.xs,
  },
  showVenue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark.text,
    marginBottom: theme.spacing.xs,
  },
  showDJ: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  showLocation: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark.textMuted,
  },
  upcomingList: {
    backgroundColor: theme.colors.dark.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.dark.border,
  },
  upcomingInfo: {
    width: 80,
    marginRight: theme.spacing.md,
  },
  upcomingDay: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark.primary,
  },
  upcomingTime: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark.textMuted,
  },
  upcomingDetails: {
    flex: 1,
  },
  upcomingVenue: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.dark.text,
    marginBottom: 2,
  },
  upcomingDJ: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark.textSecondary,
  },
  statsCard: {
    backgroundColor: theme.colors.dark.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.small,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statNumber: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.dark.primary,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark.textSecondary,
    textAlign: 'center',
  },
  statsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.dark.border,
  },
  viewDashboardText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark.primary,
    fontWeight: '500',
    marginRight: theme.spacing.xs,
  },
  bottomSpacing: {
    height: theme.spacing.xl,
  },
});

export default HomeScreen;
