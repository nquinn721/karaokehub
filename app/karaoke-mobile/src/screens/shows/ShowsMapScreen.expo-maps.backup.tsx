import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { GoogleMaps } from 'expo-maps';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ShowsStackParamList } from '../../navigation/ShowsNavigator';
import { showsStore } from '../../stores';
import { colors } from '../../theme';
import { Show } from '../../types';

type ShowsMapScreenNavigationProp = StackNavigationProp<ShowsStackParamList, 'ShowsList'>;

const ShowsMapScreen = observer(() => {
  const navigation = useNavigation<ShowsMapScreenNavigationProp>();
  const mapRef = useRef<GoogleMaps.MapView>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [region, setRegion] = useState({
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
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        };
        setRegion(newRegion);

        // Animate to user location
        if (mapRef.current) {
          mapRef.current.setCameraPosition({
            coordinates: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
            zoom: 12,
            duration: 1000,
          });
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
      mapRef.current.setCameraPosition({
        coordinates: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        zoom: 12,
        duration: 1000,
      });
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

  const getMapMarkers = (): GoogleMaps.Marker[] => {
    const markers: GoogleMaps.Marker[] = [];

    // Add user location marker
    if (userLocation) {
      markers.push({
        id: 'user-location',
        coordinates: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        title: 'Your Location',
      });
    }

    // Add show markers
    getValidShows().forEach((show) => {
      markers.push({
        id: show.id,
        coordinates: {
          latitude: show.lat!,
          longitude: show.lng!,
        },
        title: show.venue,
        snippet: `${show.address}${show.city && show.state ? `, ${show.city}, ${show.state}` : ''}`,
        showCallout: true,
      });
    });

    return markers;
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
      <GoogleMaps.View
        ref={mapRef}
        style={styles.map}
        cameraPosition={{
          coordinates: region
            ? {
                latitude: region.latitude,
                longitude: region.longitude,
              }
            : undefined,
          zoom: 12,
        }}
        markers={getMapMarkers()}
        onMarkerClick={(marker) => {
          if (marker.id && marker.id !== 'user-location') {
            const show = getValidShows().find((s) => s.id === marker.id);
            if (show) {
              handleMarkerPress(show);
            }
          }
        }}
        onCameraMove={(event) => {
          setRegion({
            latitude: event.coordinates.latitude!,
            longitude: event.coordinates.longitude!,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          });
        }}
      />

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
  markerContainer: {
    backgroundColor: colors.dark.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  callout: {
    minWidth: 200,
    maxWidth: 250,
  },
  calloutContent: {
    padding: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark.text,
    marginBottom: 4,
  },
  calloutAddress: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    marginBottom: 4,
  },
  calloutDay: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.primary,
    marginBottom: 2,
  },
  calloutTime: {
    fontSize: 14,
    color: colors.dark.text,
    marginBottom: 2,
  },
  calloutDj: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    marginBottom: 4,
  },
  calloutTap: {
    fontSize: 12,
    color: colors.dark.primary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  floatingButtons: {
    position: 'absolute',
    top: 16,
    right: 16,
    alignItems: 'flex-end',
  },
  locationButton: {
    backgroundColor: colors.dark.surface,
    padding: 12,
    borderRadius: 25,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  retryButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryText: {
    color: '#dc2626',
    fontWeight: '600',
  },
});

export default ShowsMapScreen;
