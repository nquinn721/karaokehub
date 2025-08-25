import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SocialAuthService } from '../../services/SocialAuthService';
import { authStore } from '../../stores';
import { colors } from '../../theme';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen = observer(() => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      const success = await authStore.login({ email: email.trim(), password });

      if (!success) {
        Alert.alert('Login Failed', authStore.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    try {
      const result = await SocialAuthService.authenticateWithGoogle();

      if (result.success && result.token && result.user) {
        await authStore.handleSocialAuthSuccess(result.token, result.user);
      } else {
        Alert.alert('Login Failed', result.message || 'Google authentication failed');
      }
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert('Error', 'Google authentication failed. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebookLogin = async () => {
    setSocialLoading('facebook');
    try {
      const result = await SocialAuthService.authenticateWithFacebook();

      if (result.success && result.token && result.user) {
        await authStore.handleSocialAuthSuccess(result.token, result.user);
      } else {
        Alert.alert('Login Failed', result.message || 'Facebook authentication failed');
      }
    } catch (error) {
      console.error('Facebook login error:', error);
      Alert.alert('Error', 'Facebook authentication failed. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleRegisterPress = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="musical-notes" size={60} color={colors.dark.primary} />
          <Text style={styles.appTitle}>KaraokeHub</Text>
          <Text style={styles.subtitle}>Find karaoke shows near you</Text>
        </View>

        <View style={styles.form}>
          {/* Social Login Buttons */}
          <TouchableOpacity
            style={[styles.socialButton, styles.googleButton]}
            onPress={handleGoogleLogin}
            disabled={socialLoading !== null || authStore.isLoading}
          >
            {socialLoading === 'google' ? (
              <ActivityIndicator color={colors.dark.buttonPrimaryText} size="small" />
            ) : (
              <>
                <Ionicons
                  name="logo-google"
                  size={20}
                  color={colors.dark.buttonPrimaryText}
                  style={styles.socialIcon}
                />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, styles.facebookButton]}
            onPress={handleFacebookLogin}
            disabled={socialLoading !== null || authStore.isLoading}
          >
            {socialLoading === 'facebook' ? (
              <ActivityIndicator color={colors.dark.buttonPrimaryText} size="small" />
            ) : (
              <>
                <Ionicons
                  name="logo-facebook"
                  size={20}
                  color={colors.dark.buttonPrimaryText}
                  style={styles.socialIcon}
                />
                <Text style={styles.socialButtonText}>Continue with Facebook</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email/Password Form */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={colors.dark.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.dark.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={colors.dark.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.dark.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.dark.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.loginButton,
              (authStore.isLoading || socialLoading !== null) && styles.disabledButton,
            ]}
            onPress={handleLogin}
            disabled={authStore.isLoading || socialLoading !== null}
          >
            {authStore.isLoading ? (
              <ActivityIndicator color={colors.dark.buttonPrimaryText} />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleRegisterPress}>
              <Text style={styles.registerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.dark.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 50,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  socialIcon: {
    marginRight: 12,
  },
  socialButtonText: {
    color: colors.dark.buttonPrimaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: colors.dark.googleButton,
  },
  facebookButton: {
    backgroundColor: colors.dark.facebookButton,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.dark.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.dark.textSecondary,
    fontSize: 14,
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
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: colors.dark.buttonPrimary,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: colors.dark.buttonPrimaryText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
  },
  registerLink: {
    fontSize: 16,
    color: colors.dark.primary,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
