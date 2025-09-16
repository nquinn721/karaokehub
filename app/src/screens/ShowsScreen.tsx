import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Region } from 'react-native-maps';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';

// Import stores
import { showStore, mapStore, authStore, uiStore } from '../stores';
import { Show, DayOfWeek } from '../types';

const { width, height } = Dimensions.get('window');

const ShowsScreen = observer(() => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);
  const snapPoints = ['25%', '50%', '90%'];

  useEffect(() => {
    // Initialize the screen when it loads
    showStore.fetchShows();
    
    // Initialize map store and get user location
    mapStore.initialize().then(() => {
      mapStore.goToCurrentLocation();
    });
  }, []);

  const onRegionChange = useCallback((region: Region) => {
    mapStore.setRegion(region);
  }, []);

  const handleMarkerPress = useCallback((show: Show) => {
    showStore.setSelectedShow(show);
    bottomSheetRef.current?.expand();
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

  const renderShowItem = useCallback(({ item: show }: { item: Show }) => (
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
  ), []);

  if (uiStore.isAppLoading || showStore.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {uiStore.globalLoadingMessage || 'Loading shows...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={mapStore.currentRegion || undefined}
          onRegionChange={onRegionChange}
          showsUserLocation={true}
          showsMyLocationButton={false}
          userInterfaceStyle="dark"
          mapType="standard"
        >
          {showStore.shows.map((show) => (
            <Marker
              key={show.id}
              coordinate={{
                latitude: show.venue?.lat || 0,
                longitude: show.venue?.lng || 0,
              }}
              title={show.venue?.name || 'Unknown Venue'}
              description={`${show.day} ${show.startTime}`}
              onPress={() => handleMarkerPress(show)}
            >
              <View style={styles.markerContainer}>
                <Ionicons name="musical-notes" size={20} color="white" />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Floating controls */}
        <View style={styles.floatingControls}>
          <TouchableOpacity 
            style={styles.floatingButton}
            onPress={handleGetLocation}
          >
            <Ionicons name="location" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search/Filter Bar */}
        <View style={styles.searchBar}>
          <View style={styles.searchInput}>
            <Ionicons name="search" size={20} color="#BBBBBB" />
            <Text style={styles.searchPlaceholder}>Search venues...</Text>
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter" size={20} color="#007AFF" />
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
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>
              Karaoke Shows ({showStore.shows.length})
            </Text>
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
  searchBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 8,
  },
  searchPlaceholder: {
    color: '#BBBBBB',
    fontSize: 16,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
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
    marginBottom: 8,
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
});

export default ShowsScreen;
