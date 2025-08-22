#!/usr/bin/env node

/**
 * Test URL Quality Fix
 * Test the corrected logic for removing stp parameter without breaking URLs
 */

// Test URLs with different stp parameter positions
const testUrls = [
  // Case 1: stp is first parameter with other params following
  'https://scontent-lga3-1.xx.fbcdn.net/v/t39.30808-6/535503365_10162554191363591_7749487615012513406_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=102&ccb=1-7&_nc_sid=aa7b47',
  
  // Case 2: stp is first parameter with no other params
  'https://scontent-lga3-1.xx.fbcdn.net/v/t39.30808-6/535503365_10162554191363591_7749487615012513406_n.jpg?stp=dst-jpg_s261x260_tt6',
  
  // Case 3: stp is not first parameter
  'https://scontent-lga3-1.xx.fbcdn.net/v/t39.30808-6/535503365_10162554191363591_7749487615012513406_n.jpg?_nc_cat=102&stp=dst-jpg_s261x260_tt6&ccb=1-7&_nc_sid=aa7b47',
  
  // Case 4: No stp parameter
  'https://scontent-lga3-1.xx.fbcdn.net/v/t39.30808-6/535503365_10162554191363591_7749487615012513406_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=aa7b47',
  
  // Case 5: Real URL with signature that should be removed
  'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/537887570_10239471219137488_5170534411219795979_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=GxnC-plZBjEQ7kNvwEjNQk-&oh=00_AfW97JERybyTB4rgAlrTNwUzW13r-b-rkSlj3fBYwR_P5w&oe=68ADC31B'
];

function createLargeScaleUrl(originalUrl) {
  try {
    if (originalUrl.includes('scontent') || originalUrl.includes('fbcdn')) {
      let largeUrl = originalUrl;

      // Remove the stp parameter which controls thumbnail sizing (key fix!)
      // Handle both cases: ?stp=... (first param) and &stp=... (subsequent param)  
      if (largeUrl.includes('?stp=')) {
        // stp is first parameter - replace ?stp=... with ? if there are more params, or remove entirely
        largeUrl = largeUrl.replace(/\?stp=[^&]*&/, '?').replace(/\?stp=[^&]*$/, '');
      } else {
        // stp is not first parameter - just remove &stp=...
        largeUrl = largeUrl.replace(/&stp=[^&]*/, '');
      }
      
      // Remove existing size parameters
      largeUrl = largeUrl.replace(/\/s\d+x\d+\//, '/');
      largeUrl = largeUrl.replace(/&w=\d+&h=\d+/, '');
      largeUrl = largeUrl.replace(/\?w=\d+&h=\d+/, '');

      // Remove signature parameters that become invalid after URL modification
      largeUrl = largeUrl.replace(/&oh=[^&]*/, '');
      largeUrl = largeUrl.replace(/\?oh=[^&]*&/, '?');
      largeUrl = largeUrl.replace(/\?oh=[^&]*$/, '');
      largeUrl = largeUrl.replace(/&oe=[^&]*/, '');
      largeUrl = largeUrl.replace(/\?oe=[^&]*&/, '?');
      largeUrl = largeUrl.replace(/\?oe=[^&]*$/, '');

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

console.log('🧪 Testing URL Quality Fix...\n');

testUrls.forEach((url, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`  Input:  ${url}`);
  
  const enhanced = createLargeScaleUrl(url);
  console.log(`  Output: ${enhanced}`);
  
  // Check if URL is valid
  try {
    new URL(enhanced);
    console.log(`  Status: ✅ Valid URL`);
  } catch (e) {
    console.log(`  Status: ❌ Invalid URL - ${e.message}`);
  }
  
  // Check specific issues
  const issues = [];
  if (enhanced.includes('.jpg&')) issues.push('Missing ? before params');
  if (enhanced.includes('stp=')) issues.push('stp parameter still present');
  if (enhanced.includes('&&')) issues.push('Double ampersands');
  if (enhanced.includes('?&')) issues.push('? followed by &');
  
  if (issues.length > 0) {
    console.log(`  Issues: ❌ ${issues.join(', ')}`);
  } else {
    console.log(`  Issues: ✅ None`);
  }
  
  console.log('');
});

console.log('🎯 Summary: URL enhancement should now produce valid URLs without stp parameters');
