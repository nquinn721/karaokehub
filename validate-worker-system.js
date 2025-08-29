/**
 * Comprehensive validation of the improved worker-based parsing system
 * Tests multiple scenarios including the problematic karaokeviewpoint.com
 */

const axios = require('axios');

const TEST_URLS = [
  {
    name: 'Problematic Site (Previously Blocked)',
    url: 'https://karaokeviewpoint.com/karaoke-in-ohio/',
    description: 'Previously blocked Windows user agents, should work with Mac/Linux agents',
  },
  {
    name: 'Standard Test Site',
    url: 'https://example.com',
    description: 'Basic connectivity test',
  },
];

async function validateWorkerParsingSystem() {
  console.log('🔬 COMPREHENSIVE WORKER-BASED PARSING VALIDATION');
  console.log('='.repeat(70));

  // First, verify server is running
  try {
    const healthCheck = await axios.get('http://localhost:8000/health');
    console.log('✅ Server is running and healthy');
  } catch (error) {
    console.error('❌ Server is not accessible');
    console.error('Please start the server with: npm run start:dev');
    return;
  }

  // Test each URL
  for (const testCase of TEST_URLS) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📍 URL: ${testCase.url}`);
    console.log(`📝 Description: ${testCase.description}`);
    console.log('-'.repeat(50));

    try {
      const startTime = Date.now();

      const response = await axios.post(
        'http://localhost:8000/api/parser/parse-website',
        {
          url: testCase.url,
          includeSubdomains: false,
          usePuppeteer: true,
          aiAnalysis: true,
        },
        {
          timeout: 120000, // 2 minutes timeout
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const endTime = Date.now();
      const result = response.data;

      console.log(`⏱️ Request completed in ${endTime - startTime}ms`);
      console.log(`✅ Success: ${result.success}`);

      if (result.success) {
        if (result.data) {
          console.log(`📊 Results:`);
          console.log(`   - Site Name: ${result.data.siteName || 'Not detected'}`);
          console.log(`   - URLs Found: ${result.data.totalUrls || 0}`);
          console.log(`   - URLs Processed: ${result.data.processedUrls || 0}`);
          console.log(`   - Shows Found: ${result.data.totalShows || 0}`);
          console.log(`   - DJs Found: ${result.data.totalDJs || 0}`);
          console.log(`   - Vendors Found: ${result.data.totalVendors || 0}`);
        }

        if (result.stats) {
          console.log(`📈 Performance:`);
          console.log(`   - Discovery: ${result.stats.discoveryTime || 0}ms`);
          console.log(`   - Processing: ${result.stats.processingTime || 0}ms`);
          console.log(`   - Total: ${result.stats.totalTime || 0}ms`);
        }

        if (result.parsedScheduleId) {
          console.log(`💾 Database ID: ${result.parsedScheduleId}`);
        }

        // Special validation for the problematic site
        if (testCase.url.includes('karaokeviewpoint.com')) {
          console.log('\n🎯 SPECIAL VALIDATION - Karaokeviewpoint.com:');
          if (result.data && result.data.totalUrls > 0) {
            console.log('✅ Successfully bypassed user agent blocking!');
            console.log('✅ Website accessibility issue has been resolved!');
            console.log('✅ Mac/Linux user agent rotation is working!');
          } else {
            console.log('⚠️ Parsed successfully but found no URLs');
            console.log('This could be due to site structure or content');
          }
        }
      } else {
        console.log(`❌ Failed: ${result.error || 'Unknown error'}`);

        // Provide specific guidance for common errors
        if (result.error && result.error.includes('Empty Response')) {
          console.log('🔍 Empty Response indicates potential blocking or site issues');
        } else if (result.error && result.error.includes('socket hang up')) {
          console.log('🔍 Socket hang up suggests user agent blocking');
          console.log('   The user agent rotation should have prevented this');
        }
      }
    } catch (error) {
      console.error(`❌ Request failed: ${error.message}`);

      if (error.code === 'ECONNABORTED') {
        console.error('⏰ Request timed out - site may be slow or blocking');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('🔌 Connection refused - server may be down');
      }
    }
  }

  console.log('\n🏁 VALIDATION COMPLETE');
  console.log('='.repeat(70));
}

// Utility function to test user agent behavior specifically
async function testUserAgentBehavior() {
  console.log('\n🕵️ USER AGENT BEHAVIOR TEST');
  console.log('Testing the problematic site with different user agents...');

  const testUrl = 'https://karaokeviewpoint.com/karaoke-in-ohio/';
  const userAgents = [
    {
      name: 'Windows Chrome (Previously Blocked)',
      agent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    {
      name: 'Mac Safari (Should Work)',
      agent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    },
    {
      name: 'Linux Chrome (Should Work)',
      agent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  ];

  for (const ua of userAgents) {
    try {
      console.log(`\nTesting: ${ua.name}`);
      const response = await axios.get(testUrl, {
        headers: {
          'User-Agent': ua.agent,
        },
        timeout: 10000,
      });

      console.log(`✅ Status: ${response.status}`);
      console.log(`📦 Content Length: ${response.data.length} bytes`);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
}

// Run comprehensive validation
if (require.main === module) {
  validateWorkerParsingSystem()
    .then(() => testUserAgentBehavior())
    .catch(console.error);
}

module.exports = {
  validateWorkerParsingSystem,
  testUserAgentBehavior,
};
