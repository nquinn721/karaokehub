/**
 * Test Enhanced Discovery Worker Error Handling
 * This script tests our improved error reporting and connectivity checks
 */

async function testDiscoveryWorkerErrorHandling() {
  console.log('🧪 Testing Enhanced Discovery Worker Error Handling');
  console.log('=' * 60);

  const testCases = [
    {
      name: 'Working Website',
      url: 'https://httpbin.org/html',
      description: 'Should work correctly and discover some URLs',
    },
    {
      name: 'Problem Website (Original)',
      url: 'https://karaokeviewpoint.com/karaoke-in-ohio/',
      description: 'Should provide detailed error information if it fails',
    },
    {
      name: 'Invalid Domain',
      url: 'https://this-domain-definitely-does-not-exist-12345.com',
      description: 'Should detect DNS resolution failure',
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n🎯 Testing: ${testCase.name}`);
    console.log(`📍 URL: ${testCase.url}`);
    console.log(`💭 Expected: ${testCase.description}`);
    console.log('-' * 50);

    try {
      const response = await fetch('http://localhost:8000/api/parser/parse-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: testCase.url,
          maxPages: 3,
          includeSubdomains: false,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Success!');
        if (result.data) {
          console.log(`📊 Site: ${result.data.siteName}`);
          console.log(`🔗 URLs found: ${result.data.totalUrls}`);
          console.log(`⏱️ Time: ${result.stats?.totalTime}ms`);
        }
      } else {
        console.log('❌ Failed as expected');
        console.log(`📋 Error: ${result.error}`);
      }
    } catch (error) {
      console.log('❌ Request failed:');
      console.log(`📋 Error: ${error.message}`);
    }

    // Wait between tests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log('\n🎉 Error handling test complete!');
}

// Run the test
if (require.main === module) {
  testDiscoveryWorkerErrorHandling();
}

module.exports = { testDiscoveryWorkerErrorHandling };
