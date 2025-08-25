import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ShowsStackParamList } from '../../navigation/ShowsNavigator';
import { showsStore } from '../../stores';

type ShowDetailScreenRouteProp = RouteProp<ShowsStackParamList, 'ShowDetail'>;
type ShowDetailScreenNavigationProp = StackNavigationProp<ShowsStackParamList, 'ShowDetail'>;

const ShowDetailScreen = observer(() => {
  const route = useRoute<ShowDetailScreenRouteProp>();
  const navigation = useNavigation<ShowDetailScreenNavigationProp>();
  const { showId } = route.params;

  const show = showsStore.getShowById(showId);
  const isFavorited = showsStore.isShowFavorited(showId);

  useEffect(() => {
    if (!show) {
      Alert.alert('Error', 'Show not found', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  }, [show, navigation]);

  const handleFavoritePress = async () => {
    try {
      if (isFavorited) {
        await showsStore.removeFavoriteShow(showId);
      } else {
        await showsStore.addFavoriteShow(showId);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    }
  };

  const handlePhonePress = (phone: string) => {
    const phoneUrl = `tel:${phone}`;
    Linking.canOpenURL(phoneUrl).then((supported) => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    });
  };

  const handleWebsitePress = (website: string) => {
    let url = website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open website');
      }
    });
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

  if (!show) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={80} color="#CCC" />
        <Text style={styles.errorText}>Show not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.venueName}>{show.venue || 'Unknown Venue'}</Text>
          <TouchableOpacity onPress={handleFavoritePress} style={styles.favoriteButton}>
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={32}
              color={isFavorited ? '#FF6B6B' : '#666'}
            />
          </TouchableOpacity>
        </View>

        {(show.city || show.state) && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.locationText}>
              {show.address && `${show.address}, `}
              {show.city && show.state ? `${show.city}, ${show.state}` : 'Location TBD'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Show Details</Text>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={24} color="#007AFF" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Day</Text>
            <Text style={styles.detailValue}>{formatDay(show.day) || 'TBD'}</Text>
          </View>
        </View>

        {show.startTime && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={24} color="#007AFF" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Start Time</Text>
              <Text style={styles.detailValue}>{formatTime(show.startTime)}</Text>
            </View>
          </View>
        )}

        {show.endTime && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={24} color="#007AFF" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>End Time</Text>
              <Text style={styles.detailValue}>{formatTime(show.endTime)}</Text>
            </View>
          </View>
        )}

        {show.dj?.name && (
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={24} color="#007AFF" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>DJ/Host</Text>
              <Text style={styles.detailValue}>{show.dj.name}</Text>
            </View>
          </View>
        )}
      </View>

      {show.description && (
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{show.description}</Text>
        </View>
      )}

      <View style={styles.contactSection}>
        <Text style={styles.sectionTitle}>Contact Information</Text>

        {show.venuePhone && (
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => handlePhonePress(show.venuePhone!)}
          >
            <Ionicons name="call-outline" size={24} color="#007AFF" />
            <View style={styles.contactContent}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>{show.venuePhone}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color="#CCC" />
          </TouchableOpacity>
        )}

        {show.venueWebsite && (
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => handleWebsitePress(show.venueWebsite!)}
          >
            <Ionicons name="globe-outline" size={24} color="#007AFF" />
            <View style={styles.contactContent}>
              <Text style={styles.contactLabel}>Website</Text>
              <Text style={styles.contactValue}>{show.venueWebsite}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color="#CCC" />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  venueName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 16,
  },
  favoriteButton: {
    padding: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  detailsSection: {
    backgroundColor: '#FFF',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailContent: {
    marginLeft: 16,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  descriptionSection: {
    backgroundColor: '#FFF',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  descriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  contactSection: {
    backgroundColor: '#FFF',
    marginTop: 16,
    marginBottom: 32,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactContent: {
    marginLeft: 16,
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default ShowDetailScreen;
