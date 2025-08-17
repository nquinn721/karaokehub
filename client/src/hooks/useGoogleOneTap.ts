import { useEffect, useRef } from 'react';
import { authStore } from '@stores/index';

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
  select_by: 'auto' | 'user' | 'user_1tap' | 'user_2tap' | 'btn' | 'btn_confirm' | 'btn_add_session' | 'btn_confirm_add_session';
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
    // In production, this should come from your environment variables
    // For now, we'll use the same client ID as your OAuth
    return '203453576607-fjkvjl9f2sve5gsm4n94fdsgmphgcs8u.apps.googleusercontent.com';
  };

  const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
    try {
      console.log('Google One Tap credential received:', response.select_by);
      
      // Send the credential to your backend for verification
      // This should go to the same endpoint as your OAuth callback
      // but handle JWT token instead of authorization code
      const result = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/google/verify`, {
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
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select,
        cancel_on_tap_outside,
        context,
        itp_support: true,
      });

      isInitialized.current = true;
      console.log('Google One Tap initialized');
    } catch (error) {
      console.error('Failed to initialize Google One Tap:', error);
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
          console.log('One Tap not displayed:', notification.getNotDisplayedReason());
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
