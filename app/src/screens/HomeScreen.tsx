import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStore, uiStore } from '../stores';

const HomeScreen = observer(() => {
  const { user } = authStore;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hello, {user?.stageName || user?.name || 'Singer'}! 🎤
            </Text>
            <Text style={styles.subtitle}>Ready for some karaoke?</Text>
          </View>
          {user?.avatar && <Image source={{ uri: user.avatar }} style={styles.avatar} />}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                // Navigate to shows
                uiStore.setCurrentTab('Shows');
              }}
            >
              <Ionicons name="map" size={32} color="#007AFF" />
              <Text style={styles.actionText}>Find Shows</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                // Navigate to music
                uiStore.setCurrentTab('Music');
              }}
            >
              <Ionicons name="musical-notes" size={32} color="#007AFF" />
              <Text style={styles.actionText}>Browse Music</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                // Navigate to submit
                uiStore.setCurrentTab('Submit');
              }}
            >
              <Ionicons name="add-circle" size={32} color="#007AFF" />
              <Text style={styles.actionText}>Submit Show</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity or Featured Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular This Week</Text>
          <View style={styles.featuredCard}>
            <Ionicons name="trending-up" size={24} color="#FF9500" />
            <View style={styles.featuredContent}>
              <Text style={styles.featuredTitle}>Top Karaoke Songs</Text>
              <Text style={styles.featuredSubtitle}>
                Check out the most popular songs this week
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Karaoke Tips</Text>
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={24} color="#34C759" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Perfect Your Performance</Text>
              <Text style={styles.tipText}>
                Practice with our preview feature before hitting the stage!
              </Text>
            </View>
          </View>
        </View>

        {/* Stats or Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Songs Favorited</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>Shows Attended</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>Reviews Left</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  featuredCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredContent: {
    flex: 1,
    marginLeft: 12,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  featuredSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tipCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default HomeScreen;
