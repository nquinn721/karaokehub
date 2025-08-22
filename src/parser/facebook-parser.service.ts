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
import * as path from 'path';
import { Repository } from 'typeorm';
import { Worker } from 'worker_threads';
import { KaraokeWebSocketGateway } from '../websocket/websocket.gateway';
import { ParsedSchedule, ParseStatus } from './parsed-schedule.entity';
import { UrlToParse } from './url-to-parse.entity';

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
  imageUrl?: string;
  source: string;
  success: boolean;
  error?: string;
}

interface LoadedImageData {
  originalUrl: string;
  largeScaleUrl: string;
  base64Data: string;
  size: number;
  mimeType: string;
  usedFallback: boolean;
  index: number;
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
  private maxWorkers = 10; // Maximum parallel image parsing workers

  constructor(
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
    @InjectRepository(UrlToParse)
    private urlToParseRepository: Repository<UrlToParse>,
    private webSocketGateway: KaraokeWebSocketGateway,
  ) {}

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

    this.logAndBroadcast(`🚀 [START] Facebook parsing for: ${url}`);
    this.logAndBroadcast(`📊 [INIT] Starting at ${new Date().toISOString()}`);

    try {
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
      // STEP 2: SINGLE WORKER IMAGE LOADING WITH Promise.all
      // ========================================
      this.logAndBroadcast(
        `⚡ [IMAGE-LOADING] Starting single worker with Promise.all for parallel HTTP requests...`,
      );
      const imageLoadingStartTime = Date.now();

      const loadedImages = await this.loadImagesWithSingleWorker(urls);

      const imageLoadingTime = Date.now() - imageLoadingStartTime;
      this.logAndBroadcast(`✅ [IMAGE-LOADING] Completed in ${imageLoadingTime}ms`);
      this.logAndBroadcast(`📊 [IMAGE-LOADING] Loaded ${loadedImages.length} images successfully`);

      // ========================================
      // STEP 3: PARALLEL IMAGE PARSING WITH MULTIPLE WORKERS (CPU-INTENSIVE)
      // ========================================
      const availableWorkers = Math.min(this.maxWorkers, require('os').cpus().length);
      this.logAndBroadcast(
        `⚡ [IMAGE-PARSING] Starting parallel Gemini parsing with ${availableWorkers} CPU workers...`,
      );
      const workersStartTime = Date.now();

      data = await this.parseImagesWithWorkers(loadedImages);

      const workersTime = Date.now() - workersStartTime;
      this.logAndBroadcast(`✅ [IMAGE-PARSING] Completed in ${workersTime}ms`);
      this.logAndBroadcast(
        `📊 [RESULTS] Found ${data.length} valid results from ${loadedImages.length} images`,
      );

      // ========================================
      // STEP 4: DATA VALIDATION - Fill missing address data
      // ========================================
      this.logAndBroadcast('🔍 [VALIDATION] Starting data validation for address completion...');
      const validationStartTime = Date.now();

      data = await this.validateDataWithWorker(data);

      const validationTime = Date.now() - validationStartTime;
      this.logAndBroadcast(`✅ [VALIDATION] Completed in ${validationTime}ms`);
      this.logAndBroadcast(`📍 [VALIDATION] Enhanced shows with missing location data`);

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
              reject(new Error('Facebook login credentials timeout'));
            }
          } catch (error) {
            this.logAndBroadcast(`❌ [LOGIN] Error requesting credentials: ${error.message}`);
            reject(new Error(`Facebook login failed: ${error.message}`));
          }
        } else if (message.type === 'complete') {
          if (message.data.success) {
            resolve({
              imageUrls: message.data.imageUrls,
              pageName: message.data.pageName || 'Unknown Group',
            });
          } else {
            reject(new Error(message.data.error || 'Worker failed'));
          }
        } else if (message.type === 'error') {
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        reject(error);
      });

      worker.on('exit', (code) => {
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
   * Load images using a single worker with Promise.all for parallel HTTP requests
   */
  private async loadImagesWithSingleWorker(urls: string[]): Promise<LoadedImageData[]> {
    this.logAndBroadcast(
      `⚡ [IMAGE-LOADING] Using single worker with Promise.all for ${urls.length} images`,
    );

    return new Promise((resolve, reject) => {
      const workerPath = path.join(
        __dirname,
        'facebookParser',
        'facebook-parallel-image-loading.js',
      );
      const worker = new Worker(workerPath);

      worker.on('message', (message) => {
        if (message.type === 'progress') {
          this.logAndBroadcast(`🔄 [IMAGE-LOADING] ${message.message}`);
        } else if (message.type === 'complete') {
          if (message.data.success) {
            const loadedImages: LoadedImageData[] = message.data.results
              .filter((result: any) => result.success)
              .map((result: any, idx: number) => ({
                originalUrl: result.originalUrl,
                largeScaleUrl: result.largeScaleUrl,
                base64Data: result.base64Data,
                size: result.size,
                mimeType: result.mimeType,
                usedFallback: result.usedFallback,
                index: idx,
              }));

            this.logAndBroadcast(
              `✅ [IMAGE-LOADING] Loaded ${loadedImages.length}/${urls.length} images successfully`,
            );
            resolve(loadedImages);
          } else {
            reject(new Error('Image loading worker failed'));
          }
        } else if (message.type === 'error') {
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Image loading worker stopped with exit code ${code}`));
        }
      });

      // Send all URLs to single worker
      worker.postMessage({
        imageUrls: urls,
        workerId: 1,
        maxRetries: 3,
        timeout: 30000,
      });
    });
  } /**
   * Run a single image loading worker
   */
  private async runImageLoadingWorker(
    urls: string[],
    workerId: number,
    totalImages?: number,
    startIndex?: number,
  ): Promise<LoadedImageData[]> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(
        __dirname,
        'facebookParser',
        'facebook-parallel-image-loading.js',
      );
      const worker = new Worker(workerPath);

      worker.on('message', (message) => {
        if (message.type === 'progress') {
          // Only show progress for significant milestones to reduce noise
          this.logAndBroadcast(`🔄 [IMAGE-WORKER-${workerId}] ${message.message}`);
        } else if (message.type === 'complete') {
          if (message.data.success) {
            const loadedImages: LoadedImageData[] = message.data.results
              .filter((result: any) => result.success)
              .map((result: any, idx: number) => ({
                originalUrl: result.originalUrl,
                largeScaleUrl: result.largeScaleUrl,
                base64Data: result.base64Data,
                size: result.size,
                mimeType: result.mimeType,
                usedFallback: result.usedFallback,
                index: (startIndex || 0) + idx, // Use global index
              }));

            resolve(loadedImages);
          } else {
            reject(new Error('Image loading worker failed'));
          }
        } else if (message.type === 'error') {
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Image loading worker stopped with exit code ${code}`));
        }
      });

      // Send work data to worker
      worker.postMessage({
        imageUrls: urls,
        workerId,
        maxRetries: 3,
        timeout: 30000,
      });
    });
  }

  /**
   * Parse loaded images using parallel workers
   */
  private async parseImagesWithWorkers(
    loadedImages: LoadedImageData[],
  ): Promise<ParsedImageData[]> {
    return new Promise((resolve, reject) => {
      const results: ParsedImageData[] = [];
      const imageQueue = [...loadedImages];

      let completedCount = 0;
      let activeWorkers = 0;
      const totalImages = loadedImages.length;

      const processNextImage = () => {
        if (imageQueue.length === 0 || activeWorkers >= this.maxWorkers) {
          return;
        }

        const imageData = imageQueue.shift();
        if (!imageData) return;

        activeWorkers++;

        const workerId = activeWorkers;
        this.parseImageWithWorker(imageData, workerId)
          .then((result) => {
            results[imageData.index] = result;
            completedCount++;
            activeWorkers--;

            this.logAndBroadcast(`📊 [PARSING] ${completedCount}/${totalImages} images parsed`);

            if (completedCount === totalImages) {
              // Filter out failed results
              const validResults = results.filter((r) => r && r.success);
              resolve(validResults);
            } else {
              processNextImage();
            }
          })
          .catch((error) => {
            this.logAndBroadcast(`❌ [PARSE-WORKER-${workerId}] Error: ${error.message}`);
            completedCount++;
            activeWorkers--;

            if (completedCount === totalImages) {
              const validResults = results.filter((r) => r && r.success);
              resolve(validResults);
            } else {
              processNextImage();
            }
          });
      };

      // Start initial workers
      for (let i = 0; i < Math.min(this.maxWorkers, imageQueue.length); i++) {
        processNextImage();
      }
    });
  }

  /**
   * Parse single loaded image with worker
   */
  private async parseImageWithWorker(
    imageData: LoadedImageData,
    workerId: number,
  ): Promise<ParsedImageData> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'facebookParser', 'facebook-image-parser.js');
      const worker = new Worker(workerPath);

      worker.on('message', (message) => {
        if (message.type === 'progress') {
          this.logAndBroadcast(`🔄 [PARSE-WORKER-${workerId}] ${message.message}`);
        } else if (message.type === 'complete') {
          if (message.data.success) {
            resolve(message.data);
          } else {
            resolve(message.data);
          }
        } else if (message.type === 'error') {
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Parse worker stopped with exit code ${code}`));
        }
      });

      // Send work data to worker (with base64 data instead of URL)
      worker.postMessage({
        base64Data: imageData.base64Data,
        imageUrl: imageData.originalUrl,
        mimeType: imageData.mimeType,
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        workerId,
      });
    });
  }

  /**
   * Create large scale URL from original image URL (DEPRECATED - moved to parallel worker)
   */
  private createLargeScaleUrl(originalUrl: string): string {
    // This method is kept for compatibility but is now handled by the parallel worker
    try {
      // Facebook CDN URL conversion to larger size
      if (originalUrl.includes('scontent') || originalUrl.includes('fbcdn')) {
        // Replace size parameters to get larger images
        let largeUrl = originalUrl;

        // Remove existing size parameters
        largeUrl = largeUrl.replace(/\/s\d+x\d+\//, '/');
        largeUrl = largeUrl.replace(/&w=\d+&h=\d+/, '');
        largeUrl = largeUrl.replace(/\?w=\d+&h=\d+/, '');

        // Add large size parameter
        if (largeUrl.includes('?')) {
          largeUrl += '&w=1080&h=1080';
        } else {
          largeUrl += '?w=1080&h=1080';
        }

        return largeUrl;
      }

      return originalUrl;
    } catch (error) {
      return originalUrl;
    }
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
        rawData: transformedData, // TODO: Deprecated - keeping for backward compatibility
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

    // Process each parsed image result
    for (const item of data) {
      if (item.show && item.show.venue) {
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
          source: sourceUrl,
          imageUrl: item.imageUrl,
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
