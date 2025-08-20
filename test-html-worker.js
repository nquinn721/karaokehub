const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

async function testHtmlWorkerParsing() {
  console.log('🧵 Testing HTML Worker parsing with stevesdj.com content');
  
  // Read the HTML content we extracted
  const htmlContent = fs.readFileSync('stevesdj-html-content.html', 'utf8');
  const url = 'https://stevesdj.com/karaoke-schedule';
  
  return new Promise((resolve, reject) => {
    const workerPath = path.join(process.cwd(), 'dist', 'parser', 'html-parsing-worker.js');
    
    console.log(`🔍 Worker path: ${workerPath}`);
    console.log(`📄 HTML content length: ${htmlContent.length} chars`);
    
    const worker = new Worker(workerPath, {
      workerData: {
        htmlContent,
        url,
        geminiApiKey: process.env.GEMINI_API_KEY
      },
    });

    worker.on('message', (result) => {
      if (result.type === 'progress') {
        console.log(`📝 Progress: ${result.data.status}`);
        return;
      }
      
      if (result.type === 'complete') {
        console.log('✅ Worker completed successfully');
        console.log('📊 Parsed data:');
        console.log(JSON.stringify(result.data, null, 2));
        
        // Check specifically for vendor name
        if (result.data.vendor?.name) {
          console.log(`🏢 Vendor name extracted: "${result.data.vendor.name}"`);
        } else {
          console.log('⚠️ No vendor name was extracted!');
        }
        
        worker.terminate();
        resolve(result.data);
        return;
      }
      
      if (result.type === 'error') {
        console.error('❌ Worker parsing error:', result.data.message);
        worker.terminate();
        reject(new Error(result.data.message));
        return;
      }
      
      // Unknown message type
      console.log('📩 Unknown message type:', result.type);
    });

    worker.on('error', (error) => {
      console.error('❌ Worker error:', error);
      worker.terminate();
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ Worker stopped with exit code ${code}`);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Check if we have GEMINI_API_KEY
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

testHtmlWorkerParsing()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
