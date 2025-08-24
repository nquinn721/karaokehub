// Test script to debug music search results
const axios = require('axios');

async function testMusicSearch() {
  try {
    const response = await axios.get('http://localhost:8000/api/music/search?q=hello&limit=5');
    console.log('Music search results:', JSON.stringify(response.data, null, 2));
    
    // Check how many songs have previewUrl
    const songsWithPreview = response.data.filter(song => !!song.previewUrl);
    console.log(`\nTotal songs: ${response.data.length}`);
    console.log(`Songs with preview: ${songsWithPreview.length}`);
    
    if (response.data.length > 0) {
      console.log('\nFirst song structure:');
      console.log(JSON.stringify(response.data[0], null, 2));
    }
  } catch (error) {
    console.error('Error testing music search:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

testMusicSearch();
