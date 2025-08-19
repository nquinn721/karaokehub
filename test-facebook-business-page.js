const https = require('https');
const zlib = require('zlib');

/**
 * Test Facebook meta tag extraction specifically for business pages
 */
async function testBusinessPageExtraction() {
  const businessPageUrl = 'https://www.facebook.com/maxdenney614';

  console.log('Testing business page extraction...');
  console.log('URL:', businessPageUrl);

  try {
    const response = await makeHttpRequest(businessPageUrl);
    console.log('Response received, length:', response.length);

    // Extract title
    const titleMatch = response.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      console.log('Page title:', titleMatch[1]);
    }

    // Look for meta description
    const descMatch = response.match(
      /<meta[^>]*name=['"](description|Description)['"]*[^>]*content=['"]([^'"]+)['"]/i,
    );
    if (descMatch) {
      console.log('Meta description:', descMatch[2]);
    }

    // Look for og:description
    const ogDescMatch = response.match(
      /<meta[^>]*property=['"](og:description|og:Description)['"]*[^>]*content=['"]([^'"]+)['"]/i,
    );
    if (ogDescMatch) {
      console.log('OG description:', ogDescMatch[2]);
    }

    // Look for any text that might contain schedule information
    const schedulePatterns = [
      /karaoke.*?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday).*?karaoke/gi,
      /\d{1,2}:\d{2}\s*(am|pm)?.*?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday).*?\d{1,2}:\d{2}\s*(am|pm)?/gi,
    ];

    console.log('\nLooking for schedule patterns...');
    schedulePatterns.forEach((pattern, index) => {
      const matches = response.match(pattern);
      if (matches) {
        console.log(`Pattern ${index + 1} matches:`, matches.slice(0, 3)); // First 3 matches
      }
    });

    // Check if this looks like a business page
    const businessIndicators = [
      'business',
      'page',
      'hours',
      'contact',
      'location',
      'phone',
      'website',
    ];

    console.log('\nBusiness indicators found:');
    businessIndicators.forEach((indicator) => {
      if (response.toLowerCase().includes(indicator)) {
        console.log(`✓ ${indicator}`);
      }
    });
  } catch (error) {
    console.error('Error testing business page extraction:', error.message);
  }
}

function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    };

    const req = https.request(url, options, (res) => {
      let data = [];

      res.on('data', (chunk) => {
        data.push(chunk);
      });

      res.on('end', () => {
        let buffer = Buffer.concat(data);

        // Handle compression
        const encoding = res.headers['content-encoding'];
        if (encoding === 'gzip') {
          zlib.gunzip(buffer, (err, decompressed) => {
            if (err) {
              reject(err);
            } else {
              resolve(decompressed.toString());
            }
          });
        } else if (encoding === 'br') {
          zlib.brotliDecompress(buffer, (err, decompressed) => {
            if (err) {
              reject(err);
            } else {
              resolve(decompressed.toString());
            }
          });
        } else if (encoding === 'deflate') {
          zlib.inflate(buffer, (err, decompressed) => {
            if (err) {
              reject(err);
            } else {
              resolve(decompressed.toString());
            }
          });
        } else {
          resolve(buffer.toString());
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Run the test
testBusinessPageExtraction();
