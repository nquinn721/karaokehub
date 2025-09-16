import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { theme } from '../../theme/theme';
import { showStore } from '../../stores';

interface Show {
  id: string;
  title: string;
  venueName: string;
  venueAddress: string;
  hostName: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

const ShowsScreen = observer(() => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [region, setRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data - replace with actual API calls
  const [shows] = useState<Show[]>([
    {
      id: '1',
      title: 'Friday Night Karaoke',
      venueName: 'The Singing Pub',
      venueAddress: '123 Main St, San Francisco, CA',
      hostName: 'DJ Mike',
      date: '2024-01-19',
      time: '8:00 PM',
      latitude: 37.7749,
      longitude: -122.4194,
    },
    {
      id: '2',
      title: 'Saturday Karaoke Night',
      venueName: 'Music Lounge',
      venueAddress: '456 Oak Ave, San Francisco, CA',
      hostName: 'Sarah DJ',
      date: '2024-01-20',
      time: '9:00 PM',
      latitude: 37.7849,
      longitude: -122.4094,
    },
  ]);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(coords);
        setRegion({
          ...coords,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const filterOptions = [
    { key: 'all', label: 'All Shows' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ];

  const filteredShows = shows.filter(show => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        show.title.toLowerCase().includes(query) ||
        show.venueName.toLowerCase().includes(query) ||
        show.venueAddress.toLowerCase().includes(query) ||
        show.hostName.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Apply date filter
    if (selectedFilter !== 'all') {
      const showDate = new Date(show.date);
      const now = new Date();
      
      switch (selectedFilter) {
        case 'today':
          return showDate.toDateString() === now.toDateString();
        case 'week':
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          return showDate >= now && showDate <= weekFromNow;
        case 'month':
          const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          return showDate >= now && showDate <= monthFromNow;
      }
    }

    return true;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Refresh shows data
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleShowPress = (show: Show) => {
    Alert.alert(show.title, `${show.venueName}\n${show.date} at ${show.time}\nHost: ${show.hostName}`);
  };

  const renderShowItem = ({ item }: { item: Show }) => (
    <TouchableOpacity style={styles.showCard} onPress={() => handleShowPress(item)}>
      <View style={styles.showInfo}>
        <Text style={styles.showTitle}>{item.title}</Text>
        <Text style={styles.venueName}>{item.venueName}</Text>
        <Text style={styles.venueAddress}>{item.venueAddress}</Text>
        <View style={styles.showMeta}>
          <Text style={styles.showDate}>{item.date}</Text>
          <Text style={styles.showTime}>{item.time}</Text>
          <Text style={styles.hostName}>Host: {item.hostName}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme.colors.dark.textMuted} />
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={[theme.colors.dark.background, theme.colors.dark.surface]}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Karaoke Shows</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.viewToggle, viewMode === 'map' && styles.viewToggleActive]}
              onPress={() => setViewMode('map')}
            >
              <Ionicons name="map" size={20} color={viewMode === 'map' ? 'white' : theme.colors.dark.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggle, viewMode === 'list' && styles.viewToggleActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list" size={20} color={viewMode === 'list' ? 'white' : theme.colors.dark.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={theme.colors.dark.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search shows, venues, or hosts..."
              placeholderTextColor={theme.colors.dark.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.colors.dark.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterTab,
                selectedFilter === option.key && styles.filterTabActive,
              ]}
              onPress={() => setSelectedFilter(option.key as any)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === option.key && styles.filterTabTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        {viewMode === 'map' ? (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={region}
              onRegionChangeComplete={setRegion}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {filteredShows.map((show) => (
                <Marker
                  key={show.id}
                  coordinate={{
                    latitude: show.latitude,
                    longitude: show.longitude,
                  }}
                  title={show.title}
                  description={`${show.venueName} - ${show.date} ${show.time}`}
                  onCalloutPress={() => handleShowPress(show)}
                />
              ))}
            </MapView>
            
            {/* Show count overlay */}
            <View style={styles.showCountOverlay}>
              <Text style={styles.showCountText}>
                {filteredShows.length} show{filteredShows.length !== 1 ? 's' : ''} found
              </Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={filteredShows}
            renderItem={renderShowItem}
            keyExtractor={(item) => item.id}
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.dark.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes-outline" size={64} color={theme.colors.dark.textMuted} />
                <Text style={styles.emptyStateTitle}>No Shows Found</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Try adjusting your search or filters
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.dark.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  viewToggle: {
    padding: theme.spacing.sm,
    borderRadius: 8,
    backgroundColor: theme.colors.dark.surface,
    borderWidth: 1,
    borderColor: theme.colors.dark.border,
  },
  viewToggleActive: {
    backgroundColor: theme.colors.dark.primary,
    borderColor: theme.colors.dark.primary,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.dark.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.dark.text,
  },
  filterContainer: {
    paddingBottom: theme.spacing.md,
  },
  filterContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  filterTab: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.dark.surface,
    borderWidth: 1,
    borderColor: theme.colors.dark.border,
  },
  filterTabActive: {
    backgroundColor: theme.colors.dark.primary,
    borderColor: theme.colors.dark.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.dark.text,
  },
  filterTabTextActive: {
    color: 'white',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  showCountOverlay: {
    position: 'absolute',
    top: theme.spacing.lg,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.dark.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.dark.border,
  },
  showCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.dark.text,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  showCard: {
    backgroundColor: theme.colors.dark.surface,
    borderRadius: 12,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.dark.border,
  },
  showInfo: {
    flex: 1,
  },
  showTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.dark.text,
    marginBottom: theme.spacing.xs,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.dark.primary,
    marginBottom: theme.spacing.xs,
  },
  venueAddress: {
    fontSize: 14,
    color: theme.colors.dark.textMuted,
    marginBottom: theme.spacing.sm,
  },
  showMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  showDate: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.dark.text,
  },
  showTime: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.dark.text,
  },
  hostName: {
    fontSize: 14,
    color: theme.colors.dark.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.dark.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: theme.colors.dark.textMuted,
    textAlign: 'center',
  },
});

export default ShowsScreen;
