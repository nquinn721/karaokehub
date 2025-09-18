import AvatarCustomizer from '@components/AvatarCustomizer';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Box, Container, Typography } from '@mui/material';
import { authStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Navigate } from 'react-router-dom';

const AvatarCustomizationPage: React.FC = observer(() => {
  if (!authStore.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              mb: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <FontAwesomeIcon icon={faUser} />
            Avatar Customization
          </Typography>

          <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
            Personalize your karaoke avatar with different microphones, outfits, and accessories!
            Express your unique style and stand out on stage. 🎤✨
          </Typography>

          <AvatarCustomizer />

          <Alert severity="info" sx={{ mt: 4 }}>
            <Typography variant="subtitle2" gutterBottom>
              🚀 Coming Soon: Avatar Store & Performance Rewards!
            </Typography>
            <Typography variant="body2">
              Earn coins by singing at karaoke venues and spend them on exclusive avatar items.
              Premium subscribers will get early access to limited edition accessories!
            </Typography>
          </Alert>
        </Box>
      </Container>
    </>
  );
});

export default AvatarCustomizationPage;
