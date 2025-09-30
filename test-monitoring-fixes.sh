#!/bin/bash
# Test script for API monitoring updates

echo "🧪 Testing API Monitoring System"
echo "================================"

echo "1. Making test API calls to generate data..."
curl -s "http://localhost:8000/api/music/search?q=test" > /dev/null
curl -s "http://localhost:8000/api/music/search?q=elvis" > /dev/null 
curl -s "http://localhost:8000/api/music/search?q=beatles" > /dev/null

echo "   ✓ Made 3 test API calls"

echo ""
echo "2. Checking debug endpoints..."

echo "   📊 Metrics Table Debug:"
curl -s "http://localhost:8000/api/api-monitoring/debug/metrics-table" | jq '.'

echo ""
echo "   📞 Recent Calls Count:"
curl -s "http://localhost:8000/api/api-monitoring/debug/recent-calls-count" | jq '.'

echo ""
echo "3. Checking dashboard summary..."
curl -s "http://localhost:8000/api/api-monitoring/dashboard/summary" | jq '.'

echo ""
echo "4. Checking recent calls (should show max 100 stored)..."
curl -s "http://localhost:8000/api/api-monitoring/realtime/recent-calls?limit=10" | jq '. | length'

echo ""
echo "✅ Test completed!"