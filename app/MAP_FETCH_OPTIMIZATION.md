# Map-Based Fetch Optimization

## Overview

Updated the mobile app to follow the same API fetching pattern as the webapp - only fetch shows when the map moves, not constantly based on GPS changes.

## Changes Made

### 1. **ShowStore.ts**

- **Removed automatic fetching during initialization**
  - `initialize()` now only marks store as initialized
  - No longer calls `fetchShows()` during app startup
  - Shows are only fetched when map position is established

### 2. **MapStore.ts**

- **Added debounced fetch on region changes**
  - `setRegion()` now calls `debouncedFetchData()` instead of direct `fetchDataForCurrentView()`
  - Uses 300ms debounce timer (same as webapp)
  - Prevents excessive API calls during map dragging

- **Added explicit initial fetch**
  - `goToCurrentLocation()` now calls `fetchDataForCurrentView()` after setting location
  - Ensures shows load immediately after location is obtained
  - Works for both user location and default fallback location

### 3. **Location-Based Debouncing Enhanced**

- **Existing debouncing logic maintained**
  - Time-based debouncing: 500ms minimum between requests
  - Location-based debouncing: 0.001 degrees (~100 meters) threshold
  - GPS micro-movements (0.000001 degrees) are filtered out

## Behavior Flow

### Webapp Pattern (now matched):

1. App starts → No API calls
2. Map initializes → No API calls
3. User location obtained → **First API call**
4. User moves map → **Debounced API calls (300ms)**
5. GPS micro-changes → **Filtered out by location threshold**

### Previous Mobile Pattern:

1. App starts → **Immediate API call** ❌
2. Any GPS change → **Constant API calls** ❌
3. Map movement → Additional API calls

## Benefits

- **Reduced API load**: No constant background fetching
- **Better UX**: Shows load when users actually move the map
- **Consistent behavior**: Mobile app now matches webapp logic
- **Smart debouncing**: Filters GPS noise while responding to real movement

## Testing

The mobile app should now:

- ✅ Load shows only when map position changes
- ✅ Ignore GPS micro-movements (< 0.001 degrees)
- ✅ Use 300ms debounce for map dragging
- ✅ Fetch shows immediately after getting user location
- ✅ Not make API calls during app initialization

## Logs to Monitor

Look for:

- `🚀 Initializing ShowStore (no initial fetch - waiting for map position)...`
- `✅ Successfully got current location: {...}`
- `🚫 Skipping fetch - location change too small: {...}`
- API calls only triggered by `fetchDataForCurrentView()`
