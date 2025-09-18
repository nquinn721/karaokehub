import { forwardRef } from 'react';
import { StyleSheet } from 'react-native';

// Import react-native-maps for native platforms only
import MapView, { Marker } from 'react-native-maps';

interface ConditionalMapProps {
  region: any;
  onRegionChangeComplete: (region: any) => void;
  shows: any[];
  onMarkerPress: (show: any) => void;
  style: any;
}

const ConditionalMap = forwardRef<any, ConditionalMapProps>(
  ({ region, onRegionChangeComplete, shows, onMarkerPress, style }, ref) => {
    // Filter shows that have valid coordinates
    const validShows = shows.filter((show) => {
      const hasValidCoords =
        show.lat &&
        show.lng &&
        !isNaN(parseFloat(show.lat)) &&
        !isNaN(parseFloat(show.lng)) &&
        parseFloat(show.lat) !== 0 &&
        parseFloat(show.lng) !== 0;

      if (!hasValidCoords && show.venue) {
        console.log(`🗺️ Skipping show "${show.venue}" - invalid coordinates:`, {
          lat: show.lat,
          lng: show.lng,
        });
      }

      return hasValidCoords;
    });

    console.log(`🗺️ Map rendering with shows: ${shows.length}`);
    console.log(`🗺️ Valid shows with coordinates: ${validShows.length}`);

    if (validShows.length > 0) {
      const sampleShow = validShows[0];
      console.log(`🗺️ Sample coordinates: ${sampleShow.lat} ${sampleShow.lng}`);
    }

    return (
      <MapView
        ref={ref}
        style={style}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={true}
        showsMyLocationButton={true}
        followsUserLocation={false}
        showsCompass={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
        mapType="standard"
      >
        {validShows.map((show, index) => {
          const lat = parseFloat(show.lat);
          const lng = parseFloat(show.lng);

          return (
            <Marker
              key={`${show.id}-${index}`}
              coordinate={{
                latitude: lat,
                longitude: lng,
              }}
              title={show.venue || 'Karaoke Show'}
              description={`${show.djName ? `DJ: ${show.djName}` : ''} ${show.startTime ? `at ${show.startTime}` : ''}`}
              onPress={() => onMarkerPress(show)}
            />
          );
        })}
      </MapView>
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
});

export default ConditionalMap;
