# Enhanced Gemini Deduplication System

## Overview

The deduplication system has been significantly enhanced with intelligent Gemini AI logic to handle complex duplicate detection scenarios across all entity types.

## Enhanced Entity Support

### 1. Venues (Improved)

**New Logic:**

- **Address Similarity**: Detects "123 Main St" vs "123 Main Street" as same venue
- **Name Completeness**: Prefers "Oties Tavern & Grill" over "Oties"
- **Information Richness**: Keeps records with websites, descriptions, full addresses
- **Abbreviation Handling**: Prefers "Street" over "St", "Avenue" over "Ave"

**Example:**

```json
{
  "keepRecord": {
    "id": "venue-2",
    "name": "Oties Tavern & Grill",
    "reason": "has full street name and complete info"
  },
  "deleteIds": ["venue-1"],
  "deletedNames": ["Oties"]
}
```

### 2. Shows (Enhanced)

**New Logic:**

- **Venue + Day + Time**: Primary duplicate detection criteria
- **DJ Correlation**: Same DJ same day = likely duplicate even if times differ
- **Time Overlap**: Shows within 30 minutes at same venue
- **Frequency Matching**: "Weekly" vs "Every Tuesday" same venue

**Smart Preferences:**

- Complete venue linkage over unlinked venues
- Better time formatting ("7:00 PM" > "7pm")
- Linked DJs over anonymous shows
- Clear frequency descriptions

### 3. DJs (Enhanced)

**New Logic:**

- **Name Variations**: "DJ Mike", "Mike", "Michael" = same person
- **Professional Names**: Prefers "KJ Sarah" over "Sarah"
- **Nickname Detection**: "Big Mike" vs "Michael Johnson"
- **Vendor Correlation**: Same vendor + similar name = likely duplicate

**Smart Preferences:**

- Professional stage names over casual nicknames
- Proper capitalization over all caps/lowercase
- Records with vendor associations
- More complete contact information

### 4. Vendors (New!)

**Detection Logic:**

- **Business Name Variations**: "ABC Entertainment" vs "ABC Ent"
- **Website Matching**: Same URL = definitely same business
- **Social Media**: Same Instagram/Facebook = same business
- **Owner Correlation**: Same owner name = likely same business

**Smart Preferences:**

- Official business names ("LLC", "Inc") over casual names
- Multiple social media links
- Complete business descriptions
- Proper formatting and capitalization

## API Endpoints

### Analysis Endpoints

- `POST /admin/deduplicate/venues/analyze`
- `POST /admin/deduplicate/shows/analyze`
- `POST /admin/deduplicate/djs/analyze`
- `POST /admin/deduplicate/vendors/analyze` ✨ **NEW**

### Execution Endpoint

- `POST /admin/deduplicate/:type/execute`
  - Supports: `venues`, `shows`, `djs`, `vendors`

## Frontend Integration

### Admin Dashboard

All entity tables now have dedupe buttons:

- ✅ Venues (enhanced logic)
- ✅ Shows (enhanced logic)
- ✅ DJs (enhanced logic)
- ✅ Vendors ✨ **NEW**

### Deduplication Dialog

- Shows grouped duplicates
- Highlights which record will be kept
- Displays reasoning for decisions
- Allows manual selection override

## Gemini Prompt Engineering

### Core Principles

1. **Conservative Approach**: "When in doubt, don't mark as duplicate"
2. **Information Preservation**: Always keep the record with more complete data
3. **Business Logic**: Understands real-world business naming patterns
4. **Context Awareness**: Considers relationships between entities

### Address Normalization

- Street/St, Avenue/Ave, Boulevard/Blvd
- First/1st, Second/2nd, Third/3rd
- Apartment/Apt, Suite/Ste, Building/Bldg

### Name Intelligence

- Professional vs casual names
- Abbreviations and acronyms
- Possessive forms ("Mike's" vs "Mikes")
- Business suffixes (LLC, Inc, Corp)

## Usage Examples

### Testing Venue Deduplication

```bash
# Navigate to admin dashboard
# Go to Venues tab
# Click "Dedupe" button
# Review suggested merges
# Execute deletion of duplicates
```

### Expected Results

- **Before**: 50 venues with 15 duplicates
- **After**: 35 unique venues with complete information
- **Data Quality**: Improved address formatting, complete business names

## Benefits

1. **Data Quality**: Eliminates inconsistent venue names and addresses
2. **User Experience**: Cleaner search results and venue listings
3. **Storage Efficiency**: Reduces database bloat from duplicates
4. **Maintenance**: Easier to update venue information centrally
5. **Accuracy**: AI-powered detection catches human-missed duplicates

## Safety Features

- **Dry Run Analysis**: Shows proposed changes before execution
- **Manual Override**: Admin can modify AI suggestions
- **Rollback Support**: Database backups before bulk operations
- **Conservative Logic**: Errs on side of keeping separate records
- **Audit Trail**: Logs all deduplication decisions

## Next Steps

1. Test enhanced logic with production data
2. Monitor deduplication accuracy
3. Refine prompts based on results
4. Add batch processing for large datasets
5. Implement scheduled deduplication checks
