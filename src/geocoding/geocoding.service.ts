import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly googleMapsApiKey: string;

  constructor(private configService: ConfigService) {
    this.googleMapsApiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
  }

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!address || !address.trim()) {
      return null;
    }

    if (!this.googleMapsApiKey) {
      this.logger.warn('Google Maps API key not configured for backend geocoding');
      return null;
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.googleMapsApiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;

        return {
          lat: location.lat,
          lng: location.lng,
          formatted_address: result.formatted_address,
        };
      } else if (data.status === 'ZERO_RESULTS') {
        this.logger.warn(`No geocoding results found for address: ${address}`);
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        this.logger.error('Geocoding API quota exceeded');
      } else if (data.status === 'REQUEST_DENIED') {
        this.logger.error('Geocoding API request denied - check API key permissions');
      } else {
        this.logger.warn(`Geocoding failed with status: ${data.status}`);
      }
    } catch (error) {
      this.logger.error(`Error during geocoding for address "${address}":`, error);
    }

    return null;
  }

  async geocodeMultipleAddresses(addresses: string[]): Promise<(GeocodeResult | null)[]> {
    const results: (GeocodeResult | null)[] = [];

    // Process in batches to respect API rate limits
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_REQUESTS = 100; // ms

    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE);

      for (const address of batch) {
        const result = await this.geocodeAddress(address);
        results.push(result);

        // Add delay between requests
        if (i * BATCH_SIZE + batch.indexOf(address) < addresses.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        }
      }
    }

    return results;
  }
}
