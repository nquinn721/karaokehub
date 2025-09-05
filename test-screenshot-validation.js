const axios = require('axios');

// Test data with different scenarios
const testCases = [
  {
    name: 'Empty array',
    screenshots: []
  },
  {
    name: 'Non-string data',
    screenshots: [123, true, null]
  },
  {
    name: 'Empty string',
    screenshots: ['']
  },
  {
    name: 'Invalid base64',
    screenshots: ['invalidbase64!@#$%']
  },
  {
    name: 'Extremely long string (simulating corrupted data)',
    screenshots: ['A'.repeat(15_000_000)] // 15MB of 'A' characters
  },
  {
    name: 'Valid data URL format but invalid base64',
    screenshots: ['data:image/jpeg;base64,invalidbase64!@#$%']
  },
  {
    name: 'Small valid JPEG base64 (1x1 pixel)',
    screenshots: ['/9j/4AAQSkZJRgABAQEAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BdNMK9To+yWl9Vkt7j8+Tl7lkm9DhXC8R6UJT/9k=']
  }
];

async function testScreenshotValidation() {
  const baseURL = 'http://localhost:8000';
  
  console.log('🧪 Testing screenshot validation endpoint...\n');
  
  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    
    try {
      const response = await axios.post(`${baseURL}/parser/validate-screenshots`, {
        screenshots: testCase.screenshots
      });
      
      console.log(`✅ Response: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      if (error.response) {
        console.log(`❌ Error ${error.response.status}: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.log(`❌ Network Error: ${error.message}`);
      }
    }
    
    console.log('─'.repeat(50));
  }
}

// Test analyze-screenshots endpoint with the corrupted data scenario
async function testAnalyzeScreenshots() {
  console.log('\n🔬 Testing analyze-screenshots endpoint with various scenarios...\n');
  
  const testCases = [
    {
      name: 'Missing screenshots',
      data: {
        url: 'https://example.com'
      }
    },
    {
      name: 'Invalid base64 in analyze',
      data: {
        screenshots: ['invalidbase64!@#$%'],
        url: 'https://example.com'
      }
    }
  ];
  
  const baseURL = 'http://localhost:8000';
  
  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    
    try {
      const response = await axios.post(`${baseURL}/parser/analyze-screenshots`, testCase.data);
      console.log(`✅ Response: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      if (error.response) {
        console.log(`❌ Error ${error.response.status}: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.log(`❌ Network Error: ${error.message}`);
      }
    }
    
    console.log('─'.repeat(50));
  }
}

// Run tests
async function runAllTests() {
  try {
    await testScreenshotValidation();
    await testAnalyzeScreenshots();
    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
  }
}

runAllTests();
