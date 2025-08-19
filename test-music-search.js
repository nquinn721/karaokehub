const axios = require('axios');

async function testMusicSearch() {
  console.log('🎵 Testing Music Search API...\n');

  const baseUrl = 'http://localhost:8000/api';

  const testQueries = [
    'karaoke classics hits most popular sing along',
    '80s hits decade classics top songs 1980s',
    "Don't Stop Believin Journey",
  ];

  for (const query of testQueries) {
    try {
      console.log(`🔍 Testing query: "${query}"`);

      const response = await axios.get(`${baseUrl}/music/search`, {
        params: { q: query, limit: 5 },
      });

      console.log(`✅ Success! Found ${response.data.length} songs:`);
      response.data.forEach((song, index) => {
        console.log(`   ${index + 1}. ${song.title} - ${song.artist}`);
      });
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    console.log('');
  }
}

// Check if server is running first
axios
  .get('http://localhost:8000/api/config/client')
  .then(() => {
    console.log('✅ Server is running, starting music search tests...\n');
    return testMusicSearch();
  })
  .catch(() => {
    console.log('❌ Server is not running on http://localhost:8000');
    console.log('Please start the server first with: npm run start:dev');
  });
