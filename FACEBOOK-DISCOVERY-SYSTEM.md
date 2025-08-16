# 🎤 Facebook Profile & Post Discovery System Documentation

## Overview

Our enhanced Facebook parsing system can extract comprehensive karaoke show information from Facebook profiles beyond just formal events. This system combines Facebook Graph API data with intelligent web scraping to discover real-time karaoke information from DJ profiles and venue pages.

## 📊 Data Extraction Capabilities

### ✅ **Profile Information**

- **DJ Name & Professional Identity**: "Max Denney", "Digital Creator, DJ"
- **Location**: "Columbus, Ohio"
- **Social Media Handles**: "@DJMAX614" (Instagram links)
- **Follower Count**: "1K followers" (influence metrics)
- **Bio Information**: Professional descriptions and specialties
- **Confidence Level**: 90-95% for profile data

### ✅ **Weekly Schedule Discovery**

Our system extracts structured weekly schedules from profile bios/intro sections:

```
Wednesday: Kelley's Pub, 8pm-12am
Thursday: Crescent Lounge, 8pm-12am
Friday: O'Nelly's Sports Pub, 9pm-2am
Saturday: Crescent Lounge, 8pm-12am
Sunday: North High Dublin, 6pm-9pm
```

**Data Quality**: 95% confidence for recurring schedule information

### ✅ **Real-Time Post Activity**

- **Live Updates**: "Fridays! @onellyssportspub #Karaoke 9pm-2am!"
- **Timing Context**: Posted "6h ago" (real-time activity tracking)
- **Venue Tags**: @onellyssportspub (direct venue social media connections)
- **Hashtags**: #Karaoke (for discoverability and topic classification)
- **Engagement Metrics**: Reactions, comments, shares available

### ✅ **Social Network Mapping**

- **Cross-Platform Links**: Direct links to Instagram (@DJMAX614)
- **Venue Connections**: @onellyssportspub links to venue social media
- **Professional Network**: 81 following (likely other DJs/venues)
- **Community Size**: 1K followers (established karaoke community)

## 🔍 **Technical Implementation**

### **Multi-Stage Parsing Pipeline**

1. **Facebook Graph API** (Primary)
   - Event data extraction
   - Profile events discovery
   - Structured data with high confidence

2. **Enhanced Web Scraping** (Secondary)
   - Profile bio information
   - Recent posts and activity
   - Social media handle extraction
   - Venue tag identification

3. **AI Content Analysis** (Tertiary)
   - URL transformation and analysis
   - Content classification
   - Pattern recognition for karaoke-related content

### **Data Processing Flow**

```typescript
// 1. Detect Facebook URL type
if (this.facebookService.isFacebookEventUrl(url)) {
  // Use Graph API for events
} else if (this.facebookService.isFacebookProfileUrl(url)) {
  // Use enhanced profile extraction
  const enhancedData = await this.facebookService.getEnhancedProfileEvents(url);
} else {
  // Use Gemini transformation + fallback
}

// 2. Extract comprehensive data
const extractedData = {
  profileInfo: { name, followers, location, instagram, bio },
  schedule: [{ day, venue, time, dayOfWeek }],
  recentPosts: [{ timeAgo, content, venue, time, date }],
  venues: ['Kelley\'s Pub', 'Crescent Lounge', ...],
  additionalShows: [{ venue, time, day, confidence }]
};

// 3. Apply address lookup and validation
for (const show of result.shows) {
  if (!show.address) {
    show.address = await this.lookupVenueAddress(show.venue);
  }
}
```

## 📱 **Real-World Example: Max Denney Analysis**

### **Profile Discovery Results**

```json
{
  "vendor": {
    "name": "Max Denney / DJMAX614",
    "description": "DJ and Digital Creator based in Columbus, Ohio",
    "confidence": 95
  },
  "djs": [
    {
      "name": "Max Denney",
      "confidence": 100,
      "context": "Profile introduction",
      "aliases": ["DJMAX614"]
    }
  ],
  "shows": [
    {
      "venue": "Kelley's Pub",
      "time": "8pm-12am",
      "day": "wednesday",
      "djName": "Max Denney",
      "confidence": 95
    },
    {
      "venue": "Crescent Lounge",
      "time": "8pm-12am",
      "day": "thursday",
      "djName": "Max Denney",
      "confidence": 95
    },
    {
      "venue": "Crescent Lounge",
      "time": "8pm-12am",
      "day": "saturday",
      "djName": "Max Denney",
      "confidence": 95
    },
    {
      "venue": "O'Nelly's Sports Pub",
      "time": "9pm-2am",
      "day": "friday",
      "djName": "Max Denney",
      "description": "Karaoke",
      "confidence": 95
    },
    {
      "venue": "North High Dublin",
      "time": "6pm-9pm",
      "day": "sunday",
      "djName": "Max Denney",
      "confidence": 95
    }
  ]
}
```

