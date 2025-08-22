const { createLargeScaleUrl } = require('./dist/parser/facebookParser/facebook-parallel-image-loading.js');

// Test URL conversion function
function testUrlConversion() {
  const originalUrl = 'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/537887570_10239471219137488_5170534411219795979_n.jpg?stp=dst-jpg_s280x280_tt6&_nc_cat=108&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=GxnC-plZBjEQ7kNvwEjNQk-&_nc_oc=AdnQ_z59RH8EGhaVi8qSsoaL35zl_eFiUVAvccPDwMPMacZGSMuAN4U1tvAzWf_f4lU&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=T4QOVZDEhW2qde_EYz-FyA&oh=00_AfXJLUco1sah2y6DQnmAzmIyF4EJG4S_5KmkOsIU6a7v9g&oe=68AD8ADB';
  
  const expectedFullSize = 'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/537887570_10239471219137488_5170534411219795979_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=GxnC-plZBjEQ7kNvwEjNQk-&_nc_oc=AdnQ_z59RH8EGhaVi8qSsoaL35zl_eFiUVAvccPDwMPMacZGSMuAN4U1tvAzWf_f4lU&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=7Pownpic8f5vWVC95MybBw&oh=00_AfUFQr2HKYpKezVnFKBDivYoQpGQ7XV7hDKszfbFlwTqIA&oe=68AD8ADB';
  
  // Simulate the URL conversion
  function createLargeScaleUrl(originalUrl) {
    try {
      if (originalUrl.includes('scontent') || originalUrl.includes('fbcdn')) {
        let largeUrl = originalUrl;

        // Remove the stp parameter which controls thumbnail sizing (key fix!)
        largeUrl = largeUrl.replace(/[?&]stp=[^&]*/, '');
        
        // Remove existing size parameters
        largeUrl = largeUrl.replace(/\/s\d+x\d+\//, '/');
        largeUrl = largeUrl.replace(/&w=\d+&h=\d+/, '');
        largeUrl = largeUrl.replace(/\?w=\d+&h=\d+/, '');
        largeUrl = largeUrl.replace(/&width=\d+&height=\d+/, '');
        largeUrl = largeUrl.replace(/\?width=\d+&height=\d+/, '');

        // Clean up any double ampersands or leading ampersands
        largeUrl = largeUrl.replace(/&&+/g, '&');
        largeUrl = largeUrl.replace(/\?&/, '?');
        largeUrl = largeUrl.replace(/&$/, '');

        return largeUrl;
      }

      return originalUrl;
    } catch (error) {
      return originalUrl;
    }
  }
  
  const convertedUrl = createLargeScaleUrl(originalUrl);
  
  console.log('🔍 URL Conversion Test');
  console.log('Original URL:', originalUrl);
  console.log('Converted URL:', convertedUrl);
  console.log('Expected URL:', expectedFullSize);
  
  // Check if the stp parameter was removed
  const stpRemoved = !convertedUrl.includes('stp=');
  console.log('✅ STP parameter removed:', stpRemoved);
  
  // Check if they match (ignoring different gid values which change)
  const baseOriginal = convertedUrl.replace(/&_nc_gid=[^&]*/, '');
  const baseExpected = expectedFullSize.replace(/&_nc_gid=[^&]*/, '');
  const urlsMatch = baseOriginal === baseExpected;
  console.log('✅ URLs match (ignoring gid):', urlsMatch);
  
  if (!urlsMatch) {
    console.log('Difference:');
    console.log('Base converted:', baseOriginal);
    console.log('Base expected: ', baseExpected);
  }
}

testUrlConversion();
