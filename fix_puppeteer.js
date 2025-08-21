const fs = require('fs');

let content = fs.readFileSync('src/parser/facebook-parser.service.ts', 'utf8');

const oldConfig = `    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });`;

const newConfig = `    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        // Prevent session/cache storage
        '--incognito',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-sync',
        '--disable-translate',
        '--disable-local-storage',
        '--disable-databases',
        '--disable-shared-workers',
        '--disable-file-system',
        '--disable-session-crashed-bubble',
        '--memory-pressure-off',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows'
      ]
    });`;

content = content.replace(oldConfig, newConfig);
fs.writeFileSync('src/parser/facebook-parser.service.ts', content);
console.log('Updated Puppeteer configuration');
