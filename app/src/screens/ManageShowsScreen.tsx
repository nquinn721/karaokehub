import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Show } from '../types';

const ManageShowsScreen = () => {
  const [editingShow, setEditingShow] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ [key: string]: any }>({});

  // Mock data for demo - shows user's karaoke shows
  const mockShows: Show[] = [
    {
      id: '1',
      djId: 'user1',
      day: 'tuesday',
      startTime: '20:00',
      endTime: '23:00',
      description: 'Weekly karaoke night with great crowd',
      venue: {
        id: '1',
        name: 'Bernards Tavern',
        address: '630 North High Street',
      },
    },
    {
      id: '2',
      djId: 'user1',
      day: 'saturday',
      startTime: '21:00',
      endTime: '01:00',
      description: 'Weekend karaoke party - high energy!',
      venue: {
        id: '2',
        name: "O'Nelly's Sports Pub & Grill",
        address: '8939 South Old State Road',
      },
    },
    {
      id: '3',
      djId: 'user1',
      day: 'wednesday',
      startTime: '20:00',
      endTime: '00:00',
      description: '',
      venue: {
        id: '3',
        name: 'Rude Dog Bar & Grill',
        address: '1711 Sancus',
      },
    },
  ];

  const handleEdit = (show: Show) => {
    if (editingShow === show.id) {
      handleCancel();
    } else {
      setEditingShow(show.id);
      setEditData({
        ...editData,
        [show.id]: {
          day: show.day,
          startTime: show.startTime,
          endTime: show.endTime,
          description: show.description,
        },
      });
    }
  };

  const handleCancel = () => {
    setEditingShow(null);
    setEditData({});
  };

  const updateEditData = (showId: string, field: string, value: string) => {
    setEditData({
      ...editData,
      [showId]: {
        ...editData[showId],
        [field]: value,
      },
    });
  };

  const getDayColor = (day: string): string => {
    const colors: { [key: string]: string } = {
      monday: '#FF6B6B',
      tuesday: '#4ECDC4',
      wednesday: '#45B7D1',
      thursday: '#96CEB4',
      friday: '#FFEAA7',
      saturday: '#DDA0DD',
      sunday: '#98D8C8',
    };
    return colors[day.toLowerCase()] || '#666666';
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="musical-notes" size={32} color="#007AFF" style={styles.headerIcon} />
          <View>
            <Text style={styles.title}>Manage My Shows</Text>
            <Text style={styles.subtitle}>
              Edit your show times, descriptions, and other details. Changes are saved immediately.
            </Text>
          </View>
        </View>
      </View>

      {/* Shows List */}
      <View style={styles.showsList}>
        {mockShows.map((show: Show, index: number) => (
          <View
            key={show.id}
            style={[
              styles.showCard,
              editingShow === show.id && styles.editingCard,
              index === mockShows.length - 1 && styles.lastCard,
            ]}
          >
            {/* Venue Section */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="business" size={16} color="#AAAAAA" />
                <Text style={styles.sectionTitle}>Venue</Text>
              </View>
              <Text style={styles.venueText}>{show.venue?.name}</Text>
              {show.venue?.address && (
                <View style={styles.addressContainer}>
                  <Ionicons name="location-outline" size={12} color="#AAAAAA" />
                  <Text style={styles.addressText}>{show.venue.address}</Text>
                </View>
              )}
            </View>

            {/* Day Section */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={16} color="#AAAAAA" />
                <Text style={styles.sectionTitle}>Day</Text>
              </View>
              {editingShow === show.id ? (
                <TextInput
                  style={styles.textInput}
                  value={editData[show.id]?.day || show.day}
                  onChangeText={(value) => updateEditData(show.id, 'day', value)}
                  placeholder="Day of week"
                  placeholderTextColor="#666666"
                />
              ) : (
                <View style={[styles.dayBadge, { backgroundColor: getDayColor(show.day) }]}>
                  <Text style={styles.dayText}>{show.day}</Text>
                </View>
              )}
            </View>

            {/* Time Section */}
            <View style={styles.timeSection}>
              <View style={styles.timeRow}>
                <View style={styles.timeItem}>
                  <View style={styles.timeHeader}>
                    <Ionicons name="time" size={14} color="#AAAAAA" />
                    <Text style={styles.timeLabel}>Start</Text>
                  </View>
                  {editingShow === show.id ? (
                    <TextInput
                      style={styles.timeInput}
                      value={editData[show.id]?.startTime || show.startTime}
                      onChangeText={(value) => updateEditData(show.id, 'startTime', value)}
                      placeholder="HH:MM"
                      placeholderTextColor="#666666"
                    />
                  ) : (
                    <Text style={styles.timeValue}>{formatTime(show.startTime)}</Text>
                  )}
                </View>

                <View style={styles.timeItem}>
                  <View style={styles.timeHeader}>
                    <Ionicons name="time" size={14} color="#AAAAAA" />
                    <Text style={styles.timeLabel}>End</Text>
                  </View>
                  {editingShow === show.id ? (
                    <TextInput
                      style={styles.timeInput}
                      value={editData[show.id]?.endTime || show.endTime}
                      onChangeText={(value) => updateEditData(show.id, 'endTime', value)}
                      placeholder="HH:MM"
                      placeholderTextColor="#666666"
                    />
                  ) : (
                    <Text style={styles.timeValue}>{formatTime(show.endTime)}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Description Section */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={16} color="#AAAAAA" />
                <Text style={styles.sectionTitle}>Description</Text>
              </View>
              {editingShow === show.id ? (
                <TextInput
                  style={styles.descriptionInput}
                  value={editData[show.id]?.description || show.description || ''}
                  onChangeText={(value) => updateEditData(show.id, 'description', value)}
                  placeholder="Enter show description..."
                  placeholderTextColor="#666666"
                  multiline
                />
              ) : (
                <Text style={styles.descriptionText}>
                  {show.description || 'No description provided'}
                </Text>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  editingShow === show.id ? styles.cancelButton : styles.editButton,
                ]}
                onPress={() => handleEdit(show)}
              >
                <Ionicons
                  name={editingShow === show.id ? 'close' : 'pencil'}
                  size={16}
                  color={editingShow === show.id ? '#FF6B6B' : '#007AFF'}
                />
                <Text
                  style={editingShow === show.id ? styles.cancelButtonText : styles.editButtonText}
                >
                  {editingShow === show.id ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>

              {editingShow === show.id && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={() => handleCancel()}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: '90%',
  },
  showsList: {
    gap: 16,
  },
  showCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  editingCard: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  lastCard: {
    marginBottom: 20,
  },
  cardSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 6,
  },
  venueText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    color: '#AAAAAA',
    fontSize: 14,
    marginLeft: 4,
  },
  dayBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timeSection: {
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  timeItem: {
    flex: 1,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeLabel: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  timeValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  descriptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  cancelButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#2D2D2D',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  timeInput: {
    backgroundColor: '#2D2D2D',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  descriptionInput: {
    backgroundColor: '#2D2D2D',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

export default ManageShowsScreen;
