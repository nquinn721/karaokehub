/**
 * Test the enhanced Gemini deduplication logic
 */

const testVenues = [
  {
    id: '1',
    name: 'Oties',
    address: '123 Main St',
    city: 'Columbus',
    state: 'OH',
    zip: '43215',
    website: null,
    description: null,
  },
  {
    id: '2',
    name: 'Oties Tavern & Grill',
    address: '123 Main Street',
    city: 'Columbus',
    state: 'OH',
    zip: '43215',
    website: 'https://otiestavern.com',
    description: 'Local sports bar and grill',
  },
  {
    id: '3',
    name: 'Different Place',
    address: '456 Oak Ave',
    city: 'Columbus',
    state: 'OH',
    zip: '43216',
    website: null,
    description: null,
  },
];

console.log('Test Venue Data:');
console.log(JSON.stringify(testVenues, null, 2));

console.log('\nExpected Result:');
console.log('- Should identify venues 1 and 2 as duplicates');
console.log('- Should keep venue 2 (Oties Tavern & Grill) because:');
console.log('  * More descriptive name');
console.log('  * Full street name (Street vs St)');
console.log('  * Has website and description');
console.log('- Should NOT mark venue 3 as duplicate');
