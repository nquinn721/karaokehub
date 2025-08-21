import { parentPort } from 'worker_threads';
import type {
  ParsedFacebookData,
  ValidationWorkerData,
  ValidationWorkerMessage,
} from './worker-types';

// Ensure we have parentPort
if (!parentPort) {
  throw new Error('This script must be run as a worker thread');
}

// Listen for messages from the main thread
parentPort.on('message', async (messageData: ValidationWorkerData) => {
  try {
    if (!messageData) {
      throw new Error('No data received by validation worker');
    }

    await validateData(messageData);
  } catch (error) {
    console.error('Validation worker error:', error);
    parentPort!.postMessage({
      type: 'error',
      error: error?.message || error || 'Unknown validation error',
    } as ValidationWorkerMessage);
  }
});

async function validateData(messageData: ValidationWorkerData): Promise<void> {
  const { processedImages, originalUrl } = messageData;

  // Use new properties
  const images = processedImages;
  const pageUrl = originalUrl;

  if (!images || !Array.isArray(images) || images.length === 0) {
    throw new Error('No processed images data received for validation');
  }

  if (!pageUrl) {
    throw new Error('No page URL received for validation');
  }

  parentPort!.postMessage({
    type: 'log',
    data: { message: `Validating ${images.length} worker results`, level: 'info' },
  } as ValidationWorkerMessage);

  try {
    // Filter out null results (non-karaoke images)
    const validResults = images.filter(
      (result) => result && (result.vendor || result.dj || result.show),
    );

    parentPort!.postMessage({
      type: 'log',
      data: {
        message: `Found ${validResults.length} valid karaoke results out of ${images.length} processed images`,
        level: 'info',
      },
    } as ValidationWorkerMessage);

    // Simple aggregation without re-calling Gemini
    const vendors: any[] = [];
    const venues: any[] = [];
    const djs: any[] = [];
    const shows: any[] = [];

    validResults.forEach((result) => {
      // Add vendor if present
      if (result.vendor) {
        vendors.push({
          name: result.vendor,
          confidence: 0.8,
        });
      }

      // Add DJ if present
      if (result.dj) {
        djs.push({
          name: result.dj,
          confidence: 0.8,
        });
      }

      // Add show if present
      if (result.show) {
        shows.push({
          ...result.show,
          source: result.source,
          confidence: 0.8,
        });

        // Add venue from show
        if (result.show.venue) {
          venues.push({
            name: result.show.venue,
            address: result.show.address,
            city: result.show.city,
            state: result.show.state,
            confidence: 0.8,
          });
        }
      }
    });

    // Remove duplicates and create final data structure
    const finalData: ParsedFacebookData = {
      vendors: Array.from(new Set(vendors.map((v) => v.name))).map(
        (name) => vendors.find((v) => v.name === name)!,
      ),
      venues: Array.from(new Set(venues.map((v) => v.name))).map(
        (name) => venues.find((v) => v.name === name)!,
      ),
      djs: Array.from(new Set(djs.map((d) => d.name))).map(
        (name) => djs.find((d) => d.name === name)!,
      ),
      shows: shows,
      rawData: {
        url: pageUrl,
        title: 'Facebook Post Analysis',
        content: `Analyzed ${images.length} images, found ${validResults.length} karaoke events`,
        parsedAt: new Date(),
      },
    };

    parentPort!.postMessage({
      type: 'log',
      data: {
        message: `Validation complete: ${finalData.shows.length} shows, ${finalData.djs.length} DJs, ${finalData.vendors.length} vendors`,
        level: 'info',
      },
    } as ValidationWorkerMessage);

    parentPort!.postMessage({
      type: 'complete',
      data: finalData,
    } as ValidationWorkerMessage);
  } catch (error) {
    console.error('Validation aggregation error:', error);

    // Return minimal structure on error
    const fallbackData: ParsedFacebookData = {
      vendors: [],
      venues: [],
      djs: [],
      shows: [],
      rawData: {
        url: pageUrl,
        title: 'Facebook Post Analysis (Fallback)',
        content: `Attempted to analyze ${images.length} images but validation failed`,
        parsedAt: new Date(),
      },
    };

    parentPort!.postMessage({
      type: 'complete',
      data: fallbackData,
    } as ValidationWorkerMessage);
  }
}
