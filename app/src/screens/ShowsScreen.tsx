import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConditionalMap from '../components/ConditionalMap';
import { DayPicker } from '../components/DayPicker';

// Components

// Import stores
import { mapStore, showStore, uiStore } from '../stores';
import { DayOfWeek, Show } from '../types';

const { width, height } = Dimensions.get('window');

const ShowsScreen = observer(() => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<any>(null);
  const snapPoints = ['25%', '50%', '90%'];
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize the screen when it loads - only once
    const initializeScreen = async () => {
      if (isInitialized) return;

      console.log('🚀 Initializing ShowsScreen...');

      try {
        // Initialize show store first
        const showResult = await showStore.initialize();
        console.log('📱 Show initialization result:', showResult);

        if (showResult.success) {
          console.log(`✅ Loaded ${showStore.shows.length} shows from production`);
        } else if ('error' in showResult) {
          console.error('❌ Failed to load shows:', showResult.error);
        }

        // Initialize map store
        await mapStore.initialize();

        // Get user location after initialization
        await mapStore.goToCurrentLocation();

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Screen initialization failed:', error);
        setIsInitialized(true); // Still mark as initialized to prevent loops
      }
    };

    initializeScreen();
  }, []); // Empty dependency array - only run once

  const handleDayChange = useCallback((day: DayOfWeek) => {
    showStore.setSelectedDay(day);
    // Map will automatically refresh due to day change via MapStore.fetchDataForCurrentView
  }, []);

  const onRegionChange = useCallback((region: any) => {
    mapStore.setRegion(region);
  }, []);

  const handleMarkerPress = useCallback((show: Show) => {
    showStore.setSelectedShow(show);
    bottomSheetRef.current?.expand();
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      uiStore.setAppLoading(true, 'Refreshing shows...');
      const result = await showStore.refresh();

      if (result.success) {
        console.log(`✅ Refreshed ${showStore.shows.length} shows`);
      } else if ('error' in result) {
        Alert.alert('Refresh Error', result.error || 'Could not refresh shows');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not refresh shows');
    } finally {
      uiStore.setAppLoading(false);
    }
  }, []);

  const handleGetLocation = useCallback(async () => {
    try {
      uiStore.setAppLoading(true, 'Getting your location...');
      const result = await mapStore.goToCurrentLocation();
      if (result.success && result.region) {
        // Animate to user location
        mapRef.current?.animateToRegion(result.region, 1000);
      } else {
        Alert.alert('Location Error', result.error || 'Could not get your location');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not get your location');
    } finally {
      uiStore.setAppLoading(false);
    }
  }, []);

  const renderShowItem = useCallback(
    ({ item: show }: { item: Show }) => (
      <TouchableOpacity style={styles.showItem} onPress={() => handleMarkerPress(show)}>
        <View style={styles.showHeader}>
          <Text style={styles.venueName}>{show.venue?.name || 'Unknown Venue'}</Text>
          <Text style={styles.showTime}>
            {show.day} {show.startTime}
          </Text>
        </View>

        {/* Venue Address with City, State */}
        <View style={styles.venueLocation}>
          <Text style={styles.showAddress}>{show.venue?.address || 'No address'}</Text>
          {(show.venue?.city || show.venue?.state) && (
            <Text style={styles.cityState}>
              {[show.venue?.city, show.venue?.state].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>

        {show.description && (
          <Text style={styles.showDescription} numberOfLines={2}>
            {show.description}
          </Text>
        )}
        <View style={styles.showActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="navigate" size={16} color="#007AFF" />
            <Text style={styles.actionText}>Directions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="information-circle" size={16} color="#007AFF" />
            <Text style={styles.actionText}>Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    ),
    [],
  );

  if (uiStore.isAppLoading || (showStore.isLoading && !isInitialized)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {uiStore.globalLoadingMessage || 'Loading shows from production...'}
          </Text>
          {showStore.shows.length > 0 && (
            <Text style={styles.emptySubtext}>{showStore.shows.length} shows loaded</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        <ConditionalMap
          ref={mapRef}
          style={styles.map}
          region={mapStore.currentRegion || undefined}
          onRegionChangeComplete={onRegionChange}
          shows={showStore.shows}
          onMarkerPress={handleMarkerPress}
        />

        {/* Floating controls */}
        <View style={styles.floatingControls}>
          <TouchableOpacity
            style={[styles.floatingButton, styles.refreshButton]}
            onPress={handleRefresh}
          >
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.floatingButton} onPress={handleGetLocation}>
            <Ionicons name="location" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet with Show List */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
      >
        <View style={styles.bottomSheetContent}>
          {/* Day Picker */}
          <DayPicker selectedDay={showStore.selectedDay} onDayChange={handleDayChange} />

          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>Karaoke Shows ({showStore.shows.length})</Text>
            <TouchableOpacity onPress={() => bottomSheetRef.current?.collapse()}>
              <Ionicons name="chevron-down" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <BottomSheetFlatList
            data={showStore.shows}
            renderItem={renderShowItem}
            keyExtractor={(item: Show) => item.id}
            contentContainerStyle={styles.showsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="musical-notes" size={60} color="#666666" />
                <Text style={styles.emptyText}>No shows found</Text>
                <Text style={styles.emptySubtext}>Check back later for new karaoke venues!</Text>
              </View>
            }
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floatingControls: {
    position: 'absolute',
    right: 16,
    bottom: 200,
    flexDirection: 'column',
    gap: 12,
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  bottomSheetBackground: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetIndicator: {
    backgroundColor: '#666666',
    width: 40,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  showsList: {
    paddingVertical: 16,
  },
  showItem: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
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
  venueLocation: {
    marginBottom: 8,
  },
  cityState: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '500',
  },
  showDescription: {
    fontSize: 14,
    color: '#888888',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  showActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
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
  refreshButton: {
    backgroundColor: '#28a745', // Green color for refresh
  },
  mapPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 15,
  },
  placeholderNote: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 250,
  },
});

export default ShowsScreen;
