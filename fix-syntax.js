const fs = require('fs');

// Read the file
const filePath = './src/parser/facebook-parser.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix double commas (,,) that were created by the script
content = content.replace(/,,\s*\n\s*'(info|warning|error)'/g, ",\n      '$1'");

// Write the file back
fs.writeFileSync(filePath, content);

console.log('✅ Fixed double comma syntax errors');
