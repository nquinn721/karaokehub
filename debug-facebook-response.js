const https = require('https');
const zlib = require('zlib');

/**
 * Debug what Facebook is actually returning
 */
async function debugFacebookResponse() {
  const businessPageUrl = 'https://www.facebook.com/maxdenney614';

  console.log('Debugging Facebook response...');

  try {
    const response = await makeHttpRequest(businessPageUrl);
    console.log('Full response length:', response.length);
    console.log('First 500 characters:');
    console.log(response.substring(0, 500));
    console.log('\n---\n');
    console.log('Last 500 characters:');
    console.log(response.substring(Math.max(0, response.length - 500)));
  } catch (error) {
    console.error('Error:', error.message);
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

debugFacebookResponse();
