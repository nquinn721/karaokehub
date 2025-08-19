/**
 * Test Facebook Meta Tag Parser
 * Tests the new meta tag extraction method for Facebook profiles
 */
require('dotenv').config();

class FacebookMetaParser {
  async extractProfileMetaTags(profileUrl) {
    const https = require('https');
    const { URL } = require('url');

    return new Promise((resolve, reject) => {
      const url = new URL(profileUrl);

      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        // Handle different compression formats
        let stream = res;
        if (res.headers['content-encoding'] === 'gzip') {
          const zlib = require('zlib');
          stream = res.pipe(zlib.createGunzip());
        } else if (res.headers['content-encoding'] === 'br') {
          const zlib = require('zlib');
          stream = res.pipe(zlib.createBrotliDecompress());
        } else if (res.headers['content-encoding'] === 'deflate') {
          const zlib = require('zlib');
          stream = res.pipe(zlib.createInflate());
        }

        stream.on('data', (chunk) => {
          data += chunk;
        });

        stream.on('end', () => {
          try {
            console.log(`📄 Response length: ${data.length} characters`);
            console.log(`📄 Response headers:`, res.headers);

            // Look for various meta description patterns
            const metaPatterns = [
              /<meta property="og:description" content="([^"]+)"/,
              /<meta name="description" content="([^"]+)"/,
              /<meta property="description" content="([^"]+)"/,
            ];

            let description = null;
            for (const pattern of metaPatterns) {
              const match = data.match(pattern);
              if (match) {
                description = match[1];
                console.log(`✅ Found description with pattern: ${pattern.source}`);
                break;
              }
            }

            // Extract title
            const titleMatch = data.match(/<meta property="og:title" content="([^"]+)"/);
            const title = titleMatch ? titleMatch[1] : '';

            if (!description) {
              // Save a sample of the HTML for debugging
              console.log('📄 HTML sample (first 1000 chars):');
              console.log(data.substring(0, 1000));
              console.log('\n📄 Looking for any meta tags...');
              const allMetas = data.match(/<meta[^>]+>/g);
              if (allMetas) {
                console.log('Found meta tags:', allMetas.slice(0, 5));
              }
              reject(new Error('No meta description found'));
              return;
            }

            console.log(`✅ Extracted meta description: ${description}`);
            console.log(`✅ Extracted title: ${title}`);

            // Parse schedule from description
            const schedule = this.parseScheduleFromDescription(description);
            const venues = [...new Set(schedule.map((s) => s.venue))];

            const result = {
              profileInfo: {
                name: title || 'Facebook Profile',
                followers: '',
                location: '',
                instagram: '',
                bio: description,
              },
              schedule,
              recentPosts: [],
              venues,
              additionalShows: schedule.map((s) => ({
                venue: s.venue,
                time: s.time,
                day: s.day,
                confidence: 0.9,
              })),
            };

            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  parseScheduleFromDescription(description) {
    const schedule = [];

    // Match patterns like "WED Kelley's Pub 8-12am" or "TH+SAT Crescent Lounge 8-12am"
    const patterns = [
      // Single day: "WED Kelley's Pub 8-12am"
      /\b(MON|TUE|WED|THU|FRI|SAT|SUN)\s+([^0-9]+?)\s+(\d+[:-]?\d*[ap]m?(?:\s*[-to]+\s*\d+[:-]?\d*[ap]m?)?)/gi,
      // Multiple days: "TH+SAT Crescent Lounge 8-12am"
      /\b(MON|TUE|WED|THU?|FRI|SAT|SUN)(?:\+(?:MON|TUE|WED|THU?|FRI|SAT|SUN))*\s+([^0-9]+?)\s+(\d+[:-]?\d*[ap]m?(?:\s*[-to]+\s*\d+[:-]?\d*[ap]m?)?)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(description)) !== null) {
        const dayPart = match[1];
        const venue = match[2].trim();
        const time = match[3].trim();

        // Handle multiple days (TH+SAT)
        const days = dayPart.split('+');

        for (const day of days) {
          schedule.push({
            day: day.trim(),
            venue,
            time,
            dayOfWeek: this.expandDayAbbreviation(day.trim()),
          });
        }
      }
    }

    return schedule;
  }

  expandDayAbbreviation(abbr) {
    const dayMap = {
      MON: 'Monday',
      TUE: 'Tuesday',
      WED: 'Wednesday',
      THU: 'Thursday',
      TH: 'Thursday',
      FRI: 'Friday',
      SAT: 'Saturday',
      SUN: 'Sunday',
    };

    return dayMap[abbr.toUpperCase()] || abbr;
  }
}

async function testMetaExtraction() {
  const parser = new FacebookMetaParser();
  const testUrl = 'https://www.facebook.com/max.denney.194690';

  console.log('🧪 Testing Facebook Meta Tag Extraction');
  console.log('📍 Profile URL:', testUrl);
  console.log('');

  try {
    const result = await parser.extractProfileMetaTags(testUrl);

    console.log('\n📊 EXTRACTION RESULTS:');
    console.log('========================');
    console.log('👤 Profile Name:', result.profileInfo.name);
    console.log('📝 Bio:', result.profileInfo.bio);
    console.log('🎤 Shows Found:', result.schedule.length);
    console.log('🏢 Venues Found:', result.venues.length);

    if (result.schedule.length > 0) {
      console.log('\n📅 SCHEDULE:');
      result.schedule.forEach((show, index) => {
        console.log(`${index + 1}. ${show.dayOfWeek} (${show.day}) - ${show.venue} - ${show.time}`);
      });
    }

    if (result.venues.length > 0) {
      console.log('\n🏢 VENUES:');
      result.venues.forEach((venue, index) => {
        console.log(`${index + 1}. ${venue}`);
      });
    }

    console.log('\n✅ SUCCESS: Meta tag extraction working!');
    console.log('💡 This method bypasses browser detection issues');
  } catch (error) {
    console.error('❌ Meta extraction failed:', error.message);
  }
}

testMetaExtraction().catch(console.error);
