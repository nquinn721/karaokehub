#!/usr/bin/env node
/**
 * Upload Avatars and Microphones to KaraokeHub Production
 * This script uploads 8 new avatars and 20 microphones via API endpoints
 */

const https = require('https');
const fs = require('fs');

// Configuration
const CONFIG = {
  // PRODUCTION URL - UPDATE THIS
  baseUrl: 'https://your-production-url.com', // e.g., 'https://karaokehub.onrender.com'
  
  // Admin authentication - you'll need valid JWT token
  authToken: 'your-jwt-token-here', // Get from logging into production
  
  // Local data files (generated from your database)
  avatarsFile: './avatars_export.sql',
  microphonesFile: './microphones_export.sql'
};

// Avatar data (8 new avatars with updated URLs)
const AVATARS = [
  {
    id: 'alex',
    name: 'Alex',
    description: 'A friendly and versatile performer with a warm personality',
    type: 'basic',
    rarity: 'common',
    imageUrl: '/images/avatar/avatars/alex.png',
    price: 0.00,
    coinPrice: 0,
    isAvailable: true,
    isFree: true
  },
  {
    id: 'blake',
    name: 'Blake',
    description: 'A confident artist with modern style and great stage presence',
    type: 'basic',
    rarity: 'common',
    imageUrl: '/images/avatar/avatars/blake.png',
    price: 0.00,
    coinPrice: 0,
    isAvailable: true,
    isFree: true
  },
  {
    id: 'cameron',
    name: 'Cameron',
    description: 'A dynamic performer with classic appeal and natural charisma',
    type: 'basic',
    rarity: 'common',
    imageUrl: '/images/avatar/avatars/cameron.png',
    price: 0.00,
    coinPrice: 0,
    isAvailable: true,
    isFree: true
  },
  {
    id: 'joe',
    name: 'Joe',
    description: 'A reliable and steady performer with authentic charm',
    type: 'basic',
    rarity: 'common',
    imageUrl: '/images/avatar/avatars/joe.png',
    price: 0.00,
    coinPrice: 0,
    isAvailable: true,
    isFree: true
  },
  {
    id: 'juan',
    name: 'Juan',
    description: 'A passionate singer with vibrant energy and cultural flair',
    type: 'basic',
    rarity: 'common',
    imageUrl: '/images/avatar/avatars/juan.png',
    price: 0.00,
    coinPrice: 0,
    isAvailable: true,
    isFree: true
  },
  {
    id: 'kai',
    name: 'Kai',
    description: 'A creative artist with unique style and artistic vision',
    type: 'basic',
    rarity: 'common',
    imageUrl: '/images/avatar/avatars/kai.png',
    price: 0.00,
    coinPrice: 0,
    isAvailable: true,
    isFree: true
  },
  {
    id: 'onyx',
    name: 'Onyx',
    description: 'A bold performer with striking features and commanding presence',
    type: 'premium',
    rarity: 'uncommon',
    imageUrl: '/images/avatar/avatars/onyx.png',
    price: 5.00,
    coinPrice: 100,
    isAvailable: true,
    isFree: false
  },
  {
    id: 'tyler',
    name: 'Tyler',
    description: 'A versatile entertainer with contemporary appeal and smooth vocals',
    type: 'premium',
    rarity: 'uncommon',
    imageUrl: '/images/avatar/avatars/tyler.png',
    price: 5.00,
    coinPrice: 100,
    isAvailable: true,
    isFree: false
  }
];

