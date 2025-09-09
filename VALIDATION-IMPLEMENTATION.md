# 🛡️ KaraokeHub Data Validation Implementation

## Overview

This implementation adds comprehensive validation to ensure data integrity by preventing:
- Shows without venues or DJs
- Venues without addresses
- Removal of required fields from existing records

## ✅ Validation Rules Implemented

### Show Validation
1. **DJ Required**: Every show MUST have a DJ (`djId` field is required)
2. **Venue Required**: Every show MUST have a venue (either `venueId` OR `venueName` + `venueAddress`)
3. **Complete Venue Data**: When creating a new venue, address is mandatory
4. **Update Protection**: Cannot remove DJ or venue from existing shows

### Venue Validation
1. **Address Required**: Every venue MUST have an address
2. **Update Protection**: Cannot remove address from existing venues

## 📁 Files Modified

### New Files Created
- `src/show/dto/show.dto.ts` - Show DTOs with validation decorators
- `src/venue/dto/venue.dto.ts` - Venue DTOs with validation decorators
- `src/common/validators/venue-validation.decorator.ts` - Custom validation decorators

### Modified Files
- `src/show/show.service.ts` - Enhanced with validation logic
- `src/venue/venue.service.ts` - Enhanced with validation logic
- `src/show/show.controller.ts` - Updated to use new DTOs
- `src/venue/venue.controller.ts` - Updated to use new DTOs
- `src/parser/karaoke-parser.service.ts` - Added validation before creating entities

## 🎯 Implementation Details

### 1. Data Transfer Objects (DTOs)

#### Show DTOs (`src/show/dto/show.dto.ts`)
```typescript
export class CreateShowDto {
  @IsNotEmpty({ message: 'DJ is required for a show' })
  @IsUUID('4', { message: 'DJ ID must be a valid UUID' })
  djId: string;

  @IsOptional()
  @IsUUID('4', { message: 'Venue ID must be a valid UUID' })
  @HasVenueOrVenueData()
  venueId?: string;

  @IsOptional()
  @IsString()
  @RequiredForVenueCreation()
  venueAddress?: string;
  // ... other fields
}
```

#### Venue DTOs (`src/venue/dto/venue.dto.ts`)
```typescript
export class CreateVenueDto {
  @IsNotEmpty({ message: 'Venue name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Address is required for a venue' })
  @IsString()
  address: string;
  // ... other fields
}
```

### 2. Custom Validation Decorators

#### `@HasVenueOrVenueData()`
Ensures shows have either an existing venue ID OR complete venue creation data (name + address).

#### `@RequiredForVenueCreation()`
Makes address required when creating a new venue through show creation.

### 3. Service-Level Validation

#### Show Service Validation
```typescript
async create(createShowDto: CreateShowDto): Promise<Show> {
  // Validate that either venueId or venue creation data is provided
  if (!createShowDto.venueId && !createShowDto.venueName) {
    throw new BadRequestException('Either venue ID or venue name is required to create a show');
  }

  // Validate address when creating new venue
  if (!venueId && createShowDto.venueName && !createShowDto.venueAddress) {
    throw new BadRequestException('Address is required when creating a new venue');
  }
  // ... rest of creation logic
}
```

#### Venue Service Validation
```typescript
async create(createVenueDto: CreateVenueDto): Promise<Venue> {
  if (!createVenueDto.address) {
    throw new BadRequestException('Address is required to create a venue');
  }
  // ... rest of creation logic
}
```

### 4. Parser Validation

The karaoke parser now validates data before saving:

```typescript
// Validate required fields before creating show
if (!djId) {
  this.logAndBroadcast(`Skipping show at ${showData.venue} - no DJ assigned`, 'warning');
  return null; // Skip this show
}

if (!venue?.id) {
  this.logAndBroadcast(`Skipping show at ${showData.venue} - no venue found or created`, 'warning');
  return null; // Skip this show
}
```

## 🚀 Benefits

1. **Data Integrity**: Prevents orphaned or incomplete records
2. **Clear Error Messages**: Users get specific feedback about validation failures
3. **Multi-Layer Protection**: Validation at DTO, service, and parser levels
4. **Business Rule Enforcement**: Ensures all karaoke shows have essential information
5. **Consistent API Responses**: Standardized error handling across all endpoints

## 🔧 Usage Examples

### Valid Show Creation
```json
{
  "djId": "123e4567-e89b-12d3-a456-426614174000",
  "venueId": "987e6543-e21b-12d3-a456-426614174999",
  "day": "friday",
  "startTime": "19:00",
  "endTime": "23:00"
}
```

### Valid Show with New Venue
```json
{
  "djId": "123e4567-e89b-12d3-a456-426614174000",
  "venueName": "The Karaoke Lounge",
  "venueAddress": "123 Main St",
  "venueCity": "Nashville",
  "venueState": "TN",
  "day": "friday",
  "startTime": "19:00",
  "endTime": "23:00"
}
```

### Invalid Requests (Will Fail)
```json
// Missing DJ
{
  "venueId": "987e6543-e21b-12d3-a456-426614174999",
  "day": "friday",
  "startTime": "19:00"
}

// Missing venue information
{
  "djId": "123e4567-e89b-12d3-a456-426614174000",
  "day": "friday",
  "startTime": "19:00"
}

// Venue name without address
{
  "djId": "123e4567-e89b-12d3-a456-426614174000",
  "venueName": "The Karaoke Lounge",
  "day": "friday",
  "startTime": "19:00"
}
```

## 🧪 Testing

Run the validation test script to see the rules in action:
```bash
node test-validation-rules.js
```

## 📊 Error Responses

When validation fails, the API returns detailed error messages:

```json
{
  "statusCode": 400,
  "message": [
    "DJ is required for a show",
    "Show must have either a venue ID or venue name with address for venue creation"
  ],
  "error": "Bad Request"
}
```

## 🔄 Migration Notes

- Existing data is not affected by these validation rules
- Only new creates and updates are validated
- Parser will skip shows without required data instead of failing completely
- Validation can be extended or customized as needed

## 🎉 Conclusion

The validation system ensures that:
- Every show has a DJ and a venue
- Every venue has an address
- Data integrity is maintained across all entry points
- Clear feedback is provided when validation fails
- The karaoke community gets complete, reliable show information

Your karaoke data is now protected by comprehensive validation rules! 🎤✨
