// Test URL conversion on your actual URLs
const urls = [
  'https://scontent-lga3-1.xx.fbcdn.net/v/t39.30808-6/534379820_24892115083723656_5412770796137448556_n.jpg?stp=dst-jpg_s130x130_tt6&_nc_cat=102&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=N8qE8u5L1hIQ7kNvwHiPih0&_nc_oc=Adk2-DRl-DsZ2tIO7lqfMEzat1R3StdZJFuGEe9NBpTfJ8dllMR7P6MKOoEJHrGvDfk&_nc_zt=23&_nc_ht=scontent-lga3-1.xx&_nc_gid=xWgRKPwJ5l0EC-7eZ7J1xg&oh=00_AfU1fh9cFXmppNpHzmpx_zIwF6jOUaUUAOwIBv0adv-_UA&oe=68AEA731',
  'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/531728618_25196274846628830_3797538359077498425_n.jpg?stp=dst-jpg_s130x130_tt6&_nc_cat=106&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=TT5nJYMW_GcQ7kNvwGPdBgz&_nc_oc=Adn3EncD8Rr-k7gx2WqSJ0E6iiGxadWgmbvuLZUotpGXouCiK47_PL9dT2Ejh6nORe4&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=xWgRKPwJ5l0EC-7eZ7J1xg&oh=00_AfXEai11iwuDZqOxdIoixLPYv0eOhvTzy9Cn-BJw43Limg&oe=68AEA5DD',
  'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/537887570_10239471219137488_5170534411219795979_n.jpg?ccb=1-7&_nc_sid=aa7b47&_nc_zt=23&_nc_ht=scontent-lga3-3.xx',
];

function createLargeScaleUrl(originalUrl) {
  try {
    // Facebook CDN URL conversion to larger size
    if (originalUrl.includes('scontent') || originalUrl.includes('fbcdn')) {
      let largeUrl = originalUrl;

      // Log the original URL for debugging
      console.log(`[URL-TRANSFORM] Original: ${originalUrl}`);

      // DEFENSIVE FIX: Handle malformed URLs that have .jpg& instead of .jpg?
      if (largeUrl.includes('.jpg&') && !largeUrl.includes('.jpg?')) {
        console.log(`[URL-TRANSFORM] Fixing malformed URL: .jpg& -> .jpg?`);
        largeUrl = largeUrl.replace('.jpg&', '.jpg?');
      } else if (largeUrl.includes('.jpeg&') && !largeUrl.includes('.jpeg?')) {
        console.log(`[URL-TRANSFORM] Fixing malformed URL: .jpeg& -> .jpeg?`);
        largeUrl = largeUrl.replace('.jpeg&', '.jpeg?');
      }

      // SIMPLE TEMPLATE APPROACH: Extract key components and rebuild with working template
      const urlMatch = largeUrl.match(
        /https:\/\/scontent-([^.]+)\.xx\.fbcdn\.net\/v\/t39\.30808-6\/([^?]+)/,
      );
      if (urlMatch) {
        const serverSuffix = urlMatch[1]; // e.g., "lga3-3" or "lga3-2"
        const imageFilename = urlMatch[2]; // e.g., "537887570_10239471219137488_5170534411219795979_n.jpg"

        // Check if this looks like a thumbnail (has size constraints in path or stp parameter)
        const isThumbnail =
          largeUrl.includes('/s320x320/') ||
          largeUrl.includes('/s130x130/') ||
          largeUrl.includes('/s200x200/') ||
          largeUrl.includes('stp=dst-jpg_p') ||
          largeUrl.includes('stp=cp') ||
          largeUrl.includes('stp=dst-jpg_s') ||
          imageFilename.includes('/s1') ||
          imageFilename.includes('/p1');

        if (isThumbnail) {
          console.log(`[URL-TRANSFORM] Thumbnail detected, converting using template approach...`);

          // Clean the filename of any size constraints
          let cleanFilename = imageFilename.replace(/s\d+x\d+\//, '').replace(/p\d+x\d+\//, '');

          // Use template format from working URLs (remove hash parameters since we're modifying)
          const templateUrl = `https://scontent-${serverSuffix}.xx.fbcdn.net/v/t39.30808-6/${cleanFilename}?ccb=1-7&_nc_sid=aa7b47&_nc_zt=23&_nc_ht=scontent-${serverSuffix}.xx`;

          largeUrl = templateUrl;
          console.log(`[URL-TRANSFORM] Template conversion result: ${largeUrl}`);
        } else {
          console.log(
            `[URL-TRANSFORM] Full-size URL detected, keeping original (with malformed fix if applied)`,
          );
        }
      } else {
        console.log(`[URL-TRANSFORM] Could not parse URL structure, keeping original`);
      }

      return largeUrl;
    }

    return originalUrl;
  } catch (error) {
    return originalUrl;
  }
}

console.log('=== Testing URL Conversion on Your URLs ===\n');

urls.forEach((url, index) => {
  console.log(`\n--- URL ${index + 1} ---`);
  const converted = createLargeScaleUrl(url);
  console.log(`Original:  ${url}`);
  console.log(`Converted: ${converted}`);
  console.log(`Changed:   ${url !== converted ? 'YES' : 'NO'}`);
  console.log('');
});
