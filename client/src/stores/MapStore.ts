import { autorun, makeAutoObservable, runInAction } from 'mobx';

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface GeocodedShow {
  id: string;
  lat: number;
  lng: number;
  venue: string;
  address: string;
  distance?: number;
  [key: string]: any; // For other show properties
}

export class MapStore {
  public userLocation: UserLocation | null = null; // Always the user's actual GPS location
  public userCityCenter: UserLocation | null = null; // City center of user's location
  public searchCenter: UserLocation | null = null; // Current search center (can be map center)
  public selectedMarkerId: string | null = null;
  public mapInstance: google.maps.Map | null = null;
  public initialCenter = { lat: 40.7128, lng: -74.006 }; // Default to NYC
  public initialZoom = 5;
  public isInitialized = false;
  public locationError: string | null = null;
  public hasSetInitialBounds = false;
  public geocodedShows: GeocodedShow[] = [];
  public isGeocoding = false;
  public maxDistanceMiles = 35; // 35 mile radius filter to include greater Columbus area
  private _mapCenter: { lat: number; lng: number } | null = null; // Store current map center
  private _mapZoom: number | null = null; // Store current map zoom
  private _preventAutoCenter = false; // Flag to prevent auto-centering when closing InfoWindow
  private _allowAutoFit = true; // Flag to control automatic map fitting to shows

  // Store references to avoid circular dependencies
  private apiStore: any = null;
  private showStore: any = null;
  private geocodeTimeout: number | null = null;
  private geocodeCache: Map<string, { lat: number; lng: number; timestamp: number }> = new Map();
  private mapUpdateTimeout: number | null = null; // For debouncing map updates

  constructor() {
    makeAutoObservable(this);
  }

  // Calculate radius based on current zoom level
  // More zoomed out = larger radius to show more venues
  // More zoomed in = smaller radius for better performance
  getDynamicRadius(): number {
    if (!this._mapZoom) return this.maxDistanceMiles; // Default radius if no zoom info

    // Zoom level ranges:
    // 3-6: Country/state level (100+ miles)
    // 7-9: City level (50-100 miles)
    // 10-12: Metro area (25-50 miles)
    // 13-15: Local area (10-25 miles)
    // 16+: Neighborhood (5-15 miles)

    if (this._mapZoom <= 6) {
      return 150; // Very wide area for country/state view
    } else if (this._mapZoom <= 8) {
      return 100; // Large metro area
    } else if (this._mapZoom <= 10) {
      return 60; // Metro area
    } else if (this._mapZoom <= 12) {
      return 35; // Greater city area (current default)
    } else if (this._mapZoom <= 14) {
      return 20; // Local area
    } else {
      return 10; // Neighborhood level
    }
  }

  // Debounced map position update to prevent render loops
  debouncedUpdateMapPosition = (center: { lat: number; lng: number }, zoom: number): void => {
    // Clear any existing timeout
    if (this.mapUpdateTimeout) {
      clearTimeout(this.mapUpdateTimeout);
    }

    // Set new timeout to update position after a brief delay
    this.mapUpdateTimeout = window.setTimeout(() => {
      this.updateMapPosition(center, zoom);
    }, 200); // Increased to 200ms for more stability
  };

  // Initialize the map store and set up reactive behaviors
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Import stores here to avoid circular dependency
    const { apiStore } = await import('./ApiStore');
    const { showStore } = await import('./ShowStore');

    // Set store references
    this.apiStore = apiStore;
    this.showStore = showStore;

