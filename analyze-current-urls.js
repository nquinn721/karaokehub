// Quick analysis of Facebook URL patterns
// Let's see what the current URLs look like vs our template

const sampleUrls = [
  // These should be some real URLs from the logs - let me examine them
];

// Let's test our URL conversion logic
function analyzeUrl(originalUrl) {
  console.log('\n=== URL ANALYSIS ===');
  console.log('Original:', originalUrl);

  const urlMatch = originalUrl.match(
    /https:\/\/scontent-([^.]+)\.xx\.fbcdn\.net\/v\/t39\.30808-6\/([^?]+)/,
  );
  if (urlMatch) {
    const serverSuffix = urlMatch[1];
    const imageFilename = urlMatch[2];

    console.log('Server:', serverSuffix);
    console.log('Filename:', imageFilename);

    // Extract current parameters
    const paramMatch = originalUrl.match(/\?(.+)$/);
    if (paramMatch) {
      const params = new URLSearchParams(paramMatch[1]);
      console.log('Current parameters:');
      for (const [key, value] of params) {
        console.log(`  ${key}: ${value}`);
      }
    }

    // Our template
    const templateUrl = `https://scontent-${serverSuffix}.xx.fbcdn.net/v/t39.30808-6/${imageFilename}?ccb=1-7&_nc_sid=aa7b47&_nc_zt=23&_nc_ht=scontent-${serverSuffix}.xx`;
    console.log('Our template:', templateUrl);
  }
}

// First, let's get some actual URLs from the logs
console.log('Ready to analyze Facebook URLs...');
