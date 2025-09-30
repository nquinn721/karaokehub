#!/bin/bash
# Test script to verify API monitoring works without database errors
# Run this after applying the database fix

echo "Testing API monitoring system..."

# Test a music search to trigger API monitoring
echo "Making test API call..."
curl -s "http://localhost:8000/api/music/search?q=test&limit=1" > /dev/null

# Wait a moment for processing
sleep 2

# Check if API monitoring data was logged successfully
echo "Checking API monitoring dashboard..."
curl -s "http://localhost:8000/api/api-monitoring/dashboard/summary" | jq '.'

echo "Checking recent API calls..."
curl -s "http://localhost:8000/api/api-monitoring/realtime/recent-calls" | jq '.'

echo "Test completed!"