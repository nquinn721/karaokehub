import { GoogleGenerativeAI } from '@google/generative-ai';
import { parentPort, workerData } from 'worker_threads';
import { getGeminiModel } from '../config/gemini.config';

interface WorkerData {
  htmlContent: string;
  url: string;
  geminiApiKey: string;
  model: string;
}

async function parseHtmlWithGemini() {
  try {
    const { htmlContent, url, geminiApiKey, model } = workerData as WorkerData;

    if (!geminiApiKey) {
      throw new Error('Gemini API key not provided');
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const geminiModel = genAI.getGenerativeModel({
      model: getGeminiModel('worker'),
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });

    const prompt = `You are an expert karaoke show parser. Parse this HTML content to extract karaoke shows, venues, and DJ information.

Return a JSON object with this exact structure:
{
  "vendor": {
    "name": "string",
    "website": "string", 
    "description": "string",
    "confidence": number
  },
  "venues": [
    {
      "name": "string",
      "address": "string",
      "city": "string",
      "state": "string",
      "zip": "string",
      "lat": null,
      "lng": null,
      "phone": "string",
      "website": "string",
      "confidence": number
    }
  ],
  "djs": [
    {
      "name": "string",
      "confidence": number,
      "context": "string",
      "aliases": []
    }
  ],
  "shows": [
    {
      "venueName": "string",
      "date": "string",
      "time": "string", 
      "startTime": "string",
      "endTime": "string",
      "day": "string",
      "djName": "string",
      "vendor": "string",
      "confidence": number
    }
  ]
}

HTML Content:
${htmlContent.substring(0, 50000)}`;

    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    // Send result back to main thread
    parentPort?.postMessage({
      success: true,
      data: {
        vendor: parsedData.vendor || {
          name: 'Unknown',
          website: url,
          description: '',
          confidence: 0.5,
        },
        shows: parsedData.shows || [],
        djs: parsedData.djs || [],
      },
    });
  } catch (error) {
    parentPort?.postMessage({
      success: false,
      error: error.message,
    });
  }
}

parseHtmlWithGemini();
