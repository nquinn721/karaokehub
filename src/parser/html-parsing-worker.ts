/**
 * Worker thread for HTML parsing with Gemini
 * This handles the CPU-intensive HTML processing and Gemini API calls
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { getGeminiModel, getGeminiPerformanceSettings } from '../config/gemini.config';

interface HtmlWorkerData {
  htmlContent: string;
  url: string;
  geminiApiKey: string;
  model?: string;
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

interface ParsedVendor {
  name: string;
  website: string;
  description: string;
  confidence: number;
}

if (isMainThread) {
  // Export worker creation function
  const createHtmlParsingWorker = (data: HtmlWorkerData): Worker => {
    return new Worker(__filename, { workerData: data });
  };

  module.exports = { createHtmlParsingWorker };
} else {
  // Helper function to send logs to parent thread
  function workerLog(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    parentPort?.postMessage({
      type: 'log',
      data: { message, level },
    });
  }

  // Worker thread execution
  async function parseHtmlContent(): Promise<void> {
    try {
      const { htmlContent, url, geminiApiKey, model: modelName } = workerData as HtmlWorkerData;

      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY is required in worker');
      }

      workerLog(`🧵 Worker: Starting HTML parsing for ${url}`);
      parentPort?.postMessage({
        type: 'progress',
        data: { status: 'Initializing Gemini API' },
      });

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const performanceSettings = getGeminiPerformanceSettings();
      const model = genAI.getGenerativeModel({
        model: modelName || getGeminiModel('worker'),
        generationConfig: {
          temperature: performanceSettings.temperature,
          topP: performanceSettings.topP,
          topK: performanceSettings.topK,
          maxOutputTokens: performanceSettings.maxTokensPerRequest,
        },
      });

      parentPort?.postMessage({
        type: 'progress',
        data: { status: 'Processing HTML content with Gemini' },
      });

      // Enhanced prompt for karaoke parsing
      const prompt = `
You are a karaoke schedule extraction expert. Analyze this website content and extract ONLY karaoke-related information.

FOCUS ON:
1. VENDOR: Who runs/hosts the karaoke events
2. SHOWS: Complete karaoke events with venue, time, location
3. DJS: Karaoke hosts/DJs mentioned
4. VENUES: Where karaoke happens

VENDOR should include:
- name (business/person hosting events)
- description (what they do)
- confidence (0.0-1.0)

SHOWS must include:
- venue (required - where karaoke happens)
- time (required - when karaoke starts, format: "7:00 PM" or "8:00 PM - 12:00 AM")
- day (if specified - "Monday", "Tuesday", etc.)
- address/location if available
- DJ name if mentioned
- confidence (0.0-1.0)

DJS should include:
- name (karaoke host/DJ)
- context (where/when they perform)
- confidence (0.0-1.0)

VENUES should include:
- name (bar/restaurant name)
- address if available
- city, state if available
- confidence (0.0-1.0)

IGNORE:
- Non-karaoke events
- General business info not related to karaoke
- Social media posts without schedule info

Return ONLY valid JSON:
{
  "vendor": {"name": "Business Name", "description": "Karaoke host", "confidence": 0.9},
  "shows": [{"venue": "Bar Name", "time": "7:00 PM", "day": "Monday", "djName": "DJ Name", "confidence": 0.8}],
  "djs": [{"name": "DJ Name", "context": "Monday nights at Bar", "confidence": 0.7}],
  "venues": [{"name": "Bar Name", "address": "123 Main St", "city": "Columbus", "state": "OH", "confidence": 0.9}]
}

Website URL: ${url}

HTML Content to analyze:
${htmlContent}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      parentPort?.postMessage({
        type: 'progress',
        data: { status: 'Parsing Gemini response' },
      });

      // Clean and parse the JSON response
      let cleanedText = text.trim();

      // Remove markdown code blocks if present
      cleanedText = cleanedText.replace(/```json\n?|\n?```/g, '');

      // Remove any leading/trailing whitespace
      cleanedText = cleanedText.trim();

      // Try to parse the JSON
      let parsedData;
      try {
        parsedData = JSON.parse(cleanedText);
      } catch (parseError) {
        workerLog(`Failed to parse Gemini response as JSON: ${parseError}`, 'error');
        workerLog(`Raw response: ${text}`, 'error');

        // Return empty structure if parsing fails
        parsedData = {
          vendor: { name: 'Unknown', description: 'Failed to parse', confidence: 0.1 },
          shows: [],
          djs: [],
          venues: [],
        };
      }

      // Validate and clean the parsed data
      const cleanedData = {
        vendor: parsedData.vendor || {
          name: 'Unknown',
          description: 'No vendor found',
          confidence: 0.1,
        },
        shows: Array.isArray(parsedData.shows) ? parsedData.shows : [],
        djs: Array.isArray(parsedData.djs) ? parsedData.djs : [],
        venues: Array.isArray(parsedData.venues) ? parsedData.venues : [],
      };

      workerLog(
        `✅ Worker: HTML parsing complete - ${cleanedData.shows.length} shows, ${cleanedData.djs.length} DJs, ${cleanedData.venues.length} venues`,
      );

      // Send results back to main thread
      parentPort?.postMessage({
        type: 'complete',
        data: {
          ...cleanedData,
          rawData: {
            url,
            title: extractTitle(htmlContent),
            content: htmlContent.substring(0, 1000), // First 1000 chars for reference
            parsedAt: new Date(),
          },
          stats: {
            totalShows: cleanedData.shows.length,
            totalDjs: cleanedData.djs.length,
            totalVenues: cleanedData.venues.length,
          },
        },
      });
    } catch (error) {
      workerLog(`🚨 Worker: HTML parsing error: ${error}`, 'error');
      parentPort?.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function extractTitle(htmlContent: string): string {
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]*)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : 'No title found';
  }

  // Start processing
  parseHtmlContent().catch((error) => {
    parentPort?.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
