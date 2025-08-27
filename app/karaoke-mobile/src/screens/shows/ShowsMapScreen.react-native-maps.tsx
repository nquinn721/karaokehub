import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

import { ShowsStackParamList } from '../../navigation/ShowsNavigator';
import { showsStore } from '../../stores';
import { colors } from '../../theme';
import { Show } from '../../types';

type ShowsMapScreenNavigationProp = StackNavigationProp<ShowsStackParamList, 'ShowsList'>;

const ShowsMapScreen = observer(() => {
  const navigation = useNavigation<ShowsMapScreenNavigationProp>();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 39.9612, // Columbus, OH default
    longitude: -82.9988,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  useEffect(() => {
    loadShows();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(location.coords);

        // Update map region to user's location
        const newRegion: Region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        };
        setRegion(newRegion);

        // Animate to user location
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      } else {
        Alert.alert(
          'Location Permission',
          'Location permission is needed to show nearby karaoke shows on the map.',
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const loadShows = async () => {
    try {
      await showsStore.fetchShows();
    } catch (error) {
      console.error('Error loading shows:', error);
      Alert.alert('Error', 'Failed to load shows. Please try again.');
    }
  };

  const handleMarkerPress = (show: Show) => {
    console.log('Marker pressed for:', show.venue);
  };

  const handleCalloutPress = (show: Show) => {
    navigation.navigate('ShowDetail', { showId: show.id });
  };

  const centerOnUserLocation = () => {
    if (userLocation && mapRef.current) {
      const newRegion: Region = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return time;
    }
  };

  const getValidShows = () => {
    return showsStore.filteredShows.filter(
      (show) => show.lat && show.lng && show.isActive && show.isValid,
    );
  };

  if (showsStore.isLoadingShows) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.dark.primary} />
        <Text style={styles.loadingText}>Loading shows...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
        onRegionChangeComplete={setRegion}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="Your Location"
            pinColor="blue"
          />
        )}

        {/* Show markers */}
        {getValidShows().map((show) => (
          <Marker
            key={show.id}
            coordinate={{
              latitude: show.lat!,
              longitude: show.lng!,
            }}
            title={show.venue}
            description={`${show.address}${show.city && show.state ? `, ${show.city}, ${show.state}` : ''}`}
            onPress={() => handleMarkerPress(show)}
            onCalloutPress={() => handleCalloutPress(show)}
          />
        ))}
      </MapView>

      {/* Floating action buttons */}
      <View style={styles.floatingButtons}>
        {/* My Location Button */}
        {userLocation && (
          <TouchableOpacity style={styles.locationButton} onPress={centerOnUserLocation}>
            <Ionicons name="locate" size={24} color={colors.dark.text} />
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>{getValidShows().length} shows near you</Text>
        </View>
      </View>

      {/* Error state */}
      {showsStore.showsError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{showsStore.showsError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadShows}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.dark.text,
  },
  floatingButtons: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  locationButton: {
    backgroundColor: colors.dark.surface,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsContainer: {
    backgroundColor: colors.dark.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsText: {
    color: colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: colors.dark.error,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: colors.dark.text,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: colors.dark.text,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryText: {
    color: colors.dark.error,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ShowsMapScreen;
