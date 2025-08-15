# 📅 Facebook Event Parsing & DJ Nickname Intelligence

KaraokePal now includes advanced Facebook event parsing capabilities with intelligent DJ name recognition that understands aliases, social media handles, and stage names.

## 🎯 Key Features

### Facebook Event Parsing

- **Event Detection**: Automatically detects Facebook event URLs
- **Cover Image Analysis**: Extracts details from event cover images using Gemini Vision
- **Structured Data**: Extracts venue, date/time, DJ info, and event details
- **Admin Review**: All parsed events require admin approval before going live

### DJ Nickname Intelligence

- **Multi-Name Support**: DJs can have multiple names (real name, stage name, social handles)
- **Smart Matching**: `@djmax614` = `Max` = `Max Denney` = `DJ Max`
- **Alias Database**: Automatically stores and learns new DJ name variations
- **Social Handle Recognition**: Understands @mentions and platform-specific handles

## 🆕 New API Endpoints

### Facebook Event Endpoints

```http
# Parse Facebook event (preview only)
POST /api/parser/parse-facebook-event
Body: { "eventUrl": "https://facebook.com/events/123456789" }

# Parse and save Facebook event for admin review
POST /api/parser/parse-and-save-facebook-event
Body: { "eventUrl": "https://facebook.com/events/123456789" }

# Smart parsing (auto-detects events vs posts)
POST /api/parser/parse-smart-social-media
Body: { "url": "https://facebook.com/events/123456789" }
```

### Response Format

```json
{
  "vendor": {
    "name": "The Crescent Lounge",
    "website": "https://facebook.com/events/123456789",
    "description": "Venue extracted from Facebook event",
    "confidence": 0.9
  },
  "djs": [
    {
      "name": "DJ Max",
      "confidence": 0.95,
      "context": "Host field in Facebook event",
      "aliases": ["@djmax614", "Max", "Max Denney"]
    }
  ],
  "shows": [
    {
      "venue": "The Crescent Lounge",
      "address": "Columbus, Ohio",
      "date": "2025-08-14",
      "time": "8PM-12AM",
      "startTime": "20:00",
      "endTime": "00:00",
      "day": "thursday",
      "djName": "DJ Max",
      "description": "Karaoke Thursdays",
      "confidence": 0.9
    }
  ],
  "rawData": {
    "url": "https://facebook.com/events/123456789",
    "title": "Crescent Lounge Karaoke Thursdays!",
    "content": "Combined event content...",
    "parsedAt": "2025-08-15T10:30:00.000Z"
  }
}
```

## 🧠 DJ Nickname Intelligence

### Database Schema

The system uses a `dj_nicknames` table to store DJ aliases:

```sql
CREATE TABLE dj_nicknames (
  id VARCHAR(36) PRIMARY KEY,
  djId VARCHAR(36) REFERENCES djs(id),
  nickname VARCHAR(255),
  type ENUM('stage_name', 'alias', 'social_handle', 'real_name'),
  platform VARCHAR(100), -- 'facebook', 'instagram', etc.
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Example DJ Mappings

| DJ Record | Nicknames  | Type          | Platform |
| --------- | ---------- | ------------- | -------- |
| DJ Max    | Max        | alias         | -        |
| DJ Max    | Max Denney | real_name     | -        |
| DJ Max    | @djmax614  | social_handle | facebook |
| DJ Max    | DJ Max     | stage_name    | -        |
| DJ Max    | KJ Max     | stage_name    | -        |

### Smart Matching Logic

1. **Exact Match**: Direct nickname lookup in database
2. **Prefix Variations**: Handles DJ/KJ prefixes automatically
3. **Social Handle Cleaning**: Removes @ symbols for matching
4. **Fuzzy Matching**: Partial string matching for variations
5. **Confidence Scoring**: Returns match confidence (0.0-1.0)

## 🎤 Example Usage

### Real-World Example: Crescent Lounge

From the attached Facebook post, the system would extract:

```bash
# Input: Facebook event URL
curl -X POST http://localhost:8000/api/parser/parse-facebook-event \
  -H "Content-Type: application/json" \
  -d '{"eventUrl": "https://facebook.com/events/crescent-lounge-event"}'

# Expected extraction:
# ✅ Venue: "The Crescent Lounge"
# ✅ DJ: "DJ Max" (matched from @djmax614 via nickname intelligence)
# ✅ Time: "8PM-12AM" -> startTime: "20:00", endTime: "00:00"
# ✅ Day: "thursday" (recurring pattern detected)
# ✅ Address: Auto-extracted from event location
```

### DJ Name Variations Understood

The AI now intelligently handles these variations:

- **Post Text**: "Thursdays! @thecrescentlounge #Karaoke 8pm-12am!"
- **Host Field**: "@djmax614"
- **Event Title**: "Karaoke Thursdays with Max"

**Result**: All correctly linked to the same DJ record with confidence scoring.

## 🔧 Configuration

### Environment Variables

```bash
# Required for all parsing
GEMINI_API_KEY=your-gemini-api-key

# Optional for production Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

### Facebook Event URL Formats

Supported Facebook event URL patterns:

- `https://facebook.com/events/123456789`
- `https://fb.com/events/123456789`
- `https://facebook.com/pages/venue/events/123456789`
- `https://m.facebook.com/events/123456789`

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Test Facebook event parsing
node test-facebook-events.js

# Test with real Crescent Lounge image
node test-image-parsing.js

# Test DJ nickname matching
npm run test:dj-nicknames
```

## 🚀 Production Deployment

1. **Database Migration**: Run the DJ nicknames migration
2. **Seed Data**: Add initial DJ aliases for existing DJs
3. **Admin Training**: Train admins on reviewing parsed events
4. **Error Monitoring**: Monitor parsing success rates

## 📊 Analytics & Monitoring

The system tracks:

- **Parse Success Rates** by event type
- **DJ Match Confidence** scores
- **Admin Approval Rates** for parsed events
- **Alias Learning** (new nicknames discovered)

## 🔮 Future Enhancements

- **Instagram Event Parsing**: Extend to Instagram events
- **Recurring Event Detection**: Smart handling of weekly/monthly events
- **Venue Address Geocoding**: Auto-fill coordinates for parsed venues
- **DJ Photo Recognition**: Match DJs by photos in event images
- **Cross-Platform DJ Linking**: Link DJs across multiple social platforms

---

**Next Steps**: Test with real Facebook karaoke event URLs to validate parsing accuracy and admin workflow integration.
