/**
 * Enhanced Venue Geocoding Validation Service
 * Fixes geocoding accuracy issues and validates venue coordinates
 * Provides multiple fallback methods for accurate location data
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeocodingService } from '../geocoding/geocoding.service';
import { Venue } from '../venue/venue.entity';

export interface VenueGeocodingResult {
  venueId: string;
  venueName: string;
  currentAddress: string;
  currentCoordinates: { lat: number; lng: number } | null;
  newCoordinates: { lat: number; lng: number } | null;
  status: 'fixed' | 'verified' | 'failed' | 'no_address';
  confidence: number;
  source: 'google_geocoding' | 'gemini_geocoding' | 'places_api' | 'no_change';
  distanceMoved?: number; // in meters
  message: string;
}

export interface GeocodingValidationSummary {
  totalVenues: number;
  venuesFixed: number;
  venuesVerified: number;
  venuesFailed: number;
  venuesWithoutAddress: number;
  averageConfidence: number;
  processingTime: number;
}

@Injectable()
export class VenueGeocodingValidationService {
  private readonly logger = new Logger(VenueGeocodingValidationService.name);

  constructor(
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
    private geocodingService: GeocodingService,
    private configService: ConfigService,
  ) {}

  /**
   * Validate and fix geocoding for all venues
   */
  async validateAllVenueGeocoordinates(): Promise<{
    success: boolean;
    results: VenueGeocodingResult[];
    summary: GeocodingValidationSummary;
  }> {
    const startTime = Date.now();
    this.logger.log('Starting venue geocoding validation...');

    try {
      // Get all venues with addresses
      const venues = await this.venueRepository.find({
        select: ['id', 'name', 'address', 'city', 'state', 'zip', 'lat', 'lng'],
        where: { isActive: true },
      });

      this.logger.log(`Validating geocoding for ${venues.length} venues...`);

      const results: VenueGeocodingResult[] = [];
      const batchSize = 10;

      // Process in batches to respect API rate limits
      for (let i = 0; i < venues.length; i += batchSize) {
        const batch = venues.slice(i, i + batchSize);
        const batchPromises = batch.map((venue) => this.validateVenueGeocoordinates(venue));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches
        if (i + batchSize < venues.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const summary = this.calculateSummary(results, Date.now() - startTime);

      this.logger.log(
        `Geocoding validation completed. Fixed: ${summary.venuesFixed}, Verified: ${summary.venuesVerified}`,
      );

      return {
        success: true,
        results,
        summary,
      };
    } catch (error) {
      this.logger.error('Geocoding validation failed:', error.stack);
      throw new Error(`Geocoding validation failed: ${error.message}`);
    }
  }

  /**
   * Validate geocoding for a single venue
   */
  private async validateVenueGeocoordinates(venue: any): Promise<VenueGeocodingResult> {
    const fullAddress = this.buildFullAddress(venue);

    if (!fullAddress) {
      return {
        venueId: venue.id,
        venueName: venue.name,
        currentAddress: 'No address available',
        currentCoordinates: venue.lat && venue.lng ? { lat: venue.lat, lng: venue.lng } : null,
        newCoordinates: null,
        status: 'no_address',
        confidence: 0,
        source: 'no_change',
        message: 'No address available for geocoding',
      };
    }

    try {
      // Try multiple geocoding methods for best accuracy
      const geocodingResults = await this.tryMultipleGeocodingMethods(fullAddress);

      if (!geocodingResults || geocodingResults.length === 0) {
        return {
          venueId: venue.id,
          venueName: venue.name,
          currentAddress: fullAddress,
          currentCoordinates: venue.lat && venue.lng ? { lat: venue.lat, lng: venue.lng } : null,
          newCoordinates: null,
          status: 'failed',
          confidence: 0,
          source: 'no_change',
          message: 'All geocoding methods failed',
        };
      }

      // Get the best result (highest confidence)
      const bestResult = geocodingResults[0];
      const newCoordinates = { lat: bestResult.lat, lng: bestResult.lng };
      const currentCoordinates = venue.lat && venue.lng ? { lat: venue.lat, lng: venue.lng } : null;

      // Calculate distance if we have current coordinates
      let distanceMoved = 0;
      let needsUpdate = false;

      if (currentCoordinates) {
        distanceMoved =
          this.geocodingService.calculateDistanceSync(
            currentCoordinates.lat,
            currentCoordinates.lng,
            newCoordinates.lat,
            newCoordinates.lng,
          ) * 1609.34; // Convert miles to meters

        // Consider it a fix if moved more than 100 meters (likely wrong location)
        needsUpdate = distanceMoved > 100;
      } else {
        // No current coordinates, so this is definitely a fix
        needsUpdate = true;
      }

      // Update venue if coordinates changed significantly
      if (needsUpdate) {
        await this.venueRepository.update(venue.id, {
          lat: newCoordinates.lat,
          lng: newCoordinates.lng,
        });
      }

      return {
        venueId: venue.id,
        venueName: venue.name,
        currentAddress: fullAddress,
        currentCoordinates,
        newCoordinates,
        status: needsUpdate ? 'fixed' : 'verified',
        confidence: bestResult.confidence,
        source: bestResult.source,
        distanceMoved,
        message: needsUpdate
          ? `Updated coordinates (moved ${Math.round(distanceMoved)}m)`
          : 'Coordinates verified as accurate',
      };
    } catch (error) {
      this.logger.error(`Geocoding validation failed for ${venue.name}:`, error);
      return {
        venueId: venue.id,
        venueName: venue.name,
        currentAddress: fullAddress,
        currentCoordinates: venue.lat && venue.lng ? { lat: venue.lat, lng: venue.lng } : null,
        newCoordinates: null,
        status: 'failed',
        confidence: 0,
        source: 'no_change',
        message: `Geocoding error: ${error.message}`,
      };
    }
  }

  /**
   * Try multiple geocoding methods and return results sorted by confidence
   */
  private async tryMultipleGeocodingMethods(address: string): Promise<
    Array<{
      lat: number;
      lng: number;
      confidence: number;
      source: 'google_geocoding' | 'gemini_geocoding' | 'places_api';
    }>
  > {
    const results: Array<{
      lat: number;
      lng: number;
      confidence: number;
      source: 'google_geocoding' | 'gemini_geocoding' | 'places_api';
    }> = [];

    // Method 1: Google Geocoding API (most reliable)
    try {
      const googleResult = await this.geocodingService.geocodeAddress(address);
      if (googleResult) {
        results.push({
          lat: googleResult.lat,
          lng: googleResult.lng,
          confidence: 0.95, // High confidence for Google API
          source: 'google_geocoding',
        });
      }
    } catch (error) {
      this.logger.debug(`Google geocoding failed for ${address}: ${error.message}`);
    }

    // Method 2: Gemini AI Geocoding (can handle ambiguous addresses)
    try {
      const geminiResult = await this.geocodingService.geocodeAddressWithGemini(address);
      if (geminiResult) {
        results.push({
          lat: geminiResult.lat,
          lng: geminiResult.lng,
          confidence: 0.85, // Good confidence for Gemini
          source: 'gemini_geocoding',
        });
      }
    } catch (error) {
      this.logger.debug(`Gemini geocoding failed for ${address}: ${error.message}`);
    }

    // Method 3: Google Places API (future enhancement)
    // TODO: Implement Places API for business-specific searches

    // Sort by confidence (highest first)
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Build full address string from venue components
   */
  private buildFullAddress(venue: any): string | null {
    const parts = [];

    if (venue.address) parts.push(venue.address);
    if (venue.city) parts.push(venue.city);
    if (venue.state) parts.push(venue.state);
    if (venue.zip) parts.push(venue.zip);

    return parts.length > 0 ? parts.join(', ') : null;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    results: VenueGeocodingResult[],
    processingTime: number,
  ): GeocodingValidationSummary {
    const totalVenues = results.length;
    const venuesFixed = results.filter((r) => r.status === 'fixed').length;
    const venuesVerified = results.filter((r) => r.status === 'verified').length;
    const venuesFailed = results.filter((r) => r.status === 'failed').length;
    const venuesWithoutAddress = results.filter((r) => r.status === 'no_address').length;

    const confidenceSum = results.reduce((sum, r) => sum + r.confidence, 0);
    const averageConfidence = totalVenues > 0 ? confidenceSum / totalVenues : 0;

    return {
      totalVenues,
      venuesFixed,
      venuesVerified,
      venuesFailed,
      venuesWithoutAddress,
      averageConfidence,
      processingTime,
    };
  }

  /**
   * Fix specific venue by ID
   */
  async fixVenueGeocoordinates(venueId: string): Promise<VenueGeocodingResult> {
    const venue = await this.venueRepository.findOne({
      where: { id: venueId },
      select: ['id', 'name', 'address', 'city', 'state', 'zip', 'lat', 'lng'],
    });

    if (!venue) {
      throw new Error(`Venue not found: ${venueId}`);
    }

    return await this.validateVenueGeocoordinates(venue);
  }
}
