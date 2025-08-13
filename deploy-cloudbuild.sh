#!/bin/bash

# KaraokeHub Deployment Script using Cloud Build
echo "🚀 Deploying KaraokeHub to Google Cloud Run using Cloud Build..."

# Configuration
PROJECT_ID="heroic-footing-460117-k8"
SERVICE_NAME="karaokehub"
REGION="us-east1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Build using Cloud Build
echo "🔨 Building Docker image using Cloud Build..."
gcloud builds submit --tag ${IMAGE_NAME} .

# Deploy to Cloud Run
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars FRONTEND_URL=https://karaokehub-203453576607.us-east1.run.app \
  --update-secrets DATABASE_HOST=KARAOKE_HUB_DB_HOST:latest \
  --update-secrets DATABASE_PORT=KARAOKE_HUB_DB_PORT:latest \
  --update-secrets DATABASE_NAME=KARAOKE_HUB_DB_NAME:latest \
  --update-secrets DATABASE_SYNCHRONIZE=KARAOKE_HUB_DB_SYNCHRONIZE:latest \
  --update-secrets DATABASE_USERNAME=KARAOKE_HUB_DB_USERNAME:latest \
  --update-secrets DATABASE_PASSWORD=KARAOKE_HUB_DB_PASSWORD:latest \
  --update-secrets JWT_SECRET=KARAOKE_HUB_JWT_SECRET:latest \
  --update-secrets GOOGLE_CLIENT_ID=KARAOKE_HUB_GOOGLE_CLIENT_ID:latest \
  --update-secrets GOOGLE_CLIENT_SECRET=KARAOKE_HUB_GOOGLE_CLIENT_SECRET:latest \
  --update-secrets GEMINI_API_KEY=KARAOKE_HUB_GEMINI_API_KEY:latest

echo "✅ Deployment complete!"
echo "🌍 Service URL: https://karaokehub-203453576607.us-east1.run.app"
