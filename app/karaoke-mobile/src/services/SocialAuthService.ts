import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// OAuth configuration for Google
const GOOGLE_CLIENT_ID = Platform.select({
  ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
  android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
  default: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
});

// OAuth configuration for Facebook
const FACEBOOK_CLIENT_ID = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_ID || '646464114624794';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface AuthResult {
  success: boolean;
  user?: any;
  token?: string;
  message?: string;
}

export class SocialAuthService {
  private static createRedirectUri(provider: string): string {
    return AuthSession.makeRedirectUri({
      scheme: 'karaoke-mobile',
      path: `auth/${provider}/callback`,
    });
  }

  static async authenticateWithGoogle(): Promise<AuthResult> {
    try {
      if (!GOOGLE_CLIENT_ID) {
        throw new Error('Google Client ID not configured');
      }

      const redirectUri = this.createRedirectUri('google');
      console.log('Google OAuth redirect URI:', redirectUri);

      // Create code challenge for PKCE
      const codeChallenge = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        redirectUri,
        { encoding: Crypto.CryptoEncoding.BASE64 },
      );

      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        codeChallenge,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });

      if (result.type === 'success' && result.params.code) {
        // Exchange authorization code for tokens via our backend
        const authResponse = await fetch(`${BASE_URL}/auth/google/mobile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: result.params.code,
            redirectUri,
            codeVerifier: redirectUri,
          }),
        });

        if (!authResponse.ok) {
          throw new Error('Failed to authenticate with Google');
        }

        const authData = await authResponse.json();
        return {
          success: true,
          user: authData.user,
          token: authData.token,
          message: authData.message,
        };
      } else {
        return {
          success: false,
          message: 'Google authentication was cancelled',
        };
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      return {
        success: false,
        message: (error as Error).message || 'Google authentication failed',
      };
    }
  }

  static async authenticateWithFacebook(): Promise<AuthResult> {
    try {
      if (!FACEBOOK_CLIENT_ID) {
        throw new Error('Facebook Client ID not configured');
      }

      const redirectUri = this.createRedirectUri('facebook');
      console.log('Facebook OAuth redirect URI:', redirectUri);

      const request = new AuthSession.AuthRequest({
        clientId: FACEBOOK_CLIENT_ID,
        scopes: ['public_profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
      });

      if (result.type === 'success' && result.params.code) {
        // Exchange authorization code for tokens via our backend
        const authResponse = await fetch(`${BASE_URL}/auth/facebook/mobile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: result.params.code,
            redirectUri,
          }),
        });

        if (!authResponse.ok) {
          throw new Error('Failed to authenticate with Facebook');
        }

        const authData = await authResponse.json();
        return {
          success: true,
          user: authData.user,
          token: authData.token,
          message: authData.message,
        };
      } else {
        return {
          success: false,
          message: 'Facebook authentication was cancelled',
        };
      }
    } catch (error) {
      console.error('Facebook authentication error:', error);
      return {
        success: false,
        message: (error as Error).message || 'Facebook authentication failed',
      };
    }
  }
}
