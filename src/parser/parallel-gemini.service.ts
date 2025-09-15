/**
 * Parallel Gemini Image Analysis Service
 * Processes multiple images concurrently using worker threads
 */

import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { getGeminiModel } from '../config/gemini.config';
import { ParsedKaraokeData } from './karaoke-parser.service';

interface ImageAnalysisJob {
  imageBase64: string;
  imageIndex: number;
  prompt: string;
  description?: string;
  venue?: string;
  url?: string;
}

interface ImageAnalysisResult {
  success: boolean;
  imageIndex: number;
  data?: any;
  error?: string;
  processingTime: number;
}

interface ParallelAnalysisResult {
  success: boolean;
  results: ImageAnalysisResult[];
  combinedData: ParsedKaraokeData;
  totalProcessingTime: number;
  stats: {
    successfulImages: number;
    failedImages: number;
    averageProcessingTime: number;
    parallelizationBenefit: string;
  };
}

@Injectable()
export class ParallelGeminiService {
  private readonly logger = new Logger(ParallelGeminiService.name);

  /**
   * Analyze multiple images in parallel using worker threads
   */
  async analyzeImagesInParallel(
    screenshots: string[],
    url: string,
    description?: string,
    maxConcurrentWorkers: number = 3, // Limit concurrent workers to avoid rate limits
  ): Promise<ParallelAnalysisResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`🚀 Starting parallel analysis of ${screenshots.length} images with max ${maxConcurrentWorkers} workers`);

      // Prepare the base prompt for image analysis
      const basePrompt = this.generateImageAnalysisPrompt(url, description);

      // Create analysis jobs
      const jobs: ImageAnalysisJob[] = screenshots.map((screenshot, index) => ({
        imageBase64: screenshot,
        imageIndex: index,
        prompt: basePrompt,
        description,
        venue: url,
        url,
      }));

      // Process jobs in parallel with concurrency limit
      const results = await this.processJobsInParallel(jobs, maxConcurrentWorkers);

      // Combine results from all successful analyses
      const combinedData = this.combineAnalysisResults(results);

      const totalProcessingTime = Date.now() - startTime;
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);

      // Calculate parallelization benefit (estimated)
      const avgProcessingTime = successfulResults.length > 0 
        ? successfulResults.reduce((sum, r) => sum + r.processingTime, 0) / successfulResults.length 
        : 0;
      const estimatedSequentialTime = avgProcessingTime * screenshots.length;
      const timeSaved = estimatedSequentialTime - totalProcessingTime;
      const speedupFactor = estimatedSequentialTime > 0 ? (estimatedSequentialTime / totalProcessingTime).toFixed(2) : '1.00';

      this.logger.log(`✅ Parallel analysis completed in ${totalProcessingTime}ms`);
      this.logger.log(`📊 Results: ${successfulResults.length} successful, ${failedResults.length} failed`);
      this.logger.log(`⚡ Speedup: ${speedupFactor}x faster (saved ~${timeSaved}ms)`);

      return {
        success: successfulResults.length > 0,
        results,
        combinedData,
        totalProcessingTime,
        stats: {
          successfulImages: successfulResults.length,
          failedImages: failedResults.length,
          averageProcessingTime: Math.round(avgProcessingTime),
          parallelizationBenefit: `${speedupFactor}x speedup, saved ~${Math.round(timeSaved)}ms`,
        },
      };

    } catch (error) {
      this.logger.error(`❌ Parallel analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Process jobs in parallel with concurrency limit
   */
  private async processJobsInParallel(
    jobs: ImageAnalysisJob[],
    maxConcurrentWorkers: number,
  ): Promise<ImageAnalysisResult[]> {
    const results: ImageAnalysisResult[] = [];
    const activeWorkers = new Set<Worker>();

    // Process jobs in batches to limit concurrency
    for (let i = 0; i < jobs.length; i += maxConcurrentWorkers) {
      const batch = jobs.slice(i, i + maxConcurrentWorkers);
      const batchPromises = batch.map(job => this.analyzeImageWithWorker(job, activeWorkers));
      
      this.logger.log(`🔄 Processing batch ${Math.floor(i / maxConcurrentWorkers) + 1}: images ${i + 1}-${Math.min(i + maxConcurrentWorkers, jobs.length)}`);
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((result, batchIndex) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Handle rejected promises
          const jobIndex = i + batchIndex;
          results.push({
            success: false,
            imageIndex: jobIndex,
            error: result.reason?.message || 'Worker promise rejected',
            processingTime: 0,
          });
        }
      });
    }

    // Cleanup any remaining workers
    activeWorkers.forEach(worker => {
      try {
        worker.terminate();
      } catch (error) {
        this.logger.warn(`Warning: Failed to terminate worker:`, error);
      }
    });

    return results.sort((a, b) => a.imageIndex - b.imageIndex); // Ensure original order
  }

  /**
   * Analyze a single image using a worker thread
   */
  private async analyzeImageWithWorker(
    job: ImageAnalysisJob,
    activeWorkers: Set<Worker>,
  ): Promise<ImageAnalysisResult> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'gemini-image-worker.js');
      
      const worker = new Worker(workerPath, {
        workerData: {
          imageBase64: job.imageBase64,
          imageIndex: job.imageIndex,
          prompt: job.prompt,
          geminiApiKey: process.env.GEMINI_API_KEY,
          model: getGeminiModel('vision'),
          description: job.description,
          venue: job.venue,
          url: job.url,
        },
      });

      activeWorkers.add(worker);

      // Set timeout for worker (30 seconds per image)
      const timeout = setTimeout(() => {
        worker.terminate();
        activeWorkers.delete(worker);
        resolve({
          success: false,
          imageIndex: job.imageIndex,
          error: 'Worker timeout (30s)',
          processingTime: 30000,
        });
      }, 30000);

      worker.on('message', (result: ImageAnalysisResult) => {
        clearTimeout(timeout);
        activeWorkers.delete(worker);
        worker.terminate();
        resolve(result);
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        activeWorkers.delete(worker);
        this.logger.error(`Worker error for image ${job.imageIndex}:`, error);
        resolve({
          success: false,
          imageIndex: job.imageIndex,
          error: error.message,
          processingTime: 0,
        });
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        activeWorkers.delete(worker);
        if (code !== 0) {
          this.logger.warn(`Worker exited with code ${code} for image ${job.imageIndex}`);
        }
      });
    });
  }

  /**
   * Generate the base prompt for image analysis
   */
  private generateImageAnalysisPrompt(url: string, description?: string): string {
    return `Analyze this karaoke show screenshot and extract ALL karaoke shows with complete venue addresses and show times.

🎯 CRITICAL FOCUS: Extract ALL venues, COMPLETE addresses, and EXACT show times from this image.

CRITICAL RESPONSE REQUIREMENTS:
- Return ONLY valid JSON, no other text
- Extract EVERY venue mentioned in this screenshot
- Get COMPLETE addresses with street, city, state
- Extract EXACT show times (not approximations)
- Look at ALL text in the image including captions, overlays, and descriptions

🚫 DUPLICATE PREVENTION WITHIN THIS IMAGE:
- ONLY extract UNIQUE shows within this single image
- If the same venue appears multiple times in this image with the same day/time, only include it ONCE
- Different days at the same venue = separate shows (e.g., "Bar Monday" vs "Bar Saturday")  
- Different times at the same venue = separate shows (e.g., "Bar 7:00 PM" vs "Bar 10:00 PM")
- Same venue, same day, same time = DUPLICATE, include only once

Source: ${url}
${description ? `Description: ${description}` : ''}

🏢 VENUE & ADDRESS EXTRACTION - CRITICAL:
- Look for complete address patterns like "1234 Main St, Columbus, OH" 
- Extract phone numbers that appear near venue names
- Look for venue websites or social media handles
- Extract any pricing information mentioned
- Look for special event details or themes

📅 TIME & DATE EXTRACTION:
- Extract specific dates if mentioned
- Extract day of the week (Monday, Tuesday, etc.)
- Extract exact times (7:00 PM, 8:30 PM, etc.)
- Look for recurring schedule patterns

🎤 DJ & HOST EXTRACTION:
- Extract DJ names and host information
- Look for social media handles for DJs
- Extract any special DJ or host details

Expected JSON format:
{
  "vendors": [
    {
      "name": "Venue Name",
      "website": "https://...",
      "description": "Brief venue description",
      "confidence": 0.95
    }
  ],
  "djs": [
    {
      "name": "DJ Name",
      "confidence": 0.90,
      "context": "Host details",
      "aliases": ["Nickname1", "Nickname2"],
      "socialHandles": ["@handle1", "@handle2"]
    }
  ],
  "shows": [
    {
      "venue": "Complete Venue Name",
      "time": "7:00 PM",
      "djName": "DJ Name",
      "description": "Show details",
      "address": "1234 Main St, City, State 12345",
      "city": "City",
      "state": "State",
      "zip": "12345",
      "venuePhone": "(555) 123-4567",
      "venueWebsite": "https://...",
      "source": "${url}",
      "confidence": 0.85
    }
  ]
}`;
  }

  /**
   * Combine results from multiple image analyses with deduplication
   */
  private combineAnalysisResults(results: ImageAnalysisResult[]): ParsedKaraokeData {
    const successfulResults = results.filter(r => r.success && r.data);
    
    if (successfulResults.length === 0) {
      return {
        vendors: [],
        djs: [],
        shows: [],
      };
    }

    const allVendors: any[] = [];
    const allDJs: any[] = [];
    const allShows: any[] = [];

    // Combine all data from successful analyses
    successfulResults.forEach(result => {
      const data = result.data;
      if (data.vendors) allVendors.push(...data.vendors);
      if (data.djs) allDJs.push(...data.djs);
      if (data.shows) allShows.push(...data.shows);
    });

    // Deduplicate combined results
    const deduplicatedVendors = this.deduplicateVendors(allVendors);
    const deduplicatedDJs = this.deduplicateDJs(allDJs);
    const deduplicatedShows = this.deduplicateShows(allShows);

    this.logger.log(`📊 Combined results: ${deduplicatedShows.length} shows, ${deduplicatedDJs.length} DJs, ${deduplicatedVendors.length} vendors`);
    this.logger.log(`🔄 Deduplication: ${allShows.length} → ${deduplicatedShows.length} shows, ${allDJs.length} → ${deduplicatedDJs.length} DJs, ${allVendors.length} → ${deduplicatedVendors.length} vendors`);

    return {
      vendors: deduplicatedVendors,
      djs: deduplicatedDJs,
      shows: deduplicatedShows,
    };
  }

  /**
   * Deduplicate vendors by name and website
   */
  private deduplicateVendors(vendors: any[]): any[] {
    const seen = new Set<string>();
    return vendors.filter(vendor => {
      const key = `${vendor.name?.toLowerCase() || ''}-${vendor.website?.toLowerCase() || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Deduplicate DJs by name
   */
  private deduplicateDJs(djs: any[]): any[] {
    const seen = new Set<string>();
    return djs.filter(dj => {
      const key = dj.name?.toLowerCase() || '';
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Deduplicate shows by venue, time, and date
   */
  private deduplicateShows(shows: any[]): any[] {
    const seen = new Set<string>();
    return shows.filter(show => {
      const key = `${show.venue?.toLowerCase() || ''}-${show.time?.toLowerCase() || ''}-${show.date?.toLowerCase() || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
