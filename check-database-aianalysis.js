const { DataSource } = require('typeorm');

// Database connection configuration
const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'karaokehub',
  synchronize: false,
  logging: false,
});

async function checkAiAnalysisData() {
  try {
    await dataSource.initialize();
    console.log('Connected to database successfully');

    // Get the most recent pending review
    const query = `
      SELECT id, url, status, aiAnalysis, rawData, createdAt 
      FROM parsed_schedules 
      WHERE status = 'pending_review' 
      ORDER BY createdAt DESC 
      LIMIT 1
    `;

    const result = await dataSource.query(query);

    if (result.length === 0) {
      console.log('No pending reviews found');
      return;
    }

    const schedule = result[0];
    console.log('\n=== LATEST PENDING REVIEW ===');
    console.log('Schedule ID:', schedule.id);
    console.log('URL:', schedule.url);
    console.log('Created:', schedule.createdAt);

    // Check aiAnalysis field
    if (schedule.aiAnalysis) {
      try {
        const aiAnalysis = JSON.parse(schedule.aiAnalysis);
        console.log('\n=== AI ANALYSIS DATA ===');
        console.log('Shows count:', aiAnalysis.shows?.length || 0);

        if (aiAnalysis.shows && aiAnalysis.shows.length > 0) {
          console.log('\nFirst 3 shows sources:');
          aiAnalysis.shows.slice(0, 3).forEach((show, index) => {
            console.log(`Show ${index + 1}:`, show.venue);
            console.log(`  Source: ${show.source}`);
            console.log(`  Is CDN URL: ${show.source?.includes('fbcdn.net') ? 'YES' : 'NO'}`);
            console.log('');
          });
        }
      } catch (error) {
        console.error('Error parsing aiAnalysis JSON:', error);
      }
    } else {
      console.log('No aiAnalysis data found');
    }

    // Check rawData field for comparison
    if (schedule.rawData) {
      try {
        const rawData = JSON.parse(schedule.rawData);
        console.log('\n=== RAW DATA COMPARISON ===');
        console.log('RawData source:', rawData.source);
        console.log('Shows count in rawData:', rawData.shows?.length || 0);
      } catch (error) {
        console.error('Error parsing rawData JSON:', error);
      }
    }
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await dataSource.destroy();
  }
}

checkAiAnalysisData();
