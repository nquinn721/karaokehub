# Gemini AI Configuration

This document explains how to configure and manage Gemini AI models across the KaraokeHub application.

## Overview

All Gemini model configurations are now centralized in `src/config/gemini.config.ts`. This allows you to update model versions and settings in one place instead of scattered across multiple files.

## Current Configuration

Run this command to see the current configuration:

```bash
node show-gemini-config.js
```

## Model Types

The system uses different models for different use cases:

- **Text Model**: HTML parsing, text analysis
- **Vision Model**: Image analysis, screenshot parsing
- **Facebook Model**: Social media content parsing
- **Worker Model**: Background processing in worker threads

## Configuration Modes

### Speed Mode (Default)

Uses `gemini-1.5-flash` for all operations:

- ✅ Higher rate limits (2,000 requests/minute)
- ✅ Faster processing
- ✅ Lower cost
- ❌ Slightly lower accuracy

### High Accuracy Mode

Uses `gemini-1.5-pro` for complex operations:

- ✅ Higher accuracy
- ✅ Better complex reasoning
- ❌ Lower rate limits (100 requests/minute)
- ❌ Higher cost

## Switching Modes

### To Speed Mode (Default)

```bash
export GEMINI_HIGH_ACCURACY=false
# or just unset the variable
unset GEMINI_HIGH_ACCURACY
```

### To High Accuracy Mode

```bash
export GEMINI_HIGH_ACCURACY=true
```

## Rate Limiting

The configuration includes intelligent rate limiting:

- **Speed Mode**: 1,800 requests/minute (stays under 2,000 limit)
- **High Accuracy Mode**: 100 requests/minute
- **Batch Processing**: 10 requests per batch
- **Auto Retry**: 3 attempts with 1-second delays

## Performance Settings

All models use optimized settings:

- **Temperature**: 0.1 (consistent parsing)
- **Top P**: 0.8
- **Top K**: 40
- **Max Tokens**: 8,192

## Files Updated

The following files now use centralized configuration:

- `src/parser/karaoke-parser.service.ts`
- `src/parser/facebook-parser.service.ts`
- `src/parser/html-parsing-worker.ts`
- `src/parser/image-parsing-worker.ts`

## Benefits

1. **Single Source of Truth**: Update models in one place
2. **No More Quota Errors**: Production models with higher limits
3. **Environment-Based**: Switch modes via environment variables
4. **Rate Limiting**: Built-in protection against quota exhaustion
5. **Performance Tuned**: Optimized settings for consistent parsing

## Troubleshooting

### Still Getting Quota Errors?

1. Check your current configuration:

   ```bash
   node show-gemini-config.js
   ```

2. Ensure you're using production models:

   ```bash
   # Should show gemini-1.5-flash, not gemini-2.0-flash-exp
   ```

3. Verify your Gemini API key has paid quota:
   ```bash
   # Check that GEMINI_API_KEY is set
   echo $GEMINI_API_KEY
   ```

### Need Higher Accuracy?

Enable high accuracy mode:

```bash
export GEMINI_HIGH_ACCURACY=true
node show-gemini-config.js  # Verify the change
```

### Want to Customize Models?

Edit `src/config/gemini.config.ts` and modify the `GEMINI_CONFIG` object:

```typescript
export const GEMINI_CONFIG: GeminiConfig = {
  textModel: 'gemini-1.5-flash', // Your preferred text model
  visionModel: 'gemini-1.5-flash', // Your preferred vision model
  facebookModel: 'gemini-1.5-flash', // Your preferred Facebook model
  workerModel: 'gemini-1.5-flash', // Your preferred worker model
  // ... rest of config
};
```

## Migration Notes

All hardcoded model references have been replaced with centralized configuration. The system now automatically uses production models with your paid subscription's higher quotas.

Previous experimental models (`gemini-2.0-flash-exp`, `gemini-2.0-flash-thinking-exp`) had very low rate limits (10 requests/minute) and have been replaced with production models.
