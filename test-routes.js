// Simple route test
const http = require('http');

// Test if server is running and check routes
const testRoute = (path) => {
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`${path}: ${res.statusCode} ${res.statusMessage}`);
  });

  req.on('error', (err) => {
    console.log(`${path}: ERROR - ${err.message}`);
  });

  req.setTimeout(2000, () => {
    console.log(`${path}: TIMEOUT`);
    req.destroy();
  });

  req.end();
};

console.log('Testing server routes...');
testRoute('/api/admin/parser/pending-reviews');
testRoute('/api/health');
testRoute('/');
