import { Box, Typography } from '@mui/material';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import React from 'react';
import { apiStore } from '../../stores';

const MarkerTest: React.FC = () => {
  // Simple test data
  const testMarkers = [
    { id: '1', lat: 39.8283, lng: -98.5795, name: 'Test Marker 1' },
    { id: '2', lat: 40.0, lng: -99.0, name: 'Test Marker 2' },
    { id: '3', lat: 39.5, lng: -98.0, name: 'Test Marker 3' },
  ];

  if (!apiStore.googleMapsApiKey) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading Google Maps API...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '400px' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Marker Test - Should show {testMarkers.length} markers
      </Typography>

      <APIProvider apiKey={apiStore.googleMapsApiKey}>
        <Map
          style={{ width: '100%', height: '350px' }}
          defaultCenter={{ lat: 39.8283, lng: -98.5795 }}
          defaultZoom={6}
        >
          {testMarkers.map((marker) => (
            <Marker
              key={marker.id}
              position={{ lat: marker.lat, lng: marker.lng }}
              onClick={() => console.log('Clicked marker:', marker.name)}
            />
          ))}
        </Map>
      </APIProvider>
    </Box>
  );
};

export default MarkerTest;
