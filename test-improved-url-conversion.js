// Test the improved URL conversion strategy
// This should reduce fallback usage by being more conservative

const testUrls = [
  // Example of what Facebook URLs currently look like
  'https://scontent-lga3-1.xx.fbcdn.net/v/t39.30808-6/s320x320/image123.jpg?_nc_cat=123&ccb=1-7&_nc_sid=aa7b47&_nc_zt=23&_nc_ht=scontent-lga3-1.xx',
  'https://scontent-lga3-2.xx.fbcdn.net/v/t39.30808-6/image456.jpg?stp=dst-jpg_p320x320&_nc_cat=456&ccb=1-7&_nc_sid=aa7b47',
  'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/fullsize789.jpg?_nc_cat=789&ccb=1-7&_nc_sid=aa7b47&_nc_zt=23',
];

function simulateNewUrlConversion(originalUrl) {
  console.log('\n=== URL CONVERSION TEST ===');
  console.log('Original:', originalUrl);

  // Simulate the new logic
  if (originalUrl.includes('scontent') || originalUrl.includes('fbcdn')) {
    let largeUrl = originalUrl;

    // Parse structure
    const urlMatch = largeUrl.match(
      /https:\/\/scontent-([^.]+)\.xx\.fbcdn\.net\/v\/t39\.30808-6\/([^?]+)/,
    );
    if (urlMatch) {
      const serverSuffix = urlMatch[1];
      const imageFilename = urlMatch[2];

      console.log('Server:', serverSuffix);
      console.log('Filename:', imageFilename);

      // Check for thumbnails more conservatively
      const isThumbnail =
        largeUrl.includes('/s320x320/') ||
        largeUrl.includes('/s130x130/') ||
        largeUrl.includes('/s200x200/') ||
        largeUrl.includes('stp=dst-jpg_p') ||
        largeUrl.includes('stp=cp') ||
        largeUrl.includes('stp=dst-jpg_s');

      console.log('Is Thumbnail:', isThumbnail);

      if (isThumbnail) {
        // Strategy 1: Remove size constraints from path
        if (
          largeUrl.includes('/s320x320/') ||
          largeUrl.includes('/s130x130/') ||
          largeUrl.includes('/s200x200/')
        ) {
          const converted = largeUrl.replace(/\/s\d+x\d+\//, '/');
          console.log('Strategy 1 - Remove size path:', converted);
          return converted;
        }

        // Strategy 2: Remove stp parameter
        if (
          largeUrl.includes('stp=dst-jpg_p') ||
          largeUrl.includes('stp=cp') ||
          largeUrl.includes('stp=dst-jpg_s')
        ) {
          try {
            const url = new URL(largeUrl);
            url.searchParams.delete('stp');
            const converted = url.toString();
            console.log('Strategy 2 - Remove stp param:', converted);
            return converted;
          } catch (error) {
            console.log('Strategy 2 failed:', error.message);
          }
        }

        // Strategy 3: Keep original
        console.log('Strategy 3 - Keep original (conservative):', originalUrl);
        return originalUrl;
      } else {
        console.log('Full-size URL - no conversion needed');
        return originalUrl;
      }
    }
  }

  return originalUrl;
}

// Test the conversion
testUrls.forEach((url) => {
  const result = simulateNewUrlConversion(url);
  console.log('Final result:', result);
  console.log('Same as original?', result === url);
});

console.log('\n✅ Ready to test with real Facebook parsing!');
