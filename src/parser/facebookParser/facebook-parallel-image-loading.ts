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
 * Create large scale URL from original Facebook image URL using template approach
 */
function createLargeScaleUrl(originalUrl: string): string {
  try {
    // Facebook CDN URL conversion to larger size
    if (originalUrl.includes('scontent') || originalUrl.includes('fbcdn')) {
      let largeUrl = originalUrl;

      // Enhanced logging for URL transformation
      console.log(`\n[URL-TRANSFORM] === URL CONVERSION ANALYSIS ===`);
      console.log(`[URL-TRANSFORM] Input: ${originalUrl}`);

      // DEFENSIVE FIX: Handle malformed URLs that have .jpg& instead of .jpg?
      if (largeUrl.includes('.jpg&') && !largeUrl.includes('.jpg?')) {
        console.log(`[URL-TRANSFORM] 🔧 MALFORMED URL FIX: .jpg& -> .jpg?`);
        largeUrl = largeUrl.replace('.jpg&', '.jpg?');
        console.log(`[URL-TRANSFORM] Fixed: ${largeUrl}`);
      } else if (largeUrl.includes('.jpeg&') && !largeUrl.includes('.jpeg?')) {
        console.log(`[URL-TRANSFORM] 🔧 MALFORMED URL FIX: .jpeg& -> .jpeg?`);
        largeUrl = largeUrl.replace('.jpeg&', '.jpeg?');
        console.log(`[URL-TRANSFORM] Fixed: ${largeUrl}`);
      } else {
        console.log(`[URL-TRANSFORM] ✅ No malformed patterns detected`);
      }

      // SIMPLE TEMPLATE APPROACH: Extract key components and rebuild with working template
      const urlMatch = largeUrl.match(
        /https:\/\/scontent-([^.]+)\.xx\.fbcdn\.net\/v\/t39\.30808-6\/([^?]+)/,
      );
      if (urlMatch) {
        const serverSuffix = urlMatch[1]; // e.g., "lga3-3" or "lga3-2"
        const imageFilename = urlMatch[2]; // e.g., "537887570_10239471219137488_5170534411219795979_n.jpg"

        console.log(`[URL-TRANSFORM] 📊 Parsed components:`);
        console.log(`[URL-TRANSFORM]   Server: ${serverSuffix}`);
        console.log(`[URL-TRANSFORM]   Filename: ${imageFilename}`);

        // Check if this looks like a thumbnail (has size constraints in path or stp parameter)
        const checks = {
          hasS320: largeUrl.includes('/s320x320/'),
          hasS130: largeUrl.includes('/s130x130/'),
          hasS200: largeUrl.includes('/s200x200/'),
          hasStp: largeUrl.includes('stp=dst-jpg_p'),
          hasCp: largeUrl.includes('stp=cp'),
          hasDstJpgS: largeUrl.includes('stp=dst-jpg_s'),
          hasS1: imageFilename.includes('/s1'),
          hasP1: imageFilename.includes('/p1'),
        };

        // Only consider it a thumbnail if we have OBVIOUS size constraints
        const isThumbnail =
          checks.hasS320 ||
          checks.hasS130 ||
          checks.hasS200 ||
          checks.hasStp ||
          checks.hasCp ||
          checks.hasDstJpgS;

        console.log(`[URL-TRANSFORM] 🔍 Thumbnail detection:`);
        Object.entries(checks).forEach(([key, value]) => {
          if (value) console.log(`[URL-TRANSFORM]   ✓ ${key}: ${value}`);
        });
        console.log(
          `[URL-TRANSFORM] 📋 Result: ${isThumbnail ? 'THUMBNAIL (will convert)' : 'FULL-SIZE (keep original)'}`,
        );

        if (isThumbnail) {
          console.log(`[URL-TRANSFORM] 🔄 Converting thumbnail to large format...`);

          // CONSERVATIVE APPROACH: Try minimal modifications first
          let convertedUrl = originalUrl;

          // Strategy 1: Try removing size constraints from path
          if (
            largeUrl.includes('/s320x320/') ||
            largeUrl.includes('/s130x130/') ||
            largeUrl.includes('/s200x200/')
          ) {
            convertedUrl = largeUrl.replace(/\/s\d+x\d+\//, '/');
            console.log(`[URL-TRANSFORM] 🎯 Strategy 1 - Remove size path: ${convertedUrl}`);
            console.log(`[URL-TRANSFORM] 📊 Conversion: THUMBNAIL -> LARGE`);
            return convertedUrl;
          }

          // Strategy 2: Try removing 'stp' parameter that forces thumbnails
          if (
            largeUrl.includes('stp=dst-jpg_p') ||
            largeUrl.includes('stp=cp') ||
            largeUrl.includes('stp=dst-jpg_s')
          ) {
            try {
              const url = new URL(largeUrl);
              url.searchParams.delete('stp');
              convertedUrl = url.toString();
              console.log(`[URL-TRANSFORM] 🎯 Strategy 2 - Remove stp param: ${convertedUrl}`);
              console.log(`[URL-TRANSFORM] 📊 Conversion: THUMBNAIL -> LARGE`);
              return convertedUrl;
            } catch (urlError) {
              console.log(`[URL-TRANSFORM] ❌ Strategy 2 failed: ${urlError.message}`);
            }
          }

          // Strategy 3: For very small thumbnails, just use original URL
          // (conservative approach - don't risk breaking working URLs)
          console.log(
            `[URL-TRANSFORM] 🎯 Strategy 3 - Keep original (conservative): ${originalUrl}`,
          );
          console.log(`[URL-TRANSFORM] 📊 Conversion: NONE (keeping original)`);
          return originalUrl;
        } else {
          console.log(`[URL-TRANSFORM] ✅ Full-size URL detected, keeping original`);
          console.log(`[URL-TRANSFORM] 📊 Conversion: NONE (already full-size)`);
        }
      } else {
        console.log(`[URL-TRANSFORM] ❌ Could not parse URL structure`);
        console.log(`[URL-TRANSFORM] 📊 Conversion: FAILED (keeping original)`);
      }

      console.log(`[URL-TRANSFORM] 🎯 Final output: ${largeUrl}`);
      console.log(`[URL-TRANSFORM] === END URL CONVERSION ===\n`);
      return largeUrl;
    }

    // Instagram or other CDN URLs
    if (originalUrl.includes('instagram') || originalUrl.includes('cdninstagram')) {
      console.log(`[URL-TRANSFORM] 📸 Instagram URL detected, applying Instagram conversion`);
      // Try to get higher resolution Instagram images
      return originalUrl.replace(/\/s\d+x\d+\//, '/').replace(/\?.*$/, '');
    }

    console.log(`[URL-TRANSFORM] ❓ Non-Facebook URL, returning unchanged: ${originalUrl}`);
    return originalUrl;
  } catch (error) {
    console.log(`[URL-TRANSFORM] ❌ ERROR in URL transformation: ${error.message}`);
    console.log(`[URL-TRANSFORM] 🔄 Returning original URL as fallback`);
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

  // Log the start of processing for this image
  console.log(`\n[IMAGE-${index}] === PROCESSING START ===`);
  console.log(`[IMAGE-${index}] Original URL: ${originalUrl.substring(0, 100)}...`);
  console.log(`[IMAGE-${index}] Large Scale URL: ${largeScaleUrl.substring(0, 100)}...`);
  console.log(
    `[IMAGE-${index}] URLs are identical: ${originalUrl === largeScaleUrl ? 'YES' : 'NO'}`,
  );

  // Smart processing strategy: if URLs are identical or conversion failed,
  // just use original URL directly (no point in trying a template that will fail)
  if (originalUrl === largeScaleUrl) {
    console.log(`[IMAGE-${index}] 📋 URLs identical - using original directly`);
    try {
      const imageData = await loadImageAsBase64(originalUrl, timeout);
      result.base64Data = imageData.base64Data;
      result.size = imageData.size;
      result.mimeType = imageData.mimeType;
      result.success = true;
      result.usedFallback = false; // Not really a fallback since URLs are same

      console.log(`[IMAGE-${index}] ✅ ORIGINAL URL SUCCESS`);
      console.log(`[IMAGE-${index}] Size: ${(imageData.size / 1024).toFixed(1)} KB`);
      console.log(`[IMAGE-${index}] MIME: ${imageData.mimeType}`);

      return result;
    } catch (error) {
      console.log(`[IMAGE-${index}] ❌ ORIGINAL URL FAILED: ${error.message}`);
      result.error = error.message;
      return result;
    }
  }

  // If URLs are different, try large scale first, then fallback
  console.log(`[IMAGE-${index}] 🔄 Attempting large scale download...`);
  try {
    const imageData = await loadImageAsBase64(largeScaleUrl, timeout);
    result.base64Data = imageData.base64Data;
    result.size = imageData.size;
    result.mimeType = imageData.mimeType;
    result.success = true;
    result.usedFallback = false;

    console.log(`[IMAGE-${index}] ✅ LARGE SCALE SUCCESS`);
    console.log(`[IMAGE-${index}] Size: ${(imageData.size / 1024).toFixed(1)} KB`);
    console.log(`[IMAGE-${index}] MIME: ${imageData.mimeType}`);
    console.log(`[IMAGE-${index}] Gemini will receive: LARGE SCALE image data`);
    console.log(`[IMAGE-${index}] URL to save: ${largeScaleUrl.substring(0, 80)}...`);

    return result;
  } catch (largeError) {
    console.log(`[IMAGE-${index}] ❌ LARGE SCALE FAILED: ${largeError.message}`);

    // If large scale URL fails and it's different from original, try fallback
    if (largeScaleUrl !== originalUrl) {
      console.log(`[IMAGE-${index}] 🔄 Attempting fallback to original URL...`);
      try {
        const imageData = await loadImageAsBase64(originalUrl, timeout);
        result.base64Data = imageData.base64Data;
        result.size = imageData.size;
        result.mimeType = imageData.mimeType;
        result.success = true;
        result.usedFallback = true;

        console.log(`[IMAGE-${index}] ✅ FALLBACK SUCCESS`);
        console.log(`[IMAGE-${index}] Size: ${(imageData.size / 1024).toFixed(1)} KB`);
        console.log(`[IMAGE-${index}] MIME: ${imageData.mimeType}`);
        console.log(`[IMAGE-${index}] ⚠️  Gemini will receive: THUMBNAIL/ORIGINAL image data`);
        console.log(
          `[IMAGE-${index}] ⚠️  URL to save: ${largeScaleUrl.substring(0, 80)}... (MISMATCH!)`,
        );
        console.log(`[IMAGE-${index}] ⚠️  Actual source: ${originalUrl.substring(0, 80)}...`);

        return result;
      } catch (fallbackError) {
        console.log(`[IMAGE-${index}] ❌ FALLBACK ALSO FAILED: ${fallbackError.message}`);
        result.error = `Large scale failed: ${largeError.message}. Fallback failed: ${fallbackError.message}`;
      }
    } else {
      console.log(`[IMAGE-${index}] ❌ No fallback available (URLs identical)`);
      result.error = largeError.message;
    }
  }

  console.log(`[IMAGE-${index}] ❌ COMPLETE FAILURE - Image will be skipped`);
  console.log(`[IMAGE-${index}] Gemini will receive: NOTHING`);
  console.log(`[IMAGE-${index}] Database will store: NOTHING`);

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
          size: undefined,
          mimeType: undefined,
        } as ImageLoadResult;
      }
    }),
  );

  // Sort results by original index
  results.sort((a, b) => a.index - b.index);

  const successCount = results.filter((r) => r.success).length;
  const fallbackCount = results.filter((r) => r.success && r.usedFallback).length;
  const largeSuccessCount = results.filter((r) => r.success && !r.usedFallback).length;
  const failedCount = results.length - successCount;

  // Log details about each result type
  if (largeSuccessCount > 0) {
    results
      .filter((r) => r.success && !r.usedFallback)
      .forEach((r, idx) => {
        const size = r.size ? (r.size / 1024).toFixed(1) : 'Unknown';
        console.log(
          `[BATCH-SUMMARY]   ${idx + 1}. Size: ${size}KB, URL: ${r.largeScaleUrl.substring(0, 60)}...`,
        );
      });
  }

  if (fallbackCount > 0) {
    console.log(`\n[BATCH-SUMMARY] ⚠️  Fallback successes (Gemini gets thumbnail quality):`);
    results
      .filter((r) => r.success && r.usedFallback)
      .forEach((r, idx) => {
        const size = r.size ? (r.size / 1024).toFixed(1) : 'Unknown';
        console.log(
          `[BATCH-SUMMARY]   ${idx + 1}. Size: ${size}KB, Original: ${r.originalUrl.substring(0, 60)}...`,
        );
        console.log(
          `[BATCH-SUMMARY]       BUT database will save: ${r.largeScaleUrl.substring(0, 60)}...`,
        );
      });
  }

  if (failedCount > 0) {
    console.log(`\n[BATCH-SUMMARY] ❌ Complete failures (skipped by Gemini):`);
    results
      .filter((r) => !r.success)
      .forEach((r, idx) => {
        console.log(`[BATCH-SUMMARY]   ${idx + 1}. Error: ${r.error}`);
        console.log(`[BATCH-SUMMARY]       URL: ${r.originalUrl.substring(0, 60)}...`);
      });
  }

  console.log(`[BATCH-SUMMARY] === END BATCH SUMMARY ===\n`);

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
