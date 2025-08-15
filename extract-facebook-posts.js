const puppeteer = require('puppeteer');

async function extractKaraokeContent() {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto('https://www.facebook.com/max.denney.194690', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const extractedData = await page.evaluate(() => {
      const text = document.body.innerText;
      
      // Extract structured information
      const karaokeData = {
        profile: {
          name: '',
          followers: '',
          location: '',
          bio: '',
          instagram: '',
          schedule: []
        },
        posts: [],
        additionalInfo: []
      };
      
      // Parse profile info
      const nameMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
      if (nameMatch) karaokeData.profile.name = nameMatch[1];
      
      const followersMatch = text.match(/(\d+[KM]?) followers/);
      if (followersMatch) karaokeData.profile.followers = followersMatch[1];
      
      const locationMatch = text.match(/Lives in ([^\n]+)/);
      if (locationMatch) karaokeData.profile.location = locationMatch[1];
      
      const instagramMatch = text.match(/DJMAX614/);
      if (instagramMatch) karaokeData.profile.instagram = 'DJMAX614';
      
      // Parse schedule from intro
      const schedulePattern = /(WED|TH|THU|THURSDAY|FRI|FRIDAY|SAT|SATURDAY|SUN|SUNDAY|MON|MONDAY|TUE|TUESDAY)\s+([^\n]+?)\s+(\d+[ap]m?[-–]\d+[ap]m?)/gi;
      let scheduleMatch;
      while ((scheduleMatch = schedulePattern.exec(text)) !== null) {
        karaokeData.profile.schedule.push({
          day: scheduleMatch[1],
          venue: scheduleMatch[2].trim(),
          time: scheduleMatch[3]
        });
      }
      
      // Extract recent posts with karaoke content
      const postPattern = /(\d+[hmsdw])\s*·[^\n]*([^\n]*(?:karaoke|Karaoke|#Karaoke)[^\n]*)/gi;
      let postMatch;
      while ((postMatch = postPattern.exec(text)) !== null) {
        karaokeData.posts.push({
          timeAgo: postMatch[1],
          content: postMatch[2].trim()
        });
      }
      
      // Look for venue mentions
      const venues = [];
      const venueKeywords = ['Pub', 'Lounge', 'Bar', 'Sports', 'Grill', 'Club', 'Tavern'];
      venueKeywords.forEach(keyword => {
        const venuePattern = new RegExp(`([A-Z][a-zA-Z']*\\s*)+${keyword}(?:s|\\b)`, 'g');
        let venueMatch;
        while ((venueMatch = venuePattern.exec(text)) !== null) {
          const venueName = venueMatch[0];
          if (!venues.includes(venueName) && venueName.length < 50) {
            venues.push(venueName);
          }
        }
      });
      karaokeData.additionalInfo = venues;
      
      return karaokeData;
    });
    
    console.log('Extracted Karaoke Data:');
    console.log('======================');
    console.log(JSON.stringify(extractedData, null, 2));
    
    // Also get raw text segments for manual review
    const rawSegments = await page.evaluate(() => {
      const text = document.body.innerText;
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      
      const karaokeLines = lines.filter(line => {
        const lower = line.toLowerCase();
        return lower.includes('karaoke') || 
               lower.includes('dj') || 
               lower.includes('music') ||
               lower.includes('singing') ||
               /\d+[ap]m/.test(lower) ||
               lower.includes('tonight') ||
               (lower.includes('@') && (lower.includes('pub') || lower.includes('lounge')));
      });
      
      return karaokeLines.slice(0, 20); // Limit to first 20 relevant lines
    });
    
    console.log('\n\nRelevant Text Segments:');
    console.log('======================');
    rawSegments.forEach((line, index) => {
      console.log(`${index + 1}. ${line}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

extractKaraokeContent();
