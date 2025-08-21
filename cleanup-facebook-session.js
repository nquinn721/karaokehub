const fs = require('fs');
const path = require('path');

/**
 * Cleanup script to remove unnecessary Chrome profile files from facebook-session
 * and keep only the essential cookies.json file for session persistence
 */

function cleanupFacebookSession() {
  console.log('🧹 Cleaning up Facebook session directory...');
  console.log('='.repeat(50));

  const sessionDir = path.join(process.cwd(), 'facebook-session');

  if (!fs.existsSync(sessionDir)) {
    console.log('📁 No facebook-session directory found - nothing to clean');
    return;
  }

  const cookiesPath = path.join(sessionDir, 'cookies.json');
  let cookiesBackup = null;

  // Backup cookies.json if it exists
  if (fs.existsSync(cookiesPath)) {
    try {
      cookiesBackup = fs.readFileSync(cookiesPath, 'utf8');
      console.log('✅ Backed up cookies.json');
    } catch (error) {
      console.log(`⚠️ Failed to backup cookies: ${error.message}`);
    }
  }

  // List all items in the session directory
  console.log('\n📋 Current facebook-session contents:');
  const items = fs.readdirSync(sessionDir);
  items.forEach((item) => {
    const itemPath = path.join(sessionDir, item);
    const isDir = fs.statSync(itemPath).isDirectory();
    console.log(`  ${isDir ? '📁' : '📄'} ${item}`);
  });

  console.log(`\n📊 Found ${items.length} items in facebook-session directory`);

  // Remove all items except cookies.json
  let removedCount = 0;
  let errorCount = 0;

  items.forEach((item) => {
    if (item === 'cookies.json') {
      console.log(`⏭️ Keeping: ${item}`);
      return;
    }

    const itemPath = path.join(sessionDir, item);

    try {
      const isDir = fs.statSync(itemPath).isDirectory();

      if (isDir) {
        fs.rmSync(itemPath, { recursive: true, force: true });
        console.log(`🗑️ Removed directory: ${item}`);
      } else {
        fs.unlinkSync(itemPath);
        console.log(`🗑️ Removed file: ${item}`);
      }

      removedCount++;
    } catch (error) {
      console.log(`❌ Failed to remove ${item}: ${error.message}`);
      errorCount++;
    }
  });

  // Restore cookies.json if we had a backup
  if (cookiesBackup && !fs.existsSync(cookiesPath)) {
    try {
      fs.writeFileSync(cookiesPath, cookiesBackup);
      console.log('✅ Restored cookies.json');
    } catch (error) {
      console.log(`❌ Failed to restore cookies: ${error.message}`);
    }
  }

  console.log('\n📊 Cleanup Summary:');
  console.log(`   ✅ Items removed: ${removedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📄 Files kept: ${fs.existsSync(cookiesPath) ? 'cookies.json' : 'none'}`);

  // Check final state
  console.log('\n📋 Final facebook-session contents:');
  const finalItems = fs.readdirSync(sessionDir);
  if (finalItems.length === 0) {
    console.log('   (empty directory)');
  } else {
    finalItems.forEach((item) => {
      const itemPath = path.join(sessionDir, item);
      const isDir = fs.statSync(itemPath).isDirectory();
      const size = isDir ? 'dir' : `${fs.statSync(itemPath).size} bytes`;
      console.log(`   ${isDir ? '📁' : '📄'} ${item} (${size})`);
    });
  }

  const sizeMB = getFolderSize(sessionDir) / (1024 * 1024);
  console.log(`\n💾 Final directory size: ${sizeMB.toFixed(2)} MB`);

  console.log('\n✨ Cleanup complete! Now using minimal session storage.');
}

function getFolderSize(dirPath) {
  let totalSize = 0;

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        totalSize += getFolderSize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Ignore errors for inaccessible files
  }

  return totalSize;
}

// Run cleanup
cleanupFacebookSession();
