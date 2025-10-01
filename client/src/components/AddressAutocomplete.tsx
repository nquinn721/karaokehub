import { TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';

interface AddressAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected?: (place: any) => void;
  placeholder?: string;
  required?: boolean;
  fullWidth?: boolean;
  helperText?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = observer(
  ({
    label,
    value,
    onChange,
    onPlaceSelected,
    placeholder,
    required = false,
    fullWidth = true,
    helperText,
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

    useEffect(() => {
      // Check if Google Maps API is loaded
      const checkGoogleMaps = () => {
        if (
          (window as any).google &&
          (window as any).google.maps &&
          (window as any).google.maps.places
        ) {
          setIsGoogleLoaded(true);
          initializeAutocomplete();
        } else {
          // Retry after a short delay
          setTimeout(checkGoogleMaps, 100);
        }
      };

      checkGoogleMaps();

      return () => {
        if (autocompleteRef.current && (window as any).google) {
          (window as any).google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    }, []);

    const initializeAutocomplete = () => {
      const google = (window as any).google;
      if (!inputRef.current || !google || !google.maps || !google.maps.places) {
        return;
      }

      // Create autocomplete instance
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment', 'geocode'],
        fields: ['name', 'formatted_address', 'address_components', 'geometry', 'place_id'],
      });

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();

        if (place && place.formatted_address) {
          onChange(place.formatted_address);

          if (onPlaceSelected) {
            onPlaceSelected(place);
          }
        }
      });
    };

    return (
      <TextField
        ref={inputRef}
        fullWidth={fullWidth}
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        helperText={
          isGoogleLoaded
            ? helperText || 'Start typing to search for addresses...'
            : 'Loading address suggestions...'
        }
        variant="outlined"
        sx={{
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
              borderColor: '#1976d2',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#cccccc',
            '&.Mui-focused': {
              color: '#1976d2',
            },
          },
          '& .MuiFormHelperText-root': {
            color: '#999999',
          },
        }}
      />
    );
  },
);

export default AddressAutocomplete;
