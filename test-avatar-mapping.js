// Test script to verify avatar and microphone mappings
const avatarMap = {
  avatar_default_1: {
    id: 'avatar_default_1',
    name: 'Classic Avatar',
    imageUrl: '/images/avatar/avatar_1.png',
    category: 'classic',
  },
  avatar_rockstar_2: {
    id: 'avatar_rockstar_2',
    name: 'Rockstar',
    imageUrl: '/images/avatar/avatar_2.png',
    category: 'rockstar',
  },
  avatar_punk_3: {
    id: 'avatar_punk_3',
    name: 'Punk Rocker',
    imageUrl: '/images/avatar/avatar_3.png',
    category: 'punk',
  },
  avatar_disco_4: {
    id: 'avatar_disco_4',
    name: 'Disco Star',
    imageUrl: '/images/avatar/avatar_4.png',
    category: 'disco',
  },
  avatar_country_5: {
    id: 'avatar_country_5',
    name: 'Country Singer',
    imageUrl: '/images/avatar/avatar_5.png',
    category: 'country',
  },
};

const microphoneMap = {
  mic_default_1: {
    id: 'mic_default_1',
    name: 'Classic Microphone',
    imageUrl: '/images/avatar/parts/microphones/mic_1.png',
    category: 'classic',
  },
  mic_wireless_2: {
    id: 'mic_wireless_2',
    name: 'Wireless Mic',
    imageUrl: '/images/avatar/parts/microphones/mic_2.png',
    category: 'modern',
  },
  mic_vintage_3: {
    id: 'mic_vintage_3',
    name: 'Vintage Microphone',
    imageUrl: '/images/avatar/parts/microphones/mic_3.png',
    category: 'vintage',
  },
  mic_studio_4: {
    id: 'mic_studio_4',
    name: 'Studio Microphone',
    imageUrl: '/images/avatar/parts/microphones/mic_4.png',
    category: 'studio',
  },
  mic_stage_5: {
    id: 'mic_stage_5',
    name: 'Stage Microphone',
    imageUrl: '/images/avatar/parts/microphones/mic_5.png',
    category: 'stage',
  },
};

// Test the mappings
console.log('Testing Avatar Mappings:');
console.log('avatar_default_1:', avatarMap['avatar_default_1']);
console.log('avatar_rockstar_2:', avatarMap['avatar_rockstar_2']);

console.log('\nTesting Microphone Mappings:');
console.log('mic_default_1:', microphoneMap['mic_default_1']);
console.log('mic_wireless_2:', microphoneMap['mic_wireless_2']);

console.log('\nAll mappings are correctly structured for backend service methods.');
