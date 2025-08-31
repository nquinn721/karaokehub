import { apiStore } from '@stores/ApiStore';

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
}

interface GeocodeCache {
  [address: string]: GeocodeResult & { timestamp: number };
}

class GeocodingService {
  private cache: GeocodeCache = {};
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private apiKey: string | null = null;

  constructor() {
    // Load cache from localStorage
    this.loadCache();
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  private loadCache(): void {
    try {
      const cachedData = localStorage.getItem('geocoding_cache');
      if (cachedData) {
        this.cache = JSON.parse(cachedData);
        // Clean up expired entries
        this.cleanupExpiredEntries();
      }
    } catch (error) {
      console.warn('Failed to load geocoding cache:', error);
      this.cache = {};
    }
  }

  private saveCache(): void {
    try {
      localStorage.setItem('geocoding_cache', JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save geocoding cache:', error);
    }
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [address, result] of Object.entries(this.cache)) {
      if (now - result.timestamp > this.CACHE_DURATION) {
        keysToDelete.push(address);
      }
    }

    keysToDelete.forEach((key) => delete this.cache[key]);

    if (keysToDelete.length > 0) {
      this.saveCache();
    }
  }

  private isValidAddress(address: string): boolean {
    return Boolean(address && address.trim().length > 0);
  }

  private getCachedResult(address: string): GeocodeResult | null {
    const normalizedAddress = address.toLowerCase().trim();
    const cached = this.cache[normalizedAddress];

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return {
        lat: cached.lat,
        lng: cached.lng,
        formatted_address: cached.formatted_address,
      };
    }

    return null;
  }

  private cacheResult(address: string, result: GeocodeResult): void {
    const normalizedAddress = address.toLowerCase().trim();
    this.cache[normalizedAddress] = {
      ...result,
      timestamp: Date.now(),
    };
    this.saveCache();
  }

  private getFallbackCoordinates(): GeocodeResult {
    // Default to NYC with small random variation to avoid overlapping markers
    return {
      lat: 40.7128 + (Math.random() - 0.5) * 0.02,
      lng: -74.006 + (Math.random() - 0.5) * 0.02,
      formatted_address: 'New York, NY, USA (fallback)',
    };
  }

  async geocodeAddress(address: string): Promise<GeocodeResult> {
    // Validate input
    if (!this.isValidAddress(address)) {
      console.warn('Invalid address provided to geocoding service');
      return this.getFallbackCoordinates();
    }

    // Check cache first
    const cached = this.getCachedResult(address);
    if (cached) {
      return cached;
    }

    // Check if API key is available
    if (!this.apiKey) {
      console.warn('Google Maps API key not available for geocoding');
      return this.getFallbackCoordinates();
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.apiKey}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;

        const geocodeResult: GeocodeResult = {
          lat: location.lat,
          lng: location.lng,
          formatted_address: result.formatted_address,
        };

        // Cache the result
        this.cacheResult(address, geocodeResult);

        return geocodeResult;
      } else if (data.status === 'ZERO_RESULTS') {
        console.warn(`No results found for address: ${address}`);
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.warn('Geocoding API quota exceeded');
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('Geocoding API request denied - check API key permissions');
      } else {
        console.warn(`Geocoding failed with status: ${data.status}`);
      }
    } catch (error) {
      console.error('Error during geocoding:', error);
    }

    // Return fallback coordinates if geocoding fails
    return this.getFallbackCoordinates();
  }

  async geocodeMultipleAddresses(addresses: string[]): Promise<GeocodeResult[]> {
    const results: GeocodeResult[] = [];

    // Process in batches to avoid overwhelming the API
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 100; // ms

    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((address) => this.geocodeAddress(address));

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect API rate limits
      if (i + BATCH_SIZE < addresses.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    return results;
  }

  clearCache(): void {
    this.cache = {};
    try {
      localStorage.removeItem('geocoding_cache');
    } catch (error) {
      console.warn('Failed to clear geocoding cache:', error);
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    // Check if API key is available
    if (!this.apiKey) {
      console.warn('Google Maps API key not available for reverse geocoding');
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      } else {
        console.warn(`Reverse geocoding failed with status: ${data.status}`);
      }
    } catch (error) {
      console.error('Error during reverse geocoding:', error);
    }

    // Return coordinates if reverse geocoding fails
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  getCacheStats(): { totalEntries: number; cacheSize: string } {
    const totalEntries = Object.keys(this.cache).length;
    const cacheString = JSON.stringify(this.cache);
    const cacheSize = new Blob([cacheString]).size;

    return {
      totalEntries,
      cacheSize: `${(cacheSize / 1024).toFixed(2)} KB`,
    };
  }

  /**
   * Calculate real driving distance using backend API
   */
  async calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): Promise<number | null> {
    try {
      // Use backend API via apiStore to avoid CORS issues with Google Maps
      const endpoint = apiStore.endpoints.location.calculateDistance(lat1, lng1, lat2, lng2);
      const data = await apiStore.get(endpoint);

      if (data.distance && data.distance.meters) {
        const distanceInMeters = data.distance.meters;
        console.debug(`Real distance calculated: ${(distanceInMeters / 1000).toFixed(2)} km`);
        return distanceInMeters;
      } else {
        console.warn('Invalid distance response from backend');
      }
    } catch (error) {
      console.error('Error during backend distance calculation:', error);
    }

    return null;
  }

  /**
   * Calculate distance using Haversine formula (fallback)
   */
  calculateDistanceHaversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}

export const geocodingService = new GeocodingService();
export type { GeocodeResult };
