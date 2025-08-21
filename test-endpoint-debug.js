/**
 * Test to directly trigger the Facebook parser endpoint and capture the validation worker debug output
 */

const http = require('http');
const { spawn } = require('child_process');

async function testFacebookParserEndpoint() {
  console.log('🚀 Starting server and testing Facebook parser endpoint...');

  // Start the server
  const server = spawn('npm', ['run', 'start:dev'], {
    cwd: 'D:/Projects/KaraokeHub',
    stdio: 'pipe',
    shell: true,
  });

  let serverReady = false;

  // Monitor server output
  server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('[SERVER]', output.trim());

    if (output.includes('Application is running on')) {
      serverReady = true;
      console.log('✅ Server is ready, making test request...');
      makeTestRequest();
    }
  });

  server.stderr.on('data', (data) => {
    const output = data.toString();
    console.log('[DEBUG]', output.trim());
  });

  async function makeTestRequest() {
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait a bit more

      const postData = JSON.stringify({
        url: 'https://www.facebook.com/groups/test',
      });

      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/parser/facebook',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers: ${JSON.stringify(res.headers)}`);

        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          console.log('Response:', responseData);
          console.log('🔍 Check the debug output above for validation worker data...');

          // Stop the server
          server.kill('SIGTERM');
          process.exit(0);
        });
      });

      req.on('error', (e) => {
        console.error(`Request error: ${e.message}`);
        server.kill('SIGTERM');
        process.exit(1);
      });

      req.write(postData);
      req.end();
    } catch (error) {
      console.error('Error making request:', error);
      server.kill('SIGTERM');
      process.exit(1);
    }
  }

  // Cleanup on exit
  process.on('SIGINT', () => {
    console.log('Stopping server...');
    server.kill('SIGTERM');
    process.exit(0);
  });

  // Timeout after 60 seconds
  setTimeout(() => {
    console.log('Test timeout, stopping server...');
    server.kill('SIGTERM');
    process.exit(1);
  }, 60000);
}

testFacebookParserEndpoint();
