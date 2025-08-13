import { Box, CircularProgress, Typography } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authStore } from '../stores';

const AuthSuccess = observer(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // Store the token and fetch user profile
      localStorage.setItem('token', token);
      authStore.setToken(token);

      // Fetch user profile with the new token
      authStore
        .fetchProfile()
        .then(() => {
          navigate('/dashboard');
        })
        .catch(() => {
          navigate('/auth/error');
        });
    } else {
      navigate('/auth/error');
    }
  }, [navigate, searchParams]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor="background.default"
    >
      <CircularProgress size={48} sx={{ mb: 2 }} />
      <Typography variant="h6" color="text.primary">
        Completing sign in...
      </Typography>
    </Box>
  );
});

export default AuthSuccess;
