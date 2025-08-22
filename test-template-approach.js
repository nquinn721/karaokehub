// Test the template approach with various Facebook URLs
function createLargeScaleUrl(originalUrl) {
  console.log(`\n=== TEMPLATE APPROACH TEST ===`);
  console.log(`Original: ${originalUrl}`);

  try {
    if (originalUrl.includes('scontent') || originalUrl.includes('fbcdn')) {
      let largeUrl = originalUrl;

      // DEFENSIVE FIX: Handle malformed URLs that have .jpg& instead of .jpg?
      if (largeUrl.includes('.jpg&') && !largeUrl.includes('.jpg?')) {
        console.log(`Fixing malformed URL: .jpg& -> .jpg?`);
        largeUrl = largeUrl.replace('.jpg&', '.jpg?');
      } else if (largeUrl.includes('.jpeg&') && !largeUrl.includes('.jpeg?')) {
        console.log(`Fixing malformed URL: .jpeg& -> .jpeg?`);
        largeUrl = largeUrl.replace('.jpeg&', '.jpeg?');
      }

      // SIMPLE TEMPLATE APPROACH: Extract key components and rebuild with working template
      const urlMatch = largeUrl.match(
        /https:\/\/scontent-([^.]+)\.xx\.fbcdn\.net\/v\/t39\.30808-6\/([^?]+)/,
      );
      if (urlMatch) {
        const serverSuffix = urlMatch[1]; // e.g., "lga3-3" or "lga3-2"
        const imageFilename = urlMatch[2]; // e.g., "537887570_10239471219137488_5170534411219795979_n.jpg"

        console.log(`Extracted server: ${serverSuffix}`);
        console.log(`Extracted filename: ${imageFilename}`);

        // Check if this looks like a thumbnail (has size constraints in path or stp parameter)
        const isThumbnail =
          largeUrl.includes('/s320x320/') ||
          largeUrl.includes('/s130x130/') ||
          largeUrl.includes('/s200x200/') ||
          largeUrl.includes('stp=dst-jpg_p') ||
          largeUrl.includes('stp=cp') ||
          imageFilename.includes('/s1') ||
          imageFilename.includes('/p1');

        console.log(`Is thumbnail: ${isThumbnail}`);

        if (isThumbnail) {
          console.log(`Thumbnail detected, converting using template approach...`);

          // Clean the filename of any size constraints
          let cleanFilename = imageFilename.replace(/s\d+x\d+\//, '').replace(/p\d+x\d+\//, '');
          console.log(`Clean filename: ${cleanFilename}`);

          // Use template format from working URLs (remove hash parameters since we're modifying)
          // Template: https://scontent-SERVER.xx.fbcdn.net/v/t39.30808-6/FILENAME?ccb=1-7&_nc_sid=aa7b47&_nc_zt=23&_nc_ht=scontent-SERVER.xx
          const templateUrl = `https://scontent-${serverSuffix}.xx.fbcdn.net/v/t39.30808-6/${cleanFilename}?ccb=1-7&_nc_sid=aa7b47&_nc_zt=23&_nc_ht=scontent-${serverSuffix}.xx`;

          largeUrl = templateUrl;
          console.log(`Template conversion result: ${largeUrl}`);
        } else {
          console.log(`Full-size URL detected, keeping original (with malformed fix if applied)`);
        }
      } else {
        console.log(`Could not parse URL structure, keeping original`);
      }

      console.log(`Final URL: ${largeUrl}`);
      console.log(`URL is valid: ${isValidUrl(largeUrl)}`);
      return largeUrl;
    }
    return originalUrl;
  } catch (error) {
    console.error('Error processing URL:', error);
    return originalUrl;
  }
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Test cases
const testUrls = [
  // Working full-size URLs (should be left unchanged)
  'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/537887570_10239471219137488_5170534411219795979_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=GxnC-plZBjEQ7kNvwEjNQk-&_nc_oc=AdnQ_z59RH8EGhaVi8qSsoaL35zl_eFiUVAvccPDwMPMacZGSMuAN4U1tvAzWf_f4lU&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=pwRf9w18gtfB0hopizH_hw&oh=00_AfU9Xwn4Ydvuqzbv1zsjBFahTLj5ajdvI7zUSAJURE9EMQ&oe=68AEA41B',

  // Malformed URL (should be fixed)
  'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/537887570_10239471219137488_5170534411219795979_n.jpg&_nc_cat=108&ccb=1-7&_nc_sid=aa7b47',

  // Thumbnail URL (should be converted)
  'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/s320x320/537887570_10239471219137488_5170534411219795979_n.jpg?stp=dst-jpg_p&_nc_cat=108&ccb=1-7&_nc_sid=aa7b47',
];

console.log('='.repeat(80));
console.log('TEMPLATE APPROACH TEST');
console.log('='.repeat(80));

testUrls.forEach((url, index) => {
  console.log(`\n--- TEST ${index + 1} ---`);
  createLargeScaleUrl(url);
});

console.log('\n' + '='.repeat(80));
console.log('TEMPLATE TEST COMPLETE');
console.log('='.repeat(80));
