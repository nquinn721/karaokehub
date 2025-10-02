/**
 * ErrorHandler Component
 * Displays user-friendly error messages with retry options
 */

import {
  Close as CloseIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  LocationOff as LocationOffIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  WifiOff as WifiOffIcon,
} from '@mui/icons-material';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  IconButton,
  Snackbar,
  Typography,
} from '@mui/material';
import React from 'react';
import { LocationError } from '../services/LocationService';

interface ErrorHandlerProps {
  error: LocationError | Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showAsSnackbar?: boolean;
  autoHideDuration?: number;
}

interface ErrorDisplayConfig {
  icon: React.ReactNode;
  severity: 'error' | 'warning' | 'info';
  title: string;
  showDetails: boolean;
}

export const ErrorHandler: React.FC<ErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  showAsSnackbar = false,
  autoHideDuration = 6000,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  if (!error) return null;

  const getErrorConfig = (error: LocationError | Error): ErrorDisplayConfig => {
    const locationError = error as LocationError;

    switch (locationError.code) {
      case 'PERMISSION_DENIED':
        return {
          icon: <LocationOffIcon />,
          severity: 'warning',
          title: 'Location Access Required',
          showDetails: true,
        };
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
        return {
          icon: <WifiOffIcon />,
          severity: 'error',
          title: 'Connection Issue',
          showDetails: true,
        };
      case 'RETRY_EXHAUSTED':
        return {
          icon: <ErrorIcon />,
          severity: 'error',
          title: 'Service Unavailable',
          showDetails: true,
        };
      case 'UNSUPPORTED':
        return {
          icon: <WarningIcon />,
          severity: 'warning',
          title: 'Feature Not Supported',
          showDetails: false,
        };
      default:
        return {
          icon: <ErrorIcon />,
          severity: 'error',
          title: 'Something Went Wrong',
          showDetails: true,
        };
    }
  };

  const config = getErrorConfig(error);
  const locationError = error as LocationError;
  const userMessage = locationError.userMessage || locationError.message || error.message;
  const canRetry = locationError.retryable && onRetry;

  const ErrorContent = () => (
    <Alert
      severity={config.severity}
      icon={config.icon}
      sx={{
        '& .MuiAlert-message': {
          width: '100%',
        },
      }}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {canRetry && (
            <Button
              color="inherit"
              size="small"
              onClick={onRetry}
              startIcon={<RefreshIcon />}
              variant="outlined"
            >
              Try Again
            </Button>
          )}
          {config.showDetails && (
            <IconButton
              aria-label="show details"
              color="inherit"
              size="small"
              onClick={() => setShowDetails(!showDetails)}
              sx={{
                transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: '0.2s',
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          )}
          {onDismiss && (
            <IconButton aria-label="close" color="inherit" size="small" onClick={onDismiss}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      }
    >
      <AlertTitle>{config.title}</AlertTitle>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {userMessage}
      </Typography>

      {getHelperText(locationError.code)}

      <Collapse in={showDetails}>
        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
            <strong>Error Code:</strong> {locationError.code || 'UNKNOWN'}
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mt: 1 }}>
            <strong>Details:</strong> {locationError.message || error.message}
          </Typography>
          {locationError.retryAfter && (
            <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mt: 1 }}>
              <strong>Retry After:</strong> {locationError.retryAfter}ms
            </Typography>
          )}
        </Box>
      </Collapse>
    </Alert>
  );

  const getHelperText = (code?: string) => {
    switch (code) {
      case 'PERMISSION_DENIED':
        return (
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            💡 <strong>How to fix:</strong> Click the location icon in your browser's address bar
            and select "Allow".
          </Typography>
        );
      case 'NETWORK_ERROR':
        return (
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            💡 <strong>How to fix:</strong> Check your internet connection and try again.
          </Typography>
        );
      case 'TIMEOUT':
        return (
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            💡 <strong>How to fix:</strong> Make sure you have a good GPS signal and try again.
          </Typography>
        );
      case 'UNSUPPORTED':
        return (
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            💡 <strong>Alternative:</strong> You can still browse and join shows manually.
          </Typography>
        );
      default:
        return null;
    }
  };

  if (showAsSnackbar) {
    return (
      <Snackbar
        open={!!error}
        autoHideDuration={autoHideDuration}
        onClose={onDismiss}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <div>
          <ErrorContent />
        </div>
      </Snackbar>
    );
  }

  return <ErrorContent />;
};

// Hook for consistent error handling across components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<LocationError | Error | null>(null);

  const handleError = (err: LocationError | Error | string) => {
    if (typeof err === 'string') {
      setError(new Error(err));
    } else {
      setError(err);
    }
  };

  const clearError = () => setError(null);

  const retryWithErrorHandling = async (
    operation: () => Promise<any>,
    onSuccess?: (result: any) => void,
  ) => {
    try {
      clearError();
      const result = await operation();
      onSuccess?.(result);
      return result;
    } catch (err) {
      handleError(err as LocationError | Error);
      throw err;
    }
  };

  return {
    error,
    handleError,
    clearError,
    retryWithErrorHandling,
  };
};
