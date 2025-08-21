// Shared types for Facebook parser workers

export interface ImageUrlPair {
  url: string;
  index: number;
  alt?: string;
  context?: string;
}

export interface ImageDataPair {
  data: string; // base64 encoded image data
  mimeType: string;
  index: number;
  alt?: string;
  context?: string;
  originalUrl?: string;
}

export interface WorkerResult {
  vendor?: string;
  dj?: string;
  show?: {
    venue: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    time?: string;
    dayOfWeek?: string;
    djName?: string;
    description?: string;
  };
  addressComponent?: string;
  lat?: number;
  lng?: number;
  source: string;
}

export interface ParsedFacebookData {
  vendor?: {
    name: string;
    website?: string;
    description?: string;
    confidence?: number;
  };
  vendors?: Array<{
    name: string;
    website?: string;
    description?: string;
    confidence?: number;
  }>;
  venues?: Array<{
    name: string;
    address?: string;
    city?: string;
    state?: string;
    confidence?: number;
  }>;
  djs: Array<{
    name: string;
    confidence: number;
    context?: string;
    aliases?: string[];
  }>;
  shows: Array<{
    venue: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: number;
    lng?: number;
    time: string;
    startTime?: string;
    endTime?: string;
    day?: string;
    djName?: string;
    vendor?: string;
    description?: string;
    imageUrl?: string;
    venuePhone?: string;
    venueWebsite?: string;
    source?: string;
    confidence: number;
  }>;
  rawData?: {
    url: string;
    title: string;
    content: string;
    parsedAt: Date;
  };
}

// Worker message types
export interface ImageWorkerData {
  images: ImageUrlPair[];
  geminiApiKey: string;
}

export interface ImageWorkerMessage {
  type: 'success' | 'error' | 'progress' | 'log';
  result?: WorkerResult;
  data?: WorkerResult[] | { message: string; level?: 'info' | 'warning' | 'error' };
  error?: string;
}

export interface ValidationWorkerData {
  processedImages: WorkerResult[];
  originalUrl: string;
  geminiApiKey: string;
  // Legacy aliases
  data?: WorkerResult[];
  url?: string;
}

export interface ValidationWorkerMessage {
  type: 'success' | 'error' | 'log' | 'complete';
  result?: ParsedFacebookData;
  data?: ParsedFacebookData | { message: string; level?: 'info' | 'warning' | 'error' };
  error?: string;
}
