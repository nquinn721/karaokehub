#!/bin/bash

# Deploy resource configuration fixes to Cloud Run
echo "🚀 Deploying resource optimization fixes..."

# Apply the updated Cloud Run service configuration
gcloud run services replace cloudrun-service.yaml \
  --region=us-central1 \
  --platform=managed

echo "✅ Resource configuration updated!"
echo ""
echo "📊 New configuration:"
echo "   Memory: 2GB (was 512MB)"
echo "   CPU: 2 cores (was 1 core)" 
echo "   Timeout: 15 min (was 5 min)"
echo "   Concurrency: 10 (was 80)"
echo "   Min instances: 1 (was 0)"
echo ""
echo "🎯 This should resolve parsing failures due to resource constraints!"
