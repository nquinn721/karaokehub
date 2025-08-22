/**
 * Facebook Image Parser Worker
 * Handles individual image parsing with Gemini AI
 * - Loads image as base64
 * - Uses Gemini with rules for karaoke show parsing
 * - Returns {vendor, dj, show} object
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as http from 'http';
import * as https from 'https';
import { parentPort } from 'worker_threads';
import { getGeminiModel } from '../../config/gemini.config';

interface ImageWorkerData {
  base64Data?: string; // Pre-loaded base64 data from parallel worker
  imageUrl?: string; // Original URL for fallback and logging
  mimeType?: string; // MIME type from parallel worker
  geminiApiKey: string;
  workerId: number;
}

interface ParsedImageResult {
  vendor?: string;
  dj?: string;
  show?: {
    venue?: string;
    address?: string;
    time?: string;
    startTime?: string;
    endTime?: string;
    state?: string;
    zip?: string;
    city?: string;
    lat?: string;
    lng?: string;
    day?: string;
    venuePhone?: string;
    venueWebsite?: string;
  };
  imageUrl?: string;
  source: string;
  success: boolean;
  error?: string;
}

/**
 * Load image as base64 with fallback support
 */
async function loadImageAsBase64(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = imageUrl.startsWith('https:') ? https : http;

    const request = client
      .get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const chunks: Buffer[] = [];

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          resolve(base64);
        });
      })
      .on('error', (error) => {
        reject(error);
      });

    // Set timeout
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Image load timeout'));
    });
  });
}

/**
 * Parse karaoke show image using Gemini AI
 */
