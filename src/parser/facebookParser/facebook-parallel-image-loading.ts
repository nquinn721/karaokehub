/**
 * Facebook Parallel Image Loading Worker
 * High-performance parallel image loading with URL conversion and base64 encoding
 *
 * Architecture:
 * - Converts URLs to large scale versions for better quality
 * - Loads images as base64 with fallback to original URL
 * - Operates in worker pools for CPU-intensive operations
 * - Handles 40 workers on 200 images (5 cycles per worker)
 */

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { parentPort } from 'worker_threads';

interface ImageLoadTask {
  originalUrl: string;
  largeScaleUrl: string;
  index: number;
}

interface ImageLoadResult {
  index: number;
  originalUrl: string;
  largeScaleUrl: string;
  base64Data?: string;
  success: boolean;
  usedFallback: boolean;
  error?: string;
  size?: number;
  mimeType?: string;
}

interface WorkerData {
  imageUrls: string[];
  workerId: number;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Create large scale URL from original Facebook image URL
 */
function createLargeScaleUrl(originalUrl: string): string {
  try {
    // Facebook CDN URL conversion to larger size
    if (originalUrl.includes('scontent') || originalUrl.includes('fbcdn')) {
      let largeUrl = originalUrl;

      // Remove the stp parameter which controls thumbnail sizing (key fix!)
      // Handle both cases: ?stp=... (first param) and &stp=... (subsequent param)  
      if (largeUrl.includes('?stp=')) {
        // stp is first parameter - replace ?stp=... with ? if there are more params, or remove entirely
        largeUrl = largeUrl.replace(/\?stp=[^&]*&/, '?').replace(/\?stp=[^&]*$/, '');
      } else {
        // stp is not first parameter - just remove &stp=...
        largeUrl = largeUrl.replace(/&stp=[^&]*/, '');
      }
      
      // Remove existing size parameters
      largeUrl = largeUrl.replace(/\/s\d+x\d+\//, '/');
      largeUrl = largeUrl.replace(/&w=\d+&h=\d+/, '');
      largeUrl = largeUrl.replace(/\?w=\d+&h=\d+/, '');
      largeUrl = largeUrl.replace(/&width=\d+&height=\d+/, '');
      largeUrl = largeUrl.replace(/\?width=\d+&height=\d+/, '');

      // Clean up any double ampersands or leading ampersands
      largeUrl = largeUrl.replace(/&&+/g, '&');
      largeUrl = largeUrl.replace(/\?&/, '?');
      largeUrl = largeUrl.replace(/&$/, '');

      return largeUrl;
    }

    // Instagram or other CDN URLs
    if (originalUrl.includes('instagram') || originalUrl.includes('cdninstagram')) {
      // Try to get higher resolution Instagram images
      return originalUrl.replace(/\/s\d+x\d+\//, '/').replace(/\?.*$/, '');
    }

    return originalUrl;
  } catch (error) {
    return originalUrl;
  }
}

/**
 * Load image from URL and convert to base64
 */
function loadImageAsBase64(
  url: string,
  timeout: number = 30000,
): Promise<{
  base64Data: string;
  size: number;
  mimeType: string;
}> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const request = client.get(
        url,
        {
          timeout: timeout,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Accept: 'image/*,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        },
        (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            return;
          }

          const contentType = response.headers['content-type'] || 'image/jpeg';
          if (!contentType.startsWith('image/')) {
            reject(new Error(`Invalid content type: ${contentType}`));
            return;
          }

          const chunks: Buffer[] = [];
          let totalSize = 0;

          response.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
            totalSize += chunk.length;

            // Prevent loading extremely large images (>50MB)
            if (totalSize > 50 * 1024 * 1024) {
              reject(new Error('Image too large (>50MB)'));
              return;
            }
          });

          response.on('end', () => {
            try {
              const buffer = Buffer.concat(chunks);
              const base64Data = buffer.toString('base64');

              resolve({
                base64Data,
                size: totalSize,
                mimeType: contentType,
              });
            } catch (error) {
              reject(new Error(`Base64 conversion failed: ${error.message}`));
            }
          });

          response.on('error', (error) => {
            reject(new Error(`Response error: ${error.message}`));
          });
        },
      );

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });

      request.on('error', (error) => {
        reject(new Error(`Request error: ${error.message}`));
      });

      request.end();
    } catch (error) {
      reject(new Error(`URL parsing failed: ${error.message}`));
    }
  });
}

