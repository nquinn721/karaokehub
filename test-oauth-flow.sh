#!/bin/bash

echo "🔵 Testing OAuth Flow with Comprehensive Logging"
echo "================================================"

# Step 1: Test the OAuth initiation endpoint
echo ""
echo "1️⃣ Testing OAuth initiation endpoint..."
curl -v "https://karaoke-hub.com/api/auth/google" 2>&1 | grep -E "(location:|HTTP/)"

echo ""
echo "2️⃣ Waiting for logs to appear..."
sleep 5

echo ""
echo "3️⃣ Getting recent logs..."
gcloud logging read 'resource.labels.service_name="karaokehub" AND resource.labels.location="us-central1" AND timestamp>="'$(date -u -d '1 minute ago' +%Y-%m-%dT%H:%M:%SZ)'"' --limit=20 --format="value(timestamp,textPayload)" | head -40

echo ""
echo "4️⃣ Getting OAuth specific logs..."
gcloud logging read 'resource.labels.service_name="karaokehub" AND resource.labels.location="us-central1" AND (textPayload:"GOOGLE_OAUTH" OR textPayload:"OAUTH_CALLBACK" OR textPayload:"JWT_" OR textPayload:"PROFILE_ENDPOINT")' --limit=10 --format="value(timestamp,textPayload)"
