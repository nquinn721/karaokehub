/**
 * Facebook Login Modal React Component
 * Handles secure credential input for Facebook authentication
 */

import { Facebook, Lock } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

interface FacebookLoginModalProps {
  open: boolean;
  onCredentials: (email: string, password: string, requestId: string) => void;
  onCancel: () => void;
  requestId: string | null;
  loading?: boolean;
  error?: string | null;
}

export const FacebookLoginModal: React.FC<FacebookLoginModalProps> = ({
  open,
  onCredentials,
  onCancel,
  requestId,
  loading = false,
  error = null,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Clear form when modal opens/closes
  useEffect(() => {
    if (open) {
      setEmail('');
      setPassword('');
      setLocalError(null);
    }
  }, [open]);

  // Clear local error when props error changes
  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  const handleSubmit = () => {
    setLocalError(null);

    // Validation
    if (!email.trim()) {
      setLocalError('Please enter your Facebook email');
      return;
    }

    if (!password.trim()) {
      setLocalError('Please enter your Facebook password');
      return;
    }

    if (!requestId) {
      setLocalError('No active login request found');
      return;
    }

    // Submit credentials
    onCredentials(email.trim(), password.trim(), requestId);
  };

  const handleCancel = () => {
    setEmail('');
    setPassword('');
    setLocalError(null);
    onCancel();
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Facebook color="primary" />
          <Typography variant="h6">Facebook Login Required</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box mb={2}>
          <Alert severity="info" icon={<Lock />}>
            Your Facebook credentials are needed to continue parsing. They will be used once and not
            stored permanently.
          </Alert>
        </Box>

        {(localError || error) && (
          <Box mb={2}>
            <Alert severity="error">{localError || error}</Alert>
          </Box>
        )}

        <TextField
          fullWidth
          label="Facebook Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          margin="normal"
          autoComplete="email"
          autoFocus
        />

        <TextField
          fullWidth
          label="Facebook Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          margin="normal"
          autoComplete="current-password"
        />

        {loading && (
          <Box display="flex" alignItems="center" gap={1} mt={2}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="textSecondary">
              Logging in to Facebook...
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel} disabled={loading} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !email.trim() || !password.trim()}
          variant="contained"
          color="primary"
        >
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FacebookLoginModal;
