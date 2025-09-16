import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';

// Import stores
import { showStore, mapStore, authStore, uiStore } from '../stores';
import { Show, DayOfWeek } from '../types';

const { width, height } = Dimensions.get('window');

const ShowsScreen = observer(() => {
  const [showMap, setShowMap] = useState(false); // Default to list view since map is temporarily disabled

  useEffect(() => {
    // Initialize the screen when it loads
    showStore.fetchShows();
  }, []);

  const handleMarkerPress = (show: Show) => {
    showStore.setSelectedShow(show);
  };

  const handleToggleView = () => {
    setShowMap(!showMap);
  };

  const renderShowItem = ({ item: show }: { item: Show }) => (
    <TouchableOpacity
      style={styles.showItem}
      onPress={() => handleMarkerPress(show)}
    >
      <View style={styles.showHeader}>
        <Text style={styles.venueName}>{show.venue?.name || 'Unknown Venue'}</Text>
        <Text style={styles.showTime}>
          {show.day} {show.startTime}
        </Text>
      </View>
      <Text style={styles.showAddress}>{show.venue?.address || 'No address'}</Text>
      {show.description && (
        <Text style={styles.showDescription} numberOfLines={2}>
          {show.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (uiStore.isAppLoading || showStore.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading shows...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Karaoke Shows</Text>
        <TouchableOpacity onPress={handleToggleView} style={styles.toggleButton}>
          <Ionicons 
            name={showMap ? "list" : "map"} 
            size={24} 
            color="#007AFF" 
          />
        </TouchableOpacity>
      </View>

      {showMap ? (
        // Map View (Temporarily disabled - requires development build)
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={80} color="#666666" />
            <Text style={styles.mapPlaceholderText}>
              Map View Coming Soon
            </Text>
            <Text style={styles.mapPlaceholderSubtext}>
              Maps require a development build. For now, use the list view below.
            </Text>
            <TouchableOpacity 
              style={styles.switchToListButton}
              onPress={() => setShowMap(false)}
            >
              <Ionicons name="list" size={20} color="white" />
              <Text style={styles.switchToListText}>View List</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // List View
        <FlatList
          data={showStore.shows}
          renderItem={renderShowItem}
          keyExtractor={(item) => item.id}
          style={styles.showsList}
          contentContainerStyle={styles.showsListContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes" size={60} color="#666666" />
              <Text style={styles.emptyText}>No shows found</Text>
              <Text style={styles.emptySubtext}>Check back later for new karaoke venues!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  toggleButton: {
    padding: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#BBBBBB',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    margin: 16,
    borderRadius: 12,
    padding: 32,
  },
  mapPlaceholderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#BBBBBB',
    textAlign: 'center',
    marginBottom: 24,
  },
  switchToListButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  switchToListText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  showsList: {
    flex: 1,
    backgroundColor: '#121212',
  },
  showsListContent: {
    padding: 16,
  },
  showItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  showHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  venueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  showTime: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  showAddress: {
    fontSize: 14,
    color: '#BBBBBB',
    marginBottom: 4,
  },
  showDescription: {
    fontSize: 14,
    color: '#888888',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBBBBB',
    textAlign: 'center',
  },
});

export default ShowsScreen;
