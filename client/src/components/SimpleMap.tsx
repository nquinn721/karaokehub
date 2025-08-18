import {
  faClock,
  faLocationCrosshairs,
  faMicrophone,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { apiStore, mapStore, showStore } from '../stores';

// Custom popup component that positions itself over the map
const CustomPopup: React.FC<{
  map: google.maps.Map;
  show: any;
  onClose: () => void;
}> = ({ map, show, onClose }) => {
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    if (!map || !show.lat || !show.lng) return;

    const updatePosition = () => {
      const lat = typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat;
      const lng = typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng;

      const projection = map.getProjection();
      if (projection) {
        const point = projection.fromLatLngToPoint(new google.maps.LatLng(lat, lng));
        const scale = Math.pow(2, map.getZoom() || 10);
        const worldPoint = new google.maps.Point(point!.x * scale, point!.y * scale);

        const mapDiv = map.getDiv();
        const mapBounds = mapDiv.getBoundingClientRect();
        const center = map.getCenter();
        if (center) {
          const centerPoint = projection.fromLatLngToPoint(center);
          const centerWorldPoint = new google.maps.Point(
            centerPoint!.x * scale,
            centerPoint!.y * scale,
          );

          const pixelOffset = new google.maps.Point(
            worldPoint.x - centerWorldPoint.x,
            worldPoint.y - centerWorldPoint.y,
          );

          setPosition({
            x: mapBounds.width / 2 + pixelOffset.x,
            y: mapBounds.height / 2 + pixelOffset.y - 60, // Offset above marker
          });
        }
      }
    };

    updatePosition();

    // Update position when map moves
    const listener = map.addListener('bounds_changed', updatePosition);
    return () => google.maps.event.removeListener(listener);
  }, [map, show.lat, show.lng]);

  const formatTime = (time: string) => {
    try {
      const date = new Date(`1970-01-01T${time}`);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return time;
    }
  };

  if (!position) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          padding: '16px',
          maxWidth: '280px',
          backgroundColor: '#2c2c2c',
          color: '#ffffff',
          borderRadius: '12px',
          fontFamily: 'Roboto, sans-serif',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
          }}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        {/* Title */}
        <div
          style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '8px',
            lineHeight: '1.2',
            paddingRight: '32px', // Space for close button
          }}
        >
          {show.venue}
        </div>

        {/* Vendor name */}
        {show.vendor?.name && (
          <div
            style={{
              fontSize: '0.875rem',
              fontStyle: 'italic',
              marginBottom: '8px',
              opacity: 0.8,
            }}
          >
            by {show.vendor.name}
          </div>
        )}

        {/* Address */}
        {show.address && (
          <div
            style={{
              fontSize: '0.875rem',
              marginBottom: '12px',
              opacity: 0.8,
              lineHeight: '1.3',
            }}
          >
            {show.address}
          </div>
        )}

        {/* Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <FontAwesomeIcon
            icon={faClock}
            style={{
              fontSize: '12px',
              color: '#4fc3f7',
            }}
          />
          <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
            {formatTime(show.startTime)}
          </span>
        </div>

        {/* DJ */}
        {show.dj?.name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FontAwesomeIcon
              icon={faMicrophone}
              style={{
                fontSize: '12px',
                color: '#4fc3f7',
              }}
            />
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{show.dj.name}</span>
          </div>
        )}

        {/* Description */}
        {show.description && (
          <div
            style={{
              fontSize: '0.875rem',
              lineHeight: '1.4',
              marginTop: '8px',
              opacity: 0.8,
            }}
          >
            {show.description}
          </div>
        )}

        {/* Arrow pointing to marker */}
        <div
          style={{
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #2c2c2c',
          }}
        />
      </div>
    </div>
  );
};

export const SimpleMap: React.FC = observer(() => {
  const theme = useTheme();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);

          // Center map on user location at zoom level 10
          if (map) {
            map.setCenter(location);
            map.setZoom(10);
          }
        },
        (error) => {
          console.warn('Error getting location:', error);
          // Fall back to mapStore location if available
          const fallbackLocation = mapStore.userLocation || mapStore.currentCenter;
          if (map && fallbackLocation) {
            map.setCenter(fallbackLocation);
            map.setZoom(10);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        },
      );
    }
  }, [map]);

  // Format time helper
  // Get selected show
  const selectedShow = showStore.selectedMarkerId
    ? showStore.filteredShows.find((s) => s.id === showStore.selectedMarkerId)
    : null;

  // Handle current location button click
  const handleCurrentLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);

          if (map) {
            map.panTo(location);
            map.setZoom(10);
          }
        },
        (error) => {
          console.error('Error getting current location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // 1 minute
        },
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  };

  return (
    <APIProvider apiKey={apiStore.googleMapsApiKey || ''}>
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <Map
          style={{
            width: '100%',
            height: '100%',
          }}
          defaultCenter={
            userLocation ||
            mapStore.userCityCenter ||
            mapStore.userLocation ||
            mapStore.currentCenter
          }
          defaultZoom={10}
          gestureHandling="auto"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          scaleControl={true}
          streetViewControl={false}
          rotateControl={false}
          fullscreenControl={false}
          onCameraChanged={(event) => {
            // Store map instance when available
            if (event.map && !map) {
              setMap(event.map);
            }
          }}
        >
          {/* Current location blue dot */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
            />
          )}

          {/* Render markers for all filtered shows */}
          {showStore.filteredShows.map((show) => {
            if (!show.lat || !show.lng) return null;

            const lat = typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat;
            const lng = typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng;

            // Validate coordinates - North American bounds
            // North America: lat 25-85, lng -180 to -50
            // More specific: Canada/US populated areas lat 30-70, lng -170 to -50
            if (isNaN(lat) || isNaN(lng) || lat < 30 || lat > 70 || lng > -50 || lng < -170) {
              console.warn(
                `Invalid coordinates for show ${show.id} (${show.venue}): lat=${lat}, lng=${lng}, address="${show.address}"`,
              );
              return null;
            }

            // Debug log for coordinates (remove later)
            console.log(`✓ Valid show ${show.venue}: lat=${lat}, lng=${lng}`);

            return (
              <Marker
                key={show.id}
                position={{ lat, lng }}
                onClick={() => showStore.setSelectedMarkerId(show.id)}
              />
            );
          })}
        </Map>

        {/* Custom popup for selected show */}
        {selectedShow && selectedShow.lat && selectedShow.lng && map && (
          <CustomPopup
            map={map}
            show={selectedShow}
            onClose={() => showStore.setSelectedMarkerId(null)}
          />
        )}

        {/* Current Location Button */}
        <IconButton
          onClick={handleCurrentLocationClick}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[2],
            width: 40,
            height: 40,
            '&:hover': {
              backgroundColor: theme.palette.primary.main,
              borderColor: theme.palette.primary.main,
              '& .location-icon': {
                color: theme.palette.primary.contrastText,
              },
            },
            zIndex: 1000,
          }}
        >
          <FontAwesomeIcon
            icon={faLocationCrosshairs}
            className="location-icon"
            style={{
              fontSize: '16px',
              color: theme.palette.primary.main,
            }}
          />
        </IconButton>
      </Box>
    </APIProvider>
  );
});
