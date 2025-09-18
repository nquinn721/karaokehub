import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { makeRedirectUri, ResponseType, useAuthRequest } from 'expo-auth-session';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { apiService } from './ApiService';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '479508459081-8nlnt4fh1s1sccbkb46qrql3a4f7oj59.apps.googleusercontent.com', // Web client ID from Google Console
  iosClientId: '479508459081-YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // iOS client ID (if you have one)
  offlineAccess: true,
  hostedDomain: '',
  forceCodeForRefreshToken: true,
});

WebBrowser.maybeCompleteAuthSession();

export interface OAuthResult {
  success: boolean;
  user?: any;
  token?: string;
  error?: string;
}

class OAuthService {
  private baseURL = apiService.environmentInfo.baseURL;

  /**
   * Google Sign-In using Google Sign-In SDK
   */
  async signInWithGoogle(): Promise<OAuthResult> {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      if (userInfo.type === 'success') {
        // Get tokens separately
        const tokens = await GoogleSignin.getTokens();
        
        if (tokens.idToken) {
          // Send the ID token to your backend for verification
          const response = await apiService.post('/auth/google/verify', {
            idToken: tokens.idToken,
          });

          if (response.user && response.token) {
            // Store tokens securely
            await apiService.setAuthTokens(response.token, response.refreshToken);
            
            return {
              success: true,
              user: response.user,
              token: response.token,
            };
          }
        }
      }

      throw new Error('Failed to get ID token from Google');
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      return {
        success: false,
        error: error.message || 'Google Sign-In failed',
      };
    }
  }

  /**
   * Google One Tap - Automatic sign-in attempt
   */
  async googleOneTap(): Promise<OAuthResult> {
    try {
      // Try to get current user if signed in
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser?.data?.user) {
        // Get tokens to check for idToken
        const tokens = await GoogleSignin.getTokens();
        if (tokens.idToken) {
          const response = await apiService.post('/auth/google/verify', {
            idToken: tokens.idToken,
          });

          if (response.user && response.token) {
            await apiService.setAuthTokens(response.token, response.refreshToken);
            
            return {
              success: true,
              user: response.user,
              token: response.token,
            };
          }
        }
      }
      
      // Try silent sign-in
      const userInfo = await GoogleSignin.signInSilently();
      if (userInfo.type === 'success') {
        const tokens = await GoogleSignin.getTokens();
        if (tokens.idToken) {
          const response = await apiService.post('/auth/google/verify', {
            idToken: tokens.idToken,
          });

          if (response.user && response.token) {
            await apiService.setAuthTokens(response.token, response.refreshToken);
            
            return {
              success: true,
              user: response.user,
              token: response.token,
            };
          }
        }
      }
      
      return { success: false, error: 'One Tap not available' };
    } catch (error: any) {
      console.error('Google One Tap error:', error);
      return {
        success: false,
        error: error.message || 'One Tap failed',
      };
    }
  }

  /**
   * Facebook Login using AuthSession for web compatibility
   */
  async signInWithFacebook(): Promise<OAuthResult> {
    try {
      const redirectUri = makeRedirectUri({
        native: 'karaokehub://auth',
      });

      const authUrl = `${this.baseURL}/auth/facebook`;
      
      if (Platform.OS === 'web') {
        // For web, redirect directly
        window.location.href = authUrl;
        return { success: false, error: 'Redirecting...' };
      } else {
        // For mobile, use WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        
        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const token = url.searchParams.get('token');
          const error = url.searchParams.get('error');

          if (error) {
            return { success: false, error: decodeURIComponent(error) };
          }

          if (token) {
            // Fetch user profile with the token
            await apiService.setAuthTokens(token, undefined);
            const userResponse = await apiService.get('/auth/profile');
            
            return {
              success: true,
              user: userResponse.user,
              token: token,
            };
          }
        }

        return { success: false, error: 'Facebook login cancelled or failed' };
      }
    } catch (error: any) {
      console.error('Facebook Sign-In error:', error);
      return {
        success: false,
        error: error.message || 'Facebook Sign-In failed',
      };
    }
  }

  /**
   * Sign out from all OAuth providers
   */
  async signOut(): Promise<void> {
    try {
      // Try to sign out from Google (will handle if not signed in)
      try {
        await GoogleSignin.signOut();
      } catch (googleError) {
        // Continue if Google sign out fails
        console.log('Google sign out failed or user not signed in:', googleError);
      }

      // Clear local tokens
      await apiService.clearAuthTokens();
    } catch (error) {
      console.error('Sign out error:', error);
      // Continue with local token clearing even if OAuth sign-out fails
      await apiService.clearAuthTokens();
    }
  }

  /**
   * Get current user info from Google (if signed in)
   */
  async getCurrentGoogleUser() {
    try {
      return await GoogleSignin.getCurrentUser();
    } catch (error) {
      console.error('Get current Google user error:', error);
      return null;
    }
  }
}

export const oauthService = new OAuthService();