/**
 * Process a single image with fallback support
 */
async function processImage(
  originalUrl: string,
  largeScaleUrl: string,
  index: number,
  maxRetries: number,
  timeout: number,
): Promise<ImageLoadResult> {
  const result: ImageLoadResult = {
    index,
    originalUrl,
    largeScaleUrl,
    success: false,
    usedFallback: false,
  };

  // First, try the large scale URL
  try {
    const imageData = await loadImageAsBase64(largeScaleUrl, timeout);
    result.base64Data = imageData.base64Data;
    result.size = imageData.size;
    result.mimeType = imageData.mimeType;
    result.success = true;
    result.usedFallback = false;

    return result;
  } catch (largeError) {
    // If large scale URL fails and it's different from original, try fallback
    if (largeScaleUrl !== originalUrl) {
      try {
        const imageData = await loadImageAsBase64(originalUrl, timeout);
        result.base64Data = imageData.base64Data;
        result.size = imageData.size;
        result.mimeType = imageData.mimeType;
        result.success = true;
        result.usedFallback = true;

        return result;
      } catch (fallbackError) {
        result.error = `Large scale failed: ${largeError.message}. Fallback failed: ${fallbackError.message}`;
      }
    } else {
      result.error = largeError.message;
    }
  }

  return result;
}

/**
 * Process multiple images in parallel using Promise.all (single worker, multiple HTTP requests)
 */
async function processImageBatch(
  imageUrls: string[],
  workerId: number,
  maxRetries: number = 3,
  timeout: number = 30000,
): Promise<ImageLoadResult[]> {
  if (parentPort) {
    parentPort.postMessage({
      type: 'progress',
      message: `Worker ${workerId} processing ${imageUrls.length} images with Promise.all`,
    });
  }

  // Create all tasks with large scale URLs
  const tasks: ImageLoadTask[] = imageUrls.map((url, index) => ({
    originalUrl: url,
    largeScaleUrl: createLargeScaleUrl(url),
    index,
  }));

  if (parentPort) {
    parentPort.postMessage({
      type: 'progress',
      message: `Starting ${tasks.length} parallel HTTP requests...`,
    });
  }

  // Process all images in parallel using Promise.all
  const results = await Promise.all(
    tasks.map(async (task, taskIndex) => {
      try {
        const result = await processImage(
          task.originalUrl,
          task.largeScaleUrl,
          task.index,
          maxRetries,
          timeout,
        );

        // Report progress every 20% completion
        const progressThreshold = Math.max(1, Math.floor(tasks.length / 5));
        if ((taskIndex + 1) % progressThreshold === 0 || taskIndex === tasks.length - 1) {
          if (parentPort) {
            parentPort.postMessage({
              type: 'progress',
              message: `Completed ${taskIndex + 1}/${tasks.length} images (${Math.round(((taskIndex + 1) / tasks.length) * 100)}%)`,
            });
          }
        }

        return result;
      } catch (error) {
        return {
          index: task.index,
          originalUrl: task.originalUrl,
          largeScaleUrl: task.largeScaleUrl,
          success: false,
          usedFallback: false,
          error: error.message,
        };
      }
    }),
  );

  // Sort results by original index
  results.sort((a, b) => a.index - b.index);

  return results;
}

// Worker main execution
if (parentPort) {
  parentPort.on('message', async (data: WorkerData) => {
    try {
      if (parentPort) {
        parentPort.postMessage({
          type: 'progress',
          message: `Worker ${data.workerId} started with ${data.imageUrls.length} images`,
        });
      }

      const results = await processImageBatch(
        data.imageUrls,
        data.workerId,
        data.maxRetries || 3,
        data.timeout || 30000,
      );

      const successCount = results.filter((r) => r.success).length;
      const fallbackCount = results.filter((r) => r.success && r.usedFallback).length;

      if (parentPort) {
        parentPort.postMessage({
          type: 'complete',
          data: {
            success: true,
            results,
            stats: {
              total: results.length,
              successful: successCount,
              failed: results.length - successCount,
              usedFallback: fallbackCount,
              workerId: data.workerId,
            },
          },
        });
      }
    } catch (error) {
      if (parentPort) {
        parentPort.postMessage({
          type: 'error',
          error: error.message,
        });
      }
    }
  });
}

export { createLargeScaleUrl, loadImageAsBase64, processImageBatch };
