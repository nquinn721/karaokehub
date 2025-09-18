import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { observer } from 'mobx-react-lite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { submissionService } from '../services/SubmissionService';

const { width } = Dimensions.get('window');

interface UploadedImage {
  id: string;
  uri: string;
  base64?: string;
  name: string;
  size: number;
}

const ImageUploadScreen = observer(() => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const pickImages = useCallback(async () => {
    try {
      // Request permission
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Please allow access to your photo library to upload images.',
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const newImages: UploadedImage[] = result.assets.map((asset, index) => ({
          id: `img-${Date.now()}-${index}`,
          uri: asset.uri,
          base64: asset.base64 || undefined,
          name: asset.fileName || `image-${index + 1}.jpg`,
          size: asset.fileSize || 0,
        }));

        setUploadedImages((prev) => [...prev, ...newImages]);
        setError('');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick images');
      console.error('Image picker error:', err);
    }
  }, []);

  const removeImage = useCallback((imageId: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  const analyzeImages = useCallback(async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one image first');
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      // Convert images to base64 strings for API
      const base64Images = uploadedImages.map((img) =>
        img.base64 ? `data:image/jpeg;base64,${img.base64}` : img.uri,
      );

      console.log(`🚀 Analyzing ${base64Images.length} images using submission service...`);

      const result = await submissionService.analyzeImages({
        images: base64Images,
        maxConcurrentWorkers: Math.min(base64Images.length, 3),
      });

      if (result.success) {
        setSuccess(
          `Successfully analyzed ${uploadedImages.length} image(s)! Data submitted to review queue.`,
        );

        // If there's analysis data, submit it for approval
        if (result.data) {
          console.log('Submitting analysis for approval...');
          const submitResult = await submissionService.submitImageAnalysis(result.data);

          if (submitResult.success) {
            setSuccess(
              `Analysis complete! Your ${uploadedImages.length} image(s) have been submitted for review. Thank you for contributing to the karaoke community!`,
            );
          } else {
            setError(submitResult.error || 'Analysis completed but submission failed');
          }
        }
      } else {
        setError(result.error || 'Failed to analyze images');
      }
    } catch (err) {
      console.error('Image analysis error:', err);
      setError('Failed to analyze images. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  }, [uploadedImages]);

  const clearAll = useCallback(() => {
    setUploadedImages([]);
    setError('');
    setSuccess('');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="cloud-upload" size={60} color="#007AFF" />
          <Text style={styles.title}>Upload Show Images</Text>
          <Text style={styles.subtitle}>
            Upload photos of karaoke schedules, flyers, or venue postings for fast and accurate AI
            analysis
          </Text>
        </View>

        {/* Upload Area */}
        <TouchableOpacity style={styles.uploadArea} onPress={pickImages} disabled={analyzing}>
          <Ionicons name="camera" size={48} color="#666666" />
          <Text style={styles.uploadText}>Tap to select images</Text>
          <Text style={styles.uploadSubtext}>
            Supports multiple files: JPG, PNG, and other image formats
          </Text>
        </TouchableOpacity>

        {/* Uploaded Images */}
        {uploadedImages.length > 0 && (
          <View style={styles.imagesSection}>
            <View style={styles.imagesSectionHeader}>
              <Text style={styles.imagesSectionTitle}>
                {uploadedImages.length} image(s) uploaded
              </Text>
              <TouchableOpacity onPress={clearAll} disabled={analyzing}>
                <Text style={styles.clearButton}>Clear All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.imagesGrid}>
              {uploadedImages.map((image) => (
                <View key={image.id} style={styles.imageContainer}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(image.id)}
                    disabled={analyzing}
                  >
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.imageName} numberOfLines={1}>
                    {image.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        {uploadedImages.length > 0 && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]}
              onPress={analyzeImages}
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="scan" size={24} color="white" />
              )}
              <Text style={styles.analyzeButtonText}>
                {analyzing
                  ? 'Analyzing Images...'
                  : `Analyze ${uploadedImages.length} Image${uploadedImages.length > 1 ? 's' : ''}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moreImagesButton}
              onPress={pickImages}
              disabled={analyzing}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.moreImagesButtonText}>Add More Images</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {/* Benefits */}
        <View style={styles.benefits}>
          <Text style={styles.benefitsTitle}>Tips for better results:</Text>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark" size={16} color="#4CAF50" />
            <Text style={styles.benefitText}>Use clear, well-lit photos</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark" size={16} color="#4CAF50" />
            <Text style={styles.benefitText}>Include venue name and schedule details</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark" size={16} color="#4CAF50" />
            <Text style={styles.benefitText}>Multiple angles help accuracy</Text>
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
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
  uploadArea: {
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#1A1A1A',
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  imagesSection: {
    marginBottom: 24,
  },
  imagesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  imagesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clearButton: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageContainer: {
    width: (width - 64) / 3,
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageName: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
    textAlign: 'center',
  },
  actions: {
    gap: 16,
    marginBottom: 24,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#555555',
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  moreImagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  moreImagesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
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
    alignItems: 'center',
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
  },
  benefits: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#BBBBBB',
    marginLeft: 12,
    flex: 1,
  },
});

export default ImageUploadScreen;
