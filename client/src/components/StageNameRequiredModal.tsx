import { LoadingButton } from '@components/LoadingButton';
import { faMicrophone } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { authStore, uiStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

interface StageNameRequiredModalProps {
  open: boolean;
}

const StageNameRequiredModal: React.FC<StageNameRequiredModalProps> = observer(({ open }) => {
  const [stageName, setStageName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitStageName = async () => {
    if (!stageName.trim()) {
      uiStore.addNotification('Please enter a stage name', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await authStore.updateProfile({ stageName: stageName.trim() });

    if (result.success) {
      uiStore.addNotification('Stage name set successfully!', 'success');
      setStageName('');
      authStore.closeStageNameModal();
    } else {
      uiStore.addNotification(result.error || 'Failed to set stage name', 'error');
    }
    setIsSubmitting(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && stageName.trim()) {
      handleSubmitStageName();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={undefined} // Prevent closing - stage name is required
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', py: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              background: 'linear-gradient(135deg, #ff6b9d, #c44569)',
              borderRadius: '50%',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
            }}
          >
            <FontAwesomeIcon icon={faMicrophone} size="lg" color="white" />
          </Box>
          <Typography variant="h5" component="div" fontWeight={600}>
            Stage Name Required
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="body1" color="text.secondary" paragraph>
            To use KaraokeHub, you need a stage name. This is how other karaoke enthusiasts will
            know you!
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            Your stage name helps build the karaoke community and makes it easier for friends to
            find you.
          </Alert>
        </Box>

        <TextField
          autoFocus
          fullWidth
          label="Choose Your Stage Name"
          type="text"
          variant="outlined"
          value={stageName}
          onChange={(e) => setStageName(e.target.value)}
          placeholder="e.g., SingStar, KaraokeKing, MelodyMaker"
          helperText="Make it memorable and uniquely you!"
          onKeyPress={handleKeyPress}
          sx={{ mb: 3 }}
        />

        <LoadingButton
          onClick={handleSubmitStageName}
          variant="contained"
          size="large"
          fullWidth
          loading={isSubmitting}
          disabled={!stageName.trim()}
          sx={{
            py: 1.5,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ff6b9d, #c44569)',
            '&:hover': {
              background: 'linear-gradient(135deg, #ff5722, #d32f2f)',
            },
          }}
        >
          {isSubmitting ? 'Setting Stage Name...' : 'Set My Stage Name'}
        </LoadingButton>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 2, display: 'block', textAlign: 'center' }}
        >
          You can change this later in your profile settings
        </Typography>
      </DialogContent>
    </Dialog>
  );
});

export default StageNameRequiredModal;
