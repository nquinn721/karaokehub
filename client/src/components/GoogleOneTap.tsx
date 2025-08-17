import { Box, Typography } from '@mui/material';
import { uiStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';
import { useGoogleOneTap } from '../hooks/useGoogleOneTap';

interface GoogleOneTapProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
  disabled?: boolean;
  showButton?: boolean; // Whether to show the alternative button
  context?: 'signin' | 'signup' | 'use';
}

const GoogleOneTap: React.FC<GoogleOneTapProps> = observer(
  ({ onSuccess, onError, disabled = false, showButton = true, context = 'signin' }) => {
    const buttonRef = useRef<HTMLDivElement>(null);

    const { promptOneTap, renderGoogleButton, isReady } = useGoogleOneTap({
      onSuccess: () => {
        console.log('Google One Tap successful');
        uiStore.addNotification('Successfully signed in with Google!', 'success');
        onSuccess?.();
      },
      onError: (error) => {
        console.error('Google One Tap error:', error);
        // Only show error notification if it's not a user dismissal
        if (!error.message?.includes('dismissed') && !error.message?.includes('skipped')) {
          uiStore.addNotification('Google sign-in failed. Please try again.', 'error');
        }
        onError?.(error);
      },
      disabled,
      context,
    });

    // Trigger One Tap prompt when component mounts and is ready
    useEffect(() => {
      if (isReady && !disabled) {
        // Small delay to ensure page is fully loaded
        const timer = setTimeout(() => {
          promptOneTap();
        }, 500);

        return () => clearTimeout(timer);
      }
    }, [isReady, disabled, promptOneTap]);

    // Render Google button if enabled
    useEffect(() => {
      if (isReady && showButton && buttonRef.current) {
        renderGoogleButton('google-signin-button', {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: '100%',
        });
      }
    }, [isReady, showButton, renderGoogleButton]);

    if (!showButton) {
      return null; // Only One Tap, no button
    }

    return (
      <Box sx={{ width: '100%' }}>
        <div
          id="google-signin-button"
          ref={buttonRef}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            minHeight: '44px', // Google button standard height
          }}
        >
          {/* Fallback content while Google button loads */}
          {!isReady && (
            <Box
              sx={{
                width: '100%',
                height: '44px',
                border: '1px solid #dadce0',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                color: '#3c4043',
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'Roboto', fontWeight: 500 }}>
                Continue with Google
              </Typography>
            </Box>
          )}
        </div>
      </Box>
    );
  },
);

export default GoogleOneTap;
