import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ShowsStackParamList } from '../../navigation/ShowsNavigator';
import { showsStore } from '../../stores';
import { colors } from '../../theme';
import { Show } from '../../types';

type ShowsListScreenNavigationProp = StackNavigationProp<ShowsStackParamList, 'ShowsList'>;

const ShowsListScreen = observer(() => {
  const navigation = useNavigation<ShowsListScreenNavigationProp>();
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);

  useEffect(() => {
    loadShows();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
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

  const renderShowItem = ({ item: show }: { item: Show }) => (
    <TouchableOpacity style={styles.showItem} onPress={() => handleShowPress(show)}>
      <View style={styles.showHeader}>
        <Text style={styles.showVenue} numberOfLines={1}>
          {show.venue || 'Unknown Venue'}
        </Text>
        <TouchableOpacity onPress={() => handleFavoritePress(show)} style={styles.favoriteButton}>
          <Ionicons
            name={showsStore.isShowFavorited(show.id) ? 'heart' : 'heart-outline'}
            size={24}
            color={
              showsStore.isShowFavorited(show.id) ? colors.dark.error : colors.dark.textSecondary
            }
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.showAddress} numberOfLines={2}>
        {show.address ? `${show.address}, ` : ''}
        {show.city ? `${show.city}, ` : ''}
        {show.state || ''}
      </Text>

      {show.time && (
        <Text style={styles.showTime}>
          <Ionicons name="time-outline" size={16} color={colors.dark.textSecondary} /> {show.time}
        </Text>
      )}

      {show.description && (
        <Text style={styles.showDescription} numberOfLines={2}>
          {show.description}
        </Text>
      )}
    </TouchableOpacity>
  );

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
      {userLocation && (
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={16} color={colors.dark.primary} />
          <Text style={styles.locationText}>Shows near you • {showsStore.shows.length} found</Text>
        </View>
      )}

      <FlatList
        data={showsStore.shows}
        renderItem={renderShowItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={showsStore.isLoadingShows}
        onRefresh={loadShows}
      />
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
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 14,
    color: colors.dark.text,
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
  },
  showItem: {
    backgroundColor: colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.dark.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  showHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  showVenue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark.text,
    flex: 1,
    marginRight: 8,
  },
  favoriteButton: {
    padding: 4,
  },
  showAddress: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
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
    lineHeight: 20,
  },
});

export default ShowsListScreen;
