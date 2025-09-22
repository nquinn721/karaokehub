# Facebook Authentication Workflow

## Problem
Facebook's bot detection prevents headless Puppeteer from working in production, often requiring human verification (CAPTCHAs, "Are you human?" challenges).

## Solution Strategy
Complete human verification locally with visible browser, then sync authenticated cookies to production.

## Workflow

### 1. Local Authentication (Development)
```bash
# Start development server
npm run start:dev

# Use admin parser to parse any Facebook group
# Browser window will appear automatically
# Complete any human verification challenges
```

**What happens locally:**
- Browser window opens (non-headless mode)
- You can see and interact with Facebook's verification challenges
- Complete CAPTCHAs, click "I'm not a robot", etc.
- Parser saves authenticated cookies to `data/facebook-cookies.json`

### 2. Sync to Production
```bash
# Upload fresh cookies to Google Secret Manager
node update-facebook-cookies.js
```

**What this does:**
- Reads your locally verified cookies
- Uploads them to Google Secret Manager
- Production can now use these pre-verified cookies

### 3. Production Deployment
```bash
# Deploy with fresh cookies
./deploy.sh
```

**What happens in production:**
- Runs headlessly (no browser window)
- Uses pre-verified cookies from Secret Manager
- Bypasses human verification challenges
- Works reliably without manual intervention

## Key Benefits

1. **Human Verification Handled Locally**: Complete challenges where you can see and interact
2. **Production Runs Headlessly**: Fast, automated, no manual intervention needed
3. **Cookie Reuse**: One verification session works for many production runs
4. **Reliable Authentication**: Bypasses bot detection with legitimate session data

## When to Re-verify

Run the local workflow again when:
- Production starts failing with authentication errors
- Cookies expire (usually after several days/weeks)
- Facebook changes their verification requirements

## Environment Variables

- `NODE_ENV=production`: Enables headless mode in production
- `FB_SESSION_COOKIES`: Set automatically by Secret Manager in production
- `FACEBOOK_DEBUG_MODE=true`: Forces visible browser even in production (debugging only)

## Files

- `data/facebook-cookies.json`: Local cookie storage
- `update-facebook-cookies.js`: Cookie sync script
- `src/parser/facebookParser/facebook-group-parser.ts`: Main parser with environment detection
