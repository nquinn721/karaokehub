import { apiStore } from '../stores/index';

interface GoogleMapsLoaderOptions {
  libraries?: string[];
  callback?: () => void;
}

class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  async load(options: GoogleMapsLoaderOptions = {}): Promise<void> {
    // If already loaded, return immediately
    if (this.isLoaded) {
      return Promise.resolve();
    }

    // If currently loading, return the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Start loading
    this.isLoading = true;
    this.loadPromise = this.loadGoogleMaps(options);

    try {
      await this.loadPromise;
      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to load Google Maps:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private async loadGoogleMaps(options: GoogleMapsLoaderOptions): Promise<void> {
    // Check if Google Maps is already available
    if ((window as any).google && (window as any).google.maps) {
      // Check if Places library is loaded if needed
      if (!options.libraries?.includes('places') || (window as any).google.maps.places) {
        return Promise.resolve();
      }
    }

    // Ensure config is loaded from /config/client
    await apiStore.fetchClientConfig();

    const apiKey = apiStore.googleMapsApiKey;
    if (!apiKey) {
      console.warn('Google Maps API key not available from /config/client');
      throw new Error('Google Maps API key not available from /config/client');
    }

    return new Promise((resolve, reject) => {
      // Create script element
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.defer = true;

      // Build URL with libraries
      const libraries = options.libraries || ['places'];
      const librariesParam = libraries.length > 0 ? `&libraries=${libraries.join(',')}` : '';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}${librariesParam}&callback=initGoogleMaps`;

      // Set up callback
      (window as any).initGoogleMaps = () => {
        console.log('Google Maps loaded successfully with libraries:', libraries);
        if (options.callback) {
          options.callback();
        }
        // Clean up
        delete (window as any).initGoogleMaps;
        resolve();
      };

      // Handle errors
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        delete (window as any).initGoogleMaps;
        reject(new Error('Failed to load Google Maps script'));
      };

      // Add script to document
      document.head.appendChild(script);
    });
  }

  isGoogleMapsLoaded(): boolean {
    return (
      (window as any).google && (window as any).google.maps && (window as any).google.maps.places
    );
  }
}

export const googleMapsLoader = GoogleMapsLoader.getInstance();
