import { Box, CircularProgress, Typography } from '@mui/material';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authStore } from '../stores';

const AuthSuccess = observer(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Handle auth success immediately - this will only run once per component lifecycle
  React.useMemo(() => {
    const token = searchParams.get('token');

    if (token) {
      authStore.handleAuthSuccess(token, navigate);
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
