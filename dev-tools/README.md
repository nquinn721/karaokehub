# Dev Tools

This directory contains development tools, test scripts, and debugging utilities for the KaraokeHub project.

## 📁 Directory Structure

```
dev-tools/
├── testing/          # Test scripts for various features
├── debug/            # Debug scripts for troubleshooting
├── database/         # SQL scripts and database utilities
├── migrations/       # TypeScript migration and setup scripts
├── archived/         # Old test files kept for reference
└── README.md         # This file
```

## 🧪 Testing Scripts (`/testing`)

### Venue Validation Tests

- **`test-venue-validation.js`** - Tests the venue validation endpoint with fake venue data
- **`test-venue-validation-worker.js`** - Tests the venue validation worker thread to ensure it doesn't block the main thread
- **`test-real-venue.js`** - Tests venue validation with real venue data (The Abbey Bar)

### Worker Tests

- **`test-worker-parsing.js`** - Tests worker-based parsing functionality
- **`test-worker-behavior.js`** - Tests worker thread behavior and performance

### API Tests

- **`test-validation-rules.js`** - Tests data validation rules implementation
- **`test-production-stripe.js`** - Tests Stripe payment integration in production mode
- **`diagnose-customer-issue.js`** - Customer support diagnostic tool
- **`validate-stripe-config.js`** - Stripe configuration validation
- **`validate-stripe-prices.js`** - Stripe pricing validation
- **`validate-worker-system.js`** - Worker system validation
- **`simple-api-test.js`** - Basic API functionality test
- **`clear-auth-storage.js`** - Clear authentication storage utility
- **`check-migration-status.js`** - Database migration status checker
- **`check-invalid-shows.js`** - Show data validation checker

## 🐛 Debug Scripts (`/debug`)

### Parser Debugging

- **`debug-stevesdj-*.js`** - Various debugging scripts for Steve's DJ website parsing
  - `debug-stevesdj-detailed.js` - Detailed parsing analysis
  - `debug-stevesdj-html.js` - HTML structure debugging
  - `debug-stevesdj-schedule.js` - Schedule parsing debugging
  - `debug-stevesdj-screenshot.js` - Screenshot analysis debugging
  - `debug-stevesdj-specific.js` - Specific issue debugging

### System Debugging

- **`debug-discovery-worker.js`** - Debug website discovery worker functionality
- **`debug-auth-loop.js`** - Debug authentication loop issues
- **`analyze-connecticut-page.js`** - Analyze specific page parsing issues
- **`quick-analysis.js`** - Quick diagnostic analysis tool
- **`upload_to_production.js`** - Production deployment utility
- **`update-facebook-cookies.js`** - Facebook authentication helper

## �️ Database Scripts (`/database`)

Contains SQL scripts for database operations:

- **Avatar system scripts** - `*avatar*.sql`
- **Migration scripts** - `*migration*.sql`, `*uuid*.sql`
- **Data export/backup** - `*export*.sql`, `*backup*.sql`
- **Production updates** - `production_*.sql`
- **System setup** - `init.sql`, `create-*.sql`
- **Data cleanup** - `remove-*.sql`, `cleanup-*.sql`

## 🔄 Migration Scripts (`/migrations`)

TypeScript scripts for database setup and data migration:

- **`setup-avatar-system.ts`** - Complete avatar system setup
- **`seed-all-avatars.ts`** - Seed avatar data
- **`seed-store-items.ts`** - Seed store items
- **`create-avatar-system.ts`** - Avatar system creation
- **`fix-user-avatars-table.ts`** - Avatar table fixes
- **`test-avatar-system.ts`** - Avatar system testing
- **`test-store-generation-prompts.ts`** - Store generation testing
- **`run-migrations.ts`** - Migration runner utility

## 📚 Archived Scripts (`/archived`)

Contains old test files that are no longer actively used but kept for reference. These include:

Contains old test files that are no longer actively used but kept for reference. These include:

- Legacy parser tests
- Old API integration tests
- Deprecated feature tests
- Performance benchmarking scripts

## 🚀 Usage

### Running Test Scripts

1. **Venue Validation Tests:**

   ```bash
   cd dev-tools/testing
   node test-venue-validation.js
   node test-venue-validation-worker.js
   node test-real-venue.js
   ```

2. **Worker Tests:**

   ```bash
   cd dev-tools/testing
   node test-worker-parsing.js
   node test-worker-behavior.js
   ```

3. **API Tests:**
   ```bash
   cd dev-tools/testing
   node test-validation-rules.js
   node test-production-stripe.js
   ```

### Running Debug Scripts

1. **Parser Debugging:**

   ```bash
   cd dev-tools/debug
   node debug-stevesdj-detailed.js
   node debug-discovery-worker.js
   ```

2. **Auth Debugging:**
   ```bash
   cd dev-tools/debug
   node debug-auth-loop.js
   ```

## ⚙️ Prerequisites

Most scripts require:

- Node.js environment
- Environment variables (`.env` file in project root)
- Database connection (for database-related tests)
- API keys (Gemini, Stripe, etc.)

## 📋 Environment Variables

Ensure these environment variables are set:

```env
# Required for AI/parsing tests
GEMINI_API_KEY=your_gemini_api_key

# Required for database tests
DATABASE_HOST=localhost
DATABASE_USERNAME=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=your_db_name

# Required for Stripe tests
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Required for auth tests
JWT_SECRET=your_jwt_secret
```

## 🔧 Development Notes

### Worker Thread Testing

- Worker tests verify that heavy processing doesn't block the main thread
- Look for "Main thread counter" messages to confirm non-blocking behavior
- Worker paths should point to compiled JavaScript files in `dist/` directory

### Venue Validation Testing

- Tests use real Gemini AI API calls (requires valid API key)
- Mock data is used for basic functionality tests
- Real venue tests use known venues for accuracy verification

### Debug Script Usage

- Debug scripts are designed for troubleshooting specific issues
- They often include verbose logging and detailed output
- Use when investigating parser failures or integration problems

## 📝 Adding New Tools

When adding new test or debug scripts:

1. **Choose the right directory:**
   - `/testing` for feature tests and validation
   - `/debug` for troubleshooting and diagnostic tools
   - `/archived` for obsolete but reference-worthy scripts

2. **Follow naming conventions:**
   - `test-[feature-name].js` for tests
   - `debug-[component-name].js` for debug scripts

3. **Include proper documentation:**
   - Add script description to this README
   - Include usage examples
   - Document required environment variables

4. **Add error handling:**
   - Check for required environment variables
   - Provide meaningful error messages
   - Include graceful fallbacks where appropriate

## 🗂️ File Organization

The dev-tools directory follows this organization principle:

- **Current and useful** → Keep in appropriate subdirectory with documentation
- **Outdated but reference-worthy** → Move to `/archived`
- **Completely obsolete** → Delete

This keeps the development environment clean while preserving valuable debugging tools and test cases.
