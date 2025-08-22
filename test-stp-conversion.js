const http = require('http');
const https = require('https');
const { URL } = require('url');

// Function from facebook-parallel-image-loading.ts
function createLargeScaleUrl(originalUrl) {
  try {
    const urlObj = new URL(originalUrl);

    // Remove stp parameter to get larger image
    if (urlObj.searchParams.has('stp')) {
      urlObj.searchParams.delete('stp');
      return urlObj.toString();
    }

    return originalUrl;
  } catch (error) {
    console.error('Error processing URL:', error);
    return originalUrl;
  }
}

async function testStpConversion() {
  console.log('🔍 Testing STP parameter removal...\n');

  // Test URL with stp parameter (thumbnail size)
  const thumbnailUrl =
    'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/537887570_10239471219137488_5170534411219795979_n.jpg?stp=dst-jpg_s280x280_tt6&_nc_cat=101&ccb=1-7&_nc_sid=127cfc&_nc_ohc=abc123&_nc_ht=scontent-lga3-3.xx.fbcdn.net&oh=def456&oe=ghi789';

  console.log('Original URL:');
  console.log(thumbnailUrl);
  console.log('\nOriginal URL params:');
  const originalUrlObj = new URL(thumbnailUrl);
  originalUrlObj.searchParams.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });

  const convertedUrl = createLargeScaleUrl(thumbnailUrl);

  console.log('\nConverted URL:');
  console.log(convertedUrl);
  console.log('\nConverted URL params:');
  const convertedUrlObj = new URL(convertedUrl);
  convertedUrlObj.searchParams.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log('\n📊 Analysis:');
  console.log(`Original has stp param: ${originalUrlObj.searchParams.has('stp')}`);
  console.log(`Converted has stp param: ${convertedUrlObj.searchParams.has('stp')}`);
  console.log(`STP value removed: ${originalUrlObj.searchParams.get('stp') || 'none'}`);
  console.log(`URLs are different: ${thumbnailUrl !== convertedUrl}`);

  if (originalUrlObj.searchParams.has('stp') && !convertedUrlObj.searchParams.has('stp')) {
    console.log('✅ STP parameter successfully removed!');
  } else {
    console.log('❌ STP parameter removal failed!');
  }
}

testStpConversion().catch(console.error);