async function parseKaraokeImageWithGemini(
  base64Image: string,
  imageUrl: string,
  geminiApiKey: string,
): Promise<ParsedImageResult> {
  try {
    if (!geminiApiKey) {
      throw new Error('No Gemini API key provided');
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: getGeminiModel('facebook') });

    const prompt = `Analyze this social media image and extract ANY karaoke-related information, even if not from a formal event flyer. Look for:

BROAD KARAOKE CONTENT DETECTION:
1. Venue mentions (bars, restaurants, clubs where karaoke happens)
2. Any text mentioning "karaoke", "singing", "mic night", "open mic"
3. DJ/host names in social contexts
4. Location information (addresses, venue names, business names)
5. Casual photos FROM karaoke venues/events
6. Social media posts ABOUT karaoke events
7. Screenshots of conversations mentioning karaoke venues

BE FLEXIBLE AND INCLUSIVE:
- Extract venue names even from casual mentions or photos
- Look for DJ names in comments, captions, or casual references  
- Extract location info from any context (not just formal flyers)
- Include venues that "host karaoke" even if not explicitly stated
- Consider bars/clubs/restaurants as potential karaoke venues
- Extract information from low-quality or blurry images when possible

INTELLIGENT GEOGRAPHIC PROCESSING:
1. ALWAYS try to infer missing geographic data when you find any location information
2. Use your knowledge of US geography to complete partial addresses
3. If you find a venue name, try to determine its likely location based on context
4. **VENUE NAME LOOKUP**: If you can't find a complete address but have a venue name, use your knowledge to provide the full address and coordinates for that venue
5. **VENUE CONTACT INFO**: For known venues, try to provide phone number and website from your knowledge
6. For addresses, extract AND infer all possible location data:
   - Full address: "123 Main St, Columbus, OH 43215" → extract all parts
   - Partial address: "456 Elm Street, Hilliard" → infer state as "OH" 
   - City only: "downtown Columbus" → infer state: "OH", common zip: "43215"
   - Venue context: "Otie's Tavern in Powell" → city: "Powell", state: "OH"
   - **Venue only**: "Otie's Tavern & Grille" → lookup full address: "5861 Sawmill Rd, Dublin, OH 43017"
6. Use zip code knowledge to determine city/state if you see one
7. Use well-known venue chains or local knowledge to infer locations
8. **COMPLETE GEO DATA**: Always try to provide lat/lng coordinates when you know the venue's exact location

GEOGRAPHIC INTELLIGENCE EXAMPLES:
- "Hilliard" → state: "OH" (known Ohio suburb)
- "Powell" → state: "OH" (known Ohio city)  
- "43026" → city: "Hilliard", state: "OH"
- "43215" → city: "Columbus", state: "OH"
- "Leap-N-Lizard's" + "Cemetery Rd" → likely Hilliard, OH area
- "Otie's Tavern" → known Ohio chain, likely Columbus area

Return JSON format:
{
  "vendor": "company, venue, or business name related to karaoke",
  "dj": "DJ, host, or performer name (even casual mentions)",
  "show": {
    "venue": "any venue name mentioned (bar, club, restaurant, etc.)",
    "address": "any address or location information found OR looked up from venue name",
    "time": "any time mentioned",
    "startTime": "start time if available",
    "endTime": "end time if available", 
    "state": "state abbreviation - EXTRACT from address OR INFER from city/venue context OR lookup from venue",
    "zip": "zip code - EXTRACT from address OR INFER from city knowledge OR lookup from venue",
    "city": "city name - EXTRACT from address OR INFER from venue/context OR lookup from venue",
    "lat": "latitude - PROVIDE if you know the venue's exact location",
    "lng": "longitude - PROVIDE if you know the venue's exact location",
    "day": "day of week or date if mentioned",
    "venuePhone": "phone number if visible OR looked up from venue name",
    "venueWebsite": "website URL if visible OR looked up from venue name"
  }
}

PROCESSING EXAMPLES:
- Image shows "Otie's Tavern, Hilliard" → venue: "Otie's Tavern", city: "Hilliard", state: "OH", zip: "43026" (inferred)
- Address "Cemetery Rd, Hilliard, OH" → city: "Hilliard", state: "OH", zip: "43026" (inferred)
- Venue "Downtown Columbus bar" → city: "Columbus", state: "OH", zip: "43215" (inferred)
- "Powell karaoke night" → city: "Powell", state: "OH", zip: "43065" (inferred)
- **VENUE LOOKUP**: "Champions Grille" → lookup: address: "123 Main St, Anytown, OH 12345", lat: "40.123", lng: "-83.456", phone: "(614) 555-0123", website: "championsgrille.com"
- **KNOWN VENUE**: "Otie's Tavern & Grille" → lookup: address: "5861 Sawmill Rd, Dublin, OH 43017", lat: "40.099", lng: "-83.114", phone: "(614) 889-3030", website: "otiestavern.com"

IMPORTANT: Even if location data isn't visible in the image, use your geographic knowledge to fill in what you can reasonably infer from venue names, partial addresses, or city mentions. For known venues, also try to provide their phone number and website if you know them.

If NO karaoke-related content is found AT ALL, return empty fields.
Return ONLY the JSON object, no other text.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const response = result.response.text().trim();

    // Debug logging - log raw Gemini response
    if (parentPort) {
      parentPort.postMessage({
        type: 'progress',
        workerId: 0, // Will be set by worker
        message: `🔍 Raw Gemini response: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`,
      });
    }

    // Try to parse JSON response
    let parsedData;
    try {
      // Clean up response - remove any markdown or extra text
      let jsonString = response;

      // Remove markdown code blocks if present
      if (response.includes('```json')) {
        jsonString = response.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (response.includes('```')) {
        jsonString = response.replace(/```\s*/, '').replace(/```\s*$/, '');
      }

      // Extract JSON object - handle multi-line objects
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(jsonString.trim());
      }
    } catch (parseError) {
      throw new Error(`Failed to parse Gemini JSON response: ${response}`);
    }

    // Validate and clean data
    const parsedResult: ParsedImageResult = {
      vendor: parsedData.vendor?.trim() || undefined,
      dj: parsedData.dj?.trim() || undefined,
      show: parsedData.show
        ? {
            venue: parsedData.show.venue?.trim() || undefined,
            address: parsedData.show.address?.trim() || undefined,
            time: parsedData.show.time?.trim() || undefined,
            startTime: parsedData.show.startTime?.trim() || undefined,
            endTime: parsedData.show.endTime?.trim() || undefined,
            state: parsedData.show.state?.trim() || undefined,
            zip: parsedData.show.zip?.trim() || undefined,
            city: parsedData.show.city?.trim() || undefined,
            day: parsedData.show.day?.trim() || undefined,
            venuePhone: parsedData.show.venuePhone?.trim() || undefined,
            venueWebsite: parsedData.show.venueWebsite?.trim() || undefined,
          }
        : undefined,

      imageUrl: imageUrl,
      source: imageUrl,
      success: true,
    };

    // Only return result if at least one field has data
    if (parsedResult.vendor || parsedResult.dj || parsedResult.show) {
      return parsedResult;
    } else {
      // Debug logging - log why result was rejected
      if (parentPort) {
        parentPort.postMessage({
          type: 'progress',
          workerId: 0, // Will be set by worker
          message: `❌ Rejected - No valid data found. Vendor: "${parsedResult.vendor}", DJ: "${parsedResult.dj}", Show: ${parsedResult.show ? 'exists' : 'null'}`,
        });
      }
      return {
        imageUrl: imageUrl,
        source: imageUrl,
        success: false,
        error: 'No karaoke information found in image',
      };
    }
  } catch (error) {
    return {
      imageUrl: imageUrl,
      source: imageUrl,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main worker function - parse single image (supports both pre-loaded base64 and URL loading)
 */
async function parseImage(data: ImageWorkerData): Promise<ParsedImageResult> {
  const { base64Data, imageUrl, mimeType, geminiApiKey, workerId } = data;

  try {
    // Use pre-loaded base64 data if available, otherwise load from URL
    let base64Image: string;

    if (base64Data) {
      // Base64 data already provided by parallel image loading worker
      if (parentPort) {
        parentPort.postMessage({
          type: 'progress',
          workerId,
          message: `Using pre-loaded image data (${mimeType || 'unknown type'})`,
        });
      }
      base64Image = base64Data;
    } else if (imageUrl) {
      // Fallback to loading from URL (legacy support)
      if (parentPort) {
        parentPort.postMessage({
          type: 'progress',
          workerId,
          message: `Loading image: ${imageUrl.substring(0, 50)}...`,
        });
      }
      base64Image = await loadImageAsBase64(imageUrl);
    } else {
      throw new Error('Neither base64Data nor imageUrl provided');
    }

    if (parentPort) {
      parentPort.postMessage({
        type: 'progress',
        workerId,
        message: `Parsing with Gemini AI...`,
      });
    }

    // Parse with Gemini
    const result = await parseKaraokeImageWithGemini(
      base64Image,
      imageUrl || 'pre-loaded-image',
      geminiApiKey,
    );

    if (parentPort) {
      if (result.success) {
        const fields = [
          result.vendor && `Vendor: ${result.vendor}`,
          result.dj && `DJ: ${result.dj}`,
          result.show?.venue && `Venue: ${result.show.venue}`,
          result.show?.address && `Address: ${result.show.address}`,
          result.show?.city && `City: ${result.show.city}`,
          result.show?.state && `State: ${result.show.state}`,
          result.show?.zip && `Zip: ${result.show.zip}`,
          result.show?.time && `Time: ${result.show.time}`,
          result.show?.day && `Day: ${result.show.day}`,
        ]
          .filter(Boolean)
          .join(', ');

        parentPort.postMessage({
          type: 'progress',
          workerId,
          message: `✅ Parsed: ${fields || 'No data'}`,
        });
      } else {
        parentPort.postMessage({
          type: 'progress',
          workerId,
          message: `❌ No karaoke data found`,
        });
      }
    }

    return result;
  } catch (error) {
    const errorResult: ParsedImageResult = {
      imageUrl: imageUrl || 'pre-loaded-image',
      source: imageUrl || 'pre-loaded-image',
      success: false,
      error: error.message,
    };

    if (parentPort) {
      parentPort.postMessage({
        type: 'progress',
        workerId,
        message: `❌ Error: ${error.message}`,
      });
    }

    return errorResult;
  }
}

// Worker entry point
if (parentPort) {
  parentPort.on('message', async (data: ImageWorkerData) => {
    try {
      const result = await parseImage(data);
      parentPort?.postMessage({ type: 'complete', workerId: data.workerId, data: result });
    } catch (error) {
      parentPort?.postMessage({
        type: 'error',
        workerId: data.workerId,
        error: error.message,
        data: {
          imageUrl: data.imageUrl || (data.base64Data ? 'pre-loaded-image' : 'unknown'),
          source: data.imageUrl || (data.base64Data ? 'pre-loaded-image' : 'unknown'),
          success: false,
          error: error.message,
        },
      });
    }
  });
}

// Export for testing
export { parseImage };
