# Production Parsing Debug Guide

## Issue: Production shows 38 shows vs Local 41 shows

### Root Cause Analysis

The discrepancy is likely due to **memory constraints** in Cloud Run:
- Current Memory Limit: **512Mi** 
- Puppeteer with `--single-process` + Chromium can easily exceed this
- When memory is exhausted, some parsing operations fail silently

### Solution 1: Increase Cloud Run Memory (Recommended)

Update the memory limit in `cloudbuild.yaml`:

```yaml
# Change line 41 from:
- '--memory'
- '512Mi'

# To:
- '--memory'
- '1Gi'  # or '2Gi' for better performance
```

### Solution 2: Optimize Puppeteer for Low Memory

Add these memory-efficient args to `karaoke-parser.service.ts`:

```typescript
if (process.platform === 'linux') {
  puppeteerArgs.push(
    '--memory-pressure-off',
    '--max_old_space_size=256',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-ipc-flooding-protection',
    '--disable-dev-shm-usage',  // Already present
    '--disable-extensions',     // Already present
    '--single-process',         // Already present
  );
}
```

### Solution 3: Check Production Logs

```bash
# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=karaokehub" --limit=50 --format="table(timestamp,textPayload)"

# Filter for parsing errors
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=karaokehub AND textPayload:\"Error parsing\"" --limit=20
```

### Solution 4: Add Memory Monitoring

Add this to the parseWebsite method in `karaoke-parser.service.ts`:

```typescript
// Add at the start of parseWebsite()
const memUsage = process.memoryUsage();
this.logAndBroadcast(
  `Memory before parsing: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS`,
  'info'
);

// Add error handling for memory issues
try {
  // existing parsing code
} catch (error) {
  const memUsageAfter = process.memoryUsage();
  this.logAndBroadcast(
    `Memory after error: ${Math.round(memUsageAfter.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memUsageAfter.rss / 1024 / 1024)}MB RSS`,
    'error'
  );
  throw error;
}
```

### Immediate Actions

1. **Deploy with increased memory:**
   ```bash
   # Quick deploy with more memory
   gcloud run deploy karaokehub \
     --image gcr.io/heroic-footing-460117-k8/karaokehub:latest \
     --memory 1Gi \
     --region us-central1
   ```

2. **Check current production logs:**
   ```bash
   gcloud logs tail projects/heroic-footing-460117-k8/logs/run.googleapis.com%2Fstderr --filter="resource.type=cloud_run_revision"
   ```

### Expected Results

After increasing memory to 1Gi:
- Should parse all 41 shows consistently
- Better Puppeteer stability
- Reduced parsing timeouts
- More reliable Gemini AI responses

### Monitoring

Watch the logs during parsing to confirm:
- "X Shows Found" messages increase to 41
- No memory-related errors
- Faster parsing completion times
