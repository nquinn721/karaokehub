import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Autocomplete, Box, Button, Chip, TextField, Typography } from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import CustomModal from './CustomModal';

// Import location data
import locationData from '../../../data/majorLocations.json';

interface LocationEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name?: string; city?: string; state?: string }) => Promise<void>;
  initialData?: {
    url?: string;
    name?: string;
    city?: string;
    state?: string;
  };
}

const LocationEditModal: React.FC<LocationEditModalProps> = ({
  open,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Get list of states
  const states = useMemo(() => {
    return Object.keys(locationData).sort();
  }, []);

  // Get list of cities for selected state
  const cities = useMemo(() => {
    if (!selectedState || !locationData[selectedState as keyof typeof locationData]) {
      return [];
    }
    return (locationData[selectedState as keyof typeof locationData] as string[]).sort();
  }, [selectedState]);

  // Initialize form with initial data
  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name || '');
      setSelectedState(initialData.state || null);
      setSelectedCity(initialData.city || null);
    }
  }, [open, initialData]);

  // Clear city when state changes
  useEffect(() => {
    if (selectedState !== initialData?.state) {
      setSelectedCity(null);
    }
  }, [selectedState, initialData?.state]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        name: name.trim() || undefined,
        city: selectedCity || undefined,
        state: selectedState || undefined,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to save location data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedState(null);
    setSelectedCity(null);
    setLoading(false);
    onClose();
  };

  const isFormValid = name.trim().length > 0 || selectedState || selectedCity;

  return (
    <CustomModal
      open={open}
      onClose={handleClose}
      title="Edit Location Information"
      icon={<FontAwesomeIcon icon={faMapMarkerAlt} />}
      maxWidth="sm"
    >
      <Box sx={{ pt: 1 }}>
        {/* URL Display */}
        {initialData?.url && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, wordBreak: 'break-all', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}
          >
            {initialData.url}
          </Typography>
        )}

        {/* Name Field */}
        <TextField
          fullWidth
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 3 }}
          placeholder="Enter a friendly name for this location"
          helperText="A descriptive name to identify this location (e.g., 'Steve's Karaoke')"
        />

        {/* State Autocomplete */}
        <Autocomplete
          options={states}
          value={selectedState}
          onChange={(_, newValue) => setSelectedState(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="State"
              placeholder="Select or type a state"
              helperText="Choose the state where this location is situated"
            />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={option}
                  size="small"
                  variant="outlined"
                  sx={{ minWidth: 60, justifyContent: 'center' }}
                />
                <Typography variant="body2">{option}</Typography>
              </Box>
            </li>
          )}
          sx={{ mb: 3 }}
          freeSolo
          autoSelect
          clearOnEscape
        />

        {/* City Autocomplete */}
        <Autocomplete
          options={cities}
          value={selectedCity}
          onChange={(_, newValue) => setSelectedCity(newValue)}
          disabled={!selectedState}
          renderInput={(params) => (
            <TextField
              {...params}
              label="City"
              placeholder={selectedState ? 'Select or type a city' : 'Select a state first'}
              helperText={
                selectedState
                  ? `Choose a city in ${selectedState}`
                  : 'Select a state to enable city selection'
              }
            />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FontAwesomeIcon
                  icon={faMapMarkerAlt}
                  style={{ fontSize: '12px', color: '#666' }}
                />
                <Typography variant="body2">{option}</Typography>
                {selectedState && (
                  <Chip
                    label={selectedState}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 'auto', fontSize: '10px', height: 20 }}
                  />
                )}
              </Box>
            </li>
          )}
          sx={{ mb: 2 }}
          freeSolo
          autoSelect
          clearOnEscape
        />

        {/* Preview of selected location */}
        {(selectedState || selectedCity) && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'primary.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'primary.200',
            }}
          >
            <Typography variant="subtitle2" color="primary.main" sx={{ mb: 1 }}>
              Selected Location:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={faMapMarkerAlt} style={{ color: '#1976d2' }} />
              <Typography variant="body2">
                {[selectedCity, selectedState].filter(Boolean).join(', ') || 'No location selected'}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading || !isFormValid}
            sx={{ minWidth: 80 }}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Box>
    </CustomModal>
  );
};

export default LocationEditModal;
