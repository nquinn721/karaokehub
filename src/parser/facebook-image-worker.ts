import { GoogleGenerativeAI } from '@google/generative-ai';
import { parentPort } from 'worker_threads';
import type { ImageDataPair, ImageWorkerMessage, WorkerResult } from './worker-types';

interface ProcessedImage {
  originalUrl?: string;
  analysis: string;
  error?: string;
}

// Listen for messages from the main thread
if (parentPort) {
  parentPort.on('message', async (data: { imageData: ImageDataPair; geminiApiKey: string }) => {
    try {
      console.log(
        'Image worker processing single image:',
        data.imageData.originalUrl || 'base64 data',
      );

      // Initialize Gemini with the provided API key
      const genAI = new GoogleGenerativeAI(data.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Process single image
      const result = await processImage(data.imageData, model);

      parentPort!.postMessage({
        type: 'success',
        result: result,
      } as ImageWorkerMessage);
    } catch (error) {
      console.error('Image worker error:', error);
      parentPort!.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ImageWorkerMessage);
    }
  });
}

async function processImage(imageData: ImageDataPair, model: any): Promise<WorkerResult | null> {
  try {
    const imageUrl = imageData.originalUrl || 'base64 data';
    console.log('Processing image:', imageUrl);

    // Use the base64 data directly instead of fetching
    const base64Image = imageData.data;
    const mimeType = imageData.mimeType;

    const prompt = `Analyze this image for karaoke event information. Look for:
- Venue/bar/restaurant name
- Date and time (including day of week)
- Address or location details
- DJ name or host
- Event description or details
- Phone numbers
- Any other relevant karaoke event information

Return ONLY a valid JSON object in this exact format:
{
  "isKaraokeEvent": true/false,
  "venue": "venue name",
  "address": "full address if available",
  "city": "city if available", 
  "state": "state if available",
  "zip": "zip code if available",
  "time": "event time (e.g., 7:00 PM)",
  "startTime": "start time if different from time",
  "endTime": "end time if available",
  "day": "day of week or date",
  "djName": "DJ name if available",
  "description": "brief event description",
  "confidence": 0.85,
  "reason": "why this is or isn't a karaoke event"
}

If this is NOT a karaoke event, return:
{"isKaraokeEvent": false, "reason": "explanation of what the image contains"}`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    const analysis = result.response.text();
    console.log('Raw Gemini response:', analysis);

    // Parse the JSON response from Gemini
    let parsedData;
    try {
      // Clean up the response to extract just the JSON
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON response:', parseError);
      return null;
    }

    // Only return data if it's actually a karaoke event
    if (!parsedData.isKaraokeEvent) {
      console.log('Not a karaoke event:', parsedData.reason);
      return null;
    }

    // Return structured data for karaoke events
    return {
      vendor: parsedData.venue || undefined,
      dj: parsedData.djName || undefined,
      show: {
        venue: parsedData.venue || 'Unknown Venue',
        address: parsedData.address,
        city: parsedData.city,
        state: parsedData.state,
        zip: parsedData.zip,
        time: parsedData.time,
        dayOfWeek: parsedData.day,
        djName: parsedData.djName,
        description: parsedData.description,
      },
      source: imageUrl,
    };
  } catch (error) {
    const imageUrl = imageData.originalUrl || 'base64 data';
    console.error('Error processing image', imageUrl, ':', error);
    return null;
  }
}
