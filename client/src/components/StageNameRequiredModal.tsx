import { LoadingButton } from '@components/LoadingButton';
import { faMicrophone } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Dialog, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
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
      // The updateProfile method will automatically handle modal closing via checkStageNameRequired
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

  // Don't render if not open
  if (!open) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={undefined} // Prevent closing - stage name is required
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          borderRadius: '20px',
          overflow: 'hidden',
          maxWidth: '480px',
          background: 'linear-gradient(145deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
        },
      }}
      sx={{
        zIndex: 9999,
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(12px)',
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 2, px: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
              borderRadius: '50%',
              p: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
              border: '2px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <FontAwesomeIcon icon={faMicrophone} size="xl" color="white" />
          </Box>
          <Typography
            variant="h4"
            component="div"
            fontWeight={700}
            sx={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Welcome to KaraokeHub!
          </Typography>
          <Typography
            variant="body1"
            sx={{
              maxWidth: '360px',
              color: 'rgba(148, 163, 184, 0.9)',
              lineHeight: 1.6,
            }}
          >
            Let's get you set up with a stage name so other karaoke enthusiasts can find you
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 4, pb: 4 }}>
        <TextField
          autoFocus
          fullWidth
          label="Choose Your Stage Name"
          type="text"
          variant="outlined"
          value={stageName}
          onChange={(e) => setStageName(e.target.value)}
          placeholder="e.g., VocalVirtuoso, MicMaster, SingingStar"
          helperText="Make it memorable and uniquely you!"
          onKeyPress={handleKeyPress}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              fontSize: '1.1rem',
              py: 0.5,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              '& fieldset': {
                borderColor: 'rgba(148, 163, 184, 0.3)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(139, 92, 246, 0.5)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#8b5cf6',
                borderWidth: '2px',
              },
              '& input': {
                color: '#f1f5f9',
                mt: 0.5, // Add margin-top to prevent text cutoff
              },
            },
            '& .MuiInputLabel-root': {
              color: 'rgba(148, 163, 184, 0.8)',
              '&.Mui-focused': {
                color: '#8b5cf6',
              },
            },
            '& .MuiFormHelperText-root': {
              color: 'rgba(148, 163, 184, 0.7)',
              fontSize: '0.875rem',
            },
          }}
        />

        <LoadingButton
          onClick={handleSubmitStageName}
          variant="contained"
          size="large"
          fullWidth
          loading={isSubmitting}
          disabled={!stageName.trim()}
          sx={{
            py: 1.8,
            borderRadius: '12px',
            fontSize: '1.1rem',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #7c3aed 0%, #0891b2 100%)',
              boxShadow: '0 6px 20px rgba(139, 92, 246, 0.6)',
              transform: 'translateY(-1px)',
              borderColor: 'rgba(139, 92, 246, 0.5)',
            },
            '&:disabled': {
              background: 'rgba(51, 65, 85, 0.4)',
              color: 'rgba(148, 163, 184, 0.5)',
              border: '1px solid rgba(51, 65, 85, 0.3)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          {isSubmitting ? 'Setting Up Your Profile...' : 'Set My Stage Name'}
        </LoadingButton>

        <Typography
          variant="caption"
          sx={{
            mt: 2,
            display: 'block',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'rgba(148, 163, 184, 0.7)',
          }}
        >
          💡 Don't worry, you can change this anytime in your profile settings
        </Typography>
      </DialogContent>
    </Dialog>
  );
});

export default StageNameRequiredModal;
