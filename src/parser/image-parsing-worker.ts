/**
 * Worker thread for Facebook image parsing with Gemini Vision
 * This handles the CPU-intensive image processing tasks
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import {
  getGeminiModel,
  getGeminiPerformanceSettings,
  getGeminiRateLimiting,
} from '../config/gemini.config';

interface WorkerData {
  images: string[];
  geminiApiKey: string;
  batchSize?: number;
}

interface ParsedShow {
  venue: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  venuePhone?: string;
  venueWebsite?: string;
  time: string;
  startTime?: string;
  endTime?: string;
  day?: string;
  djName?: string;
  description?: string;
  source?: string;
  confidence: number;
}

interface ParsedDJ {
  name: string;
  confidence: number;
  context: string;
}

if (isMainThread) {
  // Export worker creation function
  const createImageParsingWorker = (data: WorkerData): Worker => {
    return new Worker(__filename, { workerData: data });
  };

  module.exports = { createImageParsingWorker };
} else {
  // Helper function to send logs to parent thread
  function workerLog(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    parentPort?.postMessage({
      type: 'log',
      data: { message, level },
    });
  }

  // Worker thread execution
  async function processImages(): Promise<void> {
    try {
      const { images, geminiApiKey, batchSize = 3 } = workerData as WorkerData;

      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY is required in worker');
      }

      workerLog(`🧵 Worker: Processing ${images.length} images in batches of ${batchSize}`);

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const performanceSettings = getGeminiPerformanceSettings();
      const rateLimiting = getGeminiRateLimiting();

      const model = genAI.getGenerativeModel({
        model: getGeminiModel('vision'), // Use centralized vision model config
        generationConfig: {
          temperature: performanceSettings.temperature,
          topP: performanceSettings.topP,
          topK: performanceSettings.topK,
          maxOutputTokens: performanceSettings.maxTokensPerRequest,
        },
      });

      const allShows: ParsedShow[] = [];
      const allDjs: ParsedDJ[] = [];

      // Process images in batches
      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(images.length / batchSize);

        workerLog(`🔄 Worker: Processing batch ${batchNum}/${totalBatches}...`);

        // Send progress update to main thread
        parentPort?.postMessage({
          type: 'progress',
          data: {
            processed: i,
            total: images.length,
            batch: batchNum,
            totalBatches: totalBatches,
          },
        });

        // Process batch with Gemini Vision
        const batchResults = await processBatch(model, batch, batchNum);

        if (batchResults.shows) {
          allShows.push(...batchResults.shows);
        }
        if (batchResults.djs) {
          allDjs.push(...batchResults.djs);
        }

        // Add delay between batches to respect rate limits
        if (i + batchSize < images.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Send final results
      parentPort?.postMessage({
        type: 'complete',
        data: {
          shows: allShows,
          djs: allDjs,
          stats: {
            totalImages: images.length,
            totalShows: allShows.length,
            totalDjs: allDjs.length,
          },
        },
      });
    } catch (error) {
      parentPort?.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function processBatch(
    model: any,
    batch: string[],
    batchNum: number,
  ): Promise<{ shows: ParsedShow[]; djs: ParsedDJ[] }> {
    try {
      const prompt = `Analyze these Facebook group images for karaoke show information. Extract:

1. SHOWS: Complete karaoke events with venue, date/time, location
2. DJS: Karaoke hosts/DJs mentioned

For SHOWS, include:
- venue (required)
- time (required - format as "7:00 PM" or "8:00 PM - 12:00 AM")
- day (if specified)
- address/location details
- DJ name if mentioned
- confidence score (0.0-1.0)

For DJS, include:
- name
- context where found
- confidence score (0.0-1.0)

Return valid JSON only:
{
  "shows": [{"venue": "Bar Name", "time": "7:00 PM", "djName": "DJ Name", "confidence": 0.9}],
  "djs": [{"name": "DJ Name", "context": "hosting at venue", "confidence": 0.8}]
}`;

      const imageParts = [];

      for (const imageUrl of batch) {
        try {
          // Check if it's already base64 data
          if (imageUrl.startsWith('data:image/')) {
            imageParts.push({
              inlineData: {
                data: imageUrl.split(',')[1], // Remove data:image/jpeg;base64, prefix
                mimeType: 'image/jpeg',
              },
            });
          } else {
            // Fetch the image from URL and convert to base64
            const response = await fetch(imageUrl);

            if (!response.ok) {
              workerLog(
                `⚠️ Failed to fetch image: ${response.status} ${response.statusText}`,
                'warning',
              );
              continue; // Skip this image
            }

            const arrayBuffer = await response.arrayBuffer();
            const base64Data = Buffer.from(arrayBuffer).toString('base64');

            // Validate that we got actual image data
            if (base64Data.length === 0) {
              workerLog(`⚠️ Empty image data for URL: ${imageUrl}`, 'warning');
              continue; // Skip this image
            }

            imageParts.push({
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg',
              },
            });
          }
        } catch (fetchError) {
          workerLog(`⚠️ Error processing image ${imageUrl}: ${fetchError.message}`, 'warning');
          continue; // Skip this image and continue with the batch
        }
      }

      // Only proceed if we have valid images
      if (imageParts.length === 0) {
        workerLog(`⚠️ No valid images in batch ${batchNum}, skipping`, 'warning');
        return { shows: [], djs: [] };
      }

      workerLog(
        `✅ Successfully prepared ${imageParts.length}/${batch.length} images for analysis`,
      );

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      workerLog(
        `✅ Worker: Batch ${batchNum} processed - ${parsed.shows?.length || 0} shows, ${parsed.djs?.length || 0} DJs`,
      );

      return {
        shows: parsed.shows || [],
        djs: parsed.djs || [],
      };
    } catch (error) {
      workerLog(`❌ Worker: Batch ${batchNum} failed: ${error}`, 'error');
      return { shows: [], djs: [] };
    }
  }

  // Start processing
  processImages().catch((error) => {
    parentPort?.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
