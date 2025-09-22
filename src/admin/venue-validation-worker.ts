/**
 * Venue Validation Worker
 * Handles venue geo data validation using Gemini AI in a separate thread
 * to avoid blocking the main application thread during intensive processing
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { parentPort } from 'worker_threads';
import { getGeminiModel } from '../config/gemini.config';

interface VenueValidationWorkerData {
  venues: VenueData[];
  geminiApiKey: string;
}

interface VenueData {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  lat?: number;
  lng?: number;
  isActive: boolean;
}

interface VenueValidationResult {
  venueId: string;
  venueName: string;
  status: 'validated' | 'conflict' | 'error' | 'skipped';
  message: string;
  currentData: any;
  suggestedData?: any;
  conflicts?: string[];
  wasUpdated: boolean;
  confidence: number;
}

interface ValidationWorkerResult {
  success: boolean;
  results: VenueValidationResult[];
  summary: {
    totalVenues: number;
    validatedCount: number;
    conflictsFound: number;
    updatedCount: number;
    errorsCount: number;
  };
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
 * Send error message to parent
 */
function sendError(error: string) {
  if (parentPort) {
    parentPort.postMessage({ type: 'error', error });
  }
}

/**
 * Send completion message to parent
 */
function sendComplete(data: ValidationWorkerResult) {
  if (parentPort) {
    parentPort.postMessage({ type: 'complete', data });
  }
}

/**
 * Use Gemini AI to lookup venue information and compare with database
 */
