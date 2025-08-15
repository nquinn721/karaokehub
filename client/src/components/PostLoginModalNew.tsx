import { LoadingButton } from '@components/LoadingButton';
import { Favorite, MusicNote, People } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { authStore, uiStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

const PostLoginModal: React.FC = observer(() => {
  const [currentStep, setCurrentStep] = useState(0);
  const [stageName, setStageName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = authStore.isNewUser
    ? ['Welcome to KaraokePal!', 'Set Your Stage Name']
    : ['Set Your Stage Name'];

  const handleNext = () => {
    if (authStore.isNewUser && currentStep === 0) {
      setCurrentStep(1);
    } else {
      handleSubmitStageName();
    }
  };

  const handleSubmitStageName = async () => {
    if (!stageName.trim()) {
      uiStore.addNotification('Please enter a stage name', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await authStore.updateProfile({ stageName: stageName.trim() });

    if (result.success) {
      uiStore.addNotification('Stage name set successfully!', 'success');
      authStore.closePostLoginModal();
    } else {
      uiStore.addNotification(result.error || 'Failed to set stage name', 'error');
    }
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!authStore.isNewUser) {
      // Allow closing if not a new user (they can set stage name later)
      authStore.closePostLoginModal();
    }
  };

  if (!authStore.showPostLoginModal) return null;

  return (
    <Dialog
      open={authStore.showPostLoginModal}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={authStore.isNewUser} // Prevent escape for new users
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" component="div">
            {authStore.isNewUser ? 'Welcome to KaraokePal!' : 'Complete Your Profile'}
          </Typography>
        </Box>
        {authStore.isNewUser && (
          <Box mt={2}>
            <Stepper activeStep={currentStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}
      </DialogTitle>

      <DialogContent>
        {authStore.isNewUser && currentStep === 0 ? (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Welcome to the ultimate karaoke community!
            </Typography>

            <Typography variant="body1" paragraph>
              KaraokePal helps you discover amazing karaoke experiences and connect with fellow
              singers.
            </Typography>

            <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                What you can do:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <MusicNote color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Discover Shows"
                    secondary="Find karaoke events near you and see what's happening"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Favorite color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Track Favorites"
                    secondary="Save your favorite venues and never miss a show"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <People color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Connect & Share"
                    secondary="Build your karaoke network and share memorable moments"
                  />
                </ListItem>
              </List>
            </Paper>

            <Alert severity="info">
              Ready to get started? Let's set up your performer profile!
            </Alert>
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose Your Stage Name
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              Your stage name is how other karaoke enthusiasts will know you. Make it memorable and
              uniquely you!
            </Typography>

            <TextField
              autoFocus
              margin="dense"
              label="Stage Name"
              type="text"
              fullWidth
              variant="outlined"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              placeholder="e.g., SingingStar, KaraokeKing, MelodyMaker"
              helperText="This can be changed later in your profile settings"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && stageName.trim()) {
                  handleSubmitStageName();
                }
              }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {!authStore.isNewUser && (
          <Button onClick={handleClose} color="inherit">
            Skip for Now
          </Button>
        )}

        {authStore.isNewUser && currentStep === 0 ? (
          <Button onClick={handleNext} variant="contained" size="large" fullWidth>
            Let's Get Started!
          </Button>
        ) : (
          <LoadingButton
            onClick={handleSubmitStageName}
            variant="contained"
            size="large"
            fullWidth
            loading={isSubmitting}
            disabled={!stageName.trim()}
          >
            {isSubmitting ? 'Setting Stage Name...' : 'Complete Setup'}
          </LoadingButton>
        )}
      </DialogActions>
    </Dialog>
  );
});

export default PostLoginModal;
