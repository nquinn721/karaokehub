# Day Selector Implementation Summary

## Overview

Replaced the search/filter bar with a webapp-style day selector and updated the API fetching logic to use day-based filtering with 100-mile radius.

## Changes Made

### 1. **Created DayPicker Component** (`/app/src/components/DayPicker.tsx`)

- **Two-row layout**: Mon-Thu on first row, Fri-Sun on second row
- **Full-width responsive**: Each day button fills available space
- **Selected state styling**: Blue background with white text for selected day
- **Unselected state styling**: Light background with dark text
- **Consistent with webapp**: Same day abbreviations (Mon, Tue, Wed, etc.)

### 2. **Updated ShowsScreen.tsx**

- **Removed search bar**: Deleted search input and filter icon
- **Added DayPicker**: Positioned above the "Karaoke Shows" title
- **Added day change handler**: Triggers map refresh when day selection changes
- **Cleaned up styles**: Removed unused search-related styles

### 3. **Updated MapStore.ts**

- **Fixed radius**: Always uses 100 miles (removed zoom-based radius logic)
- **Always use day filtering**: Removed conditional day filtering
- **Simplified logic**: No more nationwide fetching at low zoom levels
- **Consistent behavior**: Every map movement triggers day-based 100-mile search

### 4. **Updated ShowStore.ts**

- **Enhanced setSelectedDay**: Now triggers map refresh when day changes
- **Map refresh integration**: Calls MapStore.fetchDataForCurrentView() on day change
- **Circular dependency prevention**: Uses dynamic import for MapStore

## New Behavior Flow

### Before:

1. App loads → Fetches all shows
2. Search bar visible → No day filtering by default
3. Map movement → Variable radius based on zoom level
4. Day changes → No automatic refresh

### After:

1. App loads → No initial fetch (waits for map position)
2. Day selector visible → Always filters by selected day
3. Map movement → Always uses 100-mile radius with current day
4. Day changes → **Automatic map refresh with new day filter**

## API Call Pattern

**Every API call now follows this pattern:**

- **Day**: Always uses currently selected day
- **Location**: Center of current map view
- **Radius**: Always 100 miles
- **Triggered by**: Map movement OR day selection change

## UI Layout

```
┌─────────────────────────────────┐
│           Map View              │
│  ┌─────────────────────────┐   │
│  │    [Refresh] [Location] │   │
│  │                         │   │
│  │       Google Maps       │   │
│  │                         │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ [Mon] [Tue] [Wed] [Thu]         │
│ [Fri] [Sat] [Sun]               │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Karaoke Shows (31) ↓            │
│ ┌─────────────────────────────┐ │
│ │ Finnegan's Wake              │ │
│ │ monday 20:00:00              │ │
│ │ 841 Hill Rd N                │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

## Testing Checklist

- ✅ Day selector displays in two rows
- ✅ Selected day highlights in blue
- ✅ Tapping days changes selection
- ✅ Day changes trigger API calls
- ✅ API calls use 100-mile radius
- ✅ API calls filter by selected day
- ✅ Search bar removed from UI
- ✅ Map movements still trigger debounced fetching

## Files Modified

1. `/app/src/components/DayPicker.tsx` - **New component**
2. `/app/src/screens/ShowsScreen.tsx` - **UI changes**
3. `/app/src/stores/MapStore.ts` - **Fetch logic update**
4. `/app/src/stores/ShowStore.ts` - **Day change handling**
