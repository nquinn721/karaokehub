import { LoadingButton } from '@components/LoadingButton';
import { faUser, faUserTag } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { authStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

const ProfilePage: React.FC = observer(() => {
  const theme = useTheme();
  const [name, setName] = useState(authStore.user?.name || '');
  const [stageName, setStageName] = useState(authStore.user?.stageName || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await authStore.updateProfile({
        name: name.trim(),
        stageName: stageName.trim() || undefined, // Convert empty string to undefined
      });
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!authStore.user) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Profile
          </Typography>
          <Alert severity="error">You must be logged in to view this page.</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
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
          Profile Settings
        </Typography>

        <Grid container spacing={4}>
          {/* Profile Info Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Avatar
                  src={authStore.user.avatar}
                  sx={{
                    width: 100,
                    height: 100,
                    mx: 'auto',
                    mb: 2,
                    fontSize: '2rem',
                  }}
                >
                  <FontAwesomeIcon icon={faUser} />
                </Avatar>

                <Typography variant="h6" gutterBottom>
                  {authStore.user.stageName || authStore.user.name}
                </Typography>

                {authStore.user.stageName && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Real name: {authStore.user.name}
                  </Typography>
                )}

                <Typography variant="body2" color="text.secondary">
                  {authStore.user.email}
                </Typography>

                {authStore.user.isAdmin && (
                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 2,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                      }}
                    >
                      Admin
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Edit Form Card */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}
                >
                  <FontAwesomeIcon icon={faUserTag} />
                  Edit Profile
                </Typography>

                <form onSubmit={handleSubmit}>
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      label="Real Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      variant="outlined"
                      helperText="Your real name (always visible to you)"
                    />
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      label="Stage Name"
                      value={stageName}
                      onChange={(e) => setStageName(e.target.value)}
                      variant="outlined"
                      helperText="Optional karaoke stage name (will be displayed instead of real name if provided)"
                      placeholder="Enter your karaoke stage name..."
                    />
                  </Box>

                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}

                  {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      {success}
                    </Alert>
                  )}

                  <LoadingButton
                    type="submit"
                    variant="contained"
                    loading={isLoading}
                    size="large"
                    sx={{ mt: 2 }}
                  >
                    Update Profile
                  </LoadingButton>
                </form>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
});

export default ProfilePage;
