#!/bin/bash

echo "🎵 KaraokeHub Music API Environment Test"
echo "========================================"
echo

# Test local development setup
echo "Testing LOCAL DEVELOPMENT setup..."
export NODE_ENV=development
echo "NODE_ENV set to: $NODE_ENV"
echo

echo "In this mode:"
echo "✅ Primary: iTunes API (no auth required)"
echo "✅ Fallback: Deezer → MusicBrainz → Sample data"
echo

# Test production setup
echo "Testing PRODUCTION setup..."
export NODE_ENV=production
echo "NODE_ENV set to: $NODE_ENV"
echo

echo "In this mode:"
echo "🎯 Primary: Spotify API (requires SPOTIFY_CLIENT_ID & SPOTIFY_CLIENT_SECRET)"
echo "🔄 Fallback: Deezer → iTunes → MusicBrainz → Sample data"
echo

echo "Environment Variables Check:"
echo "NODE_ENV: ${NODE_ENV:-'not set'}"
echo "SPOTIFY_CLIENT_ID: ${SPOTIFY_CLIENT_ID:-'not set'}"
echo "SPOTIFY_CLIENT_SECRET: ${SPOTIFY_CLIENT_SECRET:-'not set'}"
echo

echo "To test locally with iTunes:"
echo "export NODE_ENV=development && npm run start:dev"
echo

echo "To test production mode (requires Spotify credentials):"
echo "export NODE_ENV=production && npm run start:prod"
