import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';

const LoadingScreen = () => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.gradients.primary[0], theme.colors.gradients.primary[1]]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Ionicons name="musical-notes" size={64} color={theme.colors.dark.primary} />
            </View>
            <Text style={styles.logoText}>KaraokeHub</Text>
          </View>

          {/* Loading Indicator */}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.dark.text} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl * 2,
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
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark.textSecondary,
    marginTop: theme.spacing.md,
  },
});

export default LoadingScreen;
