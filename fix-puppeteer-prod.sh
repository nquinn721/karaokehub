#!/bin/bash

# Quick fix to update Puppeteer executable path in production
echo "🔧 Updating Puppeteer configuration in Cloud Run..."

gcloud run services update karaokehub \
  --region=us-central1 \
  --update-env-vars="PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser,PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" \
  --quiet

echo "✅ Environment variables updated"
echo "🔍 Checking current environment variables..."

gcloud run services describe karaokehub \
  --region=us-central1 \
  --format="export" | grep -E "(PUPPETEER|NODE_ENV)"

echo "🎯 Testing parser functionality..."
SERVICE_URL=$(gcloud run services describe karaokehub --region=us-central1 --format="value(status.url)")

curl -X POST "$SERVICE_URL/api/parser/parse-website" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/html"}' \
  -w "HTTP Status: %{http_code}\n"

echo "✅ Quick fix completed!"
