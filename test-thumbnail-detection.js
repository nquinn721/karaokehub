// Quick test of thumbnail detection logic
function testThumbnailDetection() {
  const url =
    'https://scontent-lga3-1.xx.fbcdn.net/v/t39.30808-6/534379820_24892115083723656_5412770796137448556_n.jpg?stp=dst-jpg_s130x130_tt6&_nc_cat=102&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=N8qE8u5L1hIQ7kNvwHiPih0&_nc_oc=Adk2-DRl-DsZ2tIO7lqfMEzat1R3StdZJFuGEe9NBpTfJ8dllMR7P6MKOoEJHrGvDfk&_nc_zt=23&_nc_ht=scontent-lga3-1.xx&_nc_gid=xWgRKPwJ5l0EC-7eZ7J1xg&oh=00_AfU1fh9cFXmppNpHzmpx_zIwF6jOUaUUAOwIBv0adv-_UA&oe=68AEA731';

  console.log('=== THUMBNAIL DETECTION TEST ===');
  console.log(`URL: ${url}`);
  console.log('');

  // Current detection logic from worker
  const isThumbnail =
    url.includes('/s320x320/') ||
    url.includes('/s130x130/') ||
    url.includes('/s200x200/') ||
    url.includes('stp=dst-jpg_p') ||
    url.includes('stp=cp') ||
    url.includes('stp=dst-jpg_s');

  console.log('Thumbnail detection checks:');
  console.log(`- Contains /s320x320/: ${url.includes('/s320x320/')}`);
  console.log(`- Contains /s130x130/: ${url.includes('/s130x130/')}`);
  console.log(`- Contains /s200x200/: ${url.includes('/s200x200/')}`);
  console.log(`- Contains stp=dst-jpg_p: ${url.includes('stp=dst-jpg_p')}`);
  console.log(`- Contains stp=cp: ${url.includes('stp=cp')}`);
  console.log(`- Contains stp=dst-jpg_s: ${url.includes('stp=dst-jpg_s')}`);

  console.log(`\nFinal result: ${isThumbnail ? 'THUMBNAIL' : 'FULL-SIZE'}`);

  if (!isThumbnail) {
    console.log(
      "\n❌ BUG FOUND: This URL has 'stp=dst-jpg_s130x130_tt6' but wasn't detected as thumbnail!",
    );
    console.log('The detection logic is missing the pattern: stp=dst-jpg_s130x130');
  }
}

testThumbnailDetection();
