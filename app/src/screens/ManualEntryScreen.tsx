import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { submissionService } from '../services/SubmissionService';

interface DaySelection {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

interface ShowData {
  venue: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  djName: string;
  description: string;
  startTime: string;
  endTime: string;
  phone: string;
  website: string;
  days: DaySelection;
}

// Sample data for autocomplete
const sampleVenues = [
  'Lucky Strike Bowling',
  'Howl at the Moon',
  'Karaoke Mugen',
  'The Karaoke Hole',
  'Sing Sing Karaoke',
  'Rockbox Karaoke',
  'Voicebox Karaoke',
  'Private karaoke room',
];

const sampleDJs = [
  'DJ Mike',
  'DJ Sarah',
  'DJ Johnny',
  'DJ Lisa',
  'DJ Rock',
  'KJ Steve',
  'Host Mary',
];

const timeSlots = [
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM',
  '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM', '12:00 AM', '12:30 AM', '1:00 AM', '2:00 AM'
];

const ManualEntryScreen = observer(() => {
  const [formData, setFormData] = useState<ShowData>({
    venue: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    djName: '',
    description: '',
    startTime: '',
    endTime: '',
    phone: '',
    website: '',
    days: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Autocomplete and picker states
  const [showVenuePicker, setShowVenuePicker] = useState(false);
  const [showDJPicker, setShowDJPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [venueFilterText, setVenueFilterText] = useState('');
  const [djFilterText, setDJFilterText] = useState('');

  const updateField = useCallback((field: keyof ShowData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  }, []);

  const toggleDay = useCallback((day: keyof DaySelection) => {
    setFormData((prev) => ({
      ...prev,
      days: { ...prev.days, [day]: !prev.days[day] },
    }));
  }, []);

  const validateForm = useCallback(() => {
    if (!formData.venue.trim()) {
      setError('Venue name is required');
      return false;
    }

    if (!formData.startTime.trim()) {
      setError('Start time is required');
      return false;
    }

    const hasSelectedDay = Object.values(formData.days).some((selected) => selected);
    if (!hasSelectedDay) {
      setError('Please select at least one day');
      return false;
    }

    return true;
  }, [formData]);

  const submitShow = useCallback(async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setError('');

    try {
      // Get selected days as array
      const selectedDays = Object.entries(formData.days)
        .filter(([_, selected]) => selected)
        .map(([day, _]) => day);

      const submissionData = {
        venue: formData.venue.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zip: formData.zip.trim(),
        djName: formData.djName.trim(),
        description: formData.description.trim(),
        startTime: formData.startTime.trim(),
        endTime: formData.endTime.trim(),
        phone: formData.phone.trim(),
        website: formData.website.trim(),
        days: selectedDays,
      };

      console.log('📝 Submitting manual show using submission service...');

      const result = await submissionService.submitManualShow(submissionData);

      if (result.success) {
        setSuccess(
          'Show submitted successfully! Thank you for contributing to the karaoke community.',
        );

        // Reset form
        setFormData({
          venue: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          djName: '',
          description: '',
          startTime: '',
          endTime: '',
          phone: '',
          website: '',
          days: {
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            saturday: false,
            sunday: false,
          },
        });
      } else {
        setError(result.error || 'Failed to submit show');
      }
    } catch (err) {
      setError('Failed to submit show. Please try again.');
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  }, [formData, validateForm]);
  const dayLabels = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Ionicons name="create" size={60} color="#007AFF" />
            <Text style={styles.title}>Manual Entry</Text>
            <Text style={styles.subtitle}>
              Add karaoke show details manually to help others discover great venues
            </Text>
          </View>

          {/* Required Fields */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Required Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Venue Name <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowVenuePicker(true)}>
                <Text style={[styles.pickerText, !formData.venue && styles.placeholderText]}>
                  {formData.venue || 'Select venue or type new name'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Start Time <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowStartTimePicker(true)}>
                <Text style={[styles.pickerText, !formData.startTime && styles.placeholderText]}>
                  {formData.startTime || 'Select start time'}
                </Text>
                <Ionicons name="time-outline" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Days of Week <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.daysContainer}>
                {Object.entries(dayLabels).map(([day, label]) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      formData.days[day as keyof DaySelection] && styles.dayButtonSelected,
                    ]}
                    onPress={() => toggleDay(day as keyof DaySelection)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        formData.days[day as keyof DaySelection] && styles.dayButtonTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Optional Fields */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>DJ Name</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDJPicker(true)}>
                <Text style={[styles.pickerText, !formData.djName && styles.placeholderText]}>
                  {formData.djName || 'Select DJ or type new name'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>End Time</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowEndTimePicker(true)}>
                <Text style={[styles.pickerText, !formData.endTime && styles.placeholderText]}>
                  {formData.endTime || 'Select end time (optional)'}
                </Text>
                <Ionicons name="time-outline" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={(value) => updateField('address', value)}
                placeholder="123 Main St"
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(value) => updateField('city', value)}
                  placeholder="San Jose"
                  placeholderTextColor="#666666"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={formData.state}
                  onChangeText={(value) => updateField('state', value)}
                  placeholder="CA"
                  placeholderTextColor="#666666"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(value) => updateField('phone', value)}
                placeholder="(555) 123-4567"
                placeholderTextColor="#666666"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                value={formData.website}
                onChangeText={(value) => updateField('website', value)}
                placeholder="https://mikeskaraoke.com"
                placeholderTextColor="#666666"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => updateField('description', value)}
                placeholder="Additional details about the karaoke show..."
                placeholderTextColor="#666666"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Messages */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {success && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={submitShow}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="checkmark" size={24} color="white" />
            )}
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Submit Show'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Venue Picker Modal */}
      <Modal
        visible={showVenuePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVenuePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Venue</Text>
              <TouchableOpacity onPress={() => setShowVenuePicker(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Type venue name or search..."
              placeholderTextColor="#666666"
              value={venueFilterText}
              onChangeText={setVenueFilterText}
              autoFocus
            />
            <FlatList
              data={sampleVenues.filter(venue => 
                venue.toLowerCase().includes(venueFilterText.toLowerCase())
              )}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    updateField('venue', item);
                    setVenueFilterText('');
                    setShowVenuePicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            {venueFilterText && (
              <TouchableOpacity
                style={styles.modalCustomButton}
                onPress={() => {
                  updateField('venue', venueFilterText);
                  setVenueFilterText('');
                  setShowVenuePicker(false);
                }}
              >
                <Ionicons name="add" size={20} color="#007AFF" />
                <Text style={styles.modalCustomText}>Add "{venueFilterText}" as new venue</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* DJ Picker Modal */}
      <Modal
        visible={showDJPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDJPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select DJ</Text>
              <TouchableOpacity onPress={() => setShowDJPicker(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Type DJ name or search..."
              placeholderTextColor="#666666"
              value={djFilterText}
              onChangeText={setDJFilterText}
              autoFocus
            />
            <FlatList
              data={sampleDJs.filter(dj => 
                dj.toLowerCase().includes(djFilterText.toLowerCase())
              )}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    updateField('djName', item);
                    setDJFilterText('');
                    setShowDJPicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            {djFilterText && (
              <TouchableOpacity
                style={styles.modalCustomButton}
                onPress={() => {
                  updateField('djName', djFilterText);
                  setDJFilterText('');
                  setShowDJPicker(false);
                }}
              >
                <Ionicons name="add" size={20} color="#007AFF" />
                <Text style={styles.modalCustomText}>Add "{djFilterText}" as new DJ</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Start Time Picker Modal */}
      <Modal
        visible={showStartTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStartTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Start Time</Text>
              <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={timeSlots}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    updateField('startTime', item);
                    setShowStartTimePicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  <Ionicons name="time-outline" size={20} color="#007AFF" />
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* End Time Picker Modal */}
      <Modal
        visible={showEndTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEndTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select End Time</Text>
              <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={timeSlots}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    updateField('endTime', item);
                    setShowEndTimePicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  <Ionicons name="time-outline" size={20} color="#007AFF" />
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#BBBBBB',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#BBBBBB',
  },
  dayButtonTextSelected: {
    color: 'white',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 12,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A2A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  successText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    marginTop: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#555555',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  // New picker and modal styles
  pickerButton: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickerText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  placeholderText: {
    color: '#888888',
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalInput: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
    color: '#FFFFFF',
    fontSize: 16,
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  modalCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  modalCustomText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default ManualEntryScreen;
