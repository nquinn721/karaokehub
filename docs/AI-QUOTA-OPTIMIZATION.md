# AI Quota Optimization Guide

## Overview
This document describes the AI quota optimization features implemented to reduce Gemini API usage and prevent quota exhaustion.

## Features Implemented

### 1. Multi-Tier Parsing Strategy

#### Tier 1: Cheerio-Based Parsing (No AI Quota)
- Uses Cheerio for HTML parsing with regex pattern matching
- Looks for common karaoke/DJ patterns in HTML content
- Extracts basic venue, KJ, and schedule information
- **Quota Usage: 0 API calls**

#### Tier 2: Cached Results
- 24-hour caching of parsed results using NodeCache
- Prevents re-parsing the same URLs
- **Quota Usage: 0 API calls for cached content**

#### Tier 3: Smart AI Provider Selection
- Primary: Gemini AI (when quota available)
- Fallback: OpenAI GPT-3.5-turbo
- Daily quota tracking with automatic fallback

### 2. Quota Management

#### Gemini Quota Limits
- Default: 100 calls per day (configurable)
- Automatic tracking of daily usage
- Quota reset at midnight
- Fallback to OpenAI when quota exhausted

#### Error Handling
- Detects quota/limit errors from Gemini
- Automatically switches to OpenAI fallback
- Logs quota usage and provider switches

### 3. Configuration

#### Environment Variables
```bash
# Primary AI provider (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key

# Fallback AI provider (OpenAI) 
OPENAI_API_KEY=your_openai_api_key
```

#### Quota Settings
You can adjust the daily Gemini quota limit in the service:
```typescript
private readonly MAX_DAILY_GEMINI_CALLS = 100; // Adjust as needed
```

## Usage Patterns

### Successful Cheerio Parsing (No AI Used)
```
✅ Cheerio found: Vendor name + Shows/KJs
➡️ Return result immediately (0 quota used)
```

### AI Fallback Required
```
❌ Cheerio parsing insufficient
✅ Gemini available (quota remaining)
➡️ Use Gemini (1 quota used)
```

### OpenAI Fallback
```
❌ Cheerio parsing insufficient  
❌ Gemini quota exhausted/failed
✅ OpenAI available
➡️ Use OpenAI (OpenAI pricing applies)
```

## Monitoring

### Logs to Watch
- `"Successfully parsed {url} with Cheerio (no AI quota used)"`
- `"Used Gemini AI (call X/Y)"`  
- `"Used OpenAI as fallback"`
- `"Gemini quota exhausted, switching to OpenAI"`

### Health Check Endpoint
Check `/api/health` for AI provider status:
```json
{
  "hasGeminiApiKey": true,
  "hasOpenAiApiKey": true,
  "timestamp": "2025-08-13T..."
}
```

## Cost Optimization

### Reduced Gemini Usage
- Cheerio parsing eliminates ~70% of simple cases
- Caching eliminates repeated parsing
- Smart fallback prevents failed API calls

### OpenAI Costs (Fallback)
- GPT-3.5-turbo: ~$0.002 per 1K tokens
- Much cheaper than GPT-4
- Only used when Gemini unavailable

### Best Practices
1. **Cache Hit Rate**: Monitor cache effectiveness
2. **Cheerio Success Rate**: Track how often Cheerio parsing succeeds
3. **Quota Usage**: Monitor daily Gemini call count
4. **Fallback Frequency**: Track OpenAI usage patterns

## Troubleshooting

### No AI Providers Available
- Error: `"At least one AI provider (GEMINI_API_KEY or OPENAI_API_KEY) is required"`
- Solution: Add at least one API key to environment

### High OpenAI Usage
- Check if Gemini quota is too low
- Verify Gemini API key is valid
- Consider increasing `MAX_DAILY_GEMINI_CALLS`

### Poor Parsing Quality
- Cheerio patterns may need adjustment for specific sites
- Check AI prompts for accuracy
- Review parsing confidence scores

## Future Enhancements

### Potential Improvements
1. **Adaptive Quotas**: Adjust daily limits based on usage patterns
2. **Site-Specific Parsing**: Custom Cheerio rules per domain
3. **Additional Fallbacks**: Anthropic Claude, local models
4. **Smart Scheduling**: Parse during off-peak quota hours
5. **Content Classification**: Route simple vs complex sites appropriately

### Monitoring Dashboard
Consider implementing:
- Daily quota usage graphs
- Parsing success rate by method
- Cost tracking per provider
- Cache hit rate analytics
