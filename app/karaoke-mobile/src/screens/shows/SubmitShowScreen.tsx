import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../theme';

const SubmitShowScreen = observer(() => {
  const [formData, setFormData] = useState({
    venueName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    showDate: '',
    showTime: '',
    hostName: '',
    description: '',
    contactInfo: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    const requiredFields: (keyof typeof formData)[] = [
      'venueName',
      'address',
      'city',
      'state',
      'showDate',
      'showTime',
    ];
    const missingFields = requiredFields.filter((field) => !formData[field].trim());

    if (missingFields.length > 0) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement API call to submit show
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call

      Alert.alert(
        'Success!',
        "Your show has been submitted for review. You will be notified once it's approved.",
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                venueName: '',
                address: '',
                city: '',
                state: '',
                zipCode: '',
                showDate: '',
                showTime: '',
                hostName: '',
                description: '',
                contactInfo: '',
              });
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit show. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="add-circle" size={48} color={colors.dark.primary} />
          <Text style={styles.title}>Submit a Show</Text>
          <Text style={styles.subtitle}>Help fellow karaoke enthusiasts discover new venues</Text>
        </View>

        <View style={styles.form}>
          {/* Venue Information */}
          <Text style={styles.sectionTitle}>Venue Information</Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="business-outline"
              size={20}
              color={colors.dark.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Venue Name *"
              placeholderTextColor={colors.dark.placeholder}
              value={formData.venueName}
              onChangeText={(value) => handleInputChange('venueName', value)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="location-outline"
              size={20}
              color={colors.dark.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Address *"
              placeholderTextColor={colors.dark.placeholder}
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.cityInput]}>
              <TextInput
                style={styles.input}
                placeholder="City *"
                placeholderTextColor={colors.dark.placeholder}
                value={formData.city}
                onChangeText={(value) => handleInputChange('city', value)}
              />
            </View>
            <View style={[styles.inputContainer, styles.stateInput]}>
              <TextInput
                style={styles.input}
                placeholder="State *"
                placeholderTextColor={colors.dark.placeholder}
                value={formData.state}
                onChangeText={(value) => handleInputChange('state', value)}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
            <View style={[styles.inputContainer, styles.zipInput]}>
              <TextInput
                style={styles.input}
                placeholder="ZIP"
                placeholderTextColor={colors.dark.placeholder}
                value={formData.zipCode}
                onChangeText={(value) => handleInputChange('zipCode', value)}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>

          {/* Show Information */}
          <Text style={styles.sectionTitle}>Show Information</Text>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.dark.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Date (MM/DD/YYYY) *"
                placeholderTextColor={colors.dark.placeholder}
                value={formData.showDate}
                onChangeText={(value) => handleInputChange('showDate', value)}
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Ionicons
                name="time-outline"
                size={20}
                color={colors.dark.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Time *"
                placeholderTextColor={colors.dark.placeholder}
                value={formData.showTime}
                onChangeText={(value) => handleInputChange('showTime', value)}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.dark.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Host/DJ Name"
              placeholderTextColor={colors.dark.placeholder}
              value={formData.hostName}
              onChangeText={(value) => handleInputChange('hostName', value)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="chatbox-outline"
              size={20}
              color={colors.dark.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (special themes, prizes, etc.)"
              placeholderTextColor={colors.dark.placeholder}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="call-outline"
              size={20}
              color={colors.dark.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Contact Information"
              placeholderTextColor={colors.dark.placeholder}
              value={formData.contactInfo}
              onChangeText={(value) => handleInputChange('contactInfo', value)}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.dark.buttonPrimaryText} />
            ) : (
              <>
                <Ionicons
                  name="send"
                  size={20}
                  color={colors.dark.buttonPrimaryText}
                  style={styles.buttonIcon}
                />
                <Text style={styles.submitButtonText}>Submit Show</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            * Required fields. Shows are reviewed before being published.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.dark.text,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.dark.text,
    marginBottom: 16,
    marginTop: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.inputBackground,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.dark.inputBorder,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: colors.dark.inputText,
  },
  textArea: {
    height: 80,
    paddingTop: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityInput: {
    flex: 2,
    marginRight: 8,
  },
  stateInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  zipInput: {
    flex: 1,
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: colors.dark.buttonPrimary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: colors.dark.buttonPrimaryText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 14,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default SubmitShowScreen;
