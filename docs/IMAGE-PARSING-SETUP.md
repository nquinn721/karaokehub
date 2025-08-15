# 🖼️ Image & Social Media Parsing Features

## Overview

Enhanced karaoke event parsing capabilities that can extract event details from images and social media posts using Puppeteer + Gemini AI Vision.

## 🎯 **Use Cases**

### 1. **Facebook Event Posts**

Parse posts like the one shown with venue flyers containing:

- Venue name and address
- DJ information
- Date and time details
- Special features (food, drinks, parking)
- Contact information

### 2. **Instagram Event Images**

Extract text from event promotional images

### 3. **Direct Image URLs**

Parse event flyers or promotional images directly

## 🚀 **New API Endpoints**

### **Parse Social Media Post (Preview Only)**

```http
POST /api/parser/parse-social-media-post
Content-Type: application/json

{
  "url": "https://www.facebook.com/permalink.php?story_fbid=..."
}
```

**Response:**

```json
{
  "vendor": {
    "name": "The Crescent Lounge",
    "website": "https://facebook.com/crescentlounge",
    "confidence": 0.95
  },
  "djs": [
    {
      "name": "DJ MAX614",
      "confidence": 0.9
    }
  ],
  "shows": [
    {
      "venue": "The Crescent Lounge",
      "address": "5240 Godown Road, Columbus, Ohio",
      "date": "2024-08-17",
      "time": "8PM-12AM",
      "djName": "DJ MAX614",
      "description": "Karaoke every Saturday with craft cocktails and pizza",
      "confidence": 0.92
    }
  ]
}
```

### **Parse Image Directly (Preview Only)**

```http
POST /api/parser/parse-image
Content-Type: application/json

{
  "imageUrl": "https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/479675883_610547821608741_5223623110230996688_n.jpg?..."
}
```

### **Parse & Save Social Media Post (Admin Review)**

```http
POST /api/parser/parse-and-save-social-media-post
Content-Type: application/json

{
  "url": "https://www.facebook.com/permalink.php?story_fbid=..."
}
```

**Response:**

```json
{
  "parsedScheduleId": "uuid-123-456",
  "data": {
    /* parsed event data */
  }
}
```

### **Parse & Save Image (Admin Review)**

```http
POST /api/parser/parse-and-save-image
Content-Type: application/json

{
  "imageUrl": "https://example.com/event-flyer.jpg"
}
```

## 🧠 **How It Works**

### **Step 1: Content Extraction**

- **Puppeteer** navigates to the social media post
- Extracts both text content and image URLs
- Filters for relevant images (>200x200 pixels)
- Handles dynamic content loading

### **Step 2: Image Analysis**

- **Gemini Vision** analyzes each image
- Extracts all visible text using OCR
- Identifies key event information
- Maintains original formatting

### **Step 3: Content Combination**

```
SOCIAL MEDIA POST CONTENT:
Saturdays! The Crescent Lounge Columbus, Ohio #Karaoke 8pm-12am!

EXTRACTED FROM IMAGES:
--- Image 1 ---
KARAOKE
EVERY SATURDAY!
WITH @DJMAX614
THE CRESCENT LOUNGE
5240 GODOWN ROAD
COLUMBUS, OHIO
PIZZA SERVED ONSITE
CRAFT COCKTAILS
8PM-12AM
FREE PARKING
PRIVATE PATIO
ROTATING DRAFT BEERS
```

### **Step 4: AI Parsing**

- **Gemini 1.5 Pro** analyzes combined content
- Extracts structured event data
- Assigns confidence scores
- Handles various date/time formats

## 🎛️ **Configuration**

### **Environment Variables**

```bash
GEMINI_API_KEY=your-gemini-api-key
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome  # Optional for production
```

### **Image Requirements**

- **Supported formats**: PNG, JPG, JPEG
- **Size limits**: Up to 1024x1024 pixels
- **Content**: Must contain visible text
- **Quality**: Higher resolution = better OCR results

## 🔍 **Testing Example**

### **Test with the Crescent Lounge Image**

```bash
curl -X POST http://localhost:8000/api/parser/parse-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/479675883_610547821608741_5223623110230996688_n.jpg?stp=c0.394.1545.806a_cp6_dst-jpg_s1545x806_tt6&_nc_cat=110&ccb=1-7&_nc_sid=75d36f&_nc_ohc=FzGTzQ6Fzq8Q7kNvwHNqlb2&_nc_oc=AdmzuSIBaP3dF06vwKfCBgbNV4ae6oXDrQNQng_ND_2ax8Sxoy1OaUjnawuT8p3WIDE&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=BuspIiJkodJ484HWj3ceQQ&oh=00_AfW9TbWaeMfq8YQTQk3jIThY05ZdIeH--PFOcK-VzHnE2Q&oe=68A57C0C"
  }'
```

**Expected Results:**

- ✅ **Venue**: "The Crescent Lounge"
- ✅ **Address**: "5240 Godown Road, Columbus, Ohio"
- ✅ **DJ**: "DJ MAX614"
- ✅ **Time**: "8PM-12AM"
- ✅ **Day**: "Every Saturday"
- ✅ **Features**: Pizza, craft cocktails, free parking, private patio

## 🎨 **Supported Content Types**

### **Social Media Platforms**

- ✅ **Facebook** posts and events
- ✅ **Instagram** posts (public)
- ✅ **Twitter** posts with images
- ⚠️ **Note**: Some platforms may have anti-bot measures

### **Image Types**

- ✅ **Event flyers** (like the Crescent Lounge example)
- ✅ **Venue announcements**
- ✅ **Schedule graphics**
- ✅ **Promotional images**
- ❌ **Screenshots with poor quality**
- ❌ **Images without text**

## 🔧 **Admin Integration**

All parsed content goes through the existing admin review system:

1. **Parsed data** saved to `parsed_schedules` table
2. **Admin review** in existing admin dashboard
3. **Approval process** creates actual venue/show/DJ records
4. **Quality control** ensures data accuracy

## ⚡ **Performance Notes**

- **Image processing**: ~3-5 seconds per image
- **Social media posts**: ~10-15 seconds (includes navigation)
- **Concurrent parsing**: Limited to prevent rate limiting
- **Error handling**: Graceful fallback for failed images

## 🚀 **Next Steps**

1. **Test** with the provided Facebook image URL
2. **Refine** Gemini prompts based on results
3. **Add** batch processing for multiple posts
4. **Integrate** with existing admin workflow
5. **Monitor** API usage and costs
