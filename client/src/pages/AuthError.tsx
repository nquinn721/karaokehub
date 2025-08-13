import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Box, Button, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AuthError = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor="background.default"
      px={3}
    >
      <FontAwesomeIcon
        icon={faExclamationTriangle}
        style={{ fontSize: '64px', color: theme.palette.error.main, marginBottom: '16px' }}
      />

      <Typography variant="h4" color="text.primary" gutterBottom>
        Authentication Failed
      </Typography>

      <Typography variant="body1" color="text.secondary" textAlign="center" mb={3}>
        There was a problem signing you in. Please try again.
      </Typography>

      <Alert severity="error" sx={{ mb: 3, maxWidth: 400 }}>
        Authentication was cancelled or an error occurred during the sign-in process.
      </Alert>

      <Box display="flex" gap={2}>
        <Button variant="contained" color="primary" onClick={() => navigate('/login')}>
          Try Again
        </Button>

        <Button variant="outlined" color="secondary" onClick={() => navigate('/')}>
          Go Home
        </Button>
      </Box>
    </Box>
  );
};

export default AuthError;
