# 🎉 Facebook Event Parsing & DJ Nickname Intelligence

## 🌟 Enhanced Features

### **Facebook Event Processing**

- **Direct Event URLs**: Parse `facebook.com/events/123456789` URLs
- **Event Page Scraping**: Extract event title, description, date/time, location, and host information
- **Cover Image Analysis**: Analyze event cover photos for additional details using Gemini Vision API
- **Smart URL Detection**: Automatically detect Facebook events vs regular posts for optimal parsing

### **Intelligent DJ Nickname Management**

- **Multi-Name Recognition**: Match DJs across different name formats (real names, stage names, social handles)
- **Social Handle Linking**: Connect `@djmax614` with "Max Denney" and "DJ Max"
- **Confidence Scoring**: AI-powered matching with confidence levels for name associations
- **Platform Tracking**: Track which platforms each nickname appears on

### **Enhanced Show Data Merging**

- **Smart Updates**: Merge new data with existing shows, preserving more detailed information
- **Field Intelligence**: Compare and choose better data (longer addresses, formatted phone numbers)
- **Non-Destructive Notes**: Append new notes rather than overwriting existing ones

## 🔧 Database Schema

### **DJ Nicknames Table**

```sql
CREATE TABLE dj_nicknames (
  id VARCHAR(36) PRIMARY KEY,
  djId VARCHAR(36) NOT NULL,
  nickname VARCHAR(255) NOT NULL,
  type ENUM('stage_name', 'alias', 'social_handle', 'real_name') DEFAULT 'alias',
  platform VARCHAR(100) NULL, -- 'facebook', 'instagram', etc.
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (djId) REFERENCES djs(id) ON DELETE CASCADE,
  INDEX idx_nickname (nickname),
  INDEX idx_dj_id (djId),
  INDEX idx_type (type)
);
```

## 📱 New API Endpoints

### **Facebook Event Parsing**

```http
# Parse Facebook event page (preview only)
POST /api/parser/parse-facebook-event
Body: { "url": "https://facebook.com/events/123456789" }

# Parse and save Facebook event for admin review
POST /api/parser/parse-and-save-facebook-event
Body: { "url": "https://facebook.com/events/123456789" }

# Smart parsing (auto-detects event vs post)
POST /api/parser/parse-smart-social-media
Body: { "url": "https://facebook.com/events/123456789" }
```

### **DJ Nickname Management**

```http
# Search for DJ by any nickname
POST /api/dj-nicknames/search/{nickname}

# Add nickname to DJ
POST /api/dj-nicknames/{djId}
Body: {
  "nickname": "@djmax614",
  "type": "social_handle",
  "platform": "facebook"
}

# Get all nicknames for a DJ
GET /api/dj-nicknames/{djId}
```

## 🎯 Example: Max Denney DJ Recognition

### **Input Variations**

```javascript
// All these inputs map to the same DJ:
'Max'; // Real name (short)
'Max Denney'; // Full real name
'DJ Max'; // Stage name with prefix
'@djmax614'; // Facebook handle
'djmax614'; // Handle without @
'KJ Max'; // Alternative prefix
```

### **AI Matching Logic**

```javascript
// Smart matching algorithm:
1. Exact nickname match (confidence: 95%)
2. DJ/KJ prefix variations (confidence: 85%)
3. Partial name matching (confidence: 70%)
4. Social handle patterns (confidence: 90%)
```

### **Database Storage**

```json
{
  "dj": {
    "id": "uuid-123",
    "name": "Max Denney",
    "vendorId": "vendor-uuid"
  },
  "nicknames": [
    { "nickname": "Max", "type": "alias" },
    { "nickname": "DJ Max", "type": "stage_name" },
    { "nickname": "@djmax614", "type": "social_handle", "platform": "facebook" },
    { "nickname": "Max Denney", "type": "real_name" }
  ]
}
```

## 🎨 Enhanced Client Interface

### **Admin Review Page Improvements**

- **DJ Alias Display**: Shows all known nicknames and social handles
- **Confidence Indicators**: Color-coded confidence scores
- **Nickname Management**: Add/edit DJ aliases directly from review interface

### **DJ Section Enhancement**

