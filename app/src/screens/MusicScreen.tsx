import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { authStore } from '../stores';

// Mock music data - in real app this would come from the API
const mockMusic = [
  {
    id: '1',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    genre: 'Rock',
    decade: '1970s',
    difficulty: 'Hard',
    duration: 354,
    popularity: 95,
    isFavorite: false,
    language: 'English',
    key: 'Bb Major',
    tempo: 'Variable',
    hasVideo: true,
    hasLyrics: true,
  },
  {
    id: '2',
    title: 'Sweet Caroline',
    artist: 'Neil Diamond',
    genre: 'Pop',
    decade: '1960s',
    difficulty: 'Easy',
    duration: 201,
    popularity: 89,
    isFavorite: true,
    language: 'English',
    key: 'C Major',
    tempo: 'Medium',
    hasVideo: false,
    hasLyrics: true,
  },
  {
    id: '3',
    title: 'Don\'t Stop Believin\'',
    artist: 'Journey',
    genre: 'Rock',
    decade: '1980s',
    difficulty: 'Medium',
    duration: 251,
    popularity: 92,
    isFavorite: false,
    language: 'English',
    key: 'E Major',
    tempo: 'Medium',
    hasVideo: true,
    hasLyrics: true,
  },
  {
    id: '4',
    title: 'I Will Survive',
    artist: 'Gloria Gaynor',
    genre: 'Disco',
    decade: '1970s',
    difficulty: 'Medium',
    duration: 198,
    popularity: 87,
    isFavorite: true,
    language: 'English',
    key: 'Am',
    tempo: 'Fast',
    hasVideo: true,
    hasLyrics: true,
  },
  {
    id: '5',
    title: 'Livin\' on a Prayer',
    artist: 'Bon Jovi',
    genre: 'Rock',
    decade: '1980s',
    difficulty: 'Hard',
    duration: 249,
    popularity: 90,
    isFavorite: false,
    language: 'English',
    key: 'Em',
    tempo: 'Fast',
    hasVideo: true,
    hasLyrics: true,
  },
];

