/**
 * Facebook Data Validation Worker
 * Handles data validation and address completion     (info) => `
Show ${info.index + 1}:
- Vendor: ${info.vendor}
- DJ: ${info.dj}
- Venue: ${info.venue}
- Address: ${info.address}
- Current State: ${info.currentState}
- Current City: ${info.currentCity}
- Current Zip: ${info.currentZip}
- Current Lat: ${info.currentLat}
- Current Lng: ${info.currentLng}
- Missing: ${info.missingFields.join(', ') || 'None'}`i AI
 * - Takes parsed show data
 * - Uses Gemini to fill missing state/zip/lat/lng/city
 * - Returns validated and enhanced data
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { parentPort } from 'worker_threads';
import { getGeminiModel } from '../../config/gemini.config';

interface ValidationWorkerData {
  shows: ParsedImageData[];
  geminiApiKey: string;
}

interface ParsedImageData {
  vendor?: string;
  dj?: string;
  show?: {
    venue?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    day?: string;
    time?: string;
    startTime?: string;
    endTime?: string;
    lat?: string;
    lng?: string;
    venuePhone?: string;
    venueWebsite?: string;
  };
  imageUrl?: string;
  source: string;
  success: boolean;
  error?: string;
}

interface ValidationResult {
  success: boolean;
  validatedData: ParsedImageData[];
  error?: string;
}

/**
 * Send progress message to parent
 */
function sendProgress(message: string) {
  if (parentPort) {
    parentPort.postMessage({ type: 'progress', message });
  }
}

/**
 * Process a batch of shows with Gemini AI
 */
async function processBatchWithGemini(
  model: any,
  shows: ParsedImageData[],
): Promise<ParsedImageData[]> {
  const showsInfo = shows.map((show, index) => {
    const missingData = [];
    if (!show.show?.state) missingData.push('state');
    if (!show.show?.city) missingData.push('city');
    if (!show.show?.zip) missingData.push('zip');
    if (!show.show?.lat) missingData.push('lat');
    if (!show.show?.lng) missingData.push('lng');

    return {
      index,
      vendor: show.vendor || 'Unknown',
      dj: show.dj || 'Unknown',
      venue: show.show?.venue || 'Unknown',
      address: show.show?.address || 'Unknown',
      currentState: show.show?.state || 'MISSING',
      currentCity: show.show?.city || 'MISSING',
      currentZip: show.show?.zip || 'MISSING',
      currentLat: show.show?.lat || 'MISSING',
      currentLng: show.show?.lng || 'MISSING',
      missingFields: missingData,
    };
  });

  const prompt = `You are a location data specialist. Analyze these karaoke show information and fill in missing location data for each show.

SHOWS TO PROCESS:
${showsInfo
  .map(
    (info) => `
Show ${info.index + 1}:
- Vendor: ${info.vendor}
- DJ: ${info.dj}
- Venue: ${info.venue}
- Address: ${info.address}
- Current State: ${info.currentState}
- Current City: ${info.currentCity}
- Current Zip: ${info.currentZip}
- Current Lat: ${info.currentLat}
- Current Lng: ${info.currentLng}
- Missing: ${info.missingFields.join(', ') || 'None'}
`,
  )
  .join('')}

INSTRUCTIONS:
1. For each show, use the vendor, DJ, and show information to determine the most likely location
2. If a venue name is mentioned, research that venue's location
3. If a city/state is mentioned in the text, use that information
4. Fill in missing location data with your best estimate
5. Be conservative - if you're not confident, leave the field as null
6. Return ONLY a valid JSON array with enhanced data for each show

RETURN FORMAT (JSON only, no other text):
[
  {
    "index": 0,
    "vendor": "venue name",
    "dj": "dj name",
    "show": "show name",
    "source": "facebook",
    "success": true,
    "state": "Two letter state code or null",
    "city": "City name or null",
    "zip": "Zip code or null",
    "lat": latitude_number_or_null,
    "lng": longitude_number_or_null
  }
  // ... more shows
]

Return ONLY the JSON array, no markdown, no explanations.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text().trim();

  // Parse Gemini response
  let enhancedDataArray;
  try {
    // Clean up response - remove any markdown or extra text
    let jsonString = response;
    if (response.includes('```json')) {
      jsonString = response.replace(/```json\s*/, '').replace(/```\s*$/, '');
    } else if (response.includes('```')) {
      jsonString = response.replace(/```\s*/, '').replace(/```\s*$/, '');
    }

    const jsonMatch = jsonString.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      enhancedDataArray = JSON.parse(jsonMatch[0]);
    } else {
      enhancedDataArray = JSON.parse(jsonString.trim());
    }
  } catch (parseError) {
    sendProgress(`❌ [BATCH] Failed to parse JSON response: ${parseError.message}`);
    return shows; // Return original shows if parsing fails
  }

  // Merge enhanced data with original shows
  const validatedShows: ParsedImageData[] = [];

  for (let i = 0; i < shows.length; i++) {
    const originalShow = shows[i];
    const enhancedData = enhancedDataArray.find((data: any) => data.index === i);

    if (enhancedData) {
      const validatedShow: ParsedImageData = {
        ...originalShow,
        show: {
          ...originalShow.show,
          state: enhancedData.state || originalShow.show?.state,
          city: enhancedData.city || originalShow.show?.city,
          zip: enhancedData.zip || originalShow.show?.zip,
          lat: enhancedData.lat || originalShow.show?.lat,
          lng: enhancedData.lng || originalShow.show?.lng,
        },
      };

      // Log what was enhanced
      const enhanced = [];
      if (enhancedData.state && !originalShow.show?.state) enhanced.push('state');
      if (enhancedData.city && !originalShow.show?.city) enhanced.push('city');
      if (enhancedData.zip && !originalShow.show?.zip) enhanced.push('zip');
      if (enhancedData.lat && !originalShow.show?.lat) enhanced.push('lat');
      if (enhancedData.lng && !originalShow.show?.lng) enhanced.push('lng');

      if (enhanced.length > 0) {
        sendProgress(`✅ [BATCH] Show ${i + 1}: Enhanced ${enhanced.join(', ')}`);
      }

      validatedShows.push(validatedShow);
    } else {
      sendProgress(`⚠️ [BATCH] Show ${i + 1}: No enhanced data found, keeping original`);
      validatedShows.push(originalShow);
    }
  }

  return validatedShows;
}

