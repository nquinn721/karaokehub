/**
 * Enhanced Venue Validation Worker Thread
 * Handles venue data validation with show times using Gemini AI
 * Includes smart time detection and correction for AM/PM issues
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { parentPort } from 'worker_threads';
import { getGeminiModel } from '../config/gemini.config';

interface WorkerMessage {
  venues: EnhancedVenueData[];
  threadIndex: number;
  geminiApiKey: string;
  googleMapsApiKey?: string;
}

interface EnhancedVenueData {
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
  shows: {
    id: string;
    day: string;
    startTime?: string;
    endTime?: string;
    djId?: string;
  }[];
}

interface VenueValidationResult {
  venueId: string;
  venueName: string;
  status: 'validated' | 'conflict' | 'error' | 'skipped' | 'time_fixed' | 'geo_fixed';
  message: string;
  currentData: any;
  suggestedData?: any;
  conflicts?: string[];
  timeIssues?: string[];
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
    timeFixesCount: number;
    geoFixesCount: number;
  };
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
 * Get coordinates using Google Geocoding API (primary source for coordinates)
 */
async function getCoordinatesFromGoogle(
  venue: EnhancedVenueData,
  suggestedData: any,
  googleMapsApiKey?: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    // Build full address for Google API validation
    const addressParts = [];
    if (suggestedData.address || venue.address)
      addressParts.push(suggestedData.address || venue.address);
    if (suggestedData.city || venue.city) addressParts.push(suggestedData.city || venue.city);
    if (suggestedData.state || venue.state) addressParts.push(suggestedData.state || venue.state);
    if (suggestedData.zip || venue.zip) addressParts.push(suggestedData.zip || venue.zip);

    console.log(
      `🔍 Validating coordinates for ${venue.name}: address parts = [${addressParts.join(', ')}]`,
    );

    if (addressParts.length === 0) {
      console.log(`⚠️ No address information for ${venue.name}, skipping Google validation`);
      return null;
    }

    const fullAddress = addressParts.join(', ');
    const encodedAddress = encodeURIComponent(fullAddress);

    // Use Google Geocoding API
    if (!googleMapsApiKey) return null;

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleMapsApiKey}`;
    const response = await fetch(url);

    if (!response.ok) return null;

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const googleCoords = { lat: location.lat, lng: location.lng };

      console.log(
        `📍 Google geocoding for ${venue.name}: (${googleCoords.lat}, ${googleCoords.lng})`,
      );
      return googleCoords; // Always use Google API coordinates
    }

    return null;
  } catch (error) {
    // If Google API fails, continue with Gemini coordinates
    return null;
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
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
 * Enhanced Gemini lookup with time validation
 */
async function enhancedVenueLookupWithGemini(
  venue: EnhancedVenueData,
  model: any,
  threadIndex: number,
  googleMapsApiKey?: string,
): Promise<VenueValidationResult> {
  try {
    const currentData = extractVenueData(venue);
    const showTimesInfo = extractShowTimesInfo(venue.shows);

    const prompt = `You are a comprehensive venue research expert specializing in karaoke venues and entertainment establishments. Research this venue thoroughly and provide accurate, up-to-date information.

VENUE TO RESEARCH: "${venue.name}"
Current Location Context: ${venue.city || 'Unknown'}, ${venue.state || 'Unknown'}

CURRENT DATABASE DATA:
- Name: ${venue.name || 'Not provided'}
- Address: ${venue.address || 'Not provided'}
- City: ${venue.city || 'Not provided'}
- State: ${venue.state || 'Not provided'}
- ZIP: ${venue.zip || 'Not provided'}
- Phone: ${venue.phone || 'Not provided'}
- Website: ${venue.website || 'Not provided'}
- Coordinates: ${venue.lat && venue.lng ? `${venue.lat}, ${venue.lng}` : 'Not provided'}

CURRENT SHOW TIMES:
${showTimesInfo}

RESEARCH INSTRUCTIONS:
1. Find the EXACT business name, full address, and current contact information
2. Focus on address accuracy - coordinates will be handled separately via Google Geocoding
3. Research typical karaoke/entertainment hours for this venue
4. Identify any obvious time errors (karaoke rarely happens in morning hours like 8:00 AM - 12:00 AM)
5. Look for the venue's actual operating hours and karaoke schedule

FOCUS ON ADDRESS ACCURACY:
- Ensure the complete, accurate street address
- Verify correct city, state, and ZIP code
- Address accuracy is critical for precise coordinate geocoding

CRITICAL TIME VALIDATION:
- Karaoke venues typically operate evenings (6:00 PM - 2:00 AM)
- Morning hours (6:00 AM - 12:00 PM) are almost never correct for karaoke
- If you see times like "8:00 AM - 12:00 AM", it should likely be "8:00 PM - 12:00 AM"
- Validate that start times are before end times (accounting for next-day endings)

Return a JSON response with this exact structure:

