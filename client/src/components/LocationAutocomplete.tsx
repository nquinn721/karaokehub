import { Autocomplete, TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { googleMapsLoader } from '../utils/googleMapsLoader';

interface LocationAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onLocationSelected?: (location: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }) => void;
  placeholder?: string;
  required?: boolean;
  fullWidth?: boolean;
  helperText?: string;
  type?: 'address' | 'city' | 'region'; // Different autocomplete types
}

// Fallback city/state data for when Google API isn't available
const US_CITIES_STATES = [
  { city: 'New York', state: 'NY', formatted: 'New York, NY' },
  { city: 'Los Angeles', state: 'CA', formatted: 'Los Angeles, CA' },
  { city: 'Chicago', state: 'IL', formatted: 'Chicago, IL' },
  { city: 'Houston', state: 'TX', formatted: 'Houston, TX' },
  { city: 'Phoenix', state: 'AZ', formatted: 'Phoenix, AZ' },
  { city: 'Philadelphia', state: 'PA', formatted: 'Philadelphia, PA' },
  { city: 'San Antonio', state: 'TX', formatted: 'San Antonio, TX' },
  { city: 'San Diego', state: 'CA', formatted: 'San Diego, CA' },
  { city: 'Dallas', state: 'TX', formatted: 'Dallas, TX' },
  { city: 'San Jose', state: 'CA', formatted: 'San Jose, CA' },
  { city: 'Austin', state: 'TX', formatted: 'Austin, TX' },
  { city: 'Jacksonville', state: 'FL', formatted: 'Jacksonville, FL' },
  { city: 'Fort Worth', state: 'TX', formatted: 'Fort Worth, TX' },
  { city: 'Columbus', state: 'OH', formatted: 'Columbus, OH' },
  { city: 'Charlotte', state: 'NC', formatted: 'Charlotte, NC' },
  { city: 'San Francisco', state: 'CA', formatted: 'San Francisco, CA' },
  { city: 'Indianapolis', state: 'IN', formatted: 'Indianapolis, IN' },
  { city: 'Seattle', state: 'WA', formatted: 'Seattle, WA' },
  { city: 'Denver', state: 'CO', formatted: 'Denver, CO' },
  { city: 'Washington', state: 'DC', formatted: 'Washington, DC' },
  { city: 'Boston', state: 'MA', formatted: 'Boston, MA' },
  { city: 'El Paso', state: 'TX', formatted: 'El Paso, TX' },
  { city: 'Nashville', state: 'TN', formatted: 'Nashville, TN' },
  { city: 'Detroit', state: 'MI', formatted: 'Detroit, MI' },
  { city: 'Oklahoma City', state: 'OK', formatted: 'Oklahoma City, OK' },
  { city: 'Portland', state: 'OR', formatted: 'Portland, OR' },
  { city: 'Las Vegas', state: 'NV', formatted: 'Las Vegas, NV' },
  { city: 'Memphis', state: 'TN', formatted: 'Memphis, TN' },
  { city: 'Louisville', state: 'KY', formatted: 'Louisville, KY' },
  { city: 'Baltimore', state: 'MD', formatted: 'Baltimore, MD' },
  { city: 'Milwaukee', state: 'WI', formatted: 'Milwaukee, WI' },
  { city: 'Albuquerque', state: 'NM', formatted: 'Albuquerque, NM' },
  { city: 'Tucson', state: 'AZ', formatted: 'Tucson, AZ' },
  { city: 'Fresno', state: 'CA', formatted: 'Fresno, CA' },
  { city: 'Mesa', state: 'AZ', formatted: 'Mesa, AZ' },
  { city: 'Sacramento', state: 'CA', formatted: 'Sacramento, CA' },
  { city: 'Atlanta', state: 'GA', formatted: 'Atlanta, GA' },
  { city: 'Kansas City', state: 'MO', formatted: 'Kansas City, MO' },
  { city: 'Colorado Springs', state: 'CO', formatted: 'Colorado Springs, CO' },
  { city: 'Raleigh', state: 'NC', formatted: 'Raleigh, NC' },
  { city: 'Omaha', state: 'NE', formatted: 'Omaha, NE' },
  { city: 'Miami', state: 'FL', formatted: 'Miami, FL' },
  { city: 'Long Beach', state: 'CA', formatted: 'Long Beach, CA' },
  { city: 'Virginia Beach', state: 'VA', formatted: 'Virginia Beach, VA' },
  { city: 'Oakland', state: 'CA', formatted: 'Oakland, CA' },
  { city: 'Minneapolis', state: 'MN', formatted: 'Minneapolis, MN' },
  { city: 'Tulsa', state: 'OK', formatted: 'Tulsa, OK' },
  { city: 'Tampa', state: 'FL', formatted: 'Tampa, FL' },
  { city: 'Arlington', state: 'TX', formatted: 'Arlington, TX' },
  { city: 'New Orleans', state: 'LA', formatted: 'New Orleans, LA' },
];

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = observer(
  ({
    label,
    value,
    onChange,
    onLocationSelected,
    placeholder,
    required = false,
    fullWidth = true,
    helperText,
    type = 'address',
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      const loadGoogleMaps = async () => {
        try {
          console.log('Loading Google Maps API with Places library...');
          await googleMapsLoader.load({ libraries: ['places'] });
          console.log('Google Maps API loaded successfully');
          setIsGoogleLoaded(true);
          if (type === 'address') {
            initializeGoogleAutocomplete();
          }
        } catch (error) {
          console.log('Google Maps API failed to load, using fallback:', error);
          setIsGoogleLoaded(false);
        }
      };

      loadGoogleMaps();

      return () => {
        if (autocompleteRef.current && (window as any).google) {
          (window as any).google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    }, [type]);

    const initializeGoogleAutocomplete = () => {
      const google = (window as any).google;
      if (!inputRef.current || !google || !google.maps || !google.maps.places) {
        return;
      }

      try {
        const options: any = {
          fields: ['name', 'formatted_address', 'address_components', 'geometry', 'place_id'],
        };

        // Configure different types of autocomplete
        switch (type) {
          case 'address':
            options.types = ['establishment', 'geocode'];
            break;
          case 'city':
            options.types = ['(cities)'];
            break;
          case 'region':
            options.types = ['(regions)'];
            break;
        }

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, options);

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();

          if (place && (place.formatted_address || place.name)) {
            const selectedValue = place.formatted_address || place.name || '';
            onChange(selectedValue);

            if (onLocationSelected && place.address_components) {
              const locationData = extractLocationData(place.address_components);
              onLocationSelected({
                ...locationData,
                address: selectedValue,
              });
            }
          }
        });

        console.log('Google Places Autocomplete initialized successfully');
      } catch (error) {
        console.error('Error initializing Google Places Autocomplete:', error);
      }
    };

    const extractLocationData = (addressComponents: any[]) => {
      let city = '';
      let state = '';
      let zip = '';
      let country = '';

      addressComponents.forEach((component: any) => {
        const types = component.types;
        if (types.includes('locality')) {
          city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          state = component.short_name;
        } else if (types.includes('postal_code')) {
          zip = component.long_name;
        } else if (types.includes('country')) {
          country = component.short_name;
        }
      });

      return { city, state, zip, country };
    };

    const handleFallbackSearch = (inputValue: string) => {
      if (!inputValue || inputValue.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);

      // Simulate API delay
      setTimeout(() => {
        let filtered: string[] = [];

        if (type === 'city' || type === 'region') {
          // Search cities and states
          filtered = US_CITIES_STATES.filter(
            (item) =>
              item.city.toLowerCase().includes(inputValue.toLowerCase()) ||
              item.state.toLowerCase().includes(inputValue.toLowerCase()) ||
              item.formatted.toLowerCase().includes(inputValue.toLowerCase()),
          )
            .map((item) => item.formatted)
            .slice(0, 10);
        } else {
          // For addresses, provide some common address patterns
          filtered = [
            `${inputValue} Main Street`,
            `${inputValue} Broadway`,
            `${inputValue} Oak Avenue`,
            `${inputValue} Park Road`,
            `${inputValue} Center Street`,
          ].slice(0, 5);
        }

        setSuggestions(filtered);
        setLoading(false);
      }, 300);
    };

    if (!isGoogleLoaded && (type === 'city' || type === 'region')) {
      // Use fallback autocomplete for cities/regions
      return (
        <Autocomplete
          freeSolo
          options={suggestions}
          value={value}
          onInputChange={(_event, newInputValue) => {
            onChange(newInputValue);
            handleFallbackSearch(newInputValue);
          }}
          onChange={(_event, newValue) => {
            if (newValue) {
              onChange(newValue);

              // Extract city and state from formatted string
              if (onLocationSelected && type === 'city') {
                const match = US_CITIES_STATES.find((item) => item.formatted === newValue);
                if (match) {
                  onLocationSelected({
                    city: match.city,
                    state: match.state,
                  });
                }
              }
            }
          }}
          loading={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              placeholder={placeholder}
              required={required}
              fullWidth={fullWidth}
              helperText={helperText || 'Type to search for cities and states'}
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
          )}
        />
      );
    }

    // Standard TextField for addresses (with or without Google integration)
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
          isGoogleLoaded && type === 'address'
            ? helperText || 'Start typing to search for addresses...'
            : helperText || 'Enter address manually'
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

export default LocationAutocomplete;