const MusicScreen = observer(() => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [music, setMusic] = useState(mockMusic);
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'popularity' | 'difficulty'>('title');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    genres: [] as string[],
    decades: [] as string[],
    difficulties: [] as string[],
    languages: [] as string[],
    hasVideo: false,
    hasLyrics: false,
    minDuration: 0,
    maxDuration: 600,
  });

  const allGenres = ['Rock', 'Pop', 'Country', 'Hip Hop', 'R&B', 'Jazz', 'Blues', 'Disco', 'Electronic', 'Classical'];
  const allDecades = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
  const allDifficulties = ['Easy', 'Medium', 'Hard'];
  const allLanguages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Japanese', 'Korean'];

  // Filter and sort music
  const filteredMusic = useMemo(() => {
    let result = music.filter(song => {
      // Search query filter
      const matchesSearch = !searchQuery || 
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase());

      // Favorites filter
      const matchesFavorites = !showFavoritesOnly || song.isFavorite;

      // Genre filter
      const matchesGenre = filters.genres.length === 0 || filters.genres.includes(song.genre);

      // Decade filter
      const matchesDecade = filters.decades.length === 0 || filters.decades.includes(song.decade);

      // Difficulty filter
      const matchesDifficulty = filters.difficulties.length === 0 || filters.difficulties.includes(song.difficulty);

      // Language filter
      const matchesLanguage = filters.languages.length === 0 || filters.languages.includes(song.language);

      // Video/Lyrics filters
      const matchesVideo = !filters.hasVideo || song.hasVideo;
      const matchesLyrics = !filters.hasLyrics || song.hasLyrics;

      // Duration filter
      const matchesDuration = song.duration >= filters.minDuration && song.duration <= filters.maxDuration;

      return matchesSearch && matchesFavorites && matchesGenre && matchesDecade && 
             matchesDifficulty && matchesLanguage && matchesVideo && matchesLyrics && matchesDuration;
    });

    // Sort results
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'artist':
          return a.artist.localeCompare(b.artist);
        case 'popularity':
          return b.popularity - a.popularity;
        case 'difficulty':
          const diffOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
          return diffOrder[a.difficulty as keyof typeof diffOrder] - diffOrder[b.difficulty as keyof typeof diffOrder];
        default:
          return 0;
      }
    });

    return result;
  }, [music, searchQuery, showFavoritesOnly, filters, sortBy]);

  const toggleFavorite = useCallback((songId: string) => {
    setMusic(prev => prev.map(song => 
      song.id === songId ? { ...song, isFavorite: !song.isFavorite } : song
    ));
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'Hard': return '#F44336';
      default: return '#AAAAAA';
    }
  };

  const clearAllFilters = () => {
    setFilters({
      genres: [],
      decades: [],
      difficulties: [],
      languages: [],
      hasVideo: false,
      hasLyrics: false,
      minDuration: 0,
      maxDuration: 600,
    });
    setShowFavoritesOnly(false);
  };

  const getActiveFiltersCount = () => {
    return filters.genres.length + filters.decades.length + filters.difficulties.length + 
           filters.languages.length + (filters.hasVideo ? 1 : 0) + (filters.hasLyrics ? 1 : 0) +
           (showFavoritesOnly ? 1 : 0);
  };

  const handlePlayPreview = (song: any) => {
    Alert.alert(
      'Preview',
      `Playing preview of "${song.title}" by ${song.artist}`,
      [{ text: 'OK' }]
    );
  };

  const handleAddToQueue = (song: any) => {
    Alert.alert(
      'Added to Queue',
      `"${song.title}" has been added to your karaoke queue!`,
      [{ text: 'OK' }]
    );
  };

  const FilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filters</Text>
          <TouchableOpacity onPress={clearAllFilters}>
            <Text style={styles.modalClearText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          style={styles.modalContent}
          data={[
            { key: 'genres', title: 'Genres', options: allGenres },
            { key: 'decades', title: 'Decades', options: allDecades },
            { key: 'difficulties', title: 'Difficulty', options: allDifficulties },
            { key: 'languages', title: 'Languages', options: allLanguages },
          ]}
          renderItem={({ item }) => (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>{item.title}</Text>
              <View style={styles.filterOptions}>
                {item.options.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOption,
                      (filters[item.key as keyof typeof filters] as string[]).includes(option) && styles.filterOptionSelected
                    ]}
                    onPress={() => {
                      const currentValues = filters[item.key as keyof typeof filters] as string[];
                      const newValues = currentValues.includes(option)
                        ? currentValues.filter(v => v !== option)
                        : [...currentValues, option];
                      setFilters(prev => ({ ...prev, [item.key]: newValues }));
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      (filters[item.key as keyof typeof filters] as string[]).includes(option) && styles.filterOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          ListFooterComponent={() => (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Features</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Has Video</Text>
                <Switch
                  value={filters.hasVideo}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, hasVideo: value }))}
                  trackColor={{ false: '#333333', true: '#007AFF' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Has Lyrics Display</Text>
                <Switch
                  value={filters.hasLyrics}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, hasLyrics: value }))}
                  trackColor={{ false: '#333333', true: '#007AFF' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Favorites Only</Text>
                <Switch
                  value={showFavoritesOnly}
                  onValueChange={setShowFavoritesOnly}
                  trackColor={{ false: '#333333', true: '#007AFF' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          )}
        />

        <TouchableOpacity
          style={styles.applyFiltersButton}
          onPress={() => setShowFilters(false)}
        >
          <Text style={styles.applyFiltersButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  const SongItem = ({ item }: { item: any }) => (
    <View style={styles.songItem}>
      <View style={styles.songHeader}>
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
          <View style={styles.songMeta}>
            <Text style={styles.songGenre}>{item.genre}</Text>
            <Text style={styles.songDot}>•</Text>
            <Text style={styles.songDuration}>{formatDuration(item.duration)}</Text>
            <Text style={styles.songDot}>•</Text>
            <View style={styles.difficultyContainer}>
              <View style={[styles.difficultyDot, { backgroundColor: getDifficultyColor(item.difficulty) }]} />
              <Text style={styles.songDifficulty}>{item.difficulty}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item.id)}
        >
          <Ionicons
            name={item.isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={item.isFavorite ? '#FF6B6B' : '#AAAAAA'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.songFeatures}>
        {item.hasVideo && (
          <View style={styles.featureBadge}>
            <Ionicons name="videocam" size={12} color="#007AFF" />
            <Text style={styles.featureBadgeText}>Video</Text>
          </View>
        )}
        {item.hasLyrics && (
          <View style={styles.featureBadge}>
            <Ionicons name="musical-notes" size={12} color="#4CAF50" />
            <Text style={styles.featureBadgeText}>Lyrics</Text>
          </View>
        )}
        <View style={styles.featureBadge}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={styles.featureBadgeText}>{item.popularity}%</Text>
        </View>
      </View>

      <View style={styles.songActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePlayPreview(item)}
        >
          <Ionicons name="play" size={16} color="#007AFF" />
          <Text style={styles.actionButtonText}>Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryActionButton]}
          onPress={() => handleAddToQueue(item)}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.primaryActionButtonText}>Add to Queue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#AAAAAA" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search songs, artists..."
            placeholderTextColor="#AAAAAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={20} color="#AAAAAA" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, getActiveFiltersCount() > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={20} color={getActiveFiltersCount() > 0 ? '#FFFFFF' : '#AAAAAA'} />
          {getActiveFiltersCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {['title', 'artist', 'popularity', 'difficulty'].map(option => (
          <TouchableOpacity
            key={option}
            style={[styles.sortOption, sortBy === option && styles.sortOptionActive]}
            onPress={() => setSortBy(option as any)}
          >
            <Text style={[
              styles.sortOptionText,
              sortBy === option && styles.sortOptionTextActive
            ]}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredMusic.length} song{filteredMusic.length !== 1 ? 's' : ''}
          {getActiveFiltersCount() > 0 && ' (filtered)'}
        </Text>
        {getActiveFiltersCount() > 0 && (
          <TouchableOpacity onPress={clearAllFilters}>
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Music List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading music...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMusic}
          renderItem={SongItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes-outline" size={64} color="#333333" />
              <Text style={styles.emptyTitle}>No songs found</Text>
              <Text style={styles.emptyDescription}>
                Try adjusting your search or filter criteria
              </Text>
            </View>
          )}
        />
      )}

      <FilterModal />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  filterButton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  sortLabel: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E1E1E',
  },
  sortOptionActive: {
    backgroundColor: '#007AFF',
  },
  sortOptionText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  sortOptionTextActive: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  clearFiltersText: {
    color: '#007AFF',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 100,
  },
  songItem: {
    backgroundColor: '#1E1E1E',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  songHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  songArtist: {
    color: '#AAAAAA',
    fontSize: 14,
    marginBottom: 8,
  },
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  songGenre: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  songDot: {
    color: '#333333',
    fontSize: 12,
  },
  songDuration: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  songDifficulty: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  favoriteButton: {
    padding: 4,
  },
  songFeatures: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featureBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  songActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 6,
  },
  primaryActionButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#AAAAAA',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyDescription: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalCloseText: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalClearText: {
    color: '#FF6B6B',
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
  },
  filterOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterOptionText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  filterOptionTextSelected: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  applyFiltersButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyFiltersButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MusicScreen;
