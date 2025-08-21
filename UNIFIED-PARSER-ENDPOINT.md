# Unified Parser Endpoint

## Problem Solved

We had too many parsing endpoints which was confusing and hard to maintain:

- `parse-website`
- `parse-and-save-website`
- `parse-facebook-event`
- `parse-and-save-facebook-event`
- `parse-facebook-share`
- `parse-and-save-facebook-share`
- And more...

## Solution: Single Smart Endpoint

### New Endpoint: `POST /parser/parse-url`

**Auto-detects URL type and routes to appropriate parser:**

#### Facebook URLs

- **Detection**: Contains `facebook.com` or `fb.com`
- **Router**: `FacebookParserService.parseAndSaveFacebookPageClean()`
- **Features**: Clean data flow (memory → validation → single DB save)

#### Instagram URLs

- **Detection**: Contains `instagram.com`
- **Router**: `KaraokeParserService.parseInstagramWithScreenshots()`
- **Features**: Visual parsing with AI screenshot analysis

#### Website URLs

- **Detection**: All other URLs
- **Router**: `KaraokeParserService.parseAndSaveWebsite()` or `parseWebsiteWithScreenshot()`
- **Features**: HTML parsing or screenshot-based parsing

### Request Body

```json
{
  "url": "https://example.com",
  "parseMethod": "html|screenshot", // optional, defaults to 'html'
  "isCustomUrl": true, // optional, prevents adding to urls_to_parse table
  "usePuppeteer": true // optional, for legacy compatibility
}
```

### Response Format

```json
{
  "success": true,
  "urlType": "facebook|instagram|website",
  "parsedScheduleId": "uuid",
  "data": {
    /* parsed data */
  },
  "stats": {
    /* parsing statistics */
  }
}
```

## Frontend Integration

Updated `ParserStore.ts` to use the new unified endpoint:

- Changed from `/parser/parse-and-save-website`
- Changed to `/parser/parse-url`

## Benefits

1. **Simplified**: One endpoint instead of many
2. **Smart**: Auto-detects URL type
3. **Consistent**: Unified response format
4. **Maintainable**: Single place to update parsing logic
5. **Clean**: Uses the new clean data flow for Facebook parsing

## Migration

- ✅ Frontend updated to use new endpoint
- ✅ Backend provides new unified endpoint
- ⚠️ Old endpoints still exist for backward compatibility
- 🔮 Future: Remove old endpoints after testing
