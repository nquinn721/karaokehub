import { faPaperPlane, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { authStore, feedbackStore, uiStore } from '../stores';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = observer(({ open, onClose }) => {
  const [formData, setFormData] = useState({
    type: 'general' as 'bug' | 'feature' | 'improvement' | 'compliment' | 'complaint' | 'general',
    subject: '',
    message: '',
    email: authStore.user?.email || '',
    name: authStore.user?.name || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.message.trim()) return;

    setIsSubmitting(true);
    try {
      await feedbackStore.submitFeedback({
        ...formData,
        userId: authStore.user?.id || null,
        userAgent: navigator.userAgent,
        url: window.location.href,
      });

      // Show success notification instead of modal message
      uiStore.addNotification('Thank you for your feedback! We appreciate your input.', 'success');

      // Close modal immediately
      handleClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Show error notification
      uiStore.addNotification('Failed to submit feedback. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type: 'general' as 'bug' | 'feature' | 'improvement' | 'compliment' | 'complaint' | 'general',
      subject: '',
      message: '',
      email: authStore.user?.email || '',
      name: authStore.user?.name || '',
    });
    onClose();
  };

  const feedbackTypes = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'improvement', label: 'Improvement Suggestion' },
    { value: 'compliment', label: 'Compliment' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'general', label: 'General Feedback' },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
          Share Your Feedback
        </Typography>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <FontAwesomeIcon icon={faTimes} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Box>
          <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
            Help us improve KaraokeHub! Your feedback is valuable to us.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'white' }}>Feedback Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                }}
              >
                {feedbackTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

          </Box>

          <TextField
            fullWidth
            label="Subject (Optional)"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            sx={{
              mb: 3,
              '& label': { color: 'rgba(255,255,255,0.7)' },
              '& input': { color: 'white' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                '&.Mui-focused fieldset': { borderColor: 'white' },
              },
            }}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Your Feedback *"
            value={formData.message}
            onChange={(e) => handleInputChange('message', e.target.value)}
            required
            sx={{
              mb: 3,
              '& label': { color: 'rgba(255,255,255,0.7)' },
              '& textarea': { color: 'white' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                '&.Mui-focused fieldset': { borderColor: 'white' },
              },
            }}
          />

          {!authStore.user && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label="Your Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                sx={{
                  '& label': { color: 'rgba(255,255,255,0.7)' },
                  '& input': { color: 'white' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&.Mui-focused fieldset': { borderColor: 'white' },
                  },
                }}
              />
              <TextField
                fullWidth
                type="email"
                label="Your Email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                sx={{
                  '& label': { color: 'rgba(255,255,255,0.7)' },
                  '& input': { color: 'white' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&.Mui-focused fieldset': { borderColor: 'white' },
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          sx={{
            color: 'rgba(255,255,255,0.7)',
            '&:hover': { color: 'white' },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!formData.message.trim() || isSubmitting}
          variant="contained"
          startIcon={<FontAwesomeIcon icon={faPaperPlane} />}
          sx={{
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            '&:hover': {
              background: 'rgba(255,255,255,0.3)',
            },
            '&:disabled': {
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
            },
          }}
        >
          {isSubmitting ? 'Sending...' : 'Send Feedback'}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default FeedbackModal;
