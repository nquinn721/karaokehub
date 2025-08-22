/**
 * Centralized Gemini AI configuration
 * Update model versions and settings in one place
 */

export interface GeminiConfig {
  // Primary model for text-based parsing (HTML, text analysis)
  textModel: string;

  // Model for vision-based parsing (image analysis, screenshots)
  visionModel: string;

  // Model for Facebook parsing (optimized for social media content)
  facebookModel: string;

  // Model for worker threads (background processing)
  workerModel: string;

  // Rate limiting and retry settings
  rateLimiting: {
    maxRetriesOnQuota: number;
    retryDelayMs: number;
    batchSize: number;
    requestsPerMinute: number;
  };

  // Model performance settings
  performance: {
    maxTokensPerRequest: number;
    temperature: number;
    topP: number;
    topK: number;
  };
}

/**
 * Production Gemini configuration with high-quota models
 * These models have higher rate limits for paid subscriptions
 */
export const GEMINI_CONFIG: GeminiConfig = {
  // Use Gemini 2.0 Flash production models with highest quotas
  textModel: 'gemini-2.0-flash', // 1M tokens/minute for paid tier
  visionModel: 'gemini-2.0-flash', // Supports vision + text
  facebookModel: 'gemini-2.0-flash', // Fast processing for social media
  workerModel: 'gemini-2.0-flash', // Background worker processing

  rateLimiting: {
    maxRetriesOnQuota: 3,
    retryDelayMs: 1000,
    batchSize: 10,
    requestsPerMinute: 5000, // Much higher for 2.0 Flash production
  },

  performance: {
    maxTokensPerRequest: 8192,
    temperature: 0.1, // Low temperature for consistent parsing
    topP: 0.8,
    topK: 40,
  },
};

/**
 * Alternative configuration for high-accuracy parsing
 * Use when accuracy is more important than speed
 */
export const GEMINI_CONFIG_HIGH_ACCURACY: GeminiConfig = {
  textModel: 'gemini-2.0-flash', // Use same fast model but with more conservative settings
  visionModel: 'gemini-2.0-flash',
  facebookModel: 'gemini-2.0-flash',
  workerModel: 'gemini-2.0-flash', // Keep consistent

  rateLimiting: {
    maxRetriesOnQuota: 5,
    retryDelayMs: 2000,
    batchSize: 5,
    requestsPerMinute: 2500, // More conservative for high accuracy
  },

  performance: {
    maxTokensPerRequest: 8192,
    temperature: 0.05, // Very low for maximum consistency
    topP: 0.9,
    topK: 20,
  },
};

/**
 * Get the current Gemini configuration
 * Can be switched between different configs based on environment
 */
export function getGeminiConfig(): GeminiConfig {
  // Use high accuracy config in production if GEMINI_HIGH_ACCURACY is set
  if (process.env.GEMINI_HIGH_ACCURACY === 'true') {
    return GEMINI_CONFIG_HIGH_ACCURACY;
  }

  // Default to standard config for speed
  return GEMINI_CONFIG;
}

/**
 * Get model name for specific use case
 */
export function getGeminiModel(useCase: 'text' | 'vision' | 'facebook' | 'worker'): string {
  const config = getGeminiConfig();

  switch (useCase) {
    case 'text':
      return config.textModel;
    case 'vision':
      return config.visionModel;
    case 'facebook':
      return config.facebookModel;
    case 'worker':
      return config.workerModel;
    default:
      return config.textModel;
  }
}

/**
 * Get rate limiting settings
 */
export function getGeminiRateLimiting() {
  return getGeminiConfig().rateLimiting;
}

/**
 * Get performance settings for model generation
 */
export function getGeminiPerformanceSettings() {
  return getGeminiConfig().performance;
}