async function lookupVenueWithGemini(
  searchQuery: string,
  venue: VenueData,
  model: any,
): Promise<{
  hasConflicts: boolean;
  wasUpdated: boolean;
  message: string;
  currentData: any;
  suggestedData: any;
  conflicts: string[];
  confidence: number;
}> {
  try {
    const currentData = extractVenueData(venue);

    const prompt = `You are a venue data validation expert. Look up accurate information for this venue and compare it with the current database data.

Venue to lookup: "${searchQuery}"

Current database data:
- Name: ${venue.name || 'Not provided'}
- Address: ${venue.address || 'Not provided'}
- City: ${venue.city || 'Not provided'}
- State: ${venue.state || 'Not provided'}
- ZIP: ${venue.zip || 'Not provided'}
- Phone: ${venue.phone || 'Not provided'}
- Website: ${venue.website || 'Not provided'}
- Coordinates: ${venue.lat && venue.lng ? `${venue.lat}, ${venue.lng}` : 'Not provided'}

Please find the most accurate, up-to-date information for this venue and return a JSON response with this structure:

{
  "venueFound": true/false,
  "confidence": 0.0-1.0,
  "suggestedData": {
    "name": "Exact venue name",
    "address": "Full street address",
    "city": "City name",
    "state": "State abbreviation (2 letters)",
    "zip": "ZIP code",
    "phone": "Phone number",
    "website": "Website URL",
    "lat": number,
    "lng": number
  },
  "conflicts": [
    "List of specific conflicts found between current and suggested data"
  ],
  "message": "Summary of findings"
}

If the venue cannot be found or you're not confident in the information, set venueFound to false and confidence to 0.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    if (!parsedData.venueFound || parsedData.confidence < 0.5) {
      return {
        hasConflicts: false,
        wasUpdated: false,
        message: 'Venue not found or low confidence',
        currentData,
        suggestedData: null,
        conflicts: [],
        confidence: parsedData.confidence || 0,
      };
    }

    // Compare current data with suggested data
    const conflicts = compareVenueData(currentData, parsedData.suggestedData);
    const hasConflicts = conflicts.length > 0;

    // Auto-update if confidence is high and has missing data that can be filled
    let wasUpdated = false;
    if (parsedData.confidence >= 0.9) {
      // Update missing fields only (don't overwrite existing data unless there's a clear error)
      if (!venue.address && parsedData.suggestedData.address) {
        venue.address = parsedData.suggestedData.address;
        wasUpdated = true;
      }
      if (!venue.city && parsedData.suggestedData.city) {
        venue.city = parsedData.suggestedData.city;
        wasUpdated = true;
      }
      if (!venue.state && parsedData.suggestedData.state) {
        venue.state = parsedData.suggestedData.state;
        wasUpdated = true;
      }
      if (!venue.zip && parsedData.suggestedData.zip) {
        venue.zip = parsedData.suggestedData.zip;
        wasUpdated = true;
      }
      if (!venue.phone && parsedData.suggestedData.phone) {
        venue.phone = parsedData.suggestedData.phone;
        wasUpdated = true;
      }
      if (!venue.website && parsedData.suggestedData.website) {
        venue.website = parsedData.suggestedData.website;
        wasUpdated = true;
      }
      if (
        (!venue.lat || !venue.lng) &&
        parsedData.suggestedData.lat &&
        parsedData.suggestedData.lng
      ) {
        venue.lat = parsedData.suggestedData.lat;
        venue.lng = parsedData.suggestedData.lng;
        wasUpdated = true;
      }
    }

    return {
      hasConflicts,
      wasUpdated,
      message: hasConflicts
        ? `Found ${conflicts.length} conflicts with current data`
        : 'Venue data validated successfully',
      currentData,
      suggestedData: parsedData.suggestedData,
      conflicts,
      confidence: parsedData.confidence,
    };
  } catch (error) {
    return {
      hasConflicts: false,
      wasUpdated: false,
      message: `Error during validation: ${error.message}`,
      currentData: extractVenueData(venue),
      suggestedData: null,
      conflicts: [],
      confidence: 0,
    };
  }
}

/**
 * Compare venue data and identify conflicts
 */
function compareVenueData(current: any, suggested: any): string[] {
  const conflicts = [];

  // Compare name
  if (
    current.name &&
    suggested.name &&
    current.name.toLowerCase() !== suggested.name.toLowerCase()
  ) {
    conflicts.push(`Name: '${current.name}' vs '${suggested.name}'`);
  }

  // Compare address
  if (current.address && suggested.address) {
    const currentAddr = current.address.toLowerCase().replace(/[^\w\s]/g, '');
    const suggestedAddr = suggested.address.toLowerCase().replace(/[^\w\s]/g, '');
    if (currentAddr !== suggestedAddr) {
      conflicts.push(`Address: '${current.address}' vs '${suggested.address}'`);
    }
  } else if (!current.address && suggested.address) {
    conflicts.push('Address is missing in current data');
  }

  // Compare city
  if (
    current.city &&
    suggested.city &&
    current.city.toLowerCase() !== suggested.city.toLowerCase()
  ) {
    conflicts.push(`City: '${current.city}' vs '${suggested.city}'`);
  }

  // Compare state
  if (
    current.state &&
    suggested.state &&
    current.state.toUpperCase() !== suggested.state.toUpperCase()
  ) {
    conflicts.push(`State: '${current.state}' vs '${suggested.state}'`);
  }

  // Compare coordinates (allow for small differences)
  if (current.lat && current.lng && suggested.lat && suggested.lng) {
    const distance = calculateDistance(current.lat, current.lng, suggested.lat, suggested.lng);
    if (distance > 0.5) {
      // More than 0.5 miles difference
      conflicts.push(`Location differs by ${distance.toFixed(2)} miles`);
    }
  }

  return conflicts;
}

/**
 * Calculate distance between two points in miles
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extract venue data for comparison
 */
function extractVenueData(venue: VenueData): any {
  return {
    name: venue.name,
    address: venue.address,
    city: venue.city,
    state: venue.state,
    zip: venue.zip,
    phone: venue.phone,
    website: venue.website,
    lat: venue.lat,
    lng: venue.lng,
  };
}

/**
 * Main worker function - validate venue data
 */
async function validateVenueData(data: VenueValidationWorkerData): Promise<ValidationWorkerResult> {
  const { venues, geminiApiKey } = data;

  try {
    sendProgress(`🚀 [VENUE-VALIDATION] Starting venue validation worker...`);
    sendProgress(`📊 [VENUE-VALIDATION] Processing ${venues.length} venues`);

    if (!geminiApiKey) {
      throw new Error('No Gemini API key provided');
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: getGeminiModel('worker'),
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    const results = [];
    let validatedCount = 0;
    let conflictsFound = 0;
    let updatedCount = 0;
    let errorsCount = 0;

    for (let i = 0; i < venues.length; i++) {
      const venue = venues[i];

      try {
        sendProgress(
          `🔍 [VENUE-VALIDATION] Processing venue ${i + 1}/${venues.length}: ${venue.name}`,
        );

        // Build search query for Gemini
        const searchQuery = [venue.name, venue.address, venue.city, venue.state]
          .filter(Boolean)
          .join(', ');

        if (!searchQuery.trim()) {
          results.push({
            venueId: venue.id,
            venueName: venue.name,
            status: 'skipped',
            message: 'Insufficient data for validation',
            currentData: extractVenueData(venue),
            wasUpdated: false,
            confidence: 0,
          });
          continue;
        }

        // Use Gemini to lookup venue information
        const geminiResult = await lookupVenueWithGemini(searchQuery, venue, model);
        validatedCount++;

        if (geminiResult.hasConflicts) {
          conflictsFound++;
        }

        if (geminiResult.wasUpdated) {
          updatedCount++;
        }

        results.push({
          venueId: venue.id,
          venueName: venue.name,
          status: geminiResult.hasConflicts ? 'conflict' : 'validated',
          message: geminiResult.message,
          currentData: geminiResult.currentData,
          suggestedData: geminiResult.suggestedData,
          conflicts: geminiResult.conflicts,
          wasUpdated: geminiResult.wasUpdated,
          confidence: geminiResult.confidence,
        });

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        errorsCount++;
        sendProgress(
          `❌ [VENUE-VALIDATION] Error processing venue ${venue.name}: ${error.message}`,
        );

        results.push({
          venueId: venue.id,
          venueName: venue.name,
          status: 'error',
          message: `Error validating venue: ${error.message}`,
          currentData: extractVenueData(venue),
          wasUpdated: false,
          confidence: 0,
        });
      }
    }

    sendProgress(`✅ [VENUE-VALIDATION] Completed processing ${venues.length} venues`);

    return {
      success: true,
      results,
      summary: {
        totalVenues: venues.length,
        validatedCount,
        conflictsFound,
        updatedCount,
        errorsCount,
      },
    };
  } catch (error) {
    sendProgress(`❌ [VENUE-VALIDATION] Worker failed: ${error.message}`);
    return {
      success: false,
      results: [],
      summary: {
        totalVenues: venues.length,
        validatedCount: 0,
        conflictsFound: 0,
        updatedCount: 0,
        errorsCount: venues.length,
      },
      error: error.message,
    };
  }
}

// Handle messages from parent process
if (parentPort) {
  parentPort.on('message', async (data: VenueValidationWorkerData) => {
    try {
      const result = await validateVenueData(data);
      sendComplete(result);
    } catch (error) {
      sendError(error.message);
    }
  });
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  sendError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  sendError(`Unhandled rejection at ${promise}, reason: ${reason}`);
  process.exit(1);
});
