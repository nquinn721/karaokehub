/**
 * Image Quality Comparison Script
 * Compare the original thumbnail vs enhanced vs extracted high-quality image
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function analyzeImage(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const metadata = await sharp(filePath).metadata();

    return {
      file: path.basename(filePath),
      size: `${(stats.size / 1024).toFixed(1)}KB`,
      dimensions: `${metadata.width}x${metadata.height}`,
      pixels: metadata.width * metadata.height,
      format: metadata.format,
      quality: 'Unknown',
    };
  } catch (error) {
    return {
      file: path.basename(filePath),
      error: error.message,
    };
  }
}

async function compareImages() {
  console.log('📊 IMAGE QUALITY COMPARISON ANALYSIS');
  console.log('='.repeat(70));

  const images = [
    'temp/original-pixelated.jpg',
    'temp/enhanced-with-sharp.jpg',
    'temp/super-enhanced.jpg',
    'temp/smart-enhanced.jpg',
    'temp/extracted-facebook-photo.jpg',
  ];

  const results = [];

  for (const imagePath of images) {
    const fullPath = path.join(__dirname, imagePath);
    if (fs.existsSync(fullPath)) {
      const analysis = await analyzeImage(fullPath);
      results.push(analysis);
    }
  }

  // Sort by pixel count to show quality progression
  results.sort((a, b) => (b.pixels || 0) - (a.pixels || 0));

  console.log('\n📈 QUALITY RANKING (by resolution):');
  console.log('-'.repeat(70));

  results.forEach((result, index) => {
    const rank = index + 1;
    const pixels = result.pixels ? `(${(result.pixels / 1000).toFixed(0)}K pixels)` : '';

    console.log(`${rank}. ${result.file}`);
    console.log(`   Size: ${result.size} | Dimensions: ${result.dimensions} ${pixels}`);

    if (result.file.includes('original')) {
      console.log('   📝 Source: Facebook thumbnail (heavily compressed)');
    } else if (result.file.includes('enhanced') || result.file.includes('super')) {
      console.log('   📝 Source: AI upscaled from thumbnail');
    } else if (result.file.includes('extracted')) {
      console.log('   📝 Source: Full-resolution Facebook CDN URL');
    }
    console.log('');
  });

  // Calculate improvement factors
  const original = results.find((r) => r.file.includes('original'));
  const extracted = results.find((r) => r.file.includes('extracted'));

  if (original && extracted && original.pixels && extracted.pixels) {
    const pixelImprovement = (extracted.pixels / original.pixels).toFixed(1);
    const sizeImprovement = (parseFloat(extracted.size) / parseFloat(original.size)).toFixed(1);

    console.log('🎯 DIRECT EXTRACTION vs THUMBNAIL ENHANCEMENT:');
    console.log('-'.repeat(70));
    console.log(`📐 Resolution improvement: ${pixelImprovement}x more pixels`);
    console.log(`💾 File size increase: ${sizeImprovement}x larger`);
    console.log(`🔍 Quality: Native high-res vs AI-enhanced low-res`);

    console.log('\n💡 KEY INSIGHT:');
    console.log('   Extracting the original high-resolution image directly from');
    console.log('   Facebook provides MUCH better quality than any AI enhancement');
    console.log('   of the tiny thumbnail versions.');

    console.log('\n📝 RECOMMENDATION:');
    console.log('   Always extract full-resolution images when possible,');
    console.log('   rather than enhancing compressed thumbnails.');
  }

  console.log(
    '\n🎉 Analysis complete! Check the actual image files to see the quality difference.',
  );
}

// Run the comparison
compareImages().catch(console.error);
