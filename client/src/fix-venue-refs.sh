#!/bin/bash

# Quick fix script for venue-show separation TypeScript errors

echo "🔧 Fixing venue-show separation TypeScript errors..."

# Fix show.venue} references to handle both string and object
find . -name "*.tsx" -type f -exec sed -i 's/{show\.venue}/{(show.venue \&\& typeof show.venue === "object" ? show.venue.name : show.venue) || "Unknown Venue"}/g' {} \;

# Fix show.address references
find . -name "*.tsx" -type f -exec sed -i 's/{show\.address}/{show.venue \&\& typeof show.venue === "object" ? show.venue.address : null}/g' {} \;

# Fix show.city references
find . -name "*.tsx" -type f -exec sed -i 's/show\.city/show.venue \&\& typeof show.venue === "object" ? show.venue.city : null/g' {} \;

# Fix show.state references
find . -name "*.tsx" -type f -exec sed -i 's/show\.state/show.venue \&\& typeof show.venue === "object" ? show.venue.state : null/g' {} \;

# Fix show.lat and show.lng references
find . -name "*.tsx" -type f -exec sed -i 's/show\.lat/show.venue \&\& typeof show.venue === "object" ? show.venue.lat : null/g' {} \;
find . -name "*.tsx" -type f -exec sed -i 's/show\.lng/show.venue \&\& typeof show.venue === "object" ? show.venue.lng : null/g' {} \;

echo "✅ Venue-show separation fixes applied!"
