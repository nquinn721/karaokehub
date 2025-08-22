# Facebook Parser Architecture - COMPLETE REWRITE ✅

## 🎯 Mission Accomplished

Successfully rewritten the entire Facebook parser architecture following your exact specifications:

**"1 instance of puppeteer, at the end save to db, no db calls anywhere else, no puppeteer anywhere else"**

## 🏗️ Architecture Implementation

### High-Level Flow

```
data = []
urls = []
pageName = '';

worker (Puppeteer)
    ↓ get img urls + header for Gemini group name parsing
    ↓ return urls, pageName

max workers (Parallel)
    ↓ parse images for show details
    ↓ return show

data.push(show)

SAVE DATA TO DB
SAVE NAME TO DB
```

### 📁 File Structure & Responsibilities

#### 1. `facebook-group-parser.ts` (Puppeteer Worker)

**Role**: Single Puppeteer instance for group parsing

- ✅ **Cookie Management**: Load/save FB session cookies
- ✅ **Login Detection**: Check if logged in
- ✅ **Interactive Login**: WebSocket modal flow (email/pw → server → puppeteer login)
- ✅ **Navigation**: Load URL with `/media`
- ✅ **Header Extraction**: Parse HTML up to main body for Gemini pageName parsing
- ✅ **Zoom & Scroll**: 50% zoom, 5 scrolls (1/3 page height, 2s wait each)
- ✅ **Image Extraction**: Parse all CDN image URLs from photo section
- ✅ **Gemini Integration**: Simple group name parsing from header HTML
- ✅ **Return**: `{ imageUrls[], pageName }`

#### 2. `facebook-image-parser.ts` (Image Parsing Worker)

**Role**: Individual image parsing with Gemini AI

- ✅ **Image Loading**: Base64 conversion with fallback support
- ✅ **Gemini Rules**: Comprehensive karaoke show parsing rules
- ✅ **Return Format**: `{ vendor, dj, show }` object
- ✅ **Source Tracking**: `show.source = url` given to parse
- ✅ **Error Handling**: Graceful fallbacks and validation

#### 3. `facebook-parser.service.ts` (Main Orchestrator)

**Role**: Coordinate workers and handle database operations

- ✅ **Worker Management**: Load Puppeteer worker, get URLs/pageName
- ✅ **URL Conversion**: Create largeScaleUrl for each image with fallback
- ✅ **Parallel Processing**: Max workers for image parsing
- ✅ **Work Queue**: Workers take URLs until all done
- ✅ **Data Collection**: Gather all parsed image data
- ✅ **Database Save**: Single save to `parsed_schedule`
- ✅ **Name Update**: Save pageName to `urls_to_parse` if needed
- ✅ **Compatibility**: All existing methods for codebase integration

## 🔄 Detailed Flow Implementation

### Step 1: Puppeteer Worker (facebook-group-parser.ts)

```typescript
// Load FB session cookies if available
await loadFacebookCookies(page, cookiesFilePath);

// Check login status
const isLoggedIn = await checkIfLoggedIn(page);

// Interactive login if needed
if (!isLoggedIn) {
  await performInteractiveLogin(page, cookiesFilePath);
}

// Navigate to group/media page
await page.goto(url + '/media', { waitUntil: 'networkidle0' });

// Extract header HTML for Gemini
const headerHtml = await page.evaluate(() => {
  // Get header elements containing group name
});

// Parse group name with Gemini
const pageName = await parseGroupNameWithGemini(headerHtml, geminiApiKey);

// Zoom out to 50%
await page.evaluate(() => {
  document.body.style.zoom = '0.5';
});

// Scroll 5 times (1/3 page height, 2s wait)
for (let i = 1; i <= 5; i++) {
  await page.evaluate(() => window.scrollBy(0, window.innerHeight / 3));
  await page.waitForTimeout(2000);
}

// Extract all CDN image URLs
const imageUrls = await page.evaluate(() => {
  // Filter CDN URLs with size validation
});

return { imageUrls, pageName };
```

### Step 2: Service Orchestration (facebook-parser.service.ts)

```typescript
// Get URLs and pageName from worker
const { imageUrls, pageName } = await extractUrlsAndPageNameWithWorker(url);

// Create large scale URLs with fallback
const largeScaleUrls = imageUrls.map((url) => createLargeScaleUrl(url));

// Process images with parallel workers
const data = await processImagesWithWorkers(largeScaleUrls, imageUrls);

// Save to database (single operation)
const savedSchedule = await saveBatchDataToDatabase(data, url, pageName);

// Update page name if needed
await updatePageNameIfNeeded(url, pageName);
```

### Step 3: Image Parsing Workers (facebook-image-parser.ts)

```typescript
// Load image as base64 with fallback
const base64Image = await loadImageAsBase64(imageUrl);

// Parse with Gemini using comprehensive rules
const result = await parseKaraokeImageWithGemini(base64Image, imageUrl);

// Return structured data
return {
  vendor: 'company hosting karaoke',
  dj: 'DJ or performer name',
  show: 'show name or event title',
  source: imageUrl,
};
```

## ✅ Validation Results

### Architecture Test Results

```
✅ Puppeteer worker for group parsing
✅ Gemini workers for image parsing
✅ Service orchestration and DB integration
✅ Compatibility with existing codebase
✅ Build compilation successful
✅ All compatibility methods present
```

### Key Features Verified

- ✅ **Single Puppeteer Instance**: Only in group parser worker
- ✅ **No DB Calls in Workers**: All database operations in service
- ✅ **No Puppeteer Elsewhere**: All browser logic isolated to worker
- ✅ **Parallel Image Processing**: Max workers with work queue
- ✅ **Single DB Save**: Batch operation at end
- ✅ **Existing Compatibility**: All methods for current codebase

## 🚀 Performance Benefits

1. **Non-Blocking**: Puppeteer in worker thread prevents UI blocking
2. **Resource Isolation**: Browser operations contained in worker
3. **Parallel Processing**: Multiple image workers for speed
4. **Memory Management**: Worker cleanup prevents memory leaks
5. **Scalable**: Can adjust max workers based on system resources
6. **Fault Tolerant**: Worker failures don't crash main service

## 📊 Implementation Stats

- **facebook-group-parser.ts**: 350+ lines (complete Puppeteer + Gemini)
- **facebook-image-parser.ts**: 200+ lines (image loading + parsing)
- **facebook-parser.service.ts**: 500+ lines (orchestration + compatibility)
- **Total Workers**: 2 specialized worker types
- **Max Parallel**: 10 image parsing workers (configurable)
- **Database Operations**: 2 (save schedule + update name)

## 🎉 Architecture Compliance

✅ **Exact Specification Match**:

- 1 instance of Puppeteer ✓
- At the end save to DB ✓
- No DB calls anywhere else ✓
- No Puppeteer anywhere else ✓
- Max workers for parallel processing ✓
- Work queue until all URLs done ✓
- Single batch data save ✓

The Facebook parser has been **completely rewritten** to follow your exact architecture specifications while maintaining full compatibility with the existing codebase!
