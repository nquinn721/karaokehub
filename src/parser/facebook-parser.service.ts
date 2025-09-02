/**
 * Facebook Parser Service
 * Main orchestrator for Facebook group parsing
 * Architecture:
 * 1. Load Puppeteer into worker to get URLs and pageName
 * 2. Create largeScaleUrls for each image
 * 3. Parallel image loading with max workers
 * 4. Parse images for show details
 * 5. Data validation - Fill missing address data with Gemini
 * 6. Save data to parsed_schedule
 * 7. Save pageName to urls_to_parse if needed
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { Worker } from 'worker_threads';
import { CancellationService } from '../services/cancellation.service';
import { KaraokeWebSocketGateway } from '../websocket/websocket.gateway';
import { ParsedSchedule, ParseStatus } from './parsed-schedule.entity';
import { UrlToParse } from './url-to-parse.entity';
import { UrlToParseService } from './url-to-parse.service';

interface ParsedImageData {
  vendor?: string;
  dj?: string;
  show?: {
    venue: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    day?: string;
    time?: string;
    startTime?: string;
    endTime?: string;
    venuePhone?: string;
    venueWebsite?: string;
  };
  source: string;
  success: boolean;
  error?: string;
}

interface ParsedFacebookData {
  shows: string[];
  djs: { name: string; confidence: number }[];
  vendors: { name: string; confidence: number }[];
  venues: any[];
}

@Injectable()
export class FacebookParserService {
  private currentParsingLogs: string[] = [];
  private maxWorkers = require('os').cpus().length; // Use all available CPU cores for maximum parallel processing

  constructor(
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
    @InjectRepository(UrlToParse)
    private urlToParseRepository: Repository<UrlToParse>,
    private webSocketGateway: KaraokeWebSocketGateway,
    private urlToParseService: UrlToParseService,
    private cancellationService: CancellationService,
  ) {
    this.logAndBroadcast(
      `🚀 [INIT] Configured for ${this.maxWorkers} parallel enhanced image parsing workers`,
    );

    // Listen for global cancellation events
    this.cancellationService.on('cancel-all', () => {
      this.logAndBroadcast('🛑 [CANCEL] Received global cancellation signal');
    });
  }

  /**
   * COMPATIBILITY METHODS - For existing codebase integration
   */

  async initializeBrowser(): Promise<void> {
    // Browser initialization is now handled by workers
    this.logAndBroadcast('🔄 [COMPAT] Browser initialization handled by workers');
  }

  getLoginStatus(): boolean {
    // Login status is now checked by workers
    return true; // Assume logged in, worker will handle login flow
  }

  hasSavedSession(): boolean {
    // Session checking is now handled by workers
    const fs = require('fs');
    const path = require('path');
    const cookiesPath = path.join(process.cwd(), 'data', 'facebook-cookies.json');
    return fs.existsSync(cookiesPath);
  }

  async loginWithCredentials(email: string, password: string): Promise<boolean> {
    // Login is now handled by workers with interactive flow
    this.logAndBroadcast('🔄 [COMPAT] Login handled by worker interactive flow');
    return true;
  }

  async saveCurrentSession(): Promise<void> {
    // Session saving is now handled by workers
    this.logAndBroadcast('🔄 [COMPAT] Session saving handled by workers');
  }

  async clearSession(): Promise<void> {
    // Clear saved cookies
    const fs = require('fs');
    const path = require('path');
    const cookiesPath = path.join(process.cwd(), 'data', 'facebook-cookies.json');

    try {
      if (fs.existsSync(cookiesPath)) {
        fs.unlinkSync(cookiesPath);
        this.logAndBroadcast('✅ [COMPAT] Facebook session cleared');
      }
    } catch (error) {
      this.logAndBroadcast(`❌ [COMPAT] Failed to clear session: ${error.message}`);
    }
  }

  async loginToFacebook(): Promise<boolean> {
    // Login is now handled by workers
    this.logAndBroadcast('🔄 [COMPAT] Facebook login handled by workers');
    return true;
  }

  async parseFacebookPage(url: string): Promise<any> {
    // Redirect to new method
    return this.parseAndSaveFacebookPageNew(url);
  }

  /**
   * Main entry point - parse and save Facebook page
   * Follows architecture: 1 Puppeteer instance, parallel image workers, single DB save
   */
  async parseAndSaveFacebookPageNew(url: string): Promise<{
    parsedScheduleId: string;
    data: ParsedFacebookData;
    stats: any;
  }> {
    this.currentParsingLogs = [];
    const startTime = Date.now();
    let data: ParsedImageData[] = [];
    let urls: string[] = [];
    let pageName = '';

    // Register this parsing operation for cancellation
    const parsingTaskId = `parsing-${Date.now()}`;
    this.cancellationService.registerTask({
      id: parsingTaskId,
      type: 'parsing',
      resource: null,
      description: `Facebook parsing: ${url}`,
      startTime: new Date(),
    });

    this.logAndBroadcast(`🚀 [START] Facebook parsing for: ${url}`);
    this.logAndBroadcast(`📊 [INIT] Starting at ${new Date().toISOString()}`);

    try {
      // Check for cancellation before starting
      this.cancellationService.throwIfCancelled('parsing start');

      // ========================================
      // STEP 1: PUPPETEER WORKER - Get URLs and pageName
      // ========================================
      this.logAndBroadcast('🔄 [WORKER] Starting Facebook group parser worker...');
      const extractionStartTime = Date.now();

      const { imageUrls, pageName: workerPageName } =
        await this.extractUrlsAndPageNameWithWorker(url);
      urls = imageUrls;
      pageName = workerPageName;

      const extractionTime = Date.now() - extractionStartTime;
      this.logAndBroadcast(`📸 [EXTRACTION] Completed in ${extractionTime}ms`);
      this.logAndBroadcast(`🔗 [URLS] Found ${urls.length} image URLs`);
      this.logAndBroadcast(`🏷️ [PAGE] Group name: "${pageName}"`);

      if (urls.length === 0) {
        this.logAndBroadcast(`⚠️ [WARNING] No image URLs found!`);
        throw new Error('No images found to process');
      }

      // ========================================
      // STEP 2: ENHANCED PHOTO PARSING - HIGH RESOLUTION EXTRACTION
      // ========================================

      // All URLs from group parser are now Facebook photo URLs (/photo/)
      this.logAndBroadcast(
        `🚀 [ENHANCED-PARSING] Processing ${urls.length} photo URLs with high-resolution extraction`,
      );
      this.logAndBroadcast(
        `📊 [ENHANCED-PARSING] Using Gemini-guided navigation to extract high-res images`,
      );

      const enhancedParsingStartTime = Date.now();

      // Use enhanced parsing that extracts high-res images from photo pages
      data = await this.parsePhotoUrlsWithEnhancedWorkers(urls);

      const enhancedParsingTime = Date.now() - enhancedParsingStartTime;
      this.logAndBroadcast(`✅ [ENHANCED-PARSING] Completed in ${enhancedParsingTime}ms`);
      this.logAndBroadcast(
        `📊 [RESULTS] Found ${data.length} valid results from ${urls.length} photo URLs`,
      );

      // ========================================
      // STEP 4: DATA VALIDATION - Fill missing address data
      // ========================================
      // SKIPPING VALIDATION FOR NOW - using parsed data directly
      this.logAndBroadcast(
        '⏭️ [VALIDATION] Skipping final data validation - using enhanced parser data directly',
      );
      // data = await this.validateDataWithWorker(data);

      // const validationTime = Date.now() - validationStartTime;
      // this.logAndBroadcast(`✅ [VALIDATION] Completed in ${validationTime}ms`);
      // this.logAndBroadcast(`📍 [VALIDATION] Enhanced shows with missing location data`);

      // ========================================
      // STEP 5: SAVE DATA TO DATABASE
      // ========================================
      this.logAndBroadcast('💾 [DATABASE] Starting batch save operation...');
      const dbStartTime = Date.now();

      const savedSchedule = await this.saveBatchDataToDatabase(data, url, pageName);

      const dbTime = Date.now() - dbStartTime;
      this.logAndBroadcast(`✅ [DATABASE] Save completed in ${dbTime}ms`);
      this.logAndBroadcast(`🆔 [DATABASE] Generated schedule ID: ${savedSchedule.id}`);

      // ========================================
      // STEP 6: UPDATE PAGE NAME IF NEEDED
      // ========================================
      await this.updatePageNameIfNeeded(url, pageName);

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Final summary
      this.logAndBroadcast(`🎉 [COMPLETE] Facebook parsing complete in ${duration.toFixed(2)}s`);
      this.logAndBroadcast(`📋 [SUMMARY] Results:`);
      this.logAndBroadcast(`   • Group: "${pageName}"`);
      this.logAndBroadcast(`   • Images: ${urls.length}`);
      this.logAndBroadcast(`   • Valid Results: ${data.length}`);
      this.logAndBroadcast(`   • Shows: ${data.filter((d) => d.show).length}`);
      this.logAndBroadcast(`   • DJs: ${data.filter((d) => d.dj).length}`);
      this.logAndBroadcast(`   • Vendors: ${data.filter((d) => d.vendor).length}`);
      this.logAndBroadcast(`   • Schedule ID: ${savedSchedule.id}`);

      // Mark URL as parsed
      try {
        const urlToParse = await this.urlToParseRepository.findOne({
          where: { url: url },
        });
        if (urlToParse) {
          await this.urlToParseService.markAsParsed(urlToParse.id);
          this.logAndBroadcast(`✅ [COMPLETE] URL marked as parsed`);
        }
      } catch (error) {
        this.logAndBroadcast(`⚠️ [WARNING] Failed to mark URL as parsed: ${error.message}`);
      }

      return {
        parsedScheduleId: savedSchedule.id,
        data: {
          shows: data.filter((d) => d.show && d.show.venue).map((d) => d.show.venue),
          djs: data.filter((d) => d.dj).map((d) => ({ name: d.dj, confidence: 0.8 })),
          vendors: data.filter((d) => d.vendor).map((d) => ({ name: d.vendor, confidence: 0.8 })),
          venues: [],
        },
        stats: {
          shows: data.filter((d) => d.show).length,
          djs: data.filter((d) => d.dj).length,
          vendors: data.filter((d) => d.vendor).length,
          processingTime: duration,
          imageCount: urls.length,
        },
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      this.logAndBroadcast(`❌ [ERROR] Parsing failed after ${duration.toFixed(2)}s`);
      this.logAndBroadcast(`🔍 [ERROR] ${error.message}`);

      throw error;
    }
  }

  /**
   * Extract URLs and pageName using Worker thread (Puppeteer)
   */
  private async extractUrlsAndPageNameWithWorker(url: string): Promise<{
    imageUrls: string[];
    pageName: string;
  }> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'facebookParser', 'facebook-group-parser.js');
      const worker = new Worker(workerPath);

      // Register worker for cancellation
      const workerId = `fb-worker-${Date.now()}`;
      this.cancellationService.registerTask({
        id: workerId,
        type: 'worker',
        resource: worker,
        description: `Facebook group parser worker: ${url}`,
        startTime: new Date(),
      });

      worker.on('message', async (message) => {
        if (message.type === 'progress') {
          this.logAndBroadcast(`🔄 [WORKER] ${message.message}`);
        } else if (message.type === 'loginRequired') {
          // Worker is requesting Facebook login credentials
          try {
            this.logAndBroadcast('🔑 [LOGIN] Facebook login required, requesting credentials...');
            const requestId = `fb-${Date.now()}`;
            const credentials = await this.webSocketGateway.requestFacebookCredentials(requestId);

            if (credentials) {
              this.logAndBroadcast('🔑 [LOGIN] Credentials received, sending to worker...');
              worker.postMessage({
                type: 'credentials',
                email: credentials.email,
                password: credentials.password,
                requestId: requestId,
              });
            } else {
              this.logAndBroadcast('❌ [LOGIN] No credentials received, login timeout');
              this.cancellationService.unregisterTask(workerId);
              reject(new Error('Facebook login credentials timeout'));
            }
          } catch (error) {
            this.logAndBroadcast(`❌ [LOGIN] Error requesting credentials: ${error.message}`);
            this.cancellationService.unregisterTask(workerId);
            reject(new Error(`Facebook login failed: ${error.message}`));
          }
        } else if (message.type === 'complete') {
          this.cancellationService.unregisterTask(workerId);
          if (message.data.success) {
            resolve({
              imageUrls: message.data.imageUrls,
              pageName: message.data.pageName || 'Unknown Group',
            });
          } else {
            reject(new Error(message.data.error || 'Worker failed'));
          }
        } else if (message.type === 'error') {
          this.cancellationService.unregisterTask(workerId);
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        this.cancellationService.unregisterTask(workerId);
        reject(error);
      });

      worker.on('exit', (code) => {
        this.cancellationService.unregisterTask(workerId);
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      // Send work data to worker
      worker.postMessage({
        url,
        tempDir: path.join(process.cwd(), 'temp'),
        cookiesFilePath: path.join(process.cwd(), 'data', 'facebook-cookies.json'),
        geminiApiKey: process.env.GEMINI_API_KEY || '',
      });
    });
  }

  /**
   * Parse Facebook photo URLs using enhanced workers with high-resolution extraction
   */
  private async parsePhotoUrlsWithEnhancedWorkers(photoUrls: string[]): Promise<ParsedImageData[]> {
    this.logAndBroadcast(
      `🚀 [ENHANCED-PARSING] Starting enhanced photo URL parsing for ${photoUrls.length} photos...`,
    );
    this.logAndBroadcast(
      `⚡ [ENHANCED-PARSING] Spawning ${Math.min(this.maxWorkers, photoUrls.length)} workers for maximum parallel processing`,
    );

    return new Promise((resolve) => {
      const results: (ParsedImageData | null)[] = new Array(photoUrls.length).fill(null);
      let completedCount = 0;
      const totalImages = photoUrls.length;
      const maxConcurrentWorkers = Math.min(this.maxWorkers, photoUrls.length);

      // Create all workers immediately for maximum parallelism
      const workers: Promise<void>[] = [];

      for (let i = 0; i < maxConcurrentWorkers; i++) {
        const workerPromise = this.processPhotosWithWorker(
          photoUrls,
          results,
          i + 1,
          maxConcurrentWorkers,
          (completed) => {
            completedCount += completed;
            this.logAndBroadcast(
              `📊 [ENHANCED-PARSING] Progress: ${completedCount}/${totalImages} completed`,
            );

            if (completedCount === totalImages) {
              const validResults = results.filter((r) => r && r.success);
              this.logAndBroadcast(
                `🎉 [ENHANCED-PARSING] All photos processed: ${validResults.length}/${totalImages} successful`,
              );
              resolve(validResults);
            }
          },
        );
        workers.push(workerPromise);
      }

      // Log worker distribution
      const photosPerWorker = Math.ceil(photoUrls.length / maxConcurrentWorkers);
      this.logAndBroadcast(
        `📈 [ENHANCED-PARSING] Worker distribution: ~${photosPerWorker} photos per worker`,
      );
    });
  }

  /**
   * Process a subset of photos with a single worker
   */
  private async processPhotosWithWorker(
    allPhotoUrls: string[],
    results: (ParsedImageData | null)[],
    workerId: number,
    totalWorkers: number,
    onProgress: (completed: number) => void,
  ): Promise<void> {
    // Distribute photos evenly across workers
    const photosPerWorker = Math.ceil(allPhotoUrls.length / totalWorkers);
    const startIndex = (workerId - 1) * photosPerWorker;
    const endIndex = Math.min(startIndex + photosPerWorker, allPhotoUrls.length);
    const workerPhotoUrls = allPhotoUrls.slice(startIndex, endIndex);

    this.logAndBroadcast(
      `🔄 [ENHANCED-PARSING] Worker ${workerId}: Processing photos ${startIndex + 1}-${endIndex} (${workerPhotoUrls.length} total)`,
    );

    let workerCompletedCount = 0;

    for (let i = 0; i < workerPhotoUrls.length; i++) {
      const photoUrl = workerPhotoUrls[i];
      const globalIndex = startIndex + i;

      try {
        const result = await this.parsePhotoUrlWithEnhancedWorker(photoUrl, workerId);
        results[globalIndex] = result;
        workerCompletedCount++;

        this.logAndBroadcast(
          `✅ [ENHANCED-PARSING] Worker ${workerId}: Completed photo ${i + 1}/${workerPhotoUrls.length}`,
        );
      } catch (error) {
        this.logAndBroadcast(
          `❌ [ENHANCED-PARSING] Worker ${workerId}: Failed photo ${i + 1}/${workerPhotoUrls.length} - ${error.message}`,
        );
        workerCompletedCount++;
      }

      // Report progress
      onProgress(1);
    }

    this.logAndBroadcast(
      `🏁 [ENHANCED-PARSING] Worker ${workerId}: Finished all ${workerPhotoUrls.length} photos`,
    );
  }

  /**
   * Parse single Facebook photo URL with enhanced worker (high-resolution extraction)
   */
  private async parsePhotoUrlWithEnhancedWorker(
    photoUrl: string,
    workerId: number,
  ): Promise<ParsedImageData> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(
        __dirname,
        'facebookParser',
        'facebook-enhanced-image-parser.js',
      );
      const worker = new Worker(workerPath);

      worker.on('message', (message) => {
        if (message.type === 'progress') {
          // Optionally log progress messages
          this.logAndBroadcast(`[Worker ${workerId}] ${message.message}`);
        } else if (message.type === 'complete') {
          resolve(message.data);
        } else if (message.type === 'error') {
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Enhanced parse worker stopped with exit code ${code}`));
        }
      });

      // Send photo URL and cookies path for session-aware navigation
      const cookiesPath = path.join(process.cwd(), 'data', 'facebook-cookies.json');

      worker.postMessage({
        photoUrl,
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        workerId,
        cookiesPath: fs.existsSync(cookiesPath) ? cookiesPath : undefined,
      });
    });
  }

  /**
   * Validate and enhance data using Worker thread
   */
  private async validateDataWithWorker(data: ParsedImageData[]): Promise<ParsedImageData[]> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'facebookParser', 'facebook-data-validation.js');
      const worker = new Worker(workerPath);

      worker.on('message', (message) => {
        if (message.type === 'progress') {
          this.logAndBroadcast(`🔄 [VALIDATION] ${message.message}`);
        } else if (message.type === 'complete') {
          if (message.data.success) {
            resolve(message.data.validatedData);
          } else {
            this.logAndBroadcast(`⚠️ [VALIDATION] Worker failed, using original data`);
            resolve(data); // Use original data if validation fails
          }
        } else if (message.type === 'error') {
          this.logAndBroadcast(`❌ [VALIDATION] Error: ${message.error}`);
          resolve(data); // Use original data if validation fails
        }
      });

      worker.on('error', (error) => {
        this.logAndBroadcast(`❌ [VALIDATION] Worker error: ${error.message}`);
        resolve(data); // Use original data if validation fails
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          this.logAndBroadcast(`❌ [VALIDATION] Worker stopped with exit code ${code}`);
          resolve(data); // Use original data if validation fails
        }
      });

      // Send work data to worker
      worker.postMessage({
        shows: data,
        geminiApiKey: process.env.GEMINI_API_KEY || '',
      });
    });
  }

  /**
   * Save parsed data to database
   */
  private async saveBatchDataToDatabase(
    data: ParsedImageData[],
    url: string,
    pageName: string,
  ): Promise<any> {
    try {
      // Transform Facebook data to ParsedKaraokeData format for admin review
      const transformedData = this.transformFacebookDataToKaraokeFormat(data, pageName, url);

      const savedSchedule = await this.parsedScheduleRepository.save({
        url: url,
        aiAnalysis: transformedData,
        status: ParseStatus.PENDING_REVIEW,
        parsingLogs: this.currentParsingLogs.map((log) => ({
          timestamp: new Date(),
          level: 'info' as const,
          message: log,
        })),
      });

      this.logAndBroadcast(
        `✅ [DATABASE] Saved parsed data for admin review. ID: ${savedSchedule.id}`,
      );
      this.logAndBroadcast(
        `📊 [STATS] Shows: ${transformedData.shows.length}, DJs: ${transformedData.djs.length}, Vendors: ${transformedData.vendors.length}`,
      );

      return savedSchedule;
    } catch (error) {
      this.logAndBroadcast(`❌ [DATABASE] Save failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transform Facebook parsed data to match KaraokeParserService format
   */
  private transformFacebookDataToKaraokeFormat(
    data: ParsedImageData[],
    pageName: string,
    sourceUrl: string,
  ): any {
    const shows = [];
    const djs = new Set<string>();
    const vendors = new Set<string>();
    const venues = new Set<string>();

    // Process each parsed image result
    for (const item of data) {
      if (item.show && item.show.venue) {
        // Add venue to set for tracking
        venues.add(item.show.venue);

        // Transform show object to expected format
        const show = {
          venue: item.show.venue,
          address: item.show.address,
          city: item.show.city,
          state: item.show.state,
          zip: item.show.zip,
          day: item.show.day,
          time: item.show.time,
          startTime: item.show.startTime,
          endTime: item.show.endTime,
          venuePhone: item.show.venuePhone,
          venueWebsite: item.show.venueWebsite,
          djName: item.dj || '',
          vendor: item.vendor || '',
          source: item.source || sourceUrl, // Use CDN URL as source, fallback to group URL
        };

        shows.push(show);
      }

      // Collect unique DJs and vendors
      if (item.dj) {
        djs.add(item.dj);
      }
      if (item.vendor) {
        vendors.add(item.vendor);
      }
    }

    return {
      vendor: vendors.size > 0 ? { name: Array.from(vendors)[0] } : null,
      vendors: Array.from(vendors).map((name) => ({ name })),
      djs: Array.from(djs).map((name) => ({ name })),
      shows: shows,
      stats: {
        showsFound: shows.length,
        djsFound: djs.size,
        venuesFound: venues.size,
        vendorsFound: vendors.size,
        totalImages: data.length,
        pageName: pageName,
        parsedAt: new Date(),
      },
    };
  }

  /**
   * Update page name in urls_to_parse if record doesn't have a name
   */
  private async updatePageNameIfNeeded(url: string, pageName: string): Promise<void> {
    try {
      const record = await this.urlToParseRepository.findOne({
        where: { url },
      });

      if (record && !record.name) {
        await this.urlToParseRepository.update(record.id, { name: pageName });

        this.logAndBroadcast(`✅ [DATABASE] Updated page name for URL record`);
      }
    } catch (error) {
      this.logAndBroadcast(`⚠️ [DATABASE] Failed to update page name: ${error.message}`);
    }
  }

  /**
   * Log message and broadcast via WebSocket
   */
  private logAndBroadcast(message: string, level: 'info' | 'error' | 'warning' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;

    this.currentParsingLogs.push(logMessage);
    console.log(logMessage);

    try {
      this.webSocketGateway.broadcastParserLog(message, level);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }
}
