// Test the exact problematic URL from the user
function createLargeScaleUrl(originalUrl) {
  console.log(`\n=== TESTING MALFORMED URL FIX ===`);
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

      if (!isThumbnail) {
        console.log(`Full-size URL detected - NO MODIFICATION to preserve hash validity`);
        if (largeUrl !== originalUrl) {
          console.log(`Applied malformed URL fix: ${largeUrl}`);
        }
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

function testProblematicUrl() {
  const problematicUrl =
    'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/537887570_10239471219137488_5170534411219795979_n.jpg&_nc_cat=108&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=GxnC-plZBjEQ7kNvwEjNQk-&_nc_oc=AdnQ_z59RH8EGhaVi8qSsoaL35zl_eFiUVAvccPDwMPMacZGSMuAN4U1tvAzWf_f4lU&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=ecKoYvPDKk6PFtXWtV0TDA';

  console.log('SYSTEMATIC FIX TEST FOR MALFORMED URL:');
  console.log('='.repeat(80));

  createLargeScaleUrl(problematicUrl);
}

testProblematicUrl();
