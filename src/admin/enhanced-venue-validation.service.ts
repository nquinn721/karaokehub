/**
 * Enhanced Multi-Threaded Venue Validation Service
 * Handles venue data validation with show times using multiple Gemini AI instances
 * for fast, accurate processing of large datasets
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as os from 'os';
import * as path from 'path';
import { Repository } from 'typeorm';
import { Worker } from 'worker_threads';
import { Show } from '../show/show.entity';
import { Venue } from '../venue/venue.entity';

interface EnhancedVenueData {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  lat?: number;
  lng?: number;
  isActive: boolean;
  shows: {
    id: string;
    day: string;
    startTime?: string;
    endTime?: string;
    djId?: string;
  }[];
}

export interface ValidationBatchResult {
  success: boolean;
  results: VenueValidationResult[];
  summary: {
    totalVenues: number;
    validatedCount: number;
    conflictsFound: number;
    updatedCount: number;
    errorsCount: number;
    timeFixesCount: number;
    geoFixesCount: number;
  };
  processingTime: number;
  threadsUsed: number;
}

export interface VenueValidationResult {
  venueId: string;
  venueName: string;
  status: 'validated' | 'conflict' | 'error' | 'skipped' | 'time_fixed' | 'geo_fixed';
  message: string;
  currentData: any;
  suggestedData?: any;
  conflicts?: string[];
  timeIssues?: string[];
  wasUpdated: boolean;
  confidence: number;
}

@Injectable()
export class EnhancedVenueValidationService {
  private readonly maxConcurrentThreads: number;
  private readonly batchSize: number;

  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
    private readonly configService: ConfigService,
  ) {
    // Calculate optimal thread count based on CPU cores and Gemini API limits
    const cpuCores = os.cpus().length;
    this.maxConcurrentThreads = Math.min(cpuCores * 2, 10); // Cap at 10 to respect API limits
    this.batchSize = 50; // Process venues in batches of 50 per thread
  }

  /**
   * Validate all venues using multiple Gemini threads
   */
  async validateAllVenuesEnhanced(): Promise<ValidationBatchResult> {
    const startTime = Date.now();

    try {
      // Get all active venues with their shows
      const venues = await this.venueRepository.find({
        where: { isActive: true },
        relations: ['shows'],
      });

      console.log(
        `🚀 Starting enhanced venue validation for ${venues.length} venues using ${this.maxConcurrentThreads} threads`,
      );

      // Split venues into batches for parallel processing
      const venueBatches = this.splitIntoThreadBatches(venues);

      // Process batches in parallel using worker threads
      const batchPromises = venueBatches.map((batch, index) =>
        this.processVenueBatchWithWorker(batch, index),
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Combine results from all threads
      const combinedResults = this.combineWorkerResults(batchResults);

      // Apply updates to database
      await this.applyValidationUpdates(combinedResults.results, venues);

      const processingTime = Date.now() - startTime;

      return {
        ...combinedResults,
        processingTime,
        threadsUsed: venueBatches.length,
      };
    } catch (error) {
      console.error('❌ Enhanced venue validation failed:', error);
      throw new Error(`Enhanced venue validation failed: ${error.message}`);
    }
  }

  /**
   * Split venues into optimal batches for thread processing
   */
  private splitIntoThreadBatches(venues: Venue[]): EnhancedVenueData[][] {
    const batches: EnhancedVenueData[][] = [];
    const venuesPerBatch = Math.ceil(venues.length / this.maxConcurrentThreads);

    for (let i = 0; i < venues.length; i += venuesPerBatch) {
      const batch = venues.slice(i, i + venuesPerBatch).map((venue) => ({
        id: venue.id,
        name: venue.name,
        address: venue.address,
        city: venue.city,
        state: venue.state,
        zip: venue.zip,
        phone: venue.phone,
        website: venue.website,
        lat: venue.lat,
        lng: venue.lng,
        isActive: venue.isActive,
        shows:
          venue.shows?.map((show) => ({
            id: show.id,
            day: show.day,
            startTime: show.startTime,
            endTime: show.endTime,
            djId: show.djId,
          })) || [],
      }));

      batches.push(batch);
    }

    return batches;
  }

  /**
   * Process a batch of venues using a dedicated worker thread
   */
  private async processVenueBatchWithWorker(
    venueBatch: EnhancedVenueData[],
    threadIndex: number,
  ): Promise<ValidationBatchResult> {
    return new Promise((resolve, reject) => {
      const workerPath = path.resolve(__dirname, 'enhanced-venue-validation-worker.js');
      const worker = new Worker(workerPath);

      // Set up worker timeout (5 minutes per batch)
      const timeout = setTimeout(
        () => {
          worker.terminate();
          reject(new Error(`Worker thread ${threadIndex} timed out after 5 minutes`));
        },
        5 * 60 * 1000,
      );

      worker.on('message', (message) => {
        if (message.type === 'progress') {
          console.log(`🔄 [THREAD-${threadIndex}] ${message.message}`);
        } else if (message.type === 'complete') {
          clearTimeout(timeout);
          resolve(message.data);
        } else if (message.type === 'error') {
          clearTimeout(timeout);
          console.error(`❌ [THREAD-${threadIndex}] Error: ${message.error}`);
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        console.error(`❌ [THREAD-${threadIndex}] Worker error: ${error.message}`);
        reject(error);
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Worker thread ${threadIndex} stopped with exit code ${code}`));
        }
      });

      // Send batch data to worker
      worker.postMessage({
        venues: venueBatch,
        threadIndex,
        geminiApiKey: this.configService.get('GEMINI_API_KEY'),
      });
    });
  }

  /**
   * Combine results from all worker threads
   */
  private combineWorkerResults(
    batchResults: PromiseSettledResult<ValidationBatchResult>[],
  ): ValidationBatchResult {
    const successfulResults = batchResults
      .filter(
        (result): result is PromiseFulfilledResult<ValidationBatchResult> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value);

    const failedCount = batchResults.length - successfulResults.length;

    const combinedResults: VenueValidationResult[] = [];
    let totalVenues = 0;
    let validatedCount = 0;
    let conflictsFound = 0;
    let updatedCount = 0;
    let errorsCount = failedCount;
    let timeFixesCount = 0;
    let geoFixesCount = 0;

    for (const result of successfulResults) {
      combinedResults.push(...result.results);
      totalVenues += result.summary.totalVenues;
      validatedCount += result.summary.validatedCount;
      conflictsFound += result.summary.conflictsFound;
      updatedCount += result.summary.updatedCount;
      errorsCount += result.summary.errorsCount;
      timeFixesCount += result.summary.timeFixesCount || 0;
      geoFixesCount += result.summary.geoFixesCount || 0;
    }

    return {
      success: failedCount === 0,
      results: combinedResults,
      summary: {
        totalVenues,
        validatedCount,
        conflictsFound,
        updatedCount,
        errorsCount,
        timeFixesCount,
        geoFixesCount,
      },
      processingTime: 0, // Will be set by caller
      threadsUsed: successfulResults.length,
    };
  }

  /**
   * Apply validation updates to the database
   */
  private async applyValidationUpdates(
    results: VenueValidationResult[],
    venues: Venue[],
  ): Promise<void> {
    const updatePromises: Promise<void>[] = [];

    for (const result of results) {
      if (!result.wasUpdated || result.status === 'error') {
        continue;
      }

      const updatePromise = this.applyVenueUpdate(result, venues);
      updatePromises.push(updatePromise);
    }

    // Execute all updates in parallel
    await Promise.allSettled(updatePromises);
  }

  /**
   * Apply updates for a single venue
   */
  private async applyVenueUpdate(result: VenueValidationResult, venues: Venue[]): Promise<void> {
    try {
      const venue = venues.find((v) => v.id === result.venueId);
      if (!venue || !result.suggestedData) {
        return;
      }

      let hasChanges = false;

      // Update venue data
      if (!venue.address && result.suggestedData.address) {
        venue.address = result.suggestedData.address;
        hasChanges = true;
      }
      if (!venue.city && result.suggestedData.city) {
        venue.city = result.suggestedData.city;
        hasChanges = true;
      }
      if (!venue.state && result.suggestedData.state) {
        venue.state = result.suggestedData.state;
        hasChanges = true;
      }
      if (!venue.zip && result.suggestedData.zip) {
        venue.zip = result.suggestedData.zip;
        hasChanges = true;
      }
      if (!venue.phone && result.suggestedData.phone) {
        venue.phone = result.suggestedData.phone;
        hasChanges = true;
      }
      if (!venue.website && result.suggestedData.website) {
        venue.website = result.suggestedData.website;
        hasChanges = true;
      }
      if ((!venue.lat || !venue.lng) && result.suggestedData.lat && result.suggestedData.lng) {
        venue.lat = result.suggestedData.lat;
        venue.lng = result.suggestedData.lng;
        hasChanges = true;
      }

      if (hasChanges) {
        await this.venueRepository.save(venue);
      }

      // Update show times if provided
      if (result.suggestedData.showUpdates && result.suggestedData.showUpdates.length > 0) {
        await this.applyShowTimeUpdates(result.suggestedData.showUpdates);
      }
    } catch (error) {
      console.error(`Failed to apply updates for venue ${result.venueId}:`, error);
    }
  }

  /**
   * Apply show time updates
   */
  private async applyShowTimeUpdates(showUpdates: any[]): Promise<void> {
    const updatePromises = showUpdates.map(async (update) => {
      try {
        const show = await this.showRepository.findOne({ where: { id: update.showId } });
        if (show) {
          if (update.startTime) {
            show.startTime = update.startTime;
          }
          if (update.endTime) {
            show.endTime = update.endTime;
          }
          await this.showRepository.save(show);
        }
      } catch (error) {
        console.error(`Failed to update show ${update.showId}:`, error);
      }
    });

    await Promise.allSettled(updatePromises);
  }
}
