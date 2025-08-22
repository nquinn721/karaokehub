// Debug script to systematically test URL processing
const fs = require('fs');

// Simulate the createLargeScaleUrl function from the worker
function createLargeScaleUrl(originalUrl) {
  console.log(`\n=== DEBUGGING URL ===`);
  console.log(`Original: ${originalUrl}`);

  try {
    if (originalUrl.includes('scontent') || originalUrl.includes('fbcdn')) {
      let largeUrl = originalUrl;

      // VERY CONSERVATIVE: Only modify URLs that are DEFINITELY thumbnails
      const isThumbnail =
        largeUrl.includes('stp=dst-jpg_p') ||
        largeUrl.includes('stp=cp0') ||
        largeUrl.includes('stp=c0.') ||
        (largeUrl.includes('stp=') && largeUrl.includes('/s1')) ||
        largeUrl.includes('/s130x130/') ||
        largeUrl.includes('/s200x200/') ||
        largeUrl.includes('/s320x320/');

      console.log(`Is Thumbnail: ${isThumbnail}`);

      if (isThumbnail) {
        console.log(`Processing thumbnail URL...`);

        // CRITICAL FIX: Properly handle stp parameter removal while preserving ? separator
        if (largeUrl.includes('?stp=')) {
          // If stp is the first parameter, we need to be careful about the ?
          if (largeUrl.match(/\?stp=[^&]*&/)) {
            // There are other parameters after stp, replace ?stp=...& with ?
            largeUrl = largeUrl.replace(/\?stp=[^&]*&/, '?');
          } else {
            // stp is the only parameter, remove ?stp=... entirely
            largeUrl = largeUrl.replace(/\?stp=[^&]*$/, '');
          }
        } else {
          // stp is not the first parameter, just remove &stp=...
          largeUrl = largeUrl.replace(/&stp=[^&]*/g, '');
        }
        console.log(`After stp removal: ${largeUrl}`);

        // Remove size constraints from path
        largeUrl = largeUrl.replace(/\/s\d+x\d+\//, '/');
        largeUrl = largeUrl.replace(/\/p\d+x\d+\//, '/');
        console.log(`After size path removal: ${largeUrl}`);

        // Remove size parameters
        largeUrl = largeUrl.replace(/[?&]w=\d+/g, '');
        largeUrl = largeUrl.replace(/[?&]h=\d+/g, '');
        largeUrl = largeUrl.replace(/[?&]width=\d+/g, '');
        largeUrl = largeUrl.replace(/[?&]height=\d+/g, '');
        console.log(`After size param removal: ${largeUrl}`);

        // CRITICAL: Remove hash/signature parameters that become invalid after modification
        largeUrl = largeUrl.replace(/[?&]oh=[^&]*/g, '');
        largeUrl = largeUrl.replace(/[?&]oe=[^&]*/g, '');
        largeUrl = largeUrl.replace(/[?&]nc_ohc=[^&]*/g, '');
        largeUrl = largeUrl.replace(/[?&]nc_oc=[^&]*/g, '');
        console.log(`After hash removal: ${largeUrl}`);

        // Clean up URL formatting
        largeUrl = largeUrl.replace(/\?&/, '?');
        largeUrl = largeUrl.replace(/&&+/g, '&');
        largeUrl = largeUrl.replace(/[?&]$/, '');
        console.log(`After cleanup: ${largeUrl}`);
      } else {
        console.log(`Full-size URL detected - NO MODIFICATION`);
      }

      console.log(`Final URL: ${largeUrl}`);
      console.log(`URL is valid format: ${isValidUrl(largeUrl)}`);
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
  // The problematic URL from your browser
  'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/537887570_10239471219137488_5170534411219795979_n.jpg&_nc_cat=108&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=GxnC-plZBjEQ7kNvwEjNQk-&_nc_oc=AdnQ_z59RH8EGhaVi8qSsoaL35zl_eFiUVAvccPDwMPMacZGSMuAN4U1tvAzWf_f4lU&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=ecKoYvPDKk6PFtXWtV0TDA',

  // What it should look like (fixed)
  'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/537887570_10239471219137488_5170534411219795979_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=GxnC-plZBjEQ7kNvwEjNQk-&_nc_oc=AdnQ_z59RH8EGhaVi8qSsoaL35zl_eFiUVAvccPDwMPMacZGSMuAN4U1tvAzWf_f4lU&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=ecKoYvPDKk6PFtXWtV0TDA',

  // Thumbnail URL that should be modified
  'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/s320x320/537887570_10239471219137488_5170534411219795979_n.jpg?stp=dst-jpg_p&_nc_cat=108&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=GxnC-plZBjEQ7kNvwEjNQk-&_nc_oc=AdnQ_z59RH8EGhaVi8qSsoaL35zl_eFiUVAvccPDwMPMacZGSMuAN4U1tvAzWf_f4lU&_nc_zt=23&_nc_ht=scontent-lga3-3.xx',
];

console.log('='.repeat(80));
console.log('SYSTEMATIC URL DEBUG TEST');
console.log('='.repeat(80));

testUrls.forEach((url, index) => {
  console.log(`\n--- TEST ${index + 1} ---`);
  createLargeScaleUrl(url);
});

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(80));
