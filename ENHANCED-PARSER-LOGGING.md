# Enhanced Facebook Parser Logging

## Added Detailed Logging Throughout the Pipeline

### 1. Image Extraction Phase

- **Image Count**: Shows total unique images found for processing
- **Sample URLs**: Displays first 3 image URLs for debugging
- **Login Warning**: Alerts if 0 images found (likely login required)
- **Download Status**: Shows successful downloads vs failures

### 2. Image Processing Phase

- **Batch Processing**: Shows progress through image batches (3 at a time)
- **Individual Results**: For each image, shows if karaoke event found with details:
  - Vendor name if found
  - DJ name if found
  - Show venue if found
- **Success/Failure**: Clear indication of which images yielded results

### 3. Validation & Aggregation Phase

- **Input Validation**: Shows how many worker results received
- **Result Breakdown**: Shows counts of vendors, DJs, and shows found
- **Valid Events**: Shows how many images contained karaoke content
- **Final Counts**: Shows final aggregated counts after deduplication

## What You'll Now See in Logs

```
🔍 Step 2: Processing images with AI analysis...
🖼️ Processing 45 images in batches of 3...
🔍 Processing image batch 1/15 (3 images)
✓ Image 1: Found karaoke event (venue: Murphy's Pub)
✓ Image 2: Found karaoke event (dj: DJ Mike, venue: The Tavern)
✗ Image 3: No karaoke content
🔍 Processing image batch 2/15 (3 images)
...
🎯 Step 2 Complete: Processed 45 images, found 32 valid results, 27 karaoke events

✅ Step 3: Validating and aggregating event data...
📊 Sending 32 results to validation worker...
🔍 Validation: Validating 32 worker results
🔍 Validation: Found 27 valid karaoke results out of 32 processed images
🔍 Validation: Result breakdown: 8 vendors, 12 DJs, 27 shows
📊 Step 3 Complete: Aggregated 27 shows, 12 DJs, 8 vendors, 13 venues
```

## Debugging Different Issues

### If you see 0 images found:

- Check for login requirement
- Verify Facebook session cookies exist
- Check if group is private/restricted

### If you see many images but few karaoke events:

- Check sample URLs to see if they're content vs UI elements
- Review individual image results to see what Gemini is finding
- Verify images are downloading successfully

### If you see events found but low final count:

- Check validation worker logs for filtering
- Look for deduplication removing valid shows
- Check if shows missing required fields

This enhanced logging will help identify exactly where shows might be getting lost in the pipeline.
