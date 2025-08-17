#!/bin/bash

# KaraokeHub Deployment Script using Cloud Build with cloudbuild.yaml
echo "🚀 Deploying KaraokeHub to Google Cloud Run using Cloud Build..."

# Configuration
PROJECT_ID="heroic-footing-460117-k8"
SERVICE_NAME="karaokehub"
REGION="us-central1"

# Set the project
echo "📋 Setting project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Submit build using cloudbuild.yaml
echo "🔨 Starting Cloud Build using cloudbuild.yaml..."
gcloud builds submit --config cloudbuild.yaml .

if [ $? -eq 0 ]; then
    echo "✅ Deployment complete!"
    echo "🌍 Service URL: https://karaoke-hub.com"
    
    # Show deployment status
    echo "📊 Checking deployment status..."
    gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format="value(status.url)"
else
    echo "❌ Build failed. Check the Cloud Build logs for details."
    exit 1
fi
