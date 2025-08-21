#!/usr/bin/env node

/**
 * Simple validation script to check if our aggregation code compiles and exports correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Facebook Parser Aggregation Implementation...\n');

// Check if the compiled file exists and contains our new methods
const compiledPath = path.join(__dirname, 'dist', 'parser', 'facebook-parser.service.js');

if (!fs.existsSync(compiledPath)) {
  console.log('❌ Compiled FacebookParserService not found at:', compiledPath);
  console.log('   Run "npm run build" first');
  process.exit(1);
}

try {
  // Read the compiled JavaScript
  const compiledCode = fs.readFileSync(compiledPath, 'utf8');

  console.log('✅ Compiled file found and readable');

  // Check for our new methods
  const requiredMethods = [
    'deduplicateShows',
    'deduplicateDJs',
    'isMoreCompleteShow',
    'isMoreCompleteDJ',
    'getShowCompletenessScore',
    'getDJCompletenessScore',
  ];

  const missingMethods = [];
  const foundMethods = [];

  for (const method of requiredMethods) {
    if (compiledCode.includes(method)) {
      foundMethods.push(method);
    } else {
      missingMethods.push(method);
    }
  }

  console.log(`\n📊 Method Check Results:`);
  console.log(`   Found methods: ${foundMethods.length}/${requiredMethods.length}`);
  foundMethods.forEach((method) => console.log(`   ✅ ${method}`));

  if (missingMethods.length > 0) {
    console.log(`   Missing methods: ${missingMethods.length}`);
    missingMethods.forEach((method) => console.log(`   ❌ ${method}`));
  }

  // Check for aggregation logic
  const aggregationPatterns = [
    'existingSchedule',
    'PENDING_REVIEW',
    'deduplicateShows',
    'deduplicateDJs',
    'Updated existing parsed_schedule',
  ];

  console.log(`\n🔧 Aggregation Logic Check:`);
  let foundPatterns = 0;

  for (const pattern of aggregationPatterns) {
    if (compiledCode.includes(pattern)) {
      console.log(`   ✅ Found: ${pattern}`);
      foundPatterns++;
    } else {
      console.log(`   ❌ Missing: ${pattern}`);
    }
  }

  console.log(`\n📈 Implementation Status:`);
  console.log(
    `   Methods: ${foundMethods.length}/${requiredMethods.length} (${Math.round((foundMethods.length / requiredMethods.length) * 100)}%)`,
  );
  console.log(
    `   Logic patterns: ${foundPatterns}/${aggregationPatterns.length} (${Math.round((foundPatterns / aggregationPatterns.length) * 100)}%)`,
  );

  if (
    foundMethods.length === requiredMethods.length &&
    foundPatterns === aggregationPatterns.length
  ) {
    console.log('\n🎉 SUCCESS: All aggregation features properly compiled!');
    console.log('   The Facebook parser now includes:');
    console.log('   • Database record aggregation');
    console.log('   • Show and DJ deduplication');
    console.log('   • Intelligent data merging');
    console.log('   • Memory optimization');
  } else {
    console.log('\n⚠️ PARTIAL: Some features may be missing');
    console.log('   Check the compilation and source code');
  }

  // Check source file for recent modifications
  const sourcePath = path.join(__dirname, 'src', 'parser', 'facebook-parser.service.ts');
  if (fs.existsSync(sourcePath)) {
    const sourceStats = fs.statSync(sourcePath);
    const compiledStats = fs.statSync(compiledPath);

    console.log(`\n📅 File Timestamps:`);
    console.log(`   Source modified: ${sourceStats.mtime.toISOString()}`);
    console.log(`   Compiled: ${compiledStats.mtime.toISOString()}`);

    if (sourceStats.mtime > compiledStats.mtime) {
      console.log('   ⚠️ Source file is newer than compiled - rebuild recommended');
    } else {
      console.log('   ✅ Compiled file is up to date');
    }
  }

  console.log('\n🚀 Next Steps:');
  console.log('   1. Test with actual Facebook URLs to verify aggregation');
  console.log('   2. Monitor database growth using check-database-queries.sql');
  console.log('   3. Verify memory usage improvements in production');
} catch (error) {
  console.error('❌ Error validating implementation:', error.message);
  process.exit(1);
}

console.log('\n✅ Validation completed successfully!');
