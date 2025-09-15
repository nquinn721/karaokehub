/**
 * Gemini Image Analysis Worker
 * Processes individual images with Gemini Vision API in parallel
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { parentPort, workerData } from 'worker_threads';

interface WorkerData {
  imageBase64: string;
  imageIndex: number;
  prompt: string;
  geminiApiKey: string;
  model: string;
  description?: string;
  venue?: string;
  url?: string;
}

interface AnalysisResult {
  success: boolean;
  imageIndex: number;
  data?: any;
  error?: string;
  processingTime: number;
}

async function analyzeImageWithGemini(workerData: WorkerData): Promise<AnalysisResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🖼️ Worker: Starting analysis of image ${workerData.imageIndex + 1}`);

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(workerData.geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: workerData.model,
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });

    // Create the image part for Gemini
    const imagePart = {
      inlineData: {
        data: workerData.imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        mimeType: 'image/jpeg', // Assume JPEG, could be made dynamic
      },
    };

    // Enhanced prompt with image-specific context
    const enhancedPrompt = `${workerData.prompt}

IMAGE CONTEXT:
- Image ${workerData.imageIndex + 1} analysis
- Source: ${workerData.url || 'Unknown'}
- Venue/Vendor: ${workerData.venue || 'Unknown'}
- Description: ${workerData.description || 'Image analysis'}

IMPORTANT: This is image ${workerData.imageIndex + 1} - extract ALL unique shows/venues/DJs from this specific screenshot.
Ensure no duplicates within this image, but don't worry about cross-image duplicates (handled at service level).`;

    // Generate content with Gemini
    const result = await model.generateContent([enhancedPrompt, imagePart]);
    const response = result.response;
    const text = response.text();

    // Try to parse as JSON
    let parsedData;
    try {
      // Clean the response text (remove any markdown formatting)
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}. Response: ${text}`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Worker: Successfully analyzed image ${workerData.imageIndex + 1} in ${processingTime}ms`);

    return {
      success: true,
      imageIndex: workerData.imageIndex,
      data: parsedData,
      processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Worker: Failed to analyze image ${workerData.imageIndex + 1}:`, error.message);

    return {
      success: false,
      imageIndex: workerData.imageIndex,
      error: error.message,
      processingTime,
    };
  }
}

// Main worker execution
(async () => {
  try {
    const result = await analyzeImageWithGemini(workerData);
    
    // Send result back to main thread
    if (parentPort) {
      parentPort.postMessage(result);
    }
  } catch (error) {
    // Send error back to main thread
    if (parentPort) {
      parentPort.postMessage({
        success: false,
        imageIndex: workerData.imageIndex,
        error: error.message,
        processingTime: 0,
      });
    }
  }
})();
