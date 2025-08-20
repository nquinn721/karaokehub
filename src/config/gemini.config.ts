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
  // Use production models with higher quotas
  textModel: 'gemini-1.5-flash', // 2,000 requests/minute for paid
  visionModel: 'gemini-1.5-flash', // Supports vision + text
  facebookModel: 'gemini-1.5-flash', // Fast processing for social media
  workerModel: 'gemini-1.5-flash', // Background worker processing

  rateLimiting: {
    maxRetriesOnQuota: 3,
    retryDelayMs: 1000,
    batchSize: 10,
    requestsPerMinute: 1800, // Stay under 2,000/min limit
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
  textModel: 'gemini-1.5-pro', // Higher accuracy, lower quota
  visionModel: 'gemini-1.5-pro',
  facebookModel: 'gemini-1.5-pro',
  workerModel: 'gemini-1.5-flash', // Keep workers fast

  rateLimiting: {
    maxRetriesOnQuota: 5,
    retryDelayMs: 2000,
    batchSize: 5,
    requestsPerMinute: 100, // Pro model has lower limits
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
