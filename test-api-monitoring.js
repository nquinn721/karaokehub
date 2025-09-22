// Quick test to generate some API monitoring data
const fetch = require('node-fetch');

const baseUrl = 'http://localhost:3001'; // Adjust if your server runs on a different port

async function generateTestData() {
  console.log('Generating test API monitoring data...');

  try {
    // Test 1: Make some music searches to trigger monitoring
    console.log('1. Testing music search endpoints...');

    // Search for songs
    await fetch(`${baseUrl}/music/search?q=love&type=song&limit=5`);
    await fetch(`${baseUrl}/music/search?q=rock&type=song&limit=5`);
    await fetch(`${baseUrl}/music/search?q=pop&type=song&limit=5`);

    // Search for artists
    await fetch(`${baseUrl}/music/search?q=Beatles&type=artist&limit=5`);
    await fetch(`${baseUrl}/music/search?q=Queen&type=artist&limit=5`);

    console.log('2. Music searches completed - API monitoring data should be generated');

    // Test 2: Check if monitoring data exists
    console.log('3. Checking monitoring dashboard...');
    const summaryResponse = await fetch(`${baseUrl}/api-monitoring/dashboard/summary`);
    const summary = await summaryResponse.json();
    console.log('Dashboard Summary:', JSON.stringify(summary, null, 2));

    // Test 3: Check daily metrics
    const metricsResponse = await fetch(`${baseUrl}/api-monitoring/metrics/daily?days=7`);
    const metrics = await metricsResponse.json();
    console.log('Daily Metrics:', JSON.stringify(metrics, null, 2));

    console.log('Test completed! Check your admin dashboard for the enhanced monitoring.');
  } catch (error) {
    console.error('Error during test:', error.message);
    console.log('Make sure the server is running on port 3001');
  }
}

generateTestData();
