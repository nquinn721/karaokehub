import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { authStore } from '../../stores';
import { theme } from '../../theme/theme';
import { AuthStackParamList, RegisterCredentials } from '../../types';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = observer(() => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    email: '',
    password: '',
    name: '',
    stageName: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!credentials.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!credentials.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!credentials.password) {
      newErrors.password = 'Password is required';
    } else if (credentials.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (credentials.password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!credentials.stageName?.trim()) {
      newErrors.stageName = 'Stage name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    const result = await authStore.register(credentials);
    if (!result.success) {
      Alert.alert('Registration Failed', result.message || 'Please try again');
    }
    // Navigation will be handled automatically by the auth state change
  };

  const handleGoogleSignUp = async () => {
    // Implement Google Sign Up
    Alert.alert('Coming Soon', 'Google Sign Up will be available soon');
  };

  const handleFacebookSignUp = async () => {
    // Implement Facebook Sign Up
    Alert.alert('Coming Soon', 'Facebook Sign Up will be available soon');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[theme.colors.gradients.primary[0], theme.colors.gradients.primary[1]]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.dark.text} />
              </TouchableOpacity>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join KaraokeHub and start your musical journey</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Full Name Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={theme.colors.dark.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your full name"
                    placeholderTextColor={theme.colors.dark.textMuted}
                    value={credentials.name}
                    onChangeText={(text) => {
                      setCredentials({ ...credentials, name: text });
                      if (errors.name) {
                        setErrors({ ...errors, name: '' });
                      }
                    }}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              {/* Stage Name Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Stage Name</Text>
                <View style={[styles.inputWrapper, errors.stageName && styles.inputError]}>
                  <Ionicons
                    name="mic-outline"
                    size={20}
                    color={theme.colors.dark.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Choose your stage name"
                    placeholderTextColor={theme.colors.dark.textMuted}
                    value={credentials.stageName}
                    onChangeText={(text) => {
                      setCredentials({ ...credentials, stageName: text });
                      if (errors.stageName) {
                        setErrors({ ...errors, stageName: '' });
                      }
                    }}
                    autoCorrect={false}
                  />
                </View>
                {errors.stageName && <Text style={styles.errorText}>{errors.stageName}</Text>}
                <Text style={styles.helpText}>This is how other users will see you</Text>
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={theme.colors.dark.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.colors.dark.textMuted}
                    value={credentials.email}
                    onChangeText={(text) => {
                      setCredentials({ ...credentials, email: text });
                      if (errors.email) {
                        setErrors({ ...errors, email: '' });
                      }
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={theme.colors.dark.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Create a password"
                    placeholderTextColor={theme.colors.dark.textMuted}
                    value={credentials.password}
                    onChangeText={(text) => {
                      setCredentials({ ...credentials, password: text });
                      if (errors.password) {
                        setErrors({ ...errors, password: '' });
                      }
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.dark.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={theme.colors.dark.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm your password"
                    placeholderTextColor={theme.colors.dark.textMuted}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) {
                        setErrors({ ...errors, confirmPassword: '' });
                      }
                    }}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.dark.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[styles.signUpButton, authStore.isLoading && styles.disabledButton]}
                onPress={handleRegister}
                disabled={authStore.isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.signUpButtonText}>
                  {authStore.isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or sign up with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login Buttons */}
              <View style={styles.socialContainer}>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleGoogleSignUp}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleFacebookSignUp}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                  <Text style={styles.socialButtonText}>Facebook</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Link */}
              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.signInLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.dark.background,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  header: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.title,
    fontWeight: 'bold',
    color: theme.colors.dark.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.dark.textSecondary,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.dark.text,
    marginBottom: theme.spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dark.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.dark.border,
    paddingHorizontal: theme.spacing.md,
    height: 56,
  },
  inputError: {
    borderColor: theme.colors.dark.error,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark.text,
    padding: 0,
  },
  eyeIcon: {
    padding: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark.error,
    marginTop: theme.spacing.xs,
  },
  helpText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark.textMuted,
    marginTop: theme.spacing.xs,
  },
  signUpButton: {
    backgroundColor: theme.colors.dark.primary,
    height: 56,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signUpButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark.background,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.dark.border,
  },
  dividerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark.textMuted,
    marginHorizontal: theme.spacing.md,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.dark.surface,
    borderWidth: 1,
    borderColor: theme.colors.dark.border,
    borderRadius: theme.borderRadius.lg,
    height: 56,
    marginHorizontal: theme.spacing.xs,
  },
  socialButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.dark.text,
    marginLeft: theme.spacing.sm,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: theme.spacing.lg,
  },
  signInText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark.textSecondary,
  },
  signInLink: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark.primary,
  },
});

export default RegisterScreen;
