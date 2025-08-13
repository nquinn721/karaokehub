const https = require('https');
const { JSDOM } = require('jsdom');

// Test extracting clean text from the karaoke schedule page
https.get('https://stevesdj.com/karaoke-schedule', (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('=== EXTRACTED TEXT FROM KARAOKE SCHEDULE ===');
    
    try {
      // Parse HTML and extract readable text
      const dom = new JSDOM(data);
      const document = dom.window.document;
      
      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());
      
      // Get the text content
      const textContent = document.body.textContent || document.body.innerText || '';
      const cleanText = textContent.replace(/\s+/g, ' ').trim();
      
      console.log('Clean text length:', cleanText.length);
      console.log('First 2000 characters:');
      console.log(cleanText.substring(0, 2000));
      
      // Look for specific patterns
      console.log('\n=== PATTERN ANALYSIS ===');
      console.log('Contains "SUNDAYS KARAOKE":', cleanText.includes('SUNDAYS KARAOKE'));
      console.log('Contains "ALIBI BEACH LOUNGE":', cleanText.includes('ALIBI BEACH LOUNGE'));
      console.log('Contains "7:00PM - 11:00PM":', cleanText.includes('7:00PM - 11:00PM'));
      
      // Extract lines containing karaoke schedules
      const lines = cleanText.split('.').filter(line => 
        line.includes('KARAOKE') || line.includes('DJ Steve') || line.includes('ALIBI') || line.includes('7:00PM')
      );
      
      console.log('\nRelevant schedule lines:');
      lines.forEach((line, i) => {
        console.log(`${i + 1}: ${line.trim()}`);
      });
      
    } catch (error) {
      console.log('Error parsing HTML:', error.message);
      
      // Fallback - just search raw HTML for patterns
      const schedulePatterns = [
        /SUNDAYS.*KARAOKE.*\d+:\d+PM.*\d+:\d+PM.*DJ Steve.*ALIBI/i,
        /SUNDAYS KARAOKE \d+:\d+PM - \d+:\d+PM with DJ Steve ALIBI BEACH LOUNGE/i
      ];
      
      schedulePatterns.forEach((pattern, i) => {
        const match = data.match(pattern);
        console.log(`Pattern ${i + 1} match:`, match ? match[0] : 'No match');
      });
    }
    
    console.log('=========================================');
  });

}).on('error', (err) => {
  console.log('Error:', err.message);
});