### **Real-Time Content Extraction**

- **Recent Post**: "Fridays! @onellyssportspub #Karaoke 9pm-2am!"
- **Social Metrics**: 1K followers, professional network
- **Venue Tags**: @onellyssportspub (direct venue connection)
- **Hashtag Usage**: #Karaoke (content classification)

## 🚀 **Advanced Capabilities We Could Add**

### **Visual Content Analysis**

- **Event Photos**: Pictures from karaoke nights for venue validation
- **Venue Photos**: Interior shots and crowd analysis
- **Equipment Photos**: DJ setup verification
- **Promotional Graphics**: Event flyers and announcements

### **Engagement Analytics**

- **Audience Feedback**: Comments and reactions on karaoke posts
- **Viral Content**: Shares and reach metrics
- **Check-ins**: Location confirmations at venues
- **Customer Reviews**: Implicit feedback in comments

### **Historical Pattern Recognition**

- **Performance History**: Archive of past events and consistency
- **Seasonal Patterns**: Holiday shows and special events
- **Venue Relationships**: Long-term partnerships and changes
- **Growth Tracking**: Follower growth and engagement trends

### **Network Analysis**

- **DJ Connections**: Professional network mapping
- **Venue Partnerships**: Cross-promotional relationships
- **Customer Communities**: Regular attendee identification
- **Geographic Clusters**: Regional karaoke scene mapping

## 📈 **Business Intelligence Applications**

### **Market Research**

- **Competitive Analysis**: Other DJs in the same market
- **Venue Popularity**: Engagement metrics per location
- **Time Slot Analysis**: Peak hours and day preferences
- **Audience Demographics**: Follower analysis for targeting

### **Operational Insights**

- **Schedule Optimization**: Popular time slots and venues
- **Marketing Effectiveness**: Hashtag performance and reach
- **Customer Retention**: Regular attendee identification
- **Revenue Correlation**: Engagement vs. venue success

### **Discovery & Recommendations**

- **Similar DJs**: Network-based recommendations
- **New Venues**: Venue partnership opportunities
- **Event Timing**: Optimal scheduling suggestions
- **Cross-Promotion**: Collaborative marketing opportunities

## 🔧 **Configuration & Setup**

### **Required Environment Variables**

```bash
FACEBOOK_APP_ID=646464114624794
FACEBOOK_APP_SECRET=3ce6645105081d6f3a5442a30bd6b1ae
GEMINI_API_KEY=your_gemini_api_key
```

### **Service Dependencies**

- `FacebookService`: Graph API integration and web scraping
- `KaraokeParserService`: Main parsing logic and routing
- `GeocodingService`: Address lookup and validation
- `GoogleGenerativeAI`: Content analysis and URL transformation

### **API Usage Example**

```bash
# Parse Facebook profile for karaoke data
curl -X POST http://localhost:8000/api/parser/parse-website \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.facebook.com/max.denney.194690"}'
```

## 🎯 **Key Success Metrics**

### **Data Quality**

- **Profile Information**: 95% confidence for bio data
- **Weekly Schedules**: 95% confidence for recurring shows
- **Recent Posts**: 90% confidence for real-time updates
- **Venue Connections**: 85% confidence for social media links

### **Coverage & Completeness**

- **5 Weekly Shows**: Complete schedule extraction
- **Social Media Links**: Instagram handle discovery
- **Real-Time Updates**: Recent post activity capture
- **Venue Network**: Social media tag relationships

### **Practical Value**

- **Real-Time Discovery**: "Tonight's events" from recent posts
- **Reliable Schedules**: Weekly patterns for planning
- **Professional Network**: DJ and venue relationship mapping
- **Community Insights**: Follower count and engagement metrics

This enhanced Facebook discovery system provides comprehensive karaoke scene intelligence that goes far beyond traditional event listings, capturing the real-time, social nature of the karaoke community.
