import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { oauthService } from '../services/OAuthService';
import { authStore } from '../stores';

interface Props {
  navigation: any;
}

const RegisterScreen = observer(({ navigation }: Props) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    stageName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { name, email, password, confirmPassword, stageName } = formData;

    if (!name.trim() || !email.trim() || !password.trim() || !stageName.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    const { name, email, password, stageName } = formData;

    const result = await authStore.register({
      name: name.trim(),
      email: email.trim(),
      password,
      stageName: stageName.trim(),
    });

    if (!result.success) {
      Alert.alert('Registration Failed', result.error || 'Please try again');
    }
    // Navigation is handled automatically by RootNavigator based on auth state
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  const handleGoogleSignup = async () => {
    setOauthLoading('google');
    try {
      const result = await oauthService.signInWithGoogle();
      if (result.success && result.user) {
        // Update auth store with OAuth user
        authStore.user = result.user;
        authStore.isAuthenticated = true;
        authStore.token = result.token || null;
      } else {
        Alert.alert('Google Sign-Up Failed', result.error || 'Please try again');
      }
    } catch (error: any) {
      Alert.alert('Google Sign-Up Error', error.message || 'Please try again');
    } finally {
      setOauthLoading(null);
    }
  };

  const handleFacebookSignup = async () => {
    setOauthLoading('facebook');
    try {
      const result = await oauthService.signInWithFacebook();
      if (result.success && result.user) {
        // Update auth store with OAuth user
        authStore.user = result.user;
        authStore.isAuthenticated = true;
        authStore.token = result.token || null;
      } else {
        Alert.alert('Facebook Sign-Up Failed', result.error || 'Please try again');
      }
    } catch (error: any) {
      Alert.alert('Facebook Sign-Up Error', error.message || 'Please try again');
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={navigateToLogin}>
                <Ionicons name="arrow-back" size={24} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join the karaoke community</Text>
            </View>

            {/* Register Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Full Name *"
                  placeholderTextColor="#666"
                  value={formData.name}
                  onChangeText={(value) => updateField('name', value)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!authStore.isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="musical-note-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Stage Name *"
                  placeholderTextColor="#666"
                  value={formData.stageName}
                  onChangeText={(value) => updateField('stageName', value)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!authStore.isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Email *"
                  placeholderTextColor="#666"
                  value={formData.email}
                  onChangeText={(value) => updateField('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!authStore.isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, styles.passwordInput]}
                  placeholder="Password *"
                  placeholderTextColor="#666"
                  value={formData.password}
                  onChangeText={(value) => updateField('password', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!authStore.isLoading}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, styles.passwordInput]}
                  placeholder="Confirm Password *"
                  placeholderTextColor="#666"
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateField('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!authStore.isLoading}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.registerButton, authStore.isLoading && styles.disabledButton]}
                onPress={handleRegister}
                disabled={authStore.isLoading}
              >
                {authStore.isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.registerButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              {/* OAuth Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* OAuth Buttons */}
              <TouchableOpacity
                style={[styles.oauthButton, styles.googleButton]}
                onPress={handleGoogleSignup}
                disabled={oauthLoading !== null || authStore.isLoading}
              >
                {oauthLoading === 'google' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#fff" style={styles.oauthIcon} />
                    <Text style={styles.oauthButtonText}>Sign up with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.oauthButton, styles.facebookButton]}
                onPress={handleFacebookSignup}
                disabled={oauthLoading !== null || authStore.isLoading}
              >
                {oauthLoading === 'facebook' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="logo-facebook"
                      size={20}
                      color="#fff"
                      style={styles.oauthIcon}
                    />
                    <Text style={styles.oauthButtonText}>Sign up with Facebook</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Terms */}
            <Text style={styles.termsText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>

            {/* Login Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: -10,
    top: 0,
    padding: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  inputIcon: {
    marginRight: 12,
    color: '#666666',
  },
  textInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#FFFFFF',
  },
  passwordInput: {
    paddingRight: 40,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  registerButton: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  loginLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333333',
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: '#666',
  },
  oauthButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  oauthIcon: {
    marginRight: 10,
  },
  oauthButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RegisterScreen;
