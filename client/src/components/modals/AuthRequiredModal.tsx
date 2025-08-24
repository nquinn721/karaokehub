import { faSignInAlt, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthRequiredModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  feature?: string;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  open,
  onClose,
  title = 'Account Required',
  message,
  feature = 'this feature',
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const defaultMessage = `To use ${feature}, you'll need to create a free account or sign in to your existing account.`;

  const handleLogin = () => {
    onClose();
    navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
  };

  const handleRegister = () => {
    onClose();
    navigate(`/register?redirect=${encodeURIComponent(window.location.pathname)}`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: '16px',
          padding: 1,
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Typography variant="h5" component="h2" fontWeight={600}>
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {message || defaultMessage}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Join thousands of karaoke enthusiasts and never miss your favorite shows!
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<FontAwesomeIcon icon={faUserPlus} />}
            onClick={handleRegister}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: '12px',
            }}
          >
            Create Free Account
          </Button>

          <Button
            variant="outlined"
            size="large"
            startIcon={<FontAwesomeIcon icon={faSignInAlt} />}
            onClick={handleLogin}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: '12px',
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
              '&:hover': {
                borderColor: theme.palette.primary.dark,
                backgroundColor: theme.palette.primary.main + '08',
              },
            }}
          >
            Sign In to Existing Account
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
