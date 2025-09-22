// Simple test to manually trigger API monitoring
const https = require('https');
const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;

    client
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data),
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: data,
            });
          }
        });
      })
      .on('error', reject);
  });
}

async function testMonitoring() {
  console.log('Testing API monitoring endpoints...');

  try {
    // Test 1: Check if dashboard summary endpoint works
    console.log('\n1. Testing dashboard summary endpoint...');
    const summary = await makeRequest('http://localhost:3001/api-monitoring/dashboard/summary');
    console.log('Summary response:', JSON.stringify(summary, null, 2));

    // Test 2: Check daily metrics
    console.log('\n2. Testing daily metrics endpoint...');
    const metrics = await makeRequest('http://localhost:3001/api-monitoring/metrics/daily?days=7');
    console.log('Metrics response:', JSON.stringify(metrics, null, 2));

    // Test 3: Check iTunes rate limit stats
    console.log('\n3. Testing iTunes rate limit stats...');
    const itunesStats = await makeRequest(
      'http://localhost:3001/admin/api-logs/itunes/rate-limit-info',
    );
    console.log('iTunes stats response:', JSON.stringify(itunesStats, null, 2));

    // Test 4: Make some actual music searches to generate data
    console.log('\n4. Making test music searches to generate monitoring data...');
    const searches = ['love', 'rock', 'pop'];

    for (const query of searches) {
      console.log(`Searching for: ${query}`);
      const result = await makeRequest(
        `http://localhost:3001/music/search?q=${query}&type=song&limit=3`,
      );
      console.log(`Search result status: ${result.status}`);

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Test 5: Check if data appeared after searches
    console.log('\n5. Checking dashboard after test searches...');
    const summaryAfter = await makeRequest(
      'http://localhost:3001/api-monitoring/dashboard/summary',
    );
    console.log('Summary after searches:', JSON.stringify(summaryAfter, null, 2));
  } catch (error) {
    console.error('Test failed:', error.message);
    console.log('\nMake sure the server is running on port 3001');
    console.log('You can start it with: npm start');
  }
}

testMonitoring();
