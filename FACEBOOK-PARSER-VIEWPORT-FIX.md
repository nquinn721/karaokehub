# 🔧 Facebook Parser Issues Fixed

## Issue 1: Reviews Not Loading in Client ✅

### Problem

- Facebook parser was setting status to `ParseStatus.PENDING`
- Reviews endpoint looks for `ParseStatus.PENDING_REVIEW`
- Result: Parsed data saved to database but not visible in admin UI

### Solution Applied

```typescript
// Before
schedule.status = ParseStatus.PENDING;

// After
schedule.status = ParseStatus.PENDING_REVIEW;
```

**Effect**: Parsed Facebook data will now appear in the "Pending Reviews" section of the admin interface.

---

## Issue 2: Puppeteer Viewport & Image Detection ✅

### Problems

1. **Limited viewport** - Page content cut off, missing images
2. **Insufficient scrolling** - Only 5 scrolls with 2s waits
3. **Basic image detection** - Missing lazy-loaded images
4. **Small image limit** - Only 20 images processed

### Solutions Applied

#### A. Enhanced Viewport & Scrolling

```typescript
// Improved viewport settings
await page.setViewport({
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1.0, // Full scale for better detection
});

// Enhanced scrolling strategy
for (let i = 0; i < 8; i++) {
  // Increased from 5 to 8 scrolls
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  await new Promise((resolve) => setTimeout(resolve, 3000)); // Increased from 2s to 3s

  // Wait for images to load
  await page.evaluate(async () => {
    const images = document.querySelectorAll('img');
    const imagePromises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 2000);
      });
    });
    await Promise.all(imagePromises);
  });
}
```

#### B. Advanced Image Detection

```typescript
// Enhanced image detection for lazy loading
const imgElements = document.querySelectorAll('img');
const lazyImages = document.querySelectorAll('[data-src], [data-lazy-src], [data-original]');

// Try multiple src attributes
const src =
  img.src ||
  img.getAttribute('data-src') ||
  img.getAttribute('data-lazy-src') ||
  img.getAttribute('data-original');

// Size filtering for content images
if (width >= 100 && height >= 100) {
  // Only include reasonably sized images (not UI elements)
}

// Duplicate removal
const uniqueImages = images.filter(
  (img, index, self) => index === self.findIndex((i) => i.url === img.url),
);
```

#### C. Improved Coverage

- **More scroll passes**: 5 → 8 scrolls
- **Longer waits**: 2s → 3s between scrolls
- **Image load waiting**: Wait for all images to finish loading
- **Lazy loading support**: Detect data-src, data-lazy-src, data-original
- **Size filtering**: Only process images ≥100x100 pixels
- **Higher limits**: 20 → 30 images processed
- **Better sources**: Added 'scontent' domain detection

---

## Expected Results

### ✅ Reviews Will Now Load

- Facebook parser results appear in admin "Pending Reviews"
- "Refresh Data" button will show new parsed content
- Database entries will have correct `pending_review` status

### ✅ Better Image Capture

- Puppeteer will see full page content (no cutoff)
- More images detected through enhanced scrolling
- Lazy-loaded images properly captured
- Better quality filtering (size-based)
- Up to 30 images processed per page

---

## Testing Recommendations

1. **Re-parse the same Facebook group** to test improved image detection
2. **Check admin interface** after parsing to verify reviews appear
3. **Monitor logs** for scroll progress and image counts
4. **Compare results** - should see more images and better content extraction

---

## Files Modified

- `src/parser/facebook-parser.service.ts`
  - Line 420: Status fix (`PENDING` → `PENDING_REVIEW`)
  - Lines 200-250: Enhanced viewport and scrolling strategy
  - Lines 260-320: Advanced image detection with lazy loading support

The Facebook parser should now capture significantly more images and properly display results in the admin interface! 🎉
