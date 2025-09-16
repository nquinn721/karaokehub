import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme/theme';
import { authStore } from '../../stores';

interface ShowForm {
  title: string;
  description: string;
  venueName: string;
  venueAddress: string;
  hostName: string;
  hostContact: string;
  date: string;
  time: string;
  notes: string;
}

const SubmitShowScreen = observer(() => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ShowForm>({
    title: '',
    description: '',
    venueName: '',
    venueAddress: '',
    hostName: '',
    hostContact: '',
    date: '',
    time: '',
    notes: '',
  });

  const updateField = (field: keyof ShowForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const required = ['title', 'venueName', 'venueAddress', 'hostName', 'date', 'time'];
    for (const field of required) {
      if (!formData[field as keyof ShowForm].trim()) {
        Alert.alert('Error', `${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!authStore.isAuthenticated) {
      Alert.alert('Authentication Required', 'Please log in to submit a show');
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement API call to submit show
      // await apiService.submitShow(formData);
      
      Alert.alert(
        'Success', 
        'Your show has been submitted for review!',
        [{ text: 'OK', onPress: () => {
          setFormData({
            title: '',
            description: '',
            venueName: '',
            venueAddress: '',
            hostName: '',
            hostContact: '',
            date: '',
            time: '',
            notes: '',
          });
        }}]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit show. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authStore.isAuthenticated) {
    return (
      <LinearGradient
        colors={[theme.colors.dark.background, theme.colors.dark.surface]}
        style={styles.container}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <Ionicons name="musical-notes" size={64} color={theme.colors.dark.primary} />
            <Text style={styles.title}>Submit a Karaoke Show</Text>
            <Text style={styles.subtitle}>Please log in to submit a show for review</Text>
            <TouchableOpacity style={styles.loginButton}>
              <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[theme.colors.dark.background, theme.colors.dark.surface]}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Ionicons name="add-circle" size={32} color={theme.colors.dark.primary} />
              <Text style={styles.title}>Submit Karaoke Show</Text>
              <Text style={styles.subtitle}>
                Help the community discover new karaoke venues!
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Show Details</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Show Title *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.title}
                    onChangeText={(text) => updateField('title', text)}
                    placeholder="e.g. Friday Night Karaoke"
                    placeholderTextColor={theme.colors.dark.textMuted}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.description}
                    onChangeText={(text) => updateField('description', text)}
                    placeholder="Tell us about this karaoke show..."
                    placeholderTextColor={theme.colors.dark.textMuted}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Venue Information</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Venue Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.venueName}
                    onChangeText={(text) => updateField('venueName', text)}
                    placeholder="e.g. The Singing Pub"
                    placeholderTextColor={theme.colors.dark.textMuted}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Venue Address *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.venueAddress}
                    onChangeText={(text) => updateField('venueAddress', text)}
                    placeholder="123 Main St, City, State"
                    placeholderTextColor={theme.colors.dark.textMuted}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Host Information</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Host Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.hostName}
                    onChangeText={(text) => updateField('hostName', text)}
                    placeholder="DJ/Host name"
                    placeholderTextColor={theme.colors.dark.textMuted}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Contact Info</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.hostContact}
                    onChangeText={(text) => updateField('hostContact', text)}
                    placeholder="Phone or email (optional)"
                    placeholderTextColor={theme.colors.dark.textMuted}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Schedule</Text>
                
                <View style={styles.row}>
                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <Text style={styles.label}>Date *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.date}
                      onChangeText={(text) => updateField('date', text)}
                      placeholder="MM/DD/YYYY"
                      placeholderTextColor={theme.colors.dark.textMuted}
                    />
                  </View>

                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <Text style={styles.label}>Time *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.time}
                      onChangeText={(text) => updateField('time', text)}
                      placeholder="7:00 PM"
                      placeholderTextColor={theme.colors.dark.textMuted}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Additional Notes</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.notes}
                    onChangeText={(text) => updateField('notes', text)}
                    placeholder="Any additional details about the show..."
                    placeholderTextColor={theme.colors.dark.textMuted}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="white" />
                    <Text style={styles.submitButtonText}>Submit Show</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                All submissions are reviewed before being published. We'll contact you if we need more information.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.dark.text,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.dark.textMuted,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.dark.text,
    marginBottom: theme.spacing.lg,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.dark.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.dark.surface,
    borderWidth: 1,
    borderColor: theme.colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.dark.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  submitButton: {
    backgroundColor: theme.colors.dark.primary,
    borderRadius: 12,
    paddingVertical: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  loginButton: {
    backgroundColor: theme.colors.dark.primary,
    borderRadius: 12,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 14,
    color: theme.colors.dark.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    lineHeight: 20,
  },
});

export default SubmitShowScreen;
