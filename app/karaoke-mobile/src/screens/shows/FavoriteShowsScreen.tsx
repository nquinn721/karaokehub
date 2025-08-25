import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ShowsStackParamList } from '../../navigation/ShowsNavigator';
import { showsStore } from '../../stores';
import { FavoriteShow } from '../../types';

type FavoriteShowsScreenNavigationProp = StackNavigationProp<ShowsStackParamList, 'FavoriteShows'>;

const FavoriteShowsScreen = observer(() => {
  const navigation = useNavigation<FavoriteShowsScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      await showsStore.fetchFavoriteShows();
    } catch (error) {
      console.error('Error loading favorite shows:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleShowPress = (favoriteShow: FavoriteShow) => {
    if (favoriteShow.show) {
      navigation.navigate('ShowDetail', { showId: favoriteShow.show.id });
    }
  };

  const handleRemoveFavorite = async (favoriteShow: FavoriteShow) => {
    try {
      await showsStore.removeFavoriteShow(favoriteShow.showId);
    } catch (error) {
      console.error('Error removing favorite:', error);
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

  const renderFavoriteItem = ({ item: favoriteShow }: { item: FavoriteShow }) => {
    const show = favoriteShow.show;

    if (!show) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.showCard}
        onPress={() => handleShowPress(favoriteShow)}
        activeOpacity={0.7}
      >
        <View style={styles.showHeader}>
          <View style={styles.showInfo}>
            <Text style={styles.venueName}>{show.venue || 'Unknown Venue'}</Text>
            <Text style={styles.location}>
              {show.city && show.state ? `${show.city}, ${show.state}` : 'Location TBD'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleRemoveFavorite(favoriteShow)}
            style={styles.removeButton}
          >
            <Ionicons name="heart" size={24} color="#FF6B6B" />
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

        <Text style={styles.favoriteDate}>
          Added {new Date(favoriteShow.createdAt).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    );
  };

  if (showsStore.isLoadingFavorites && showsStore.favoriteShows.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading favorite shows...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showsStore.favoriteShows.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color="#CCC" />
          <Text style={styles.emptyTitle}>No Favorite Shows</Text>
          <Text style={styles.emptySubtitle}>
            Start exploring shows and tap the heart icon to add them to your favorites
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('ShowsList')}
          >
            <Text style={styles.exploreButtonText}>Explore Shows</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={showsStore.favoriteShows}
          renderItem={renderFavoriteItem}
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
  exploreButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  exploreButtonText: {
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
  removeButton: {
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
    marginBottom: 8,
  },
  favoriteDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default FavoriteShowsScreen;
