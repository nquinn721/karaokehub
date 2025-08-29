/**
 * New Website Parser Service - Worker-based Architecture
 * Follows the Facebook parser pattern:
 * 1. Discovery worker -> get all URLs
 * 2. Parallel page workers -> process individual pages
 * 3. Save to DB with deduplication
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { Repository } from 'typeorm';
import { Worker } from 'worker_threads';
import { DJ } from '../../dj/dj.entity';
import { Show } from '../../show/show.entity';
import { Vendor } from '../../vendor/vendor.entity';
import { ParsedSchedule } from '../parsed-schedule.entity';
import { UrlToParseService } from '../url-to-parse.service';

interface WorkerBasedParseOptions {
  url: string;
  includeSubdomains?: boolean;
  maxWorkers?: number;
}

interface ParsedWebsiteResult {
  success: boolean;
  parsedScheduleId?: string;
  data: {
    siteName: string;
    totalUrls: number;
    processedUrls: number;
    totalShows: number;
    totalDJs: number;
    totalVendors: number;
    shows: any[];
    djs: any[];
    vendors: any[];
  };
  stats: {
    discoveryTime: number;
    processingTime: number;
    totalTime: number;
  };
}

@Injectable()
export class WorkerBasedWebsiteParserService {
  private readonly logger = new Logger(WorkerBasedWebsiteParserService.name);
  private readonly tempDir = path.join(process.cwd(), 'temp');

  constructor(
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
    private urlToParseService: UrlToParseService,
  ) {}

  /**
   * Main entry point - parse website using worker-based architecture
   */
  async parseWebsiteWithWorkers(options: WorkerBasedParseOptions): Promise<ParsedWebsiteResult> {
    const startTime = Date.now();
    const { url, includeSubdomains = false, maxWorkers = 5 } = options;

    this.logAndBroadcast(`🚀 [WORKER-PARSER] Starting worker-based website parsing for: ${url}`);
    this.logAndBroadcast(
      `⚙️ [CONFIG] Subdomains: ${includeSubdomains}, Workers: ${maxWorkers} (No page limits)`,
    );

    try {
      // ========================================
      // STEP 1: DISCOVERY WORKER - GET ALL URLS
      // ========================================

      this.logAndBroadcast(
        `🔍 [DISCOVERY] Launching discovery worker to find all relevant URLs...`,
      );
      const discoveryStartTime = Date.now();

      const discoveryResult = await this.runDiscoveryWorker({
        url,
        deepSeekApiKey: process.env.DEEPSEEK_API_KEY || '',
        includeSubdomains,
      });

      const discoveryTime = Date.now() - discoveryStartTime;

      if (!discoveryResult.success || discoveryResult.urls.length === 0) {
        this.logAndBroadcast(
          `❌ [DISCOVERY] Failed or found no URLs: ${discoveryResult.error || 'No URLs discovered'}`,
        );
        throw new Error(discoveryResult.error || 'No URLs discovered');
      }

      const urls = [url, ...discoveryResult.urls]; // Include original URL
      const uniqueUrls = Array.from(new Set(urls)); // Remove duplicates

      this.logAndBroadcast(
        `✅ [DISCOVERY] Found ${uniqueUrls.length} unique URLs in ${discoveryTime}ms`,
      );
      this.logAndBroadcast(`🏷️ [SITE] Site name: "${discoveryResult.siteName}"`);

      // ========================================
      // STEP 2: PARALLEL PROCESSING WORKERS
      // ========================================

      this.logAndBroadcast(
        `🛠️ [PROCESSING] Processing ${uniqueUrls.length} URLs with ${Math.min(maxWorkers, uniqueUrls.length)} parallel workers...`,
      );
      const processingStartTime = Date.now();

      const pageResults = await this.processUrlsWithWorkers(
        uniqueUrls,
        process.env.DEEPSEEK_API_KEY || '',
        maxWorkers,
      );

      const processingTime = Date.now() - processingStartTime;
      const successfulResults = pageResults.filter((result) => result.success);

      this.logAndBroadcast(
        `✅ [PROCESSING] Completed ${pageResults.length} pages in ${processingTime}ms`,
      );
      this.logAndBroadcast(`📊 [RESULTS] ${successfulResults.length} pages contained karaoke data`);

      // ========================================
      // STEP 3: AGGREGATE AND SAVE TO DATABASE
      // ========================================

      this.logAndBroadcast(`💾 [DATABASE] Aggregating results and saving to database...`);
      const saveStartTime = Date.now();

      const aggregatedData = this.aggregateResults(successfulResults);
      const parsedScheduleId = await this.saveToDatabase(
        aggregatedData,
        discoveryResult.siteName,
        url,
      );

      const saveTime = Date.now() - saveStartTime;
      const totalTime = Date.now() - startTime;

      this.logAndBroadcast(`✅ [DATABASE] Saved to database in ${saveTime}ms`);
      this.logAndBroadcast(`🎉 [COMPLETE] Worker-based parsing completed in ${totalTime}ms`);

      // Update URL to parse status if exists
      try {
        await this.markUrlAsParsed(url);
      } catch (error) {
        this.logger.warn(`Failed to update URL status: ${error.message}`);
      }

      return {
        success: true,
        parsedScheduleId,
        data: {
          siteName: discoveryResult.siteName,
          totalUrls: uniqueUrls.length,
          processedUrls: pageResults.length,
          totalShows: aggregatedData.shows.length,
          totalDJs: aggregatedData.djs.length,
          totalVendors: aggregatedData.vendors.length,
          shows: aggregatedData.shows,
          djs: aggregatedData.djs,
          vendors: aggregatedData.vendors,
        },
        stats: {
          discoveryTime,
          processingTime,
          totalTime,
        },
      };
    } catch (error) {
      this.logAndBroadcast(`❌ [ERROR] Worker-based parsing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run discovery worker to find all relevant URLs
   */
  private async runDiscoveryWorker(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'website-discovery-worker.js');
      const worker = new Worker(workerPath);

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Discovery worker timeout after 120 seconds'));
      }, 120000);

      worker.on('message', (message) => {
        if (message.type === 'progress') {
          this.logAndBroadcast(`[Discovery] ${message.message}`);
        } else if (message.type === 'complete') {
          clearTimeout(timeout);
          resolve(message.data);
        } else if (message.type === 'error') {
          clearTimeout(timeout);
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        this.logger.error(`Discovery worker error: ${error.message}`);
        reject(new Error(`Discovery worker error: ${error.message}`));
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          this.logger.error(`Discovery worker exited with code ${code}`);
          reject(
            new Error(`Discovery worker exited with code ${code} - possible crash or timeout`),
          );
        }
      });

      // Add message error handler for discovery worker
      worker.on('messageerror', (error) => {
        clearTimeout(timeout);
        this.logger.error(`Discovery worker message error: ${error.message}`);
        reject(new Error(`Discovery worker message error: ${error.message}`));
      });

      worker.postMessage(data);
    });
  }

  /**
   * Process URLs with parallel workers
   */
  private async processUrlsWithWorkers(
    urls: string[],
    deepSeekApiKey: string,
    maxWorkers: number,
  ): Promise<any[]> {
    const results: any[] = [];
    const workQueue = [...urls];
    const activeWorkers: Map<number, Worker> = new Map();
    let workerId = 0;

    return new Promise((resolve, reject) => {
      const processNext = async () => {
        // Start new workers if queue has work and we haven't hit max workers
        while (workQueue.length > 0 && activeWorkers.size < maxWorkers) {
          const url = workQueue.shift()!;
          const currentWorkerId = ++workerId;

          // Add small delay between worker starts to prevent API overload
          if (activeWorkers.size > 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          this.startPageWorker(url, currentWorkerId, deepSeekApiKey, (result, error) => {
            activeWorkers.delete(currentWorkerId);

            if (error) {
              this.logger.error(`Worker ${currentWorkerId} failed: ${error}`);
              results.push({
                url,
                workerId: currentWorkerId,
                success: false,
                error,
                source: url,
              });
            } else {
              results.push(result);
            }

            // Continue processing
            processNext();

            // Check if we're done
            if (activeWorkers.size === 0 && workQueue.length === 0) {
              resolve(results);
            }
          });

          activeWorkers.set(
            currentWorkerId,
            new Worker(path.join(__dirname, 'website-page-worker.js')),
          );
        }
      };

      // Handle case where there are no URLs to process
      if (urls.length === 0) {
        resolve([]);
        return;
      }

      // Start processing
      processNext();
    });
  }

  /**
   * Start a single page processing worker
   */
  private startPageWorker(
    url: string,
    workerId: number,
    deepSeekApiKey: string,
    callback: (result?: any, error?: string) => void,
  ): void {
    const workerPath = path.join(__dirname, 'website-page-worker.js');
    const worker = new Worker(workerPath);

    const timeout = setTimeout(() => {
      worker.terminate();
      callback(undefined, 'Worker timeout after 120 seconds');
    }, 120000);

    worker.on('message', (message) => {
      if (message.type === 'progress') {
        this.logAndBroadcast(`[Worker ${message.workerId}] ${message.message}`);
      } else if (message.type === 'complete') {
        clearTimeout(timeout);
        callback(message.data);
      } else if (message.type === 'error') {
        clearTimeout(timeout);
        callback(undefined, message.error);
      }
    });

    worker.on('error', (error) => {
      clearTimeout(timeout);
      this.logger.error(`Worker ${workerId} error: ${error.message}`);
      callback(undefined, `Worker error: ${error.message}`);
    });

    worker.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        this.logger.error(`Worker ${workerId} exited with code ${code}`);
        callback(undefined, `Worker exited with code ${code} - possible crash or timeout`);
      }
    });

    // Add unhandled rejection handler for the worker
    worker.on('messageerror', (error) => {
      clearTimeout(timeout);
      this.logger.error(`Worker ${workerId} message error: ${error.message}`);
      callback(undefined, `Worker message error: ${error.message}`);
    });

    worker.postMessage({
      url,
      workerId,
      deepSeekApiKey,
    });
  }

  /**
   * Aggregate results from all workers
   */
  private aggregateResults(results: any[]): {
    shows: any[];
    djs: any[];
    vendors: any[];
  } {
    const allShows: any[] = [];
    const allDJs: any[] = [];
    const allVendors: any[] = [];

    for (const result of results) {
      if (result.success) {
        // Convert worker result to standard format
        if (result.show) {
          allShows.push({
            ...result.show,
            source: result.source,
          });
        }

        if (result.dj) {
          allDJs.push({
            name: result.dj,
            source: result.source,
          });
        }

        if (result.vendor) {
          allVendors.push({
            name: result.vendor,
            source: result.source,
          });
        }
      }
    }

    // Remove duplicates
    const uniqueShows = this.removeDuplicates(allShows, 'venue');
    const uniqueDJs = this.removeDuplicates(allDJs, 'name');
    const uniqueVendors = this.removeDuplicates(allVendors, 'name');

    return {
      shows: uniqueShows,
      djs: uniqueDJs,
      vendors: uniqueVendors,
    };
  }

  /**
   * Remove duplicates from array based on key
   */
  private removeDuplicates(items: any[], key: string): any[] {
    const seen = new Set();
    return items.filter((item) => {
      const value = item[key]?.toLowerCase().trim();
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  /**
   * Save aggregated data to database
   */
  private async saveToDatabase(
    data: { shows: any[]; djs: any[]; vendors: any[] },
    siteName: string,
    sourceUrl: string,
  ): Promise<string> {
    // Create parsed schedule entry
    const parsedSchedule = this.parsedScheduleRepository.create({
      url: sourceUrl,
      aiAnalysis: {
        siteName,
        totalShows: data.shows.length,
        totalDJs: data.djs.length,
        totalVendors: data.vendors.length,
        shows: data.shows,
        djs: data.djs,
        vendors: data.vendors,
      },
      status: 'pending' as any,
      parsingLogs: [
        {
          timestamp: new Date(),
          level: 'info',
          message: `Worker-based parsing completed: ${data.shows.length} shows, ${data.djs.length} DJs, ${data.vendors.length} vendors`,
        },
      ],
    });

    await this.parsedScheduleRepository.save(parsedSchedule);

    this.logAndBroadcast(`💾 [DATABASE] Created ParsedSchedule: ${parsedSchedule.id}`);

    return parsedSchedule.id;
  }

  /**
   * Log and broadcast message
   */
  private logAndBroadcast(message: string): void {
    this.logger.log(message);
    // TODO: Add WebSocket broadcasting if needed
  }

  /**
   * Mark URL as parsed in url_to_parse table
   */
  private async markUrlAsParsed(url: string): Promise<void> {
    const urlToParseList = await this.urlToParseService.findAll();
    const matchingUrl = urlToParseList.find((u) => u.url === url);

    if (matchingUrl) {
      await this.urlToParseService.markAsParsed(matchingUrl.id);
      this.logger.log(`✅ Marked URL as parsed: ${url}`);
    } else {
      this.logger.warn(`URL not found in url_to_parse table: ${url}`);
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ available: boolean; model: string; error?: string }> {
    try {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        return { available: false, model: 'deepseek-chat', error: 'API key not configured' };
      }

      // Test DeepSeek API directly
      const axios = await import('axios');
      const response = await axios.default.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: 'Test connection',
            },
          ],
          max_tokens: 10,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      return { available: true, model: 'deepseek-chat' };
    } catch (error) {
      return { available: false, model: 'deepseek-chat', error: error.message };
    }
  }
}