// Microphone data (20 microphones across all rarities)
const MICROPHONES = [
  // Basic Microphones (Free)
  {
    id: 'mic_basic_1',
    name: 'Basic Mic Silver',
    description: 'A reliable silver microphone for beginners',
    type: 'basic',
    rarity: 'common',
    imageUrl: '/images/avatar/parts/microphones/mic_basic_1.png',
    price: 0.00,
    coinPrice: 0,
    isAvailable: true,
    isFree: true,
    isUnlockable: false
  },
  {
    id: 'mic_basic_2',
    name: 'Basic Mic Black',
    description: 'A sleek black microphone with good sound quality',
    type: 'basic',
    rarity: 'common',
    imageUrl: '/images/avatar/parts/microphones/mic_basic_2.png',
    price: 0.00,
    coinPrice: 0,
    isAvailable: true,
    isFree: true,
    isUnlockable: false
  },
  {
    id: 'mic_basic_3',
    name: 'Basic Mic Blue',
    description: 'A vibrant blue microphone for those who like color',
    type: 'basic',
    rarity: 'common',
    imageUrl: '/images/avatar/parts/microphones/mic_basic_3.png',
    price: 0.00,
    coinPrice: 0,
    isAvailable: true,
    isFree: true,
    isUnlockable: false
  },
  {
    id: 'mic_basic_4',
    name: 'Basic Mic Red',
    description: 'A bold red microphone that stands out',
    type: 'basic',
    rarity: 'common',
    imageUrl: '/images/avatar/parts/microphones/mic_basic_4.png',
    price: 0.00,
    coinPrice: 0,
    isAvailable: true,
    isFree: true,
    isUnlockable: false
  },

  // Gold Microphones (100-180 coins)
  {
    id: 'mic_gold_1',
    name: 'Golden Classic',
    description: 'A classic golden microphone with warm, rich tones',
    type: 'golden',
    rarity: 'uncommon',
    imageUrl: '/images/avatar/parts/microphones/mic_gold_1.png',
    price: 0.00,
    coinPrice: 100,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },
  {
    id: 'mic_gold_2',
    name: 'Gold Performer',
    description: 'Professional golden microphone for serious performers',
    type: 'golden',
    rarity: 'uncommon',
    imageUrl: '/images/avatar/parts/microphones/mic_gold_2.png',
    price: 0.00,
    coinPrice: 120,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },
  {
    id: 'mic_gold_3',
    name: 'Golden Star',
    description: 'Luxurious golden microphone that makes you shine',
    type: 'golden',
    rarity: 'uncommon',
    imageUrl: '/images/avatar/parts/microphones/mic_gold_3.png',
    price: 0.00,
    coinPrice: 150,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },
  {
    id: 'mic_gold_4',
    name: 'Gold Standard',
    description: 'The gold standard in microphone excellence',
    type: 'golden',
    rarity: 'uncommon',
    imageUrl: '/images/avatar/parts/microphones/mic_gold_4.png',
    price: 0.00,
    coinPrice: 180,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },

  // Emerald Microphones (250-400 coins)
  {
    id: 'mic_emerald_1',
    name: 'Emerald Elite',
    description: 'An elegant emerald microphone for distinguished performers',
    type: 'premium',
    rarity: 'rare',
    imageUrl: '/images/avatar/parts/microphones/mic_emerald_1.png',
    price: 0.00,
    coinPrice: 250,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },
  {
    id: 'mic_emerald_2',
    name: 'Forest Green Pro',
    description: 'Nature-inspired emerald microphone with crystal-clear sound',
    type: 'premium',
    rarity: 'rare',
    imageUrl: '/images/avatar/parts/microphones/mic_emerald_2.png',
    price: 0.00,
    coinPrice: 300,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },
  {
    id: 'mic_emerald_3',
    name: 'Jade Jewel',
    description: 'A precious emerald microphone with exceptional clarity',
    type: 'premium',
    rarity: 'rare',
    imageUrl: '/images/avatar/parts/microphones/mic_emerald_3.png',
    price: 0.00,
    coinPrice: 350,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },
  {
    id: 'mic_emerald_4',
    name: 'Emerald Crown',
    description: 'Royal emerald microphone fit for a karaoke king',
    type: 'premium',
    rarity: 'rare',
    imageUrl: '/images/avatar/parts/microphones/mic_emerald_4.png',
    price: 0.00,
    coinPrice: 400,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },

  // Ruby Microphones (500-800 coins)
  {
    id: 'mic_ruby_1',
    name: 'Ruby Radiance',
    description: 'A stunning ruby microphone that commands attention on stage',
    type: 'premium',
    rarity: 'epic',
    imageUrl: '/images/avatar/parts/microphones/mic_ruby_1.png',
    price: 0.00,
    coinPrice: 500,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },
  {
    id: 'mic_ruby_2',
    name: 'Crimson Crown',
    description: 'Royal ruby microphone with unmatched performance and style',
    type: 'premium',
    rarity: 'epic',
    imageUrl: '/images/avatar/parts/microphones/mic_ruby_2.png',
    price: 0.00,
    coinPrice: 600,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },
  {
    id: 'mic_ruby_3',
    name: 'Scarlet Supreme',
    description: 'Supreme ruby microphone for passionate performers',
    type: 'premium',
    rarity: 'epic',
    imageUrl: '/images/avatar/parts/microphones/mic_ruby_3.png',
    price: 0.00,
    coinPrice: 700,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },
  {
    id: 'mic_ruby_4',
    name: 'Ruby Royalty',
    description: 'The most regal ruby microphone in existence',
    type: 'premium',
    rarity: 'epic',
    imageUrl: '/images/avatar/parts/microphones/mic_ruby_4.png',
    price: 0.00,
    coinPrice: 800,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },

  // Diamond Microphones (1000-2000 coins)
  {
    id: 'mic_diamond_1',
    name: 'Diamond Dynasty',
    description: 'The ultimate diamond microphone for true karaoke legends',
    type: 'premium',
    rarity: 'legendary',
    imageUrl: '/images/avatar/parts/microphones/mic_diamond_1.png',
    price: 0.00,
    coinPrice: 1000,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },
  {
    id: 'mic_diamond_2',
    name: 'Crystal Perfection',
    description: 'Flawless diamond microphone that delivers perfection in every note',
    type: 'premium',
    rarity: 'legendary',
    imageUrl: '/images/avatar/parts/microphones/mic_diamond_2.png',
    price: 0.00,
    coinPrice: 1200,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },
  {
    id: 'mic_diamond_3',
    name: 'Brilliant Star',
    description: 'A brilliant diamond microphone that outshines all others',
    type: 'premium',
    rarity: 'legendary',
    imageUrl: '/images/avatar/parts/microphones/mic_diamond_3.png',
    price: 0.00,
    coinPrice: 1500,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  },
  {
    id: 'mic_diamond_4',
    name: 'Diamond Deity',
    description: 'The most legendary diamond microphone for karaoke gods',
    type: 'premium',
    rarity: 'legendary',
    imageUrl: '/images/avatar/parts/microphones/mic_diamond_4.png',
    price: 0.00,
    coinPrice: 2000,
    isAvailable: true,
    isFree: false,
    isUnlockable: false
  }
];

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.baseUrl + path);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.authToken}`,
        ...headers
      }
    };

    const req = (url.protocol === 'https:' ? https : require('http')).request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const responseData = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: responseData });
          } else {
            reject({ status: res.statusCode, error: responseData, body });
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: body });
          } else {
            reject({ status: res.statusCode, error: body });
          }
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Clear existing data
async function clearExistingData() {
  console.log('🧹 Clearing existing avatars and microphones...');
  
  try {
    // Note: You might need to implement delete endpoints or do this manually
    console.log('⚠️  Manual step required: Clear existing avatars and microphones in production admin panel');
    console.log('   Or implement DELETE endpoints in your controllers');
  } catch (error) {
    console.log('⚠️  Could not clear existing data:', error.message);
  }
}

// Upload avatars
async function uploadAvatars() {
  console.log('✨ Uploading 8 new avatars...');
  
  const results = {
    success: [],
    failed: []
  };

  for (const avatar of AVATARS) {
    try {
      console.log(`   Uploading avatar: ${avatar.name} (${avatar.id})`);
      
      // Try direct creation via avatars endpoint (you may need to adjust endpoint)
      const response = await makeRequest('POST', '/avatars', avatar);
      
      results.success.push({ id: avatar.id, name: avatar.name });
      console.log(`   ✅ Created avatar: ${avatar.name}`);
      
    } catch (error) {
      console.log(`   ❌ Failed to create avatar ${avatar.name}:`, error.error || error.message);
      results.failed.push({ id: avatar.id, name: avatar.name, error: error.error || error.message });
    }
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

// Upload microphones
async function uploadMicrophones() {
  console.log('🎤 Uploading 20 microphones...');
  
  const results = {
    success: [],
    failed: []
  };

  for (const microphone of MICROPHONES) {
    try {
      console.log(`   Uploading microphone: ${microphone.name} (${microphone.rarity})`);
      
      const response = await makeRequest('POST', '/microphones', microphone);
      
      results.success.push({ id: microphone.id, name: microphone.name, rarity: microphone.rarity });
      console.log(`   ✅ Created microphone: ${microphone.name}`);
      
    } catch (error) {
      console.log(`   ❌ Failed to create microphone ${microphone.name}:`, error.error || error.message);
      results.failed.push({ 
        id: microphone.id, 
        name: microphone.name, 
        rarity: microphone.rarity,
        error: error.error || error.message 
      });
    }
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

// Verify upload
async function verifyUpload() {
  console.log('🔍 Verifying upload...');
  
  try {
    // Check avatars
    const avatarsResponse = await makeRequest('GET', '/avatar/all-avatars');
    console.log(`✅ Found ${avatarsResponse.data.length} avatars in production`);
    
    // Check microphones
    const microphonesResponse = await makeRequest('GET', '/avatar/all-microphones');
    console.log(`✅ Found ${microphonesResponse.data.length} microphones in production`);
    
    // Break down by rarity
    const micsByRarity = {};
    microphonesResponse.data.forEach(mic => {
      micsByRarity[mic.rarity] = (micsByRarity[mic.rarity] || 0) + 1;
    });
    
    console.log('📊 Microphones by rarity:');
    Object.entries(micsByRarity).forEach(([rarity, count]) => {
      console.log(`   ${rarity}: ${count}`);
    });
    
    return {
      avatars: avatarsResponse.data.length,
      microphones: microphonesResponse.data.length,
      microphonesByRarity: micsByRarity
    };
    
  } catch (error) {
    console.log('❌ Verification failed:', error.message);
    return null;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting KaraokeHub Production Data Upload');
  console.log(`📡 Target: ${CONFIG.baseUrl}`);
  console.log('');

  // Validate configuration
  if (!CONFIG.baseUrl || CONFIG.baseUrl.includes('your-production-url')) {
    console.log('❌ Error: Please update CONFIG.baseUrl with your production URL');
    process.exit(1);
  }

  if (!CONFIG.authToken || CONFIG.authToken.includes('your-jwt-token')) {
    console.log('❌ Error: Please update CONFIG.authToken with a valid JWT token');
    console.log('   Login to production and get token from browser dev tools');
    process.exit(1);
  }

  try {
    // Step 1: Clear existing data (manual step)
    await clearExistingData();
    console.log('');

    // Step 2: Upload avatars
    const avatarResults = await uploadAvatars();
    console.log('');

    // Step 3: Upload microphones
    const microphoneResults = await uploadMicrophones();
    console.log('');

    // Step 4: Verify
    const verification = await verifyUpload();
    console.log('');

    // Summary
    console.log('📋 Upload Summary:');
    console.log(`✨ Avatars: ${avatarResults.success.length} created, ${avatarResults.failed.length} failed`);
    console.log(`🎤 Microphones: ${microphoneResults.success.length} created, ${microphoneResults.failed.length} failed`);
    
    if (verification) {
      console.log(`📊 Production now has: ${verification.avatars} avatars, ${verification.microphones} microphones`);
    }

    if (avatarResults.failed.length > 0 || microphoneResults.failed.length > 0) {
      console.log('');
      console.log('❌ Some uploads failed. Check the logs above for details.');
      console.log('   You may need to implement missing endpoints or adjust the data format.');
    } else {
      console.log('');
      console.log('🎉 All uploads completed successfully!');
    }

  } catch (error) {
    console.log('❌ Upload failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { uploadAvatars, uploadMicrophones, verifyUpload };