/**
 * Validate and enhance show data using Gemini AI
 */
async function validateDataWithGemini(
  shows: ParsedImageData[],
  geminiApiKey: string,
): Promise<ParsedImageData[]> {
  try {
    if (!geminiApiKey) {
      sendProgress('No Gemini API key provided, skipping data validation...');
      return shows;
    }

    sendProgress(`🤖 [VALIDATION] Starting data validation for ${shows.length} shows...`);

    // Step 1: Separate shows with complete vs incomplete geo data
    const completeShows: ParsedImageData[] = [];
    const incompleteShows: ParsedImageData[] = [];

    for (const show of shows) {
      // Check if show has complete geo data: venue/address and state, city, zip, lat, lng
      const hasCompleteGeoData =
        show.show?.venue &&
        show.show?.state &&
        show.show?.city &&
        show.show?.zip &&
        show.show?.lat &&
        show.show?.lng;

      if (hasCompleteGeoData) {
        completeShows.push(show);
      } else {
        incompleteShows.push(show);
      }
    }

    sendProgress(`✅ [VALIDATION] ${completeShows.length} shows have complete geo data (skipping)`);
    sendProgress(`🔍 [VALIDATION] ${incompleteShows.length} shows need geo data enhancement`);

    // Step 2: If no shows need validation, return early
    if (incompleteShows.length === 0) {
      sendProgress(`🎉 [VALIDATION] All shows have complete data - validation skipped!`);
      return shows;
    }

    // Step 3: Batch process incomplete shows
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: getGeminiModel('worker') });

    const batchSize = 5; // Process 5 shows per batch to avoid token limits
    const validatedIncompleteShows: ParsedImageData[] = [];

    for (let i = 0; i < incompleteShows.length; i += batchSize) {
      const batch = incompleteShows.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(incompleteShows.length / batchSize);

      sendProgress(
        `🔄 [VALIDATION] Processing batch ${batchNumber}/${totalBatches} (${batch.length} shows)...`,
      );

      try {
        const batchResult = await processBatchWithGemini(model, batch);
        validatedIncompleteShows.push(...batchResult);
      } catch (error) {
        sendProgress(`❌ [VALIDATION] Error processing batch ${batchNumber}: ${error.message}`);
        // Add original shows if batch processing fails
        validatedIncompleteShows.push(...batch);
      }
    }

    // Step 4: Combine complete + validated shows
    const allValidatedShows = [...completeShows, ...validatedIncompleteShows];

    sendProgress(`✅ [VALIDATION] Completed validation for ${allValidatedShows.length} shows`);
    return allValidatedShows;
  } catch (error) {
    sendProgress(`❌ [VALIDATION] Gemini validation failed: ${error.message}`);
    return shows; // Return original data if validation fails
  }
}

/**
 * Main worker function - validate show data
 */
async function validateShowData(data: ValidationWorkerData): Promise<ValidationResult> {
  const { shows, geminiApiKey } = data;

  try {
    sendProgress(`🚀 [VALIDATION] Starting data validation worker...`);
    sendProgress(`📊 [VALIDATION] Processing ${shows.length} shows`);

    // Filter shows that have actual data
    const validShows = shows.filter(
      (show) => show.success && (show.vendor || show.dj || show.show),
    );

    if (validShows.length === 0) {
      sendProgress(`⚠️ [VALIDATION] No valid shows to process`);
      return {
        success: true,
        validatedData: shows,
      };
    }

    sendProgress(`🔍 [VALIDATION] Found ${validShows.length} valid shows to validate`);

    // Validate and enhance data with Gemini
    const validatedData = await validateDataWithGemini(validShows, geminiApiKey);

    // Add back any shows that were filtered out (failed ones)
    const failedShows = shows.filter(
      (show) => !show.success || (!show.vendor && !show.dj && !show.show),
    );
    const allData = [...validatedData, ...failedShows];

    sendProgress(`✅ [VALIDATION] Data validation complete`);

    return {
      success: true,
      validatedData: allData,
    };
  } catch (error) {
    sendProgress(`❌ [VALIDATION] Worker failed: ${error.message}`);

    return {
      success: false,
      validatedData: shows,
      error: error.message,
    };
  }
}

// Worker entry point
if (parentPort) {
  parentPort.on('message', async (data: ValidationWorkerData) => {
    try {
      const result = await validateShowData(data);
      parentPort?.postMessage({ type: 'complete', data: result });
    } catch (error) {
      parentPort?.postMessage({
        type: 'error',
        error: error.message,
        data: {
          success: false,
          validatedData: data.shows,
          error: error.message,
        },
      });
    }
  });
}

// Export for testing
export { validateShowData };
