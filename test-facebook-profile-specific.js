const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envFile = fs.readFileSync(envPath, 'utf8');

    envFile.split('\n').forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    });
    console.log('✅ Environment variables loaded from .env file');
  } catch (error) {
    console.log('⚠️  Could not load .env file:', error.message);
  }
}

/**
 * Test Facebook Graph API with specific profile URL
 */
async function testFacebookProfile() {
  // Load environment variables first
  loadEnvFile();

  const profileUrl = 'https://www.facebook.com/max.denney.194690';
  console.log('Testing Facebook Graph API with profile:', profileUrl);
  console.log('='.repeat(60));

  // Test app credentials with fallbacks (same as in facebook.service.ts)
  const authAppId = process.env.FACEBOOK_APP_ID || '646464114624794';
  const authAppSecret = process.env.FACEBOOK_APP_SECRET || '3ce6645105081d6f3a5442a30bd6b1ae';
  const parserAppId = process.env.FACEBOOK_PARSER_APP_ID || '1160707802576346';
  const parserAppSecret =
    process.env.FACEBOOK_PARSER_APP_SECRET || '47f729de53981816dcce9b8776449b4b';

  console.log('Using app credentials:');
  console.log('- Auth App ID:', authAppId);
  console.log('- Parser App ID:', parserAppId);
  console.log('- Auth Secret:', authAppSecret ? '✅ Set' : '❌ Missing');
  console.log('- Parser Secret:', parserAppSecret ? '✅ Set' : '❌ Missing');

  try {
    // Step 1: Get access token
    console.log('\n1. Getting parser app access token...');
    const tokenResponse = await axios.get(
      `https://graph.facebook.com/oauth/access_token?client_id=${parserAppId}&client_secret=${parserAppSecret}&grant_type=client_credentials`,
    );

    const accessToken = tokenResponse.data.access_token;
    console.log('✅ Access token obtained');

    // Step 2: Extract profile ID from URL
    console.log('\n2. Extracting profile ID from URL...');
    const profileId = extractProfileId(profileUrl);
    console.log('Profile ID extracted:', profileId);

    if (!profileId) {
      console.error('❌ Could not extract profile ID from URL');
      return;
    }

    // Step 3: Test profile information access
    console.log('\n3. Testing profile information access...');
    const profileFields = [
      'id',
      'name',
      'about',
      'bio',
      'description',
      'location',
      'fan_count',
      'followers_count',
      'link',
      'website',
      'instagram',
    ].join(',');

    try {
      const profileResponse = await axios.get(
        `https://graph.facebook.com/${profileId}?fields=${profileFields}&access_token=${accessToken}`,
      );

      console.log('✅ Profile information retrieved:');
      console.log(JSON.stringify(profileResponse.data, null, 2));
    } catch (profileError) {
      console.log('❌ Profile information access failed:');
      if (profileError.response) {
        console.log('Status:', profileError.response.status);
        console.log('Error:', JSON.stringify(profileError.response.data, null, 2));
      } else {
        console.log('Error:', profileError.message);
      }
    }

    // Step 4: Test posts access
    console.log('\n4. Testing posts access...');
    const postsFields = ['id', 'message', 'story', 'created_time', 'full_picture', 'place'].join(
      ',',
    );

    try {
      const postsResponse = await axios.get(
        `https://graph.facebook.com/${profileId}/posts?fields=${postsFields}&limit=10&access_token=${accessToken}`,
      );

      console.log('✅ Posts retrieved:');
      const posts = postsResponse.data.data || [];
      console.log(`Found ${posts.length} posts`);

      posts.slice(0, 3).forEach((post, index) => {
        console.log(`\nPost ${index + 1}:`);
        console.log('- Message:', post.message || 'No message');
        console.log('- Story:', post.story || 'No story');
        console.log('- Created:', post.created_time);
        console.log('- Place:', post.place?.name || 'No place');
      });
    } catch (postsError) {
      console.log('❌ Posts access failed:');
      if (postsError.response) {
        console.log('Status:', postsError.response.status);
        console.log('Error:', JSON.stringify(postsError.response.data, null, 2));
      } else {
        console.log('Error:', postsError.message);
      }
    }

    // Step 5: Test events access
    console.log('\n5. Testing events access...');
    const eventsFields = [
      'id',
      'name',
      'description',
      'start_time',
      'end_time',
      'place',
      'owner',
      'cover',
      'attending_count',
      'interested_count',
    ].join(',');

    try {
      const eventsResponse = await axios.get(
        `https://graph.facebook.com/${profileId}/events?fields=${eventsFields}&access_token=${accessToken}`,
      );

      console.log('✅ Events retrieved:');
      const events = eventsResponse.data.data || [];
      console.log(`Found ${events.length} events`);

      events.slice(0, 3).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log('- Name:', event.name);
        console.log('- Description:', event.description || 'No description');
        console.log('- Start:', event.start_time);
        console.log('- Place:', event.place?.name || 'No place');
        console.log('- Owner:', event.owner?.name || 'No owner');
      });
    } catch (eventsError) {
      console.log('❌ Events access failed:');
      if (eventsError.response) {
        console.log('Status:', eventsError.response.status);
        console.log('Error:', JSON.stringify(eventsError.response.data, null, 2));
      } else {
        console.log('Error:', eventsError.message);
      }
    }

    // Step 6: Test alternative endpoints
    console.log('\n6. Testing alternative endpoints...');

    // Try direct page access
    try {
      const pageResponse = await axios.get(
        `https://graph.facebook.com/${profileId}?access_token=${accessToken}`,
      );
      console.log('✅ Basic page access successful');
      console.log('Page data:', JSON.stringify(pageResponse.data, null, 2));
    } catch (pageError) {
      console.log('❌ Basic page access failed:');
      if (pageError.response) {
        console.log('Status:', pageError.response.status);
        console.log('Error:', JSON.stringify(pageError.response.data, null, 2));
      }
    }
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

/**
 * Extract Facebook profile/page ID from URL
 */
function extractProfileId(url) {
  const patterns = [
    // Profile with custom username: facebook.com/username
    /facebook\.com\/([^\/\?&]+)(?:\?|$)/,
    // Profile with numeric ID: facebook.com/profile.php?id=123456
    /facebook\.com\/profile\.php\?id=(\d+)/,
    // Mobile URLs
    /m\.facebook\.com\/([^\/\?&]+)(?:\?|$)/,
    /m\.facebook\.com\/profile\.php\?id=(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Run the test
testFacebookProfile();