```tsx
// Enhanced DJ display in admin interface
{
  "name": "Max Denney",
  "aliases": ["Max", "DJ Max"],
  "socialHandles": ["@djmax614"],
  "confidence": 95,
  "context": "Found in event description as host"
}
```

## 🧠 AI Prompt Intelligence

### **Enhanced AI Understanding**

```prompt
CRITICAL DJ NAME INTELLIGENCE:
- DJs often have multiple names: real names, stage names, social media handles
- @djmax614 might also be known as "Max", "Max Denney", "DJ Max", etc.
- Look for patterns like @username, "with [name]", "hosted by [name]", "DJ [name]", "KJ [name]"
- Be smart about variations: "Max" = "DJ Max" = "@djmax614" = "Max Denney"

FACEBOOK EVENT SPECIFIC PATTERNS:
- Event titles often contain venue name and event type
- Descriptions contain detailed time/location info
- Host field contains DJ/organizer name
- Look for recurring patterns like "Every Thursday", "Weekly Karaoke"
```

## 🔄 Smart Show Data Merging

### **Intelligent Field Updates**

```javascript
// Example merging logic:
existing: { venue: "Crescent Lounge", time: "8pm" }
new:      { venue: "The Crescent Lounge", time: "8:00 PM", address: "123 Main St" }
result:   { venue: "The Crescent Lounge", time: "8:00 PM", address: "123 Main St" }

// Phone number intelligence:
existing: { phone: "5551234567" }
new:      { phone: "(555) 123-4567" }
result:   { phone: "(555) 123-4567" } // Prefers formatted version

// Notes merging:
existing: { notes: "Weekly event" }
new:      { notes: "Live DJ music" }
result:   { notes: "Weekly event; Live DJ music" }
```

## 🧪 Testing Scenarios

### **Facebook Event Test Cases**

1. **Crescent Lounge Thursday**: `"Thursdays! @thecrescentlounge #Karaoke 8pm-12am!"`
2. **O'Nelly's Friday**: `"Fridays! @onellyssportspub #Karaoke 9pm-2am!"`
3. **Recurring Events**: Handle "Every Thursday" vs specific dates
4. **DJ Name Variations**: Test all nickname formats get matched correctly

### **Test Commands**

```bash
# Test Facebook event parsing
node test-facebook-event-parsing.js

# Test DJ nickname matching
curl -X POST http://localhost:8000/api/dj-nicknames/search/Max
curl -X POST http://localhost:8000/api/dj-nicknames/search/@djmax614
curl -X POST http://localhost:8000/api/dj-nicknames/search/DJ%20Max
```

## 🚀 Production Features

### **Performance Optimizations**

- **Smart Caching**: Cache DJ nickname matches to reduce database queries
- **Batch Processing**: Process multiple Facebook events efficiently
- **Rate Limiting**: Respect Facebook's API limits and scraping policies

### **Error Handling**

- **Graceful Fallbacks**: If Facebook blocks access, fallback to text-only parsing
- **Retry Logic**: Automatic retries for temporary network issues
- **Comprehensive Logging**: Detailed logs for debugging AI parsing decisions

### **Security Considerations**

- **Input Validation**: Validate Facebook URLs and prevent injection attacks
- **Rate Limiting**: Prevent abuse of parsing endpoints
- **Authentication**: Admin-only access to parsing and nickname management

---

## 🎯 Real-World Example: Crescent Lounge Event

### **Input**: Facebook Event

```
Title: "Crescent Lounge Karaoke Thursdays!"
Description: "Join us every Thursday for karaoke night with @djmax614!"
Time: "8:00 PM - 12:00 AM"
Location: "The Crescent Lounge, Columbus"
```

### **AI Extraction**

```json
{
  "vendor": {
    "name": "The Crescent Lounge",
    "confidence": 95
  },
  "djs": [
    {
      "name": "Max Denney", // Matched from @djmax614
      "aliases": ["@djmax614", "DJ Max", "Max"],
      "confidence": 90
    }
  ],
  "shows": [
    {
      "venue": "The Crescent Lounge",
      "day": "thursday",
      "startTime": "20:00",
      "endTime": "00:00",
      "djName": "Max Denney",
      "description": "Weekly karaoke night",
      "confidence": 88
    }
  ]
}
```

This enhanced system makes KaraokePal incredibly intelligent at understanding DJ identities and event details from real-world Facebook posts and events!
