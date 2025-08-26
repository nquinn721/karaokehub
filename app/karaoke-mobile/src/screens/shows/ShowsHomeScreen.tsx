import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors } from '../../theme';
import ShowsListScreen from './ShowsListScreen';
import ShowsMapScreen from './ShowsMapScreen';

type ViewMode = 'map' | 'list';

const ShowsHomeScreen = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  return (
    <View style={styles.container}>
      {/* View Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
          onPress={() => setViewMode('map')}
        >
          <Ionicons name="map" size={20} color={viewMode === 'map' ? '#fff' : '#666'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="list" size={20} color={viewMode === 'list' ? '#fff' : '#666'} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === 'map' ? <ShowsMapScreen /> : <ShowsListScreen />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  toggleContainer: {
    position: 'absolute',
    top: 20,
    left: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    padding: 6,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  toggleButtonActive: {
    backgroundColor: colors.dark.primary,
    shadowColor: colors.dark.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default ShowsHomeScreen;
