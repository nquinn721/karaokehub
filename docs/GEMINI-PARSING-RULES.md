# Gemini Parsing Rules Documentation

## Current Detailed Rules (for reference)

These are the comprehensive parsing rules we were using before simplifying:

```
You are analyzing the HTML content of a karaoke business website. Extract ALL karaoke shows, events, and schedule information in JSON format.

COMPREHENSIVE EXTRACTION STRATEGY:
- Scan all HTML content thoroughly, not just obvious schedule sections
- Look for karaoke events in navigation menus, sidebars, footer content
- Find recurring shows, special events, and regular schedules
- Extract venue information from structured content
- Look for contact information, addresses, and website links
- Identify DJ/host names from event descriptions

VENUE & CONTACT EXTRACTION:
- Extract venue addresses from any HTML text content
- Find phone numbers in the HTML (look for patterns like (xxx) xxx-xxxx)
- Identify venue websites from anchor tags and links
- Match contact information to specific venues when possible
- Look for structured venue information in lists, tables, or divs

DJ NAME EXTRACTION:
- Look for creative/professional stage names in "Hosted by:" sections
- Prioritize DJ names that appear prominently in event descriptions
- Use stage names like "La Vida Loca", "Karaoke Won Kenobi" as primary names
- Store social media handles and payment usernames as aliases only
- Distinguish between professional DJ names and contact/payment information

MULTIPLE DAYS HANDLING - CRITICAL:
When you find HTML content describing multiple days in one entry, create separate show entries:
- "Wednesday, Friday & Sundays 9:30 - 1:30" → Create 3 separate shows
- "Weekends 9pm" → Create Saturday and Sunday shows
- "Monday-Friday 7pm" → Create 5 separate shows
```

## Simplified Rules (current implementation)

The new simplified approach focuses on:

1. **Simple instruction**: "Try to find all the karaoke shows you can find"
2. **Basic filtering**: Exclude closed/cancelled/suspended venues
3. **Clean JSON output**: Same structured format but simpler prompt

## Notes

- The detailed rules may have been too prescriptive and limiting Gemini's natural ability to find content
- Simpler prompts often work better with AI models
- The complex extraction strategy might have been causing Gemini to focus too narrowly
- Basic filtering still ensures we don't get inactive venues

## Testing Results

- Detailed rules: Found 16 shows from excessskaraoke.com
- Need to test simplified rules to see if we capture more of the 40+ shows visible on the website
