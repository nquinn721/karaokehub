const http = require('http');

// Test the pending-reviews endpoint directly
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/parser/pending-reviews',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log('Testing /api/parser/pending-reviews endpoint...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('\n=== RESPONSE DATA ===');
      console.log('Number of schedules:', jsonData.length);

      if (jsonData.length > 0) {
        const firstSchedule = jsonData[0];
        console.log('\nFirst schedule shows source field investigation:');
        console.log('Schedule ID:', firstSchedule.id);
        console.log('Schedule rawData source:', firstSchedule.rawData?.source);
        console.log('Schedule aiAnalysis exists:', !!firstSchedule.aiAnalysis);

        if (firstSchedule.aiAnalysis && firstSchedule.aiAnalysis.shows) {
          console.log('Number of shows in aiAnalysis:', firstSchedule.aiAnalysis.shows.length);
          if (firstSchedule.aiAnalysis.shows.length > 0) {
            const firstShow = firstSchedule.aiAnalysis.shows[0];
            console.log('First show source:', firstShow.source);
            console.log('First show title:', firstShow.title);
          }
        }

        // Also check transformed shows
        if (firstSchedule.transformedShows && firstSchedule.transformedShows.length > 0) {
          console.log('\nTransformed shows check:');
          console.log('Number of transformedShows:', firstSchedule.transformedShows.length);
          const firstTransformed = firstSchedule.transformedShows[0];
          console.log('First transformed show source:', firstTransformed.source);
        }
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.end();
