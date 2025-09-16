import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../theme/theme';
import { AuthStackParamList } from '../../types';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

const WelcomeScreen = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[theme.colors.gradients.primary[0], theme.colors.gradients.primary[1]]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Logo/Icon */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Ionicons name="musical-notes" size={64} color={theme.colors.dark.primary} />
            </View>
            <Text style={styles.logoText}>KaraokeHub</Text>
            <Text style={styles.tagline}>Discover karaoke shows near you</Text>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Ionicons name="map" size={24} color={theme.colors.dark.text} />
              <Text style={styles.featureText}>Find karaoke shows on an interactive map</Text>
            </View>

            <View style={styles.feature}>
              <Ionicons name="musical-note" size={24} color={theme.colors.dark.text} />
              <Text style={styles.featureText}>Browse music and preview 30-second clips</Text>
            </View>

            <View style={styles.feature}>
              <Ionicons name="heart" size={24} color={theme.colors.dark.text} />
              <Text style={styles.featureText}>Save your favorite songs and shows</Text>
            </View>

            <View style={styles.feature}>
              <Ionicons name="people" size={24} color={theme.colors.dark.text} />
              <Text style={styles.featureText}>Connect with other karaoke enthusiasts</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Social Auth Preview */}
          <View style={styles.socialContainer}>
            <Text style={styles.socialText}>Sign up with Google or Facebook for quick access</Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.dark.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  logoText: {
    fontSize: theme.fontSize.hero,
    fontWeight: 'bold',
    color: theme.colors.dark.text,
    marginBottom: theme.spacing.sm,
  },
  tagline: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  featuresContainer: {
    marginVertical: theme.spacing.xl,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  featureText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark.textSecondary,
    marginLeft: theme.spacing.md,
    lineHeight: 22,
  },
  buttonContainer: {
    marginBottom: theme.spacing.xl,
  },
  button: {
    height: 56,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  primaryButton: {
    backgroundColor: theme.colors.dark.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.dark.primary,
  },
  primaryButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark.background,
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark.primary,
  },
  socialContainer: {
    alignItems: 'center',
    paddingBottom: theme.spacing.lg,
  },
  socialText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default WelcomeScreen;
