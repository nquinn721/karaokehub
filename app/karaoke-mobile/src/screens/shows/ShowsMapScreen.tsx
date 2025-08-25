import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

import { colors } from '../../theme';
import { ShowsStackParamList } from '../../navigation/ShowsNavigator';
import { showsStore } from '../../stores';
import { Show } from '../../types';

type ShowsListScreenNavigationProp = StackNavigationProp<ShowsStackParamList, 'ShowsList'>;

const { width, height } = Dimensions.get('window');

const ShowsMapScreen = observer(() => {
  const navigation = useNavigation<ShowsListScreenNavigationProp>();
  const [region, setRegion] = useState<Region>({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);

  useEffect(() => {
    loadShows();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
        
        // Update map region to user's location
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } else {
        Alert.alert(
          'Location Permission',
          'Location permission is needed to show karaoke shows near you.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
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

  const handleShowPress = (show: Show) => {
    navigation.navigate('ShowDetail', { showId: show.id });
  };

  const handleMarkerPress = (show: Show) => {
    setSelectedShow(show);
    // Center map on selected show
    if (show.lat && show.lng) {
      setRegion({
        latitude: show.lat,
        longitude: show.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const handleFavoritePress = async (show: Show) => {
    try {
      const isFavorited = showsStore.isShowFavorited(show.id);

      if (isFavorited) {
        await showsStore.removeFavoriteShow(show.id);
      } else {
        await showsStore.addFavoriteShow(show.id);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    }
  };

  const renderShowInfoCard = () => {
    if (!selectedShow) return null;

    return (
      <View style={styles.showInfoCard}>
        <View style={styles.showInfoHeader}>
          <Text style={styles.showVenue} numberOfLines={1}>
            {selectedShow.venue || 'Unknown Venue'}
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedShow(null)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.dark.text} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.showAddress} numberOfLines={2}>
          {selectedShow.address ? `${selectedShow.address}, ` : ''}
          {selectedShow.city ? `${selectedShow.city}, ` : ''}
          {selectedShow.state || ''}
        </Text>
        
        {selectedShow.time && (
          <Text style={styles.showTime}>
            <Ionicons name="time-outline" size={16} color={colors.dark.textSecondary} />
            {' '}{selectedShow.time}
          </Text>
        )}
        
        {selectedShow.description && (
          <Text style={styles.showDescription} numberOfLines={2}>
            {selectedShow.description}
          </Text>
        )}
        
        <View style={styles.showActions}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => handleShowPress(selectedShow)}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => handleFavoritePress(selectedShow)}
          >
            <Ionicons
              name={showsStore.isShowFavorited(selectedShow.id) ? 'heart' : 'heart-outline'}
              size={24}
              color={showsStore.isShowFavorited(selectedShow.id) ? colors.dark.error : colors.dark.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const recenterToUserLocation = () => {
    if (userLocation) {
      setRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  };

  if (showsStore.isLoadingShows && showsStore.shows.length === 0) {
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
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={locationPermission}
        showsMyLocationButton={false}
        mapType="standard"
      >
        {showsStore.shows.map((show) => {
          if (!show.lat || !show.lng) return null;
          
          return (
            <Marker
              key={show.id}
              coordinate={{
                latitude: show.lat,
                longitude: show.lng,
              }}
              onPress={() => handleMarkerPress(show)}
            >
              <View style={[
                styles.customMarker,
                selectedShow?.id === show.id && styles.selectedMarker
              ]}>
                <Ionicons 
                  name="musical-notes" 
                  size={20} 
                  color={selectedShow?.id === show.id ? colors.dark.background : colors.dark.text} 
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* My Location Button */}
      {locationPermission && (
        <TouchableOpacity
          style={styles.myLocationButton}
          onPress={recenterToUserLocation}
        >
          <Ionicons name="locate" size={24} color={colors.dark.primary} />
        </TouchableOpacity>
      )}

      {/* Show Info Card */}
      {renderShowInfoCard()}

      {/* Shows Count */}
      <View style={styles.showsCount}>
        <Text style={styles.showsCountText}>
          {showsStore.shows.length} shows found
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
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
  map: {
    width,
    height,
  },
  customMarker: {
    backgroundColor: colors.dark.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.dark.background,
  },
  selectedMarker: {
    backgroundColor: colors.dark.error,
    transform: [{ scale: 1.2 }],
  },
  myLocationButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: colors.dark.surface,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.dark.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  showsCount: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: colors.dark.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: colors.dark.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  showsCountText: {
    color: colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
  },
  showInfoCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.dark.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  showInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  showVenue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark.text,
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  showAddress: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    marginBottom: 8,
    lineHeight: 22,
  },
  showTime: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  showDescription: {
    fontSize: 14,
    color: colors.dark.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  showActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewDetailsButton: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 12,
  },
  viewDetailsText: {
    color: colors.dark.buttonPrimaryText,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  favoriteButton: {
    padding: 8,
  },
});

export default ShowsMapScreen;
