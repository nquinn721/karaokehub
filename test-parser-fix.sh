#!/bin/bash

echo "🧪 Testing parser improvements after deployment..."
echo ""

# Test the problematic URL that was failing
echo "📋 Testing excessskaraoke.com parsing..."
response=$(curl -s -X POST https://karaokehub-203453576607.us-central1.run.app/api/parser/parse-website \
  -H "Content-Type: application/json" \
  -d '{"url": "https://excessskaraoke.com/shows.php"}' \
  -w "HTTPSTATUS:%{http_code}")

# Extract the HTTP status
http_code=$(echo $response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
body=$(echo $response | sed -E 's/HTTPSTATUS:[0-9]*$//')

echo "HTTP Status: $http_code"
echo ""

if [ "$http_code" = "200" ]; then
  echo "✅ SUCCESS! Parser is working"
  echo ""
  echo "📊 Response preview:"
  echo $body | jq '.data.shows | length' 2>/dev/null && echo "Shows found" || echo "Response structure:"
  echo $body | head -c 200
  echo "..."
else
  echo "❌ Still failing with status $http_code"
  echo ""
  echo "🔍 Error details:"
  echo $body | head -c 500
fi

echo ""
echo "🔗 Check full logs: https://console.cloud.google.com/run/detail/us-central1/karaokehub/logs"
