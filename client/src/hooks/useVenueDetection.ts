import { useCallback, useEffect, useState } from 'react';
import { geolocationService, UserLocation, VenueProximity } from '../services/GeolocationService';
import { Show } from '../stores/ShowStore';

interface UseVenueDetectionOptions {
  shows: Show[];
  enableAutoDetection?: boolean;
  trackingInterval?: number;
}

interface UseVenueDetectionReturn {
  location: UserLocation | null;
  nearbyVenues: VenueProximity[];
  isTracking: boolean;
  error: string | null;
  permissionStatus: PermissionState | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  checkCurrentLocation: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

export const useVenueDetection = ({
  shows,
  enableAutoDetection = true,
  trackingInterval = 30000, // 30 seconds
}: UseVenueDetectionOptions): UseVenueDetectionReturn => {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [nearbyVenues, setNearbyVenues] = useState<VenueProximity[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);

  // Check permission status
  const checkPermission = useCallback(async () => {
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(result.state);

        // Listen for permission changes
        result.onchange = () => {
          setPermissionStatus(result.state);
        };
      } catch (err) {
        console.warn('Unable to check geolocation permission:', err);
        setPermissionStatus('prompt');
      }
    } else {
      setPermissionStatus('prompt');
    }
  }, []);

  // Request geolocation permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Try to get location, which will trigger permission request
      await geolocationService.getCurrentPosition();
      setPermissionStatus('granted');
      return true;
    } catch (err) {
      const error = err as GeolocationPositionError;
      if (error.code === error.PERMISSION_DENIED) {
        setPermissionStatus('denied');
        setError(
          'Location access denied. Please enable location permissions to detect nearby venues.',
        );
      } else {
        setError('Unable to access location. Please check your device settings.');
      }
      return false;
    }
  }, []);

  // Check current location and find nearby venues
  const checkCurrentLocation = useCallback(async () => {
    if (!geolocationService.isSupported()) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    try {
      setError(null);

      // Get high-precision location
      const currentLocation = await geolocationService.getHighPrecisionLocation(3);
      setLocation(currentLocation);

      // Check for nearby venues
      const proximities = geolocationService.checkShowProximity(currentLocation, shows);
      setNearbyVenues(proximities);

      console.log(`Found ${proximities.length} nearby venues:`, proximities);
    } catch (err) {
      // Only log location errors in development or for legitimate issues
      const error = err as GeolocationPositionError;

      if (error.code === 1) {
        // PERMISSION_DENIED - user explicitly denied
        console.log('📍 Location access denied by user (expected on desktop)');
        setError('Location access denied');
        setPermissionStatus('denied');
      } else if (error.code === 2) {
        // POSITION_UNAVAILABLE - no GPS/network location
        console.log('📍 Location unavailable (expected on desktop without GPS)');
        setError('Location unavailable');
      } else if (error.code === 3) {
        // TIMEOUT - took too long
        console.log('📍 Location request timed out (expected on some devices)');
        setError('Location request timed out');
      } else {
        // Only log unexpected errors
        if (process.env.NODE_ENV === 'development') {
          console.warn('📍 Location detection failed:', err);
        }
        setError('Location not available on this device');
      }
    }
  }, [shows]);

  // Start continuous tracking
  const startTracking = useCallback(async () => {
    if (isTracking) return;

    try {
      setError(null);
      setIsTracking(true);

      // Get initial location
      await checkCurrentLocation();

      // Set up interval for continuous tracking
      const intervalId = setInterval(async () => {
        try {
          await checkCurrentLocation();
        } catch (err) {
          // Silently handle tracking failures - common on desktop
          if (process.env.NODE_ENV === 'development') {
            console.log('📍 Location tracking update skipped (expected on desktop)');
          }
        }
      }, trackingInterval);

      // Store interval ID for cleanup
      (window as any).__venueTrackingInterval = intervalId;
    } catch (err) {
      setIsTracking(false);
      throw err;
    }
  }, [isTracking, checkCurrentLocation, trackingInterval]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    setIsTracking(false);
    geolocationService.stopTracking();

    // Clear interval
    if ((window as any).__venueTrackingInterval) {
      clearInterval((window as any).__venueTrackingInterval);
      delete (window as any).__venueTrackingInterval;
    }

    console.log('Venue detection tracking stopped');
  }, []);

  // Auto-start tracking when shows are available and permission is granted
  useEffect(() => {
    if (enableAutoDetection && shows.length > 0 && permissionStatus === 'granted' && !isTracking) {
      startTracking().catch((err) => {
        console.error('Auto-start tracking failed:', err);
      });
    }
  }, [enableAutoDetection, shows.length, permissionStatus, isTracking, startTracking]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    location,
    nearbyVenues,
    isTracking,
    error,
    permissionStatus,
    startTracking,
    stopTracking,
    checkCurrentLocation,
    requestPermission,
  };
};

export default useVenueDetection;
