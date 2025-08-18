#!/bin/bash
# KaraokeHub Enhanced Deployment & Parser Test Script
# --------------------------------------------------
# Builds, deploys, and tests the parser endpoint on Cloud Run.
# Usage: bash deploy-with-parser-test.sh
# Fetches logs if tests fail for easier debugging.

# Enhanced deployment script with parser testing
set -e

echo "🚀 Enhanced KaraokePal Deployment with Parser Testing"
echo "====================================================="

# Build and deploy
echo "📦 Building and deploying..."
gcloud builds submit --config cloudbuild.yaml --machine-type=e2-highcpu-8

echo "⏳ Waiting for deployment to be ready..."
sleep 30

# Get the service URL
SERVICE_URL=$(gcloud run services describe karaoke-hub --region=us-central1 --format="value(status.url)")
echo "🌐 Service URL: $SERVICE_URL"

# Test basic health
echo "🏥 Testing basic health..."
curl -f "$SERVICE_URL/health" || {
  echo "❌ Health check failed"
  exit 1
}

# Test parser endpoint with a simple URL
echo "🔍 Testing parser functionality..."
TEST_RESPONSE=$(curl -s -X POST "$SERVICE_URL/api/parser/parse-website" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/html"}' \
  -w "%{http_code}")

HTTP_CODE="${TEST_RESPONSE: -3}"
RESPONSE_BODY="${TEST_RESPONSE%???}"

echo "HTTP Code: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Parser test successful"
else
  echo "❌ Parser test failed with HTTP code: $HTTP_CODE"
  echo "Response body: $RESPONSE_BODY"
  
  # Get logs for debugging
  echo "📋 Getting recent logs for debugging..."
  gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=karaoke-hub" \
    --limit=50 \
    --format="table(timestamp,severity,textPayload)" \
    --region=us-central1
  
  exit 1
fi

echo "🎉 Deployment and testing completed successfully!"
echo "Service is available at: $SERVICE_URL"
