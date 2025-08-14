#!/bin/bash

# Script to create Google Maps API Key secret in Google Cloud Secret Manager
# Run this before deploying to Cloud Run

PROJECT_ID="heroic-footing-460117-k8"
SECRET_NAME="KARAOKE_HUB_GOOGLE_MAPS_API_KEY"
API_KEY="AIzaSyCJgu_sx8VjMTj7iphIekriBeTjeKjHuiY"

echo "Creating Google Maps API Key secret in Google Cloud Secret Manager..."

# Create the secret
gcloud secrets create $SECRET_NAME \
    --project=$PROJECT_ID \
    --data-file=<(echo -n "$API_KEY")

if [ $? -eq 0 ]; then
    echo "✅ Secret created successfully: $SECRET_NAME"
else
    echo "❌ Failed to create secret. It might already exist. Updating instead..."
    # Update if it already exists
    echo -n "$API_KEY" | gcloud secrets versions add $SECRET_NAME \
        --project=$PROJECT_ID \
        --data-file=-
    
    if [ $? -eq 0 ]; then
        echo "✅ Secret updated successfully: $SECRET_NAME"
    else
        echo "❌ Failed to create or update secret"
        exit 1
    fi
fi

echo "🔑 Google Maps API Key secret is now available for Cloud Run deployment"
