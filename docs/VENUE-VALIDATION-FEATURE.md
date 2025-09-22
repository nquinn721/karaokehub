# Venue Validation Feature

This feature adds AI-powered venue data validation to the KaraokeHub admin dashboard.

## Overview

The venue validation system uses Google's Gemini AI to:

1. Look up accurate venue information based on venue names and addresses
2. Compare the found data with what's currently in the database
3. Identify conflicts and missing information
4. Automatically update venues with missing data when confidence is high
5. Present results in a user-friendly modal

## Components Added

### Backend (NestJS)

**AdminService** (`src/admin/admin.service.ts`):

- `validateAllVenuesWithGemini()` - Main validation function that processes all active venues
- `lookupVenueWithGemini()` - Individual venue lookup using Gemini AI
- `compareVenueData()` - Compares current vs suggested data and identifies conflicts
- `calculateDistance()` - Calculates distance between coordinates to detect location conflicts

**AdminController** (`src/admin/admin.controller.ts`):

- `POST /api/admin/venues/validate-all` - New endpoint to trigger venue validation

### Frontend (React)

**ShowAnalytics Component** (`client/src/components/ShowAnalytics.tsx`):

- Added "Validate Venue Data" button in the header
- Added state management for validation process
- Added comprehensive results modal showing:
  - Summary statistics (total venues, validated count, conflicts found, auto-updated)
  - Detailed results for each venue
  - Conflict highlighting
  - Status indicators

## How It Works

1. **User clicks "Validate Venue Data"** in the Show Analytics Dashboard
2. **System fetches all active venues** from the database
3. **For each venue:**
   - Builds a search query from name, address, city, state
   - Sends the query to Gemini AI with current database data
   - Gemini returns structured JSON with suggested data and confidence score
   - System compares current vs suggested data to identify conflicts
   - If confidence ≥ 0.9, missing fields are automatically updated
4. **Results are displayed** in a modal with:
   - Overall summary statistics
   - Individual venue results
   - Conflict details
   - Update notifications

## Gemini AI Integration

The system uses Gemini 2.0 Flash with structured prompts to:

- Look up venue information from public sources
- Return standardized JSON responses
- Provide confidence scores (0.0-1.0)
- Identify specific data conflicts
- Handle cases where venues can't be found

## Safety Features

- **High confidence threshold** (0.9) required for automatic updates
- **Conservative conflict detection** to avoid false positives
- **Rate limiting** with 1-second delays between requests
- **Error handling** for API failures and invalid responses
- **Manual review** of all conflicts through the results modal

## Example Response

```json
{
  "success": true,
  "results": [
    {
      "venueId": "venue-123",
      "venueName": "The Abbey",
      "status": "conflict",
      "message": "Found accurate information with some conflicts",
      "currentData": {
        "name": "The Abbey Bar",
        "address": null,
        "city": "West Hollywood",
        "state": "CA"
      },
      "suggestedData": {
        "name": "The Abbey",
        "address": "692 N Robertson Blvd",
        "city": "West Hollywood",
        "state": "CA",
        "zip": "90069",
        "phone": "(310) 289-8410",
        "website": "https://abbeyweho.com/"
      },
      "conflicts": ["Name: 'The Abbey Bar' vs 'The Abbey'", "Address is missing in current data"],
      "wasUpdated": true,
      "confidence": 0.95
    }
  ],
  "summary": {
    "totalVenues": 150,
    "validatedCount": 142,
    "conflictsFound": 23,
    "updatedCount": 67,
    "errorsCount": 8
  }
}
```

## Usage

1. Navigate to Admin Dashboard → Show Analytics
2. Click "Validate Venue Data" button
3. Wait for processing (may take several minutes for large datasets)
4. Review results in the modal
5. Check individual venue conflicts and take action as needed

## Testing

Two test scripts are provided:

- `test-venue-validation.js` - Tests with a fake venue
- `test-real-venue.js` - Tests with a real venue (The Abbey)

Run tests with:

```bash
node test-venue-validation.js
node test-real-venue.js
```

## Rate Limiting

The system includes built-in rate limiting:

- 1-second delay between venue requests
- Gemini 2.0 Flash has high rate limits for production use
- Error handling for quota exceeded scenarios

## Future Enhancements

- Batch processing for better performance
- User preference for auto-update thresholds
- Integration with Google Maps API for additional validation
- Scheduled automatic validation runs
- Export functionality for validation reports
