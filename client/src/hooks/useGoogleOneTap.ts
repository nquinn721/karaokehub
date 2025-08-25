import { authStore } from '@stores/index';
import { useEffect, useRef } from 'react';
import { apiStore } from '../stores/ApiStore';

// Types for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: GoogleOneTapConfig) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
          disableAutoSelect: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleOneTapConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
}

interface GoogleCredentialResponse {
  credential: string;
  select_by:
    | 'auto'
    | 'user'
    | 'user_1tap'
    | 'user_2tap'
    | 'btn'
    | 'btn_confirm'
    | 'btn_add_session'
    | 'btn_confirm_add_session';
  clientId?: string;
}

interface GoogleButtonConfig {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: string | number;
  locale?: string;
}

interface UseGoogleOneTapOptions {
  onSuccess?: (response: GoogleCredentialResponse) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
}

export const useGoogleOneTap = (options: UseGoogleOneTapOptions = {}) => {
  const {
    onSuccess,
    onError,
    disabled = false,
    auto_select = true,
    cancel_on_tap_outside = true,
    context = 'signin',
  } = options;

  const isInitialized = useRef(false);

  // Get Google Client ID from environment
  const getGoogleClientId = () => {
    // Get from server config or fallback to development client ID
    return (
      apiStore.googleClientId ||
      '203453576607-ha4529p5nc6hs1i0h2jd7sl9601fg8tj.apps.googleusercontent.com'
    );
  };

  const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
    try {
      console.log('Google One Tap credential received:', response.select_by);

      // Send the credential to your backend for verification
      // This should go to the same endpoint as your OAuth callback
      // but handle JWT token instead of authorization code
      const result = await fetch(`${apiStore.environmentInfo.baseURL}/auth/google/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: response.credential,
          clientId: response.clientId,
        }),
      });

      if (!result.ok) {
        throw new Error('Failed to verify Google credential');
      }

      const authData = await result.json();

      // Update auth store with the response
      if (authData.success && authData.token) {
        const result = await authStore.handleOneTapSuccess(authData);
        if (result.success) {
          console.log('Google One Tap login successful');
          onSuccess?.(response);
        } else {
          throw new Error(result.error || 'Authentication failed');
        }
      } else {
        throw new Error(authData.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Google One Tap error:', error);
      onError?.(error);
    }
  };

  const initializeGoogleOneTap = () => {
    if (!window.google?.accounts?.id || isInitialized.current || disabled) {
      return;
    }

    const clientId = getGoogleClientId();
    if (!clientId) {
      console.warn('Google Client ID not found');
      return;
    }

    try {
      console.log('🟢 [GOOGLE_ONE_TAP] Initializing with:', {
        clientId,
        domain: window.location.hostname,
        origin: window.location.origin,
        port: window.location.port,
        protocol: window.location.protocol,
        fullUrl: window.location.href,
        userAgent: navigator.userAgent,
        auto_select,
        cancel_on_tap_outside,
        context,
      });

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select,
        cancel_on_tap_outside,
        context,
        itp_support: true,
        use_fedcm_for_prompt: true, // Enable FedCM to fix potential compatibility issues
      });

      isInitialized.current = true;
      console.log('🟢 [GOOGLE_ONE_TAP] Initialized successfully');
    } catch (error) {
      console.error('🔴 [GOOGLE_ONE_TAP] Failed to initialize Google One Tap:', error);
      console.error('🔴 [GOOGLE_ONE_TAP] Domain authorization required in Google Cloud Console');
      console.error(
        '🔴 [GOOGLE_ONE_TAP] Add this origin to authorized JavaScript origins:',
        window.location.origin,
      );
      onError?.(error);
    }
  };

  const promptOneTap = () => {
    if (!window.google?.accounts?.id || !isInitialized.current || disabled) {
      return;
    }

    try {
      window.google.accounts.id.prompt((notification) => {
        console.log('Google One Tap notification:', notification);

        // Handle different notification types
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason();
          console.log('🔴 [GOOGLE_ONE_TAP] One Tap not displayed:', reason);

          if (reason === 'unregistered_origin') {
            console.error(
              '🔴 [GOOGLE_ONE_TAP] DOMAIN ERROR: Add this origin to Google Cloud Console:',
            );
            console.error('🔴 [GOOGLE_ONE_TAP] Origin:', window.location.origin);
            console.error(
              '🔴 [GOOGLE_ONE_TAP] Instructions: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid',
            );
            console.error('🔴 [GOOGLE_ONE_TAP] If origin is already added, try:');
            console.error('🔴 [GOOGLE_ONE_TAP] 1. Clear browser cache');
            console.error('🔴 [GOOGLE_ONE_TAP] 2. Wait 10-15 minutes for Google propagation');
            console.error('🔴 [GOOGLE_ONE_TAP] 3. Try incognito mode');
            console.error('🔴 [GOOGLE_ONE_TAP] 4. Restart dev servers');
          }
        } else if (notification.isSkippedMoment()) {
          console.log('One Tap skipped:', notification.getSkippedReason());
        } else if (notification.isDismissedMoment()) {
          console.log('One Tap dismissed:', notification.getDismissedReason());
        }
      });
    } catch (error) {
      console.error('Failed to prompt Google One Tap:', error);
      onError?.(error);
    }
  };

  const renderGoogleButton = (elementId: string, options: GoogleButtonConfig = {}) => {
    if (!window.google?.accounts?.id || !isInitialized.current) {
      return;
    }

    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element with id '${elementId}' not found`);
      return;
    }

    const defaultOptions: GoogleButtonConfig = {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: '100%',
      ...options,
    };

    try {
      window.google.accounts.id.renderButton(element, defaultOptions);
    } catch (error) {
      console.error('Failed to render Google button:', error);
      onError?.(error);
    }
  };

  const cancelOneTap = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.cancel();
    }
  };

  const disableAutoSelect = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  useEffect(() => {
    // Wait for Google script to load
    const checkGoogleLoaded = () => {
      if (window.google?.accounts?.id) {
        initializeGoogleOneTap();
      } else {
        // Retry after a short delay
        setTimeout(checkGoogleLoaded, 100);
      }
    };

    checkGoogleLoaded();

    // Cleanup on unmount
    return () => {
      cancelOneTap();
    };
  }, [disabled]);

  return {
    promptOneTap,
    renderGoogleButton,
    cancelOneTap,
    disableAutoSelect,
    isReady: isInitialized.current && !!window.google?.accounts?.id,
  };
};

export default useGoogleOneTap;
