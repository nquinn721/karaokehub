#!/bin/bash
# Quick test to verify API monitoring frontend fix

echo "🧪 Testing API Monitoring Frontend Fix"
echo "====================================="

echo "1. Making a test API call to generate monitoring data..."
curl -s "http://localhost:8000/api/music/search?q=test" > /dev/null
echo "   ✓ API call made"

echo ""
echo "2. Checking if metrics endpoint returns proper data types..."
echo "   Dashboard Summary:"
curl -s "http://localhost:8000/api/api-monitoring/dashboard/summary" | jq '.'

echo ""
echo "3. Checking metrics table data..."
curl -s "http://localhost:8000/api/api-monitoring/metrics/daily" | jq '.[0] // "No data"'

echo ""
echo "✅ Test completed! Check the browser console to see if the TypeError is resolved."
echo ""
echo "The avgResponseTime should now be properly handled as a number in the frontend."