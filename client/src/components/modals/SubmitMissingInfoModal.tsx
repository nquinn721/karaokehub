import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Box, Button, Snackbar, TextField, Typography } from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { authStore, showStore } from '../../stores';
import { showReviewStore } from '../../stores/ShowReviewStore';
import { Show } from '../../stores/ShowStore';
import CustomModal from '../CustomModal';

interface SubmitMissingInfoModalProps {
  open: boolean;
  onClose: () => void;
  show: Show | null;
}

export const SubmitMissingInfoModal: React.FC<SubmitMissingInfoModalProps> = observer(
  ({ open, onClose, show }) => {
    const [formData, setFormData] = useState({
      djName: '',
      vendorName: '',
      venueName: '',
      venuePhone: '',
      venueWebsite: '',
      location: '',
      description: '',
      comments: '',
    });

    // Initialize form data when show changes
    React.useEffect(() => {
      if (show) {
        setFormData({
          djName: show.dj?.name || '',
          vendorName: show.dj?.vendor?.name || '',
          venueName:
            show.venue && typeof show.venue === 'object' ? show.venue.name || '' : show.venue || '',
          venuePhone: show.venue?.phone || '',
          venueWebsite: show.venue?.website || '',
          location: showStore.getVenueAddress(show) || '',
          description: show.description || '',
          comments: '',
        });
      }
    }, [show]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

    const handleSubmit = async () => {
      if (!show || !authStore.user?.id) return;

      // Check if at least one field has content (excluding comments which is optional)
      const { comments, ...fieldsToCheck } = formData;
      const hasData = Object.values(fieldsToCheck).some((value) => value.trim() !== '');
      if (!hasData) {
        setError('Please update at least one field with information');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await showReviewStore.submitReview({
          showId: show.id,
          submittedByUserId: authStore.user.id,
          ...formData,
        });

        setSuccess(true);
        setFormData({
          djName: show.dj?.name || '',
          vendorName: show.dj?.vendor?.name || '',
          venueName:
            show.venue && typeof show.venue === 'object' ? show.venue.name || '' : show.venue || '',
          venuePhone: show.venue?.phone || '',
          venueWebsite: show.venue?.website || '',
          location: showStore.getVenueAddress(show) || '',
          description: show.description || '',
          comments: '',
        });

        // Close modal after short delay
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 2000);
      } catch (err: any) {
        setError(err.message || 'Failed to submit review');
      } finally {
        setLoading(false);
      }
    };

    const handleClose = () => {
      if (!loading) {
        onClose();
        setError(null);
        if (show) {
          setFormData({
            djName: show.dj?.name || '',
            vendorName: show.dj?.vendor?.name || '',
            venueName:
              show.venue && typeof show.venue === 'object'
                ? show.venue.name || ''
                : show.venue || '',
            venuePhone: show.venue?.phone || '',
            venueWebsite: show.venue?.website || '',
            location: showStore.getVenueAddress(show) || '',
            description: show.description || '',
            comments: '',
          });
        }
      }
    };

    if (!show) return null;

    return (
      <>
        <CustomModal
          open={open}
          onClose={handleClose}
          title="Update Show Info"
          icon={<FontAwesomeIcon icon={faEdit} />}
          maxWidth="md"
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Help us improve our data by updating the show information below. You can modify any of the fields including vendor, DJ, venue, and location details. Your submission will be reviewed by our team.
          </Typography>

          {/* Current Show Info */}
          <Box sx={{ mb: 2.5, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
              Current Show Information:
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Venue:</strong> {showStore.getVenueName(show) || 'Not specified'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>DJ/Host:</strong> {show.dj?.name || 'Not specified'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Vendor:</strong> {show.dj?.vendor?.name || 'Not specified'}
            </Typography>
            <Typography variant="body2">
              <strong>Location:</strong> {showStore.getVenueAddress(show) || 'Not specified'}
            </Typography>
          </Box>

          {/* Form Fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5 }}>
            <TextField
              label="DJ/Host Name"
              value={formData.djName}
              onChange={handleInputChange('djName')}
              placeholder="Enter DJ/Host name"
              fullWidth
              disabled={loading}
              size="small"
            />

            <TextField
              label="Vendor/Company Name"
              value={formData.vendorName}
              onChange={handleInputChange('vendorName')}
              placeholder="Enter vendor/company name"
              fullWidth
              disabled={loading}
              size="small"
            />

            <TextField
              label="Venue Name"
              value={formData.venueName}
              onChange={handleInputChange('venueName')}
              placeholder="Enter venue name"
              fullWidth
              disabled={loading}
              size="small"
            />

            <TextField
              label="Venue Phone"
              value={formData.venuePhone}
              onChange={handleInputChange('venuePhone')}
              placeholder="Enter venue phone number"
              fullWidth
              disabled={loading}
              size="small"
            />

            <TextField
              label="Venue Website"
              value={formData.venueWebsite}
              onChange={handleInputChange('venueWebsite')}
              placeholder="Enter venue website URL"
              fullWidth
              disabled={loading}
              size="small"
            />

            <TextField
              label="Location"
              value={formData.location}
              onChange={handleInputChange('location')}
              placeholder="Enter venue address (e.g., 8270 Sancus Blvd, Columbus, OH)"
              fullWidth
              disabled={loading}
              size="small"
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              placeholder="Enter show description"
              multiline
              rows={2}
              fullWidth
              disabled={loading}
              size="small"
            />

            <TextField
              label="Additional Comments"
              value={formData.comments}
              onChange={handleInputChange('comments')}
              placeholder="Any additional information or context..."
              multiline
              rows={2}
              fullWidth
              disabled={loading}
              size="small"
            />
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              startIcon={<FontAwesomeIcon icon={faEdit} style={{ fontSize: '14px' }} />}
            >
              {loading ? 'Updating...' : 'Update Show Info'}
            </Button>
          </Box>
        </CustomModal>

        <Snackbar
          open={success}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled">
            Show information updated successfully! Thank you for helping improve our data.
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" variant="filled">
            {error}
          </Alert>
        </Snackbar>
      </>
    );
  },
);
