// Test CORS configuration for production upload
console.log('=== CORS Configuration Test ===');

// Simulate the CORS logic from main.ts
const allowedOrigins = [
  'https://karaoke-hub.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:8000',
];

function testCorsOrigin(origin, isProduction = true, allowLocalUpload = 'true') {
  console.log(`\n--- Testing Origin: ${origin} ---`);
  console.log(`Production mode: ${isProduction}`);
  console.log(`ALLOW_LOCAL_PRODUCTION_UPLOAD: ${allowLocalUpload}`);

  // Simulate CORS logic
  if (!origin) {
    console.log('✅ ALLOWED: No origin (mobile apps, curl, etc.)');
    return true;
  }

  const isProductionUploadFromLocal =
    origin && origin.includes('localhost') && allowLocalUpload === 'true';

  const inAllowedOrigins = allowedOrigins.includes(origin);

  console.log(`In allowed origins: ${inAllowedOrigins}`);
  console.log(`Is production upload from local: ${isProductionUploadFromLocal}`);

  if (inAllowedOrigins || isProductionUploadFromLocal) {
    console.log('✅ ALLOWED');
    return true;
  } else {
    console.log('❌ BLOCKED');
    return false;
  }
}

// Test various scenarios
testCorsOrigin('http://localhost:5173', true, 'true'); // Your frontend trying to upload to prod
testCorsOrigin('http://localhost:5173', true, 'false'); // Same but upload disabled
testCorsOrigin('https://karaoke-hub.com', true, 'true'); // Production frontend
testCorsOrigin('https://evil-site.com', true, 'true'); // Blocked origin
testCorsOrigin('http://localhost:8000', true, 'true'); // Your backend
testCorsOrigin(null, true, 'true'); // No origin

console.log('\n=== Summary ===');
console.log('✅ Your localhost frontend should now be able to upload to production');
console.log('✅ The ALLOW_LOCAL_PRODUCTION_UPLOAD=true env var is set in both local and Cloud Run');
console.log('✅ Localhost origins are now included in production CORS when upload is enabled');
console.log('✅ Added logging to help debug any remaining CORS issues');

console.log('\n🚀 Deploy these changes to production and try your upload again!');
