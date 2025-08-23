import { parentPort } from 'worker_threads';

interface WorkerMessage {
  imageUrls: string[];
}

interface LoadedImageData {
  url: string;
  base64: string;
  mimeType: string;
  success: boolean;
  error?: string;
  index: number;
}

async function downloadImageAsBase64(url: string, index: number): Promise<LoadedImageData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept: 'image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        DNT: '1',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      url,
      base64,
      mimeType: contentType,
      success: true,
      index,
    };
  } catch (error) {
    return {
      url,
      base64: '',
      mimeType: '',
      success: false,
      error: error.message,
      index,
    };
  }
}

async function processImages(imageUrls: string[]): Promise<LoadedImageData[]> {
  console.log(`📥 Starting parallel download of ${imageUrls.length} images...`);

  // Download all images in parallel using Promise.all
  const downloadPromises = imageUrls.map((url, index) => downloadImageAsBase64(url, index));

  const results = await Promise.all(downloadPromises);

  const successful = results.filter((result) => result.success);
  const failed = results.filter((result) => !result.success);

  console.log(`✅ Downloaded ${successful.length}/${imageUrls.length} images successfully`);
  if (failed.length > 0) {
    console.log(`❌ Failed to download ${failed.length} images`);
    failed.forEach((failure) => {
      console.log(`   Failed: ${failure.url.substring(0, 80)}... - ${failure.error}`);
    });
  }

  return results;
}

// Worker message handler
if (parentPort) {
  parentPort.on('message', async (data: WorkerMessage) => {
    try {
      const results = await processImages(data.imageUrls);
      parentPort?.postMessage({ success: true, results });
    } catch (error) {
      parentPort?.postMessage({
        success: false,
        error: error.message,
      });
    }
  });
}
