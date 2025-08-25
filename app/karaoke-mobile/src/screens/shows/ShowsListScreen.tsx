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

const ShowsListScreen = observer(() => {
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
    setRegion({
      latitude: parseFloat(show.latitude) || region.latitude,
      longitude: parseFloat(show.longitude) || region.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
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

  const formatDay = (day?: string) => {
    if (!day) return '';
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const renderShowItem = ({ item: show }: { item: Show }) => {
    const isFavorited = showsStore.isShowFavorited(show.id);

    return (
      <TouchableOpacity
        style={styles.showCard}
        onPress={() => handleShowPress(show)}
        activeOpacity={0.7}
      >
        <View style={styles.showHeader}>
          <View style={styles.showInfo}>
            <Text style={styles.venueName}>{show.venue || 'Unknown Venue'}</Text>
            <Text style={styles.location}>
              {show.city && show.state ? `${show.city}, ${show.state}` : 'Location TBD'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleFavoritePress(show)} style={styles.favoriteButton}>
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorited ? '#FF6B6B' : '#666'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.showDetails}>
          <View style={styles.timeInfo}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.dayText}>{formatDay(show.day)}</Text>
          </View>

          {show.startTime && (
            <View style={styles.timeInfo}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.timeText}>{formatTime(show.startTime)}</Text>
            </View>
          )}

          {show.dj?.name && (
            <View style={styles.timeInfo}>
              <Ionicons name="person-outline" size={16} color="#666" />
              <Text style={styles.djText}>{show.dj.name}</Text>
            </View>
          )}
        </View>

        {show.description && (
          <Text style={styles.description} numberOfLines={2}>
            {show.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (showsStore.isLoadingShows && showsStore.shows.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading shows...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showsStore.shows.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={80} color="#CCC" />
          <Text style={styles.emptyTitle}>No Shows Found</Text>
          <Text style={styles.emptySubtitle}>
            Check back later for new karaoke shows in your area
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadShows}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={showsStore.filteredShows}
          renderItem={renderShowItem}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  refreshButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  showCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  showHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  showInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  favoriteButton: {
    padding: 4,
  },
  showDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  dayText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  djText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default ShowsListScreen;
