const url =
  'https://www.facebook.com/max.denney.194690?mibextid=wwXIfr&rdid=kN0Fd3eOEli2RRdO&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F16kWgqjUbW%2F%3Fmibextid%3DwwXIfr#';

console.log('Testing Facebook profile parsing...');

fetch('http://localhost:8000/api/parser/parse-website', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url }),
})
  .then((response) => response.json())
  .then((data) => {
    console.log('Parse Result:', JSON.stringify(data, null, 2));
  })
  .catch((error) => {
    console.error('Error:', error);
  });