{
  "venueFound": true/false,
  "confidence": 0.0-1.0,
  "suggestedData": {
    "name": "Exact business name",
    "address": "Complete street address", 
    "city": "City name",
    "state": "State abbreviation (2 letters)",
    "zip": "ZIP code",
    "phone": "Phone number with area code",
    "website": "Full website URL",
    "operatingHours": "Typical business hours",
    "karaokeHours": "Karaoke-specific hours if different"
  },
  "timeIssues": [
    "List any time inconsistencies found (AM/PM errors, impossible times, etc.)"
  ],
  "showUpdates": [
    {
      "showId": "show_id_if_time_needs_fixing",
      "currentTime": "current incorrect time",
      "suggestedTime": "corrected time",
      "reason": "explanation of correction"
    }
  ],
  "conflicts": [
    "List specific differences between current and researched data"
  ],
  "message": "Summary of research findings and any corrections made",
  "researchSources": "Brief note on how you verified this information"
}

If venue cannot be found or confidence is low, set venueFound to false.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    if (!parsedData.venueFound || parsedData.confidence < 0.4) {
      return {
        venueId: venue.id,
        venueName: venue.name,
        status: 'skipped',
        message: parsedData.message || 'Venue not found or low confidence',
        currentData,
        confidence: parsedData.confidence || 0,
        wasUpdated: false,
      };
    }

    // Analyze time issues and determine status
    const timeIssues = parsedData.timeIssues || [];
    const hasTimeIssues = timeIssues.length > 0;
    const hasShowUpdates = parsedData.showUpdates && parsedData.showUpdates.length > 0;

    // Get coordinates from Google Geocoding API (primary source)
    const googleCoordinates = await getCoordinatesFromGoogle(
      venue,
      parsedData.suggestedData,
      googleMapsApiKey,
    );
    if (googleCoordinates) {
      console.log(
        `🔧 Setting coordinates for ${venue.name} from Google: (${googleCoordinates.lat}, ${googleCoordinates.lng})`,
      );
      parsedData.suggestedData.lat = googleCoordinates.lat;
      parsedData.suggestedData.lng = googleCoordinates.lng;
    } else {
      console.log(`⚠️ No Google coordinates found for ${venue.name}, keeping existing coordinates`);
    }

    // Compare current data with suggested data
    const conflicts = compareVenueData(currentData, parsedData.suggestedData);
    const hasConflicts = conflicts.length > 0;

    // Check for geo coordinate improvements
    const hasGeoImprovements = checkGeoImprovements(venue, parsedData.suggestedData);

    // Determine status based on what was found/fixed
    let status: VenueValidationResult['status'] = 'validated';
    if (hasTimeIssues || hasShowUpdates) {
      status = 'time_fixed';
    } else if (hasGeoImprovements) {
      status = 'geo_fixed';
    } else if (hasConflicts) {
      status = 'conflict';
    }

    // Determine if updates should be applied (high confidence)
    const shouldUpdate = parsedData.confidence >= 0.8;
    let wasUpdated = false;

    if (shouldUpdate) {
      wasUpdated = true;
    }

    return {
      venueId: venue.id,
      venueName: venue.name,
      status,
      message:
        parsedData.message || `Processed venue with ${parsedData.confidence * 100}% confidence`,
      currentData,
      suggestedData: parsedData.suggestedData,
      conflicts,
      timeIssues,
      confidence: parsedData.confidence,
      wasUpdated,
    };
  } catch (error) {
    return {
      venueId: venue.id,
      venueName: venue.name,
      status: 'error',
      message: `Error during validation: ${error.message}`,
      currentData: extractVenueData(venue),
      confidence: 0,
      wasUpdated: false,
    };
  }
}

/**
 * Extract venue data for comparison
 */
