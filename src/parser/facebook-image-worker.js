const { parentPort, workerData } = require('worker_threads');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function processImages() {
  const { images, batchIndex, geminiApiKey } = workerData;

  if (!geminiApiKey) {
    parentPort.postMessage({
      type: 'error',
      data: { message: 'GEMINI_API_KEY is required' },
    });
    return;
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const results = [];
  let processedCount = 0;

  parentPort.postMessage({
    type: 'log',
    data: {
      message: `Worker ${batchIndex + 1} starting to process ${images.length} images`,
      level: 'info',
    },
  });

  for (const imageUrlPair of images) {
    try {
      // First try fullUrl, fallback to thumbnail
      let imageUrl = imageUrlPair.fullUrl;
      let imageBuffer;

      try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        imageBuffer = await response.arrayBuffer();
      } catch (fullUrlError) {
        // Fallback to thumbnail
        parentPort.postMessage({
          type: 'log',
          data: {
            message: `Full URL failed, trying thumbnail: ${imageUrlPair.thumbnail}`,
            level: 'warning',
          },
        });

        imageUrl = imageUrlPair.thumbnail;
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        imageBuffer = await response.arrayBuffer();
      }

      const prompt = `You are an expert karaoke event data extractor. Analyze this image for karaoke event information.

EXTRACT THE FOLLOWING IF PRESENT:
- Vendor/Company name (who provides karaoke service)
- DJ/Host name 
- Show details (venue, address, time, day)
- Address components (street, city, state, ZIP)
- Coordinates if mentioned

INSTRUCTIONS:
1. Look for karaoke-specific events only
2. Extract COMPLETE addresses when possible
3. Separate address components properly
4. Provide precise coordinates if you can determine location
5. Return "null" for missing information
6. Focus on recurring karaoke shows

Return ONLY this JSON format:
{
  "vendor": "Company name or null",
  "dj": "DJ name or null", 
  "show": {
    "venue": "Venue name or null",
    "address": "Street address only or null",
    "city": "City name only or null", 
    "state": "State abbreviation or null",
    "zip": "ZIP code or null",
    "dayOfWeek": "Day of week or null",
    "time": "Show time or null",
    "description": "Additional details or null"
  },
  "lat": decimal_number_or_null,
  "lng": decimal_number_or_null,
  "source": "${imageUrl}"
}`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: Buffer.from(imageBuffer).toString('base64'),
            mimeType: 'image/jpeg',
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          const parsedData = JSON.parse(jsonMatch[0]);

          // Only add if we found actual karaoke content
          if (parsedData.vendor || parsedData.dj || parsedData.show?.venue) {
            results.push({
              vendor: parsedData.vendor,
              dj: parsedData.dj,
              show: parsedData.show,
              addressComponent: parsedData.show?.address,
              lat: parsedData.lat,
              lng: parsedData.lng,
              source: imageUrl,
            });
          }
        } catch (parseError) {
          parentPort.postMessage({
            type: 'log',
            data: {
              message: `JSON parse error for ${imageUrl}: ${parseError.message}`,
              level: 'warning',
            },
          });
        }
      }

      processedCount++;

      // Send progress update
      parentPort.postMessage({
        type: 'progress',
        data: { processedCount, totalCount: images.length },
      });

      // Rate limiting - wait between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      parentPort.postMessage({
        type: 'log',
        data: {
          message: `Error processing ${imageUrlPair.thumbnail}: ${error.message}`,
          level: 'warning',
        },
      });

      // Continue processing other images
      processedCount++;
    }
  }

  parentPort.postMessage({
    type: 'complete',
    data: results,
  });
}

// Handle rate limit errors with retry
async function handleRateLimit(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('rate') && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        parentPort.postMessage({
          type: 'log',
          data: {
            message: `Rate limit hit, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
            level: 'warning',
          },
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Start processing
processImages().catch((error) => {
  parentPort.postMessage({
    type: 'error',
    data: { message: error.message },
  });
});
