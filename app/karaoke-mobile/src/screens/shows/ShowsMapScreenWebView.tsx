import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ShowsStackParamList } from '../../navigation/ShowsNavigator';
import { showsStore } from '../../stores';
import { colors } from '../../theme';

type ShowsMapScreenNavigationProp = StackNavigationProp<ShowsStackParamList, 'ShowsList'>;

const ShowsMapScreen = observer(() => {
  const navigation = useNavigation<ShowsMapScreenNavigationProp>();
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [region, setRegion] = useState({
    latitude: 39.9612, // Columbus, OH default
    longitude: -82.9988,
    zoom: 10,
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
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          zoom: 12,
        });
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

  const getValidShows = () => {
    return showsStore.filteredShows.filter(
      (show) => show.lat && show.lng && show.isActive && show.isValid,
    );
  };

  const generateMapHTML = () => {
    const validShows = getValidShows();
    const markersJson = JSON.stringify(
      validShows.map((show) => ({
        id: show.id,
        lat: show.lat,
        lng: show.lng,
        title: show.venue || 'Karaoke Show',
        address: show.address || '',
        city: show.city || '',
        state: show.state || '',
        day: show.day || '',
        startTime: show.startTime || '',
        endTime: show.endTime || '',
        djName: show.dj?.name || 'Unknown Host',
      })),
    );

    const userLocationJson = userLocation
      ? JSON.stringify({
          lat: userLocation.latitude,
          lng: userLocation.longitude,
        })
      : 'null';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body, html { margin: 0; padding: 0; height: 100%; }
        #map { height: 100%; width: 100%; }
        .info-window {
            max-width: 250px;
            padding: 8px;
            font-family: Arial, sans-serif;
        }
        .info-window h3 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 16px;
        }
        .info-window p {
            margin: 4px 0;
            color: #666;
            font-size: 14px;
        }
        .info-window .day {
            color: #007AFF;
            font-weight: bold;
        }
        .info-window .tap-hint {
            color: #007AFF;
            font-style: italic;
            font-size: 12px;
            text-align: center;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    
    <script>
        let map;
        let infoWindow;
        const markers = ${markersJson};
        const userLocation = ${userLocationJson};
        
        function initMap() {
            const centerLat = ${region.latitude};
            const centerLng = ${region.longitude};
            const zoom = ${region.zoom};
            
            map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: centerLat, lng: centerLng },
                zoom: zoom,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            });
            
            infoWindow = new google.maps.InfoWindow();
            
            // Add user location marker
            if (userLocation) {
                new google.maps.Marker({
                    position: { lat: userLocation.lat, lng: userLocation.lng },
                    map: map,
                    title: 'Your Location',
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(\`
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="8" fill="#007AFF" stroke="#fff" stroke-width="2"/>
                                <circle cx="12" cy="12" r="3" fill="#fff"/>
                            </svg>
                        \`),
                        scaledSize: new google.maps.Size(24, 24),
                        anchor: new google.maps.Point(12, 12)
                    }
                });
            }
            
            // Add show markers
            markers.forEach(show => {
                const marker = new google.maps.Marker({
                    position: { lat: show.lat, lng: show.lng },
                    map: map,
                    title: show.title,
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(\`
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" fill="#FF6B6B" stroke="#fff" stroke-width="2"/>
                                <path d="M12 6v12M6 12h12" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
                                <text x="12" y="16" text-anchor="middle" fill="#fff" font-size="8" font-family="Arial">♪</text>
                            </svg>
                        \`),
                        scaledSize: new google.maps.Size(32, 32),
                        anchor: new google.maps.Point(16, 16)
                    }
                });
                
                const formatTime = (time) => {
                    if (!time) return '';
                    try {
                        const [hours, minutes] = time.split(':');
                        const date = new Date();
                        date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                        return date.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        });
                    } catch {
                        return time;
                    }
                };
                
                const contentString = \`
                    <div class="info-window">
                        <h3>\${show.title}</h3>
                        <p>\${show.address}\${show.city && show.state ? ', ' + show.city + ', ' + show.state : ''}</p>
                        \${show.day ? '<p class="day">' + show.day.charAt(0).toUpperCase() + show.day.slice(1) + 's</p>' : ''}
                        \${show.startTime ? '<p>' + formatTime(show.startTime) + (show.endTime ? ' - ' + formatTime(show.endTime) : '') + '</p>' : ''}
                        \${show.djName ? '<p>DJ: ' + show.djName + '</p>' : ''}
                        <p class="tap-hint">Tap to view details</p>
                    </div>
                \`;
                
                marker.addListener('click', () => {
                    infoWindow.setContent(contentString);
                    infoWindow.open(map, marker);
                    
                    // Send message to React Native after a short delay
                    setTimeout(() => {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'markerClick',
                            showId: show.id
                        }));
                    }, 100);
                });
            });
        }
        
        window.initMap = initMap;
    </script>
    <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&callback=initMap" async defer></script>
</body>
</html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick' && data.showId) {
        navigation.navigate('ShowDetail', { showId: data.showId });
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
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
      <WebView
        source={{ html: generateMapHTML() }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.dark.primary} />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}
      />

      {/* Stats overlay */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>{getValidShows().length} shows near you</Text>
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
  webview: {
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
  statsContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: colors.dark.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsText: {
    color: colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
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
