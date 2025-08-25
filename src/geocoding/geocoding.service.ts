import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getGeminiModel } from '../config/gemini.config';

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly googleMapsApiKey: string;
  private readonly genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    this.googleMapsApiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
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

        // Extract city and state from address_components
        const addressComponents = result.address_components || [];
        let city = '';
        let state = '';
        let zip = '';
        let country = '';

        for (const component of addressComponents) {
          const types = component.types;

          if (types.includes('locality')) {
            city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            state = component.short_name; // Use short_name for state abbreviation (e.g., "CA")
          } else if (types.includes('postal_code')) {
            zip = component.long_name;
          } else if (types.includes('country')) {
            country = component.short_name;
          }
        }

        return {
          lat: location.lat,
          lng: location.lng,
          formatted_address: result.formatted_address,
          city: city || undefined,
          state: state || undefined,
          zip: zip || undefined,
          country: country || undefined,
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

  /**
   * Calculate distance between two coordinates in miles using Haversine formula
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Debug: Log coordinates for troubleshooting
    const distance = this.calculateHaversineDistance(lat1, lng1, lat2, lng2);

    // If distance is very small but not zero, log for debugging
    if (distance < 0.1 && distance > 0) {
      console.log('Small distance calculation:', {
        from: { lat: lat1, lng: lng1 },
        to: { lat: lat2, lng: lng2 },
        distance: distance,
        distanceMeters: Math.round(distance * 1609.34),
      });
    }

    return distance;
  }

  /**
   * Calculate distance using Haversine formula (as the crow flies)
   */
  private calculateHaversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
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

  /**
   * Reverse geocode coordinates to address using Google Maps API
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!this.googleMapsApiKey) {
      this.logger.warn('Google Maps API key not configured for reverse geocoding');
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleMapsApiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      } else {
        this.logger.warn(`Reverse geocoding failed with status: ${data.status}`);
        return null;
      }
    } catch (error) {
      this.logger.error('Error during reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Extract city and state from address string using regex patterns
   * Fallback when geocoding is not available
   */
  extractCityStateFromAddress(address: string): { city?: string; state?: string; zip?: string } {
    if (!address || !address.trim()) {
      return {};
    }

    // Common US state abbreviations
    const stateAbbreviations = [
      'AL',
      'AK',
      'AZ',
      'AR',
      'CA',
      'CO',
      'CT',
      'DE',
      'FL',
      'GA',
      'HI',
      'ID',
      'IL',
      'IN',
      'IA',
      'KS',
      'KY',
      'LA',
      'ME',
      'MD',
      'MA',
      'MI',
      'MN',
      'MS',
      'MO',
      'MT',
      'NE',
      'NV',
      'NH',
      'NJ',
      'NM',
      'NY',
      'NC',
      'ND',
      'OH',
      'OK',
      'OR',
      'PA',
      'RI',
      'SC',
      'SD',
      'TN',
      'TX',
      'UT',
      'VT',
      'VA',
      'WA',
      'WV',
      'WI',
      'WY',
    ];

    const statePattern = stateAbbreviations.join('|');

    // Pattern: City, ST ZIP or City, State ZIP
    const cityStateZipRegex = new RegExp(
      `,\\s*([^,]+),\\s*(${statePattern})\\s*(\\d{5})(?:-\\d{4})?$`,
      'i',
    );
    const match = address.match(cityStateZipRegex);

    if (match) {
      return {
        city: match[1].trim(),
        state: match[2].toUpperCase(),
        zip: match[3],
      };
    }

    // Pattern: City, ST (without ZIP)
    const cityStateRegex = new RegExp(`,\\s*([^,]+),\\s*(${statePattern})$`, 'i');
    const cityStateMatch = address.match(cityStateRegex);

    if (cityStateMatch) {
      return {
        city: cityStateMatch[1].trim(),
        state: cityStateMatch[2].toUpperCase(),
      };
    }

    // Try to extract ZIP code alone
    const zipRegex = /\b(\d{5})(?:-\d{4})?\b/;
    const zipMatch = address.match(zipRegex);

    // Try to extract state from end of address
    const stateOnlyRegex = new RegExp(`\\b(${statePattern})\\b`, 'i');
    const stateMatch = address.match(stateOnlyRegex);

    const result: { city?: string; state?: string; zip?: string } = {};

    if (stateMatch) {
      result.state = stateMatch[1].toUpperCase();
    }

    if (zipMatch) {
      result.zip = zipMatch[1];
    }

    return result;
  }

  /**
   * Clean address by removing city, state, and ZIP components
   * Returns just the street address portion
   */
  cleanStreetAddress(fullAddress: string): string {
    if (!fullAddress || !fullAddress.trim()) {
      return '';
    }

    // Remove ZIP codes (5 digits or 5-4 format)
    let cleaned = fullAddress.replace(/\b\d{5}(?:-\d{4})?\b/g, '').trim();

    // Common US state abbreviations
    const stateAbbreviations = [
      'AL',
      'AK',
      'AZ',
      'AR',
      'CA',
      'CO',
      'CT',
      'DE',
      'FL',
      'GA',
      'HI',
      'ID',
      'IL',
      'IN',
      'IA',
      'KS',
      'KY',
      'LA',
      'ME',
      'MD',
      'MA',
      'MI',
      'MN',
      'MS',
      'MO',
      'MT',
      'NE',
      'NV',
      'NH',
      'NJ',
      'NM',
      'NY',
      'NC',
      'ND',
      'OH',
      'OK',
      'OR',
      'PA',
      'RI',
      'SC',
      'SD',
      'TN',
      'TX',
      'UT',
      'VT',
      'VA',
      'WA',
      'WV',
      'WI',
      'WY',
    ];

    const statePattern = stateAbbreviations.join('|');

    // Remove city, state pattern from the end
    const cityStatePattern = new RegExp(`,\\s*[^,]+,\\s*(${statePattern})\\s*$`, 'i');
    cleaned = cleaned.replace(cityStatePattern, '').trim();

    // Remove standalone state abbreviation from the end
    const stateOnlyPattern = new RegExp(`,\\s*(${statePattern})\\s*$`, 'i');
    cleaned = cleaned.replace(stateOnlyPattern, '').trim();

    // Remove trailing commas
    cleaned = cleaned.replace(/,\s*$/, '').trim();

    return cleaned;
  }

  /**
   * Filter items by distance from a user's location
   */
  async filterByDistance<T extends { address: string }>(
    items: T[],
    userLat: number,
    userLng: number,
    radiusMiles: number = 20,
  ): Promise<Array<T & { lat: number; lng: number; distance: number }>> {
    const results: Array<T & { lat: number; lng: number; distance: number }> = [];

    for (const item of items) {
      try {
        const geocodeResult = await this.geocodeAddress(item.address);

        if (!geocodeResult) {
          continue;
        }

        const distance = this.calculateDistance(
          userLat,
          userLng,
          geocodeResult.lat,
          geocodeResult.lng,
        );

        // Only include items within the specified radius
        if (distance <= radiusMiles) {
          results.push({
            ...item,
            lat: geocodeResult.lat,
            lng: geocodeResult.lng,
            distance,
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to process item with address "${item.address}":`, error);
      }
    }

    return results;
  }

  /**
   * Geocode an address using Gemini AI instead of Google Maps API
   * This can provide more accurate results for ambiguous addresses
   */
  async geocodeAddressWithGemini(address: string): Promise<GeocodeResult | null> {
    if (!address || !address.trim()) {
      return null;
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: getGeminiModel('text') });

      const prompt = `Please provide the exact latitude and longitude coordinates for this address: "${address}"

IMPORTANT INSTRUCTIONS:
- Provide coordinates as precise decimal numbers (6+ decimal places)
- If the address is ambiguous, choose the most likely location in the United States
- If it's a business address, find the exact business location
- Return ONLY a JSON object with this exact format:

{
  "lat": <decimal_latitude>,
  "lng": <decimal_longitude>,
  "city": "<city_name>",
  "state": "<state_abbreviation>",
  "zip": "<zip_code>",
  "formatted_address": "<full_formatted_address>"
}

If you cannot determine the location with confidence, return:
{
  "error": "Unable to determine location"
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      // Parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(text);
      } catch (parseError) {
        this.logger.warn(`Failed to parse Gemini geocoding response: ${text}`);
        return null;
      }

      // Check if there was an error
      if (parsedResponse.error) {
        this.logger.warn(`Gemini geocoding error for "${address}": ${parsedResponse.error}`);
        return null;
      }

      // Validate the response has required fields
      if (typeof parsedResponse.lat !== 'number' || typeof parsedResponse.lng !== 'number') {
        this.logger.warn(`Invalid Gemini geocoding response for "${address}": missing lat/lng`);
        return null;
      }

      this.logger.log(
        `Successfully geocoded "${address}" with Gemini: ${parsedResponse.lat}, ${parsedResponse.lng}`,
      );

      return {
        lat: parsedResponse.lat,
        lng: parsedResponse.lng,
        city: parsedResponse.city || '',
        state: parsedResponse.state || '',
        zip: parsedResponse.zip || '',
        formatted_address: parsedResponse.formatted_address || address,
        country: 'US', // Assume US for now
      };
    } catch (error) {
      this.logger.error(`Gemini geocoding failed for "${address}":`, error);
      return null;
    }
  }

  /**
   * Hybrid geocoding: Try Gemini first, fallback to Google Maps API if needed
   */
  async geocodeAddressHybrid(address: string): Promise<GeocodeResult | null> {
    // Try Gemini first
    const geminiResult = await this.geocodeAddressWithGemini(address);
    if (geminiResult) {
      return geminiResult;
    }

    // Fallback to traditional Google Maps API geocoding
    this.logger.warn(`Gemini geocoding failed for "${address}", falling back to Google Maps API`);
    return await this.geocodeAddress(address);
  }
}