    try {
      // Ensure API config is loaded
      await this.apiStore.initializeConfig();

      // Set up autorun to update map markers when shows change
      autorun(() => {
        if (this.showStore?.shows.length > 0 && this.mapInstance && !this.isGeocoding) {
          // Update map markers when shows change
          this.updateMapMarkers();
        }
      });

      // Get user location to determine initial search center
      this.getUserLocation();

      runInAction(() => {
        this.isInitialized = true;
      });
    } catch (error) {
      console.error('Failed to initialize map store:', error);
    }
  }

  // Update map markers from ShowStore shows (which are already geocoded from server)
  async updateMapMarkers(): Promise<void> {
    if (!this.showStore?.shows || !this.mapInstance) return;

    try {
      // Get all shows for the selected day from ShowStore
      const showsToDisplay = this.showStore.showsForSelectedDay;

      // For now, display all shows even without coordinates
      // TODO: Implement geocoding service to add coordinates to shows
      const validShows = showsToDisplay; // Don't filter by coordinates for now

      // Convert to GeocodedShow format for map display
      const geocodedShows: GeocodedShow[] = validShows.map((show: any) => ({
        ...show,
        distance: 0, // Distance will be calculated if needed
        lat: parseFloat(show.lat) || 0, // Default to 0 if no coordinates
        lng: parseFloat(show.lng) || 0, // Default to 0 if no coordinates
      }));

      runInAction(() => {
        this.geocodedShows = geocodedShows;
        this.isGeocoding = false;
      });

      // Update map markers
      if (this.mapInstance && geocodedShows.length > 0) {
        // Map component will automatically update from geocodedShows observable
      }
    } catch (error) {
      console.error('Error updating map markers:', error);
      runInAction(() => {
        this.isGeocoding = false;
      });
    }
  }

  // Calculate distance between two coordinates in miles
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Get city center from user coordinates using reverse geocoding
  private async getCityCenterFromLocation(lat: number, lng: number): Promise<UserLocation | null> {
    try {
      if (!this.apiStore?.googleMapsApiKey) {
        console.warn('No Google Maps API key available for reverse geocoding');
        return null;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiStore.googleMapsApiKey}`,
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.warn('No geocoding results found');
        return null;
      }

      // Define major metropolitan areas for better city detection
      const majorCities = new Set([
        'Columbus',
        'Cleveland',
        'Cincinnati',
        'Toledo',
        'Akron',
        'Dayton',
      ]);

      // Priority 1: Look for major cities in any of the address components
      for (const result of data.results) {
        if (result.address_components) {
          for (const component of result.address_components) {
            if (component.types.includes('locality') && majorCities.has(component.long_name)) {
              console.log(`Found major city: ${component.long_name}`);
              // Get the city center by geocoding the city name
              return await this.geocodeCityCenter(component.long_name);
            }
          }
        }
      }

      // Priority 2: Check if we're in a metro area by looking at administrative_area_level_2 (county)
      for (const result of data.results) {
        if (result.address_components) {
          const countyComponent = result.address_components.find((component: any) =>
            component.types.includes('administrative_area_level_2'),
          );

          if (countyComponent) {
            // Franklin County = Columbus metro
            if (
              countyComponent.long_name.includes('Franklin') ||
              countyComponent.long_name.includes('Delaware') ||
              countyComponent.long_name.includes('Fairfield') ||
              countyComponent.long_name.includes('Licking')
            ) {
              console.log(`Found Columbus metro county: ${countyComponent.long_name}`);
              return await this.geocodeCityCenter('Columbus, OH');
            }
          }
        }
      }

      // Priority 3: Look for any locality (smaller cities/suburbs)
      for (const result of data.results) {
        const cityComponent = result.address_components?.find(
          (component: any) =>
            component.types.includes('locality') &&
            component.long_name &&
            component.long_name.length > 3,
        );

        if (cityComponent && result.geometry?.location) {
          console.log(`Found locality: ${cityComponent.long_name}`);
          return {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          };
        }
      }

      // Priority 4: Use first result as fallback
      if (data.results[0]?.geometry?.location) {
        console.log('Using first geocoding result as fallback');
        return {
          lat: data.results[0].geometry.location.lat,
          lng: data.results[0].geometry.location.lng,
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting city center from location:', error);
      return null;
    }
  }

  // Helper method to geocode a city name to get its center
  private async geocodeCityCenter(cityName: string): Promise<UserLocation | null> {
    try {
      if (!this.apiStore?.googleMapsApiKey) {
        return null;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityName)}&key=${this.apiStore.googleMapsApiKey}`,
      );

      if (!response.ok) {
        throw new Error('City geocoding request failed');
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results[0]?.geometry?.location) {
        console.log(`Geocoded ${cityName} to:`, data.results[0].geometry.location);
        return {
          lat: data.results[0].geometry.location.lat,
          lng: data.results[0].geometry.location.lng,
        };
      }

      return null;
    } catch (error) {
      console.error(`Error geocoding city ${cityName}:`, error);
      return null;
    }
  }

  // Fit map to show all geocoded shows
  private fitMapToShows(): void {
    if (
      !this.mapInstance ||
      this.geocodedShows.length === 0 ||
      this._preventAutoCenter ||
      !this._allowAutoFit
    ) {
      return;
    }

    const bounds = new google.maps.LatLngBounds();

    // Add all show coordinates to bounds
    this.geocodedShows.forEach((show) => {
      bounds.extend({ lat: show.lat, lng: show.lng });
    });

    // Add user location to bounds if available
    if (this.userLocation) {
      bounds.extend(this.userLocation);
    }

    // Fit map to bounds
    this.mapInstance.fitBounds(bounds);

    // Note: Removed automatic zoom limiting to prevent unwanted zoom changes during user interactions
  }

  // Get user's current location
  private getUserLocation(): void {
    if (!navigator.geolocation) {
      runInAction(() => {
        this.locationError = 'Geolocation is not supported by this browser';
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        runInAction(() => {
          this.userLocation = location;
          this.locationError = null;
          // Initialize search center with user location if not already set
          if (!this.searchCenter) {
            this.searchCenter = location;
          }
        });

        // Get city center for better map initialization
        try {
          const cityCenter = await this.getCityCenterFromLocation(location.lat, location.lng);
          if (cityCenter) {
            runInAction(() => {
              this.userCityCenter = cityCenter;
            });

            // Pan to city center if map is available
            if (this.mapInstance && !this.hasSetInitialBounds) {
              console.log('Panning to city center:', cityCenter);
              this.mapInstance.panTo(cityCenter);
              this.mapInstance.setZoom(9); // City-wide view
              this.hasSetInitialBounds = true;
            }

            // Fetch initial shows based on city center and current day
            if (this.showStore) {
              const currentDay = this.showStore.selectedDay;
              const dynamicRadius = this.getDynamicRadius();
              console.log(
                'Fetching initial shows for city center:',
                cityCenter,
                'day:',
                currentDay,
                'radius:',
                dynamicRadius,
              );

              await this.showStore.fetchShows(currentDay, {
                lat: cityCenter.lat,
                lng: cityCenter.lng,
                radius: dynamicRadius,
              });

              console.log('Initial shows loaded for city center');
            }
          }
        } catch (error) {
          console.warn('Failed to get city center:', error);
        }

        // Only pan to user location if no city center was found
        if (this.mapInstance && !this.hasSetInitialBounds) {
          console.log('Panning to user location (no city center):', location);
          this.mapInstance.panTo(location);
          this.mapInstance.setZoom(10);
          this.hasSetInitialBounds = true;

          // Fetch initial shows based on user location and current day if no city center was available
          if (this.showStore) {
            const currentDay = this.showStore.selectedDay;
            const dynamicRadius = this.getDynamicRadius();
            console.log(
              'Fetching initial shows for user location:',
              location,
              'day:',
              currentDay,
              'radius:',
              dynamicRadius,
            );

            await this.showStore.fetchShows(currentDay, {
              lat: location.lat,
              lng: location.lng,
              radius: dynamicRadius,
            });

            console.log('Initial shows loaded for user location');
          }
        }

        // Re-update map markers with new user location
        this.updateMapMarkers();
      },
      (error) => {
        let errorMessage = 'Error getting user location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        runInAction(() => {
          this.locationError = errorMessage;
        });
        console.warn('Error getting user location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      },
    );
  }

  // Set the map instance
  setMapInstance = (map: google.maps.Map | null): void => {
    if (!this) {
      console.error('MapStore context is undefined');
      return;
    }

    runInAction(() => {
      this.mapInstance = map;
    });

    // Only set initial center if not already done and on first load
    if (map && !this.hasSetInitialBounds) {
      if (this.userCityCenter) {
        console.log('Setting initial map center to city center:', this.userCityCenter);
        map.panTo(this.userCityCenter);
        map.setZoom(9); // City-wide view
        this.hasSetInitialBounds = true;
        // Disable auto-fitting after initial setup to prevent auto-scrolling
        this._allowAutoFit = false;
      } else if (this.userLocation) {
        console.log('Setting initial map center to user location:', this.userLocation);
        map.panTo(this.userLocation);
        map.setZoom(10); // Neighborhood view
        this.hasSetInitialBounds = true;
        // Disable auto-fitting after initial setup to prevent auto-scrolling
        this._allowAutoFit = false;
      }
    }
  };

  // Public method to request location and go to current location
  goToCurrentLocation = async (): Promise<void> => {
    if (this.userLocation && this.mapInstance) {
      // If we already have user location, just pan to it (no zoom change)
      this.mapInstance.panTo(this.userLocation);
      // Refresh map markers for current location
      await this.updateMapMarkers();
      return;
    }

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      runInAction(() => {
        this.locationError = 'Geolocation is not supported by this browser';
      });
      return;
    }

    // Clear any previous errors
    runInAction(() => {
      this.locationError = null;
    });

    // Check current permission state
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });

        if (permission.state === 'denied') {
          runInAction(() => {
            this.locationError =
              'Location access denied. Please enable location permission in your browser settings.';
          });
          return;
        }
      } catch (error) {
        console.warn('Could not check geolocation permission:', error);
      }
    }

    // Request location permission and get current location
    this.requestUserLocation();
  };

  // Public method to explicitly request user location with better permission handling
  requestUserLocation = (): void => {
    if (!navigator.geolocation) {
      runInAction(() => {
        this.locationError = 'Geolocation is not supported by this browser';
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        runInAction(() => {
          this.userLocation = location;
          this.locationError = null;
          // Initialize search center with user location if not already set
          if (!this.searchCenter) {
            this.searchCenter = location;
          }
        });

        // Get city center for better map initialization
        try {
          const cityCenter = await this.getCityCenterFromLocation(location.lat, location.lng);
          if (cityCenter) {
            runInAction(() => {
              this.userCityCenter = cityCenter;
            });

            // Pan to city center when explicitly requested (preserve current zoom)
            if (this.mapInstance) {
              console.log('Panning to city center (user requested):', cityCenter);
              this.mapInstance.panTo(cityCenter);
              // Remove automatic zoom change - preserve user's current zoom level
            }
          } else {
            // Pan to user location if no city center found (preserve current zoom)
            if (this.mapInstance) {
              console.log('Panning to user location (no city center, user requested):', location);
              this.mapInstance.panTo(location);
              // Remove automatic zoom change - preserve user's current zoom level
            }
          }
        } catch (error) {
          console.warn('Failed to get city center:', error);
          // Pan to user location as fallback (preserve current zoom)
          if (this.mapInstance) {
            console.log('Panning to user location (city center failed):', location);
            this.mapInstance.panTo(location);
            // Remove automatic zoom change - preserve user's current zoom level
          }
        }

        // Re-update map markers with new user location
        this.updateMapMarkers();
      },
      (error) => {
        let errorMessage = 'Error getting user location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location access denied. Please click the location icon in your browser's address bar and allow location access, then try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage =
              "Location information is unavailable. Please check your device's location settings.";
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }

        runInAction(() => {
          this.locationError = errorMessage;
        });
        console.warn('Error getting user location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout for permission prompt
        maximumAge: 60000, // 1 minute cache
      },
    );
  };

  // Check if we have location permission and location data
  hasLocationPermission = (): boolean => {
    return this.userLocation !== null && this.locationError === null;
  };

  // Check if location permission was explicitly denied
  isLocationDenied = (): boolean => {
    return (
      this.locationError !== null &&
      (this.locationError.includes('denied') || this.locationError.includes('PERMISSION_DENIED'))
    );
  };

  // Clear location error
  clearLocationError = (): void => {
    runInAction(() => {
      this.locationError = null;
    });
  };

  // Handle marker click without changing zoom
  handleMarkerClick = (show: any): void => {
    if (!this) {
      console.error('MapStore context is undefined in handleMarkerClick');
      return;
    }

    // Temporarily prevent map updates during marker click processing
    this._preventAutoCenter = true;

    runInAction(() => {
      this.selectedMarkerId = show.id;
    });

    // Update selected show in show store (but don't pan/zoom)
    this.showStore?.setSelectedShow(show);

    console.log('Marker clicked, zoom preserved');

    // Re-enable map updates after a short delay
    setTimeout(() => {
      this._preventAutoCenter = false;
    }, 100);
  };

  // Update stored map center and zoom
  updateMapPosition(center: { lat: number; lng: number }, zoom: number): void {
    // Prevent updates during auto-centering or other programmatic moves
    if (this._preventAutoCenter) {
      return;
    }

    // Disable auto-fitting once user starts interacting with the map
    if (this._allowAutoFit) {
      this._allowAutoFit = false;
      console.log('Auto-fitting disabled - user is interacting with map');
    }

    const previousCenter = this._mapCenter;

    runInAction(() => {
      this._mapCenter = center;
      this._mapZoom = zoom;
    });

    // If map center has moved significantly, update the search center for show filtering
    if (previousCenter && this.shouldUpdateSearchCenter(previousCenter, center)) {
      this.updateSearchCenter(center);
    }
  }

  // Check if we should update the search center based on map movement
  private shouldUpdateSearchCenter(
    previousCenter: { lat: number; lng: number },
    newCenter: { lat: number; lng: number },
  ): boolean {
    // Calculate distance moved in miles
    const distance = this.calculateDistance(
      previousCenter.lat,
      previousCenter.lng,
      newCenter.lat,
      newCenter.lng,
    );

    // Update search center if moved more than 5 miles
    return distance > 5;
  }

  // Update the search center and refresh geocoded shows
  private updateSearchCenter(center: { lat: number; lng: number }): void {
    console.log('Map moved significantly, updating search center:', center);

    // Debounce the server API call to prevent excessive requests
    if (this.geocodeTimeout) {
      clearTimeout(this.geocodeTimeout);
    }

    this.geocodeTimeout = window.setTimeout(async () => {
      // Update the search center location
      runInAction(() => {
        this.searchCenter = center;
      });

      // Fetch new shows from server based on map center and current selected day
      if (this.showStore) {
        const currentDay = this.showStore.selectedDay;
        const dynamicRadius = this.getDynamicRadius();
        console.log(
          'Fetching shows for map center:',
          center,
          'day:',
          currentDay,
          'radius:',
          dynamicRadius,
        );

        await this.showStore.fetchShows(currentDay, {
          lat: center.lat,
          lng: center.lng,
          radius: dynamicRadius,
        });

        // The shows are now already filtered by the server and include lat/lng/distance
        // No need for client-side geocoding anymore
        console.log('Shows updated from server for new map center with dynamic radius');
      }
    }, 500); // 500ms debounce for server requests
  }

  // Close info window
  closeInfoWindow = (): void => {
    if (!this) {
      console.error('MapStore context is undefined in closeInfoWindow');
      return;
    }

    // Prevent auto-centering for a short period after closing
    this._preventAutoCenter = true;
    setTimeout(() => {
      this._preventAutoCenter = false;
    }, 2000); // Prevent auto-centering for 2 seconds

    runInAction(() => {
      this.selectedMarkerId = null;
    });

    // Clear selected show - but don't reset map position
    this.showStore?.setSelectedShow(null);

    // Preserve current map position by not calling any map centering methods
    console.log('InfoWindow closed - preserving current map position');
  };

  // Reset map view to show all shows
  resetMapView(): void {
    if (!this.mapInstance || this._preventAutoCenter) {
      return;
    }

    // Use the new geocoded shows system
    if (this.geocodedShows.length > 0) {
      // Temporarily re-enable auto-fitting for explicit reset action
      const wasAutoFitAllowed = this._allowAutoFit;
      this._allowAutoFit = true;
      this.fitMapToShows();
      // Restore previous state to prevent future auto-fitting
      this._allowAutoFit = wasAutoFitAllowed;
    } else if (this.userLocation) {
      this.mapInstance.setCenter(this.userLocation);
      this.mapInstance.setZoom(12);
    }
  }

  // Pan to specific show
  panToShow(show: any): void {
    if (!this.mapInstance) return;

    // Find the geocoded show
    const geocodedShow = this.geocodedShows.find((s) => s.id === show.id);
    if (!geocodedShow) {
      console.warn('Show not found in geocoded shows');
      return;
    }

    const location = {
      lat: geocodedShow.lat,
      lng: geocodedShow.lng,
    };

    this.mapInstance.panTo(location);
    this.mapInstance.setZoom(16);

    // Select the show marker
    this.handleMarkerClick(geocodedShow);
  }

  // Get Google Maps API key
  get apiKey(): string | undefined {
    return this.apiStore?.googleMapsApiKey;
  }

  // Check if config is loaded
  get isConfigLoaded(): boolean {
    return this.apiStore?.configLoaded || false;
  }

  // Get current center for map (stable - doesn't automatically follow user location)
  get currentCenter(): { lat: number; lng: number } {
    // Return stored map center if available, otherwise use initial center
    return this._mapCenter || this.initialCenter;
  }

  // Get center for map initialization (uses city center of user location if available)
  get mapInitialCenter(): { lat: number; lng: number } {
    return this.userCityCenter || this.userLocation || this.initialCenter;
  }

  // Get current zoom level (stable - doesn't automatically change)
  get currentZoom(): number {
    return this._mapZoom || (this.userLocation ? 9 : this.initialZoom);
  }

  // Get zoom for map initialization
  get mapInitialZoom(): number {
    return this.userCityCenter ? 10.5 : this.userLocation ? 11 : this.initialZoom; // 10.5 for city center (good metro view), 11 for exact location
  }

  // Check if a specific marker is selected
  isMarkerSelected(showId: string): boolean {
    return this.selectedMarkerId === showId;
  }

  // Cleanup method for when component unmounts
  cleanup(): void {
    // Clear any pending timeouts
    if (this.geocodeTimeout) {
      clearTimeout(this.geocodeTimeout);
      this.geocodeTimeout = null;
    }

    // Clear geocoding cache
    this.geocodeCache.clear();

    runInAction(() => {
      this.mapInstance = null;
      this.selectedMarkerId = null;
      this.isInitialized = false;
      this.hasSetInitialBounds = false; // Reset bounds flag
    });
  }
}

// Create and export singleton instance
export const mapStore = new MapStore();
export default mapStore;