function extractVenueData(venue: EnhancedVenueData): any {
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
 * Extract show times information for Gemini analysis
 */
function extractShowTimesInfo(shows: EnhancedVenueData['shows']): string {
  if (!shows || shows.length === 0) {
    return 'No show times available';
  }

  const timesList = shows
    .map((show) => {
      const startTime = show.startTime || 'Unknown';
      const endTime = show.endTime || 'Unknown';
      return `${show.day}: ${startTime} - ${endTime}`;
    })
    .join('\n');

  return timesList;
}

/**
 * Compare venue data and identify conflicts
 */
function compareVenueData(current: any, suggested: any): string[] {
  const conflicts = [];

  // Compare name (allow for slight variations)
  if (current.name && suggested.name) {
    const currentName = current.name.toLowerCase().replace(/[^\w\s]/g, '');
    const suggestedName = suggested.name.toLowerCase().replace(/[^\w\s]/g, '');
    if (
      currentName !== suggestedName &&
      !currentName.includes(suggestedName) &&
      !suggestedName.includes(currentName)
    ) {
      conflicts.push(`Name: '${current.name}' vs '${suggested.name}'`);
    }
  }

  // Compare address
  if (current.address && suggested.address) {
    const currentAddr = current.address.toLowerCase().replace(/[^\w\s]/g, '');
    const suggestedAddr = suggested.address.toLowerCase().replace(/[^\w\s]/g, '');
    if (currentAddr !== suggestedAddr) {
      conflicts.push(`Address: '${current.address}' vs '${suggested.address}'`);
    }
  }

  // Compare city
  if (current.city && suggested.city) {
    if (current.city.toLowerCase() !== suggested.city.toLowerCase()) {
      conflicts.push(`City: '${current.city}' vs '${suggested.city}'`);
    }
  }

  // Compare state
  if (current.state && suggested.state) {
    if (current.state.toLowerCase() !== suggested.state.toLowerCase()) {
      conflicts.push(`State: '${current.state}' vs '${suggested.state}'`);
    }
  }

  // Compare coordinates if Google provided new ones
  if (current.lat && current.lng && suggested.lat && suggested.lng) {
    const distanceKm = calculateDistance(current.lat, current.lng, suggested.lat, suggested.lng);
    if (distanceKm > 0.05) {
      // More than ~50m difference - worth updating for accuracy
      conflicts.push(
        `Coordinates updated from Google: '${current.lat}, ${current.lng}' → '${suggested.lat}, ${suggested.lng}' (${(distanceKm * 1000).toFixed(0)}m improvement)`,
      );
    }
  }

  return conflicts;
}

/**
 * Check if suggested data provides better geo coordinates
 */
function checkGeoImprovements(venue: EnhancedVenueData, suggested: any): boolean {
  // Missing coordinates that could be filled
  if ((!venue.lat || !venue.lng) && suggested.lat && suggested.lng) {
    return true;
  }

  // Coordinates that seem obviously wrong (like 0,0 or very far from expected location)
  if (venue.lat === 0 && venue.lng === 0 && suggested.lat && suggested.lng) {
    return true;
  }

  return false;
}

/**
 * Process venues in this worker thread
 */
async function processVenuesInThread(
  venues: EnhancedVenueData[],
  threadIndex: number,
  geminiApiKey: string,
  googleMapsApiKey?: string,
): Promise<ValidationWorkerResult> {
  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: getGeminiModel('worker') });

    const results: VenueValidationResult[] = [];
    let validatedCount = 0;
    let conflictsFound = 0;
    let updatedCount = 0;
    let errorsCount = 0;
    let timeFixesCount = 0;
    let geoFixesCount = 0;

    sendProgress(`Thread ${threadIndex}: Starting validation of ${venues.length} venues`);

    for (let i = 0; i < venues.length; i++) {
      const venue = venues[i];

      try {
        sendProgress(`Thread ${threadIndex}: Validating ${venue.name} (${i + 1}/${venues.length})`);

        const result = await enhancedVenueLookupWithGemini(
          venue,
          model,
          threadIndex,
          googleMapsApiKey,
        );
        results.push(result);

        // Update counters
        if (result.status === 'validated') validatedCount++;
        else if (result.status === 'conflict') conflictsFound++;
        else if (result.status === 'error') errorsCount++;
        else if (result.status === 'time_fixed') timeFixesCount++;
        else if (result.status === 'geo_fixed') geoFixesCount++;

        if (result.wasUpdated) updatedCount++;

        // Brief delay between requests to respect API limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Thread ${threadIndex}: Error processing venue ${venue.name}:`, error);
        results.push({
          venueId: venue.id,
          venueName: venue.name,
          status: 'error',
          message: `Processing error: ${error.message}`,
          currentData: extractVenueData(venue),
          confidence: 0,
          wasUpdated: false,
        });
        errorsCount++;
      }
    }

    sendProgress(`Thread ${threadIndex}: Completed validation of ${venues.length} venues`);

    return {
      success: true,
      results,
      summary: {
        totalVenues: venues.length,
        validatedCount,
        conflictsFound,
        updatedCount,
        errorsCount,
        timeFixesCount,
        geoFixesCount,
      },
    };
  } catch (error) {
    sendError(`Thread ${threadIndex} failed: ${error.message}`);
    return {
      success: false,
      results: [],
      summary: {
        totalVenues: venues.length,
        validatedCount: 0,
        conflictsFound: 0,
        updatedCount: 0,
        errorsCount: venues.length,
        timeFixesCount: 0,
        geoFixesCount: 0,
      },
    };
  }
}

// Main worker thread entry point
if (parentPort) {
  parentPort.on('message', async (message: WorkerMessage) => {
    try {
      const result = await processVenuesInThread(
        message.venues,
        message.threadIndex,
        message.geminiApiKey,
        message.googleMapsApiKey,
      );
      sendComplete(result);
    } catch (error) {
      sendError(`Worker thread ${message.threadIndex} crashed: ${error.message}`);
    }
  });
}
