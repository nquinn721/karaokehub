const NodeCache = require('node-cache');

// Test NodeCache import and initialization
try {
  const cache = new NodeCache({ stdTTL: 600 });

  // Test basic operations
  cache.set('test-key', 'test-value');
  const value = cache.get('test-key');

  console.log('✅ NodeCache test successful!');
  console.log(`Test value: ${value}`);
  console.log(`Cache stats:`, cache.getStats());

  process.exit(0);
} catch (error) {
  console.error('❌ NodeCache test failed:', error);
  process.exit(1);
}
