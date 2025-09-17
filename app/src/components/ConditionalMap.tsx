import Constants from 'expo-constants';
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Conditional import for maps
let MapView: any = null;
let Marker: any = null;

// Check if we're in a development build (has native modules) or Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

try {
  if (!isExpoGo) {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
  }
} catch (error) {
  console.log('react-native-maps not available in Expo Go');
}

interface ConditionalMapProps {
  region: any;
  onRegionChangeComplete: (region: any) => void;
  shows: any[];
  onMarkerPress: (show: any) => void;
  style: any;
}

const ConditionalMap = forwardRef<any, ConditionalMapProps>(
  ({ region, onRegionChangeComplete, shows, onMarkerPress, style }, ref) => {
    // If MapView is available (development build), render the real map
    if (MapView && Marker) {
      return (
        <MapView
          ref={ref}
          style={style}
          region={region}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {shows.map((show) => (
            <Marker
              key={`${show.id}-${show.venue?.id}`}
              coordinate={{
                latitude: show.venue?.latitude || 0,
                longitude: show.venue?.longitude || 0,
              }}
              title={show.venue?.name}
              description={`${show.day_of_week} ${show.start_time}`}
              onPress={() => onMarkerPress(show)}
            >
              <View style={styles.markerContainer}>
                <View style={styles.marker}>
                  <Text style={styles.markerText}>🎤</Text>
                </View>
              </View>
            </Marker>
          ))}
        </MapView>
      );
    }

    // Fallback for Expo Go - show a placeholder
    return (
      <View style={[style, styles.mapPlaceholder]}>
        <Text style={styles.placeholderTitle}>Map Preview</Text>
        <Text style={styles.placeholderText}>📍 Maps are available in development builds</Text>
        <Text style={styles.placeholderSubtext}>{shows.length} venues found</Text>
        <Text style={styles.placeholderNote}>
          Install the development build to see the interactive map with venue markers
        </Text>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerText: {
    fontSize: 18,
  },
  mapPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 15,
  },
  placeholderNote: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 250,
  },
});

export default ConditionalMap;
