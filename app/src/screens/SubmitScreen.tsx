import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SubmitScreen = observer(() => {
  const navigation = useNavigation();
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const handleImageUpload = () => {
    navigation.navigate('ImageUpload' as never);
  };

  const handleManualEntry = () => {
    navigation.navigate('ManualEntry' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="add-circle" size={80} color="#007AFF" />
          </View>

          <Text style={styles.title}>Submit Show</Text>
          <Text style={styles.subtitle}>
            Upload images or manually add karaoke shows to help the community find great venues
          </Text>

          {/* Image Upload Button - Recommended */}
          <TouchableOpacity style={styles.submitButton} onPress={handleImageUpload}>
            <Ionicons name="camera" size={24} color="white" />
            <View style={styles.buttonContent}>
              <Text style={styles.submitButtonText}>Upload Photos</Text>
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Manual Entry Button */}
          <TouchableOpacity
            style={[styles.submitButton, styles.manualButton]}
            onPress={handleManualEntry}
          >
            <Ionicons name="create" size={24} color="#007AFF" />
            <Text style={[styles.submitButtonText, styles.manualButtonText]}>Manual Entry</Text>
          </TouchableOpacity>

          {/* Benefits */}
          <View style={styles.benefits}>
            <Text style={styles.benefitsTitle}>Why submit shows?</Text>
            <View style={styles.benefitItem}>
              <Ionicons name="people" size={16} color="#4CAF50" />
              <Text style={styles.benefitText}>Help others find great karaoke venues</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="time" size={16} color="#4CAF50" />
              <Text style={styles.benefitText}>Keep show information up to date</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="map" size={16} color="#4CAF50" />
              <Text style={styles.benefitText}>Improve local karaoke discovery</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#BBBBBB',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 280,
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonContent: {
    marginLeft: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  recommendedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  recommendedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  manualButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: 'transparent',
  },
  manualButtonText: {
    color: '#007AFF',
    marginLeft: 12,
  },
  benefits: {
    marginTop: 40,
    alignItems: 'center',
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  benefitText: {
    fontSize: 14,
    color: '#BBBBBB',
    marginLeft: 12,
    flex: 1,
  },
});

export default SubmitScreen;
