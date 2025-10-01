import { faBuilding, faMapMarkerAlt, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  Grid,
  IconButton,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { apiStore, authStore } from '../stores/index';
import LocationAutocomplete from './LocationAutocomplete';

interface VenueFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  description: string;
}

interface AddVenueFormProps {
  onVenueAdded?: (venue: any) => void;
}

const AddVenueForm: React.FC<AddVenueFormProps> = observer(({ onVenueAdded }) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<VenueFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    website: '',
    description: '',
  });

  const handleInputChange = (field: keyof VenueFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Venue name is required');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Address is required');
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      website: '',
      description: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // Prepare data for submission
      const venueData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        zip: formData.zip.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        website: formData.website.trim() || undefined,
        description: formData.description.trim() || undefined,
        submittedBy: authStore.user?.id,
      };

      const response = await apiStore.post('/venues', venueData);

      setSuccess(`Venue "${formData.name}" has been added successfully!`);
      resetForm();
      setIsExpanded(false);

      // Call the callback if provided
      if (onVenueAdded && response.data) {
        onVenueAdded(response.data);
      }

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to add venue';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        mt: 4,
        backgroundColor: '#121212',
        p: 2,
        borderRadius: 2,
      }}
    >
      {success && (
        <Alert
          severity="success"
          sx={{
            mb: 3,
            backgroundColor: '#2d5016',
            color: '#c8e6c8',
            '& .MuiAlert-icon': {
              color: '#4caf50',
            },
          }}
        >
          {success}
        </Alert>
      )}

      <Card
        sx={{
          backgroundColor: '#1e1e1e',
          border: '1px solid #333333',
          color: '#ffffff',
          '& .MuiTextField-root': {
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#2d2d2d',
              color: '#ffffff',
              '& fieldset': {
                borderColor: '#555555',
              },
              '&:hover fieldset': {
                borderColor: '#777777',
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
              },
            },
            '& .MuiInputLabel-root': {
              color: '#cccccc',
              '&.Mui-focused': {
                color: theme.palette.primary.main,
              },
            },
            '& .MuiFormHelperText-root': {
              color: '#999999',
            },
          },
        }}
      >
        <CardHeader
          avatar={
            <Box
              sx={{
                backgroundColor: theme.palette.primary.main,
                borderRadius: '50%',
                p: 1,
                color: 'white',
              }}
            >
              <FontAwesomeIcon icon={faBuilding} />
            </Box>
          }
          title={
            <Typography variant="h6" sx={{ color: '#ffffff' }}>
              Add New Venue
            </Typography>
          }
          subheader={
            <Typography variant="body2" sx={{ color: '#cccccc' }}>
              Don't see your venue in the list? Add it here and it will be available for all DJs to
              use.
            </Typography>
          }
          action={
            <IconButton
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-label="expand venue form"
              sx={{ color: '#ffffff' }}
            >
              <FontAwesomeIcon icon={isExpanded ? faMinus : faPlus} />
            </IconButton>
          }
          sx={{ backgroundColor: '#2d2d2d' }}
        />

        <Collapse in={isExpanded}>
          <CardContent>
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  backgroundColor: '#5d1a1a',
                  color: '#ffcdd2',
                  '& .MuiAlert-icon': {
                    color: '#f44336',
                  },
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Required Fields */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
                    <FontAwesomeIcon icon={faBuilding} style={{ marginRight: '8px' }} />
                    Basic Information
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Venue Name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    placeholder="e.g., The Rude Dog Bar & Grill"
                    helperText="Enter the full name of the venue"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <LocationAutocomplete
                    label="Street Address"
                    value={formData.address}
                    onChange={(value) => handleInputChange('address', value)}
                    onLocationSelected={(location) => {
                      // Auto-fill city, state, zip from the selected place
                      setFormData((prev) => ({
                        ...prev,
                        address: location.address || prev.address,
                        city: location.city || prev.city,
                        state: location.state || prev.state,
                        zip: location.zip || prev.zip,
                      }));
                    }}
                    required
                    type="address"
                    placeholder="e.g., 123 Main Street"
                    helperText="Start typing to search for addresses and auto-fill location details"
                  />
                </Grid>

                {/* Location Details */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#ffffff' }}>
                    <FontAwesomeIcon icon={faMapMarkerAlt} style={{ marginRight: '8px' }} />
                    Location Details
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <LocationAutocomplete
                    label="City"
                    value={formData.city}
                    onChange={(value) => handleInputChange('city', value)}
                    onLocationSelected={(location) => {
                      setFormData((prev) => ({
                        ...prev,
                        city: location.city || prev.city,
                        state: location.state || prev.state,
                      }));
                    }}
                    type="city"
                    placeholder="e.g., Springfield"
                    helperText="Search for cities with autocomplete"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="State"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="e.g., IL or Illinois"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="ZIP Code"
                    value={formData.zip}
                    onChange={(e) => handleInputChange('zip', e.target.value)}
                    placeholder="e.g., 62701"
                  />
                </Grid>

                {/* Optional Fields */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#ffffff' }}>
                    Additional Information (Optional)
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="e.g., (555) 123-4567"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="e.g., https://www.venue.com"
                    type="url"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    multiline
                    rows={3}
                    placeholder="Brief description of the venue (atmosphere, type of establishment, etc.)"
                  />
                </Grid>

                {/* Submit Buttons */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        resetForm();
                        setIsExpanded(false);
                        setError('');
                      }}
                      disabled={loading}
                      sx={{
                        borderColor: '#666666',
                        color: '#cccccc',
                        '&:hover': {
                          borderColor: '#888888',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        },
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading || !formData.name.trim() || !formData.address.trim()}
                      sx={{
                        minWidth: 120,
                        backgroundColor: theme.palette.primary.main,
                        '&:hover': {
                          backgroundColor: theme.palette.primary.dark,
                        },
                      }}
                    >
                      {loading ? 'Adding...' : 'Add Venue'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Collapse>
      </Card>
    </Box>
  );
});

export default AddVenueForm;
