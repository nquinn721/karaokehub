#!/usr/bin/env node

// Simple test to check environment variables in the current context
console.log('🎵 Environment Variable Test');
console.log('='.repeat(50));
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('SPOTIFY_CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET ? 'SET' : 'NOT SET');

if (process.env.SPOTIFY_CLIENT_ID) {
  console.log('SPOTIFY_CLIENT_ID length:', process.env.SPOTIFY_CLIENT_ID.length);
  console.log(
    'SPOTIFY_CLIENT_ID first 8 chars:',
    process.env.SPOTIFY_CLIENT_ID.substring(0, 8) + '...',
  );
}

if (process.env.SPOTIFY_CLIENT_SECRET) {
  console.log('SPOTIFY_CLIENT_SECRET length:', process.env.SPOTIFY_CLIENT_SECRET.length);
  console.log(
    'SPOTIFY_CLIENT_SECRET first 8 chars:',
    process.env.SPOTIFY_CLIENT_SECRET.substring(0, 8) + '...',
  );
}

console.log('='.repeat(50));
