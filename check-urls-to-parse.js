/**
 * Check urls_to_parse table for Facebook group URL
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function checkUrlsToParseTable() {
  console.log('🔍 Checking urls_to_parse table for Facebook group...\n');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    
    const { getRepositoryToken } = require('@nestjs/typeorm');
    const { UrlToParse } = require('./dist/parser/url-to-parse.entity');
    
    const urlsToParseRepository = app.get(getRepositoryToken(UrlToParse));

    const facebookUrl = 'https://www.facebook.com/groups/194826524192177';
    
    // Find the URL record
    const urlRecord = await urlsToParseRepository.findOne({
      where: { url: facebookUrl }
    });

    if (urlRecord) {
      console.log('✅ Found URL record:');
      console.log(`   ID: ${urlRecord.id}`);
      console.log(`   URL: ${urlRecord.url}`);
      console.log(`   Name: ${urlRecord.name || 'NOT SET'}`);
      console.log(`   Last Parsed: ${urlRecord.lastParsedAt || 'NEVER'}`);
      console.log(`   Created: ${urlRecord.createdAt}`);
      console.log(`   Updated: ${urlRecord.updatedAt}`);
    } else {
      console.log('❌ No URL record found for:', facebookUrl);
      
      // Check if there are any Facebook URLs at all
      const allFbUrls = await urlsToParseRepository.find({
        where: { url: require('typeorm').Like('%facebook.com%') }
      });
      
      console.log(`\n📊 Found ${allFbUrls.length} Facebook URLs in total:`);
      allFbUrls.forEach(url => {
        console.log(`   - ${url.url} (name: ${url.name || 'NOT SET'})`);
      });
    }

    await app.close();

  } catch (error) {
    console.error('❌ Error checking URLs:', error.message);
  }
}

checkUrlsToParseTable();
