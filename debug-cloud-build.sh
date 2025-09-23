#!/bin/bash

# Cloud Build Debug Script
echo "🔍 Cloud Build Debugging Helper..."

PROJECT_ID="heroic-footing-460117-k8"

# Set project
gcloud config set project ${PROJECT_ID}

echo "📋 Recent Cloud Builds:"
gcloud builds list --limit=10 --format="table(id,status,createTime,duration,source.repoSource.branchName)" 

echo ""
echo "🔍 Checking for failed builds..."
FAILED_BUILDS=$(gcloud builds list --filter="status=FAILURE" --limit=5 --format="value(id)")

if [ ! -z "$FAILED_BUILDS" ]; then
    echo "❌ Found failed builds:"
    for build_id in $FAILED_BUILDS; do
        echo "Build ID: $build_id"
        echo "Getting build details..."
        gcloud builds describe $build_id --format="value(status,statusDetail)" 
        echo "---"
    done
    
    # Get logs for the most recent failed build
    LATEST_FAILED=$(echo $FAILED_BUILDS | head -n1)
    echo "📋 Logs for latest failed build ($LATEST_FAILED):"
    gcloud builds log $LATEST_FAILED
else
    echo "✅ No recent failed builds found"
fi

echo ""
echo "🔍 Checking current build status..."
CURRENT_BUILDS=$(gcloud builds list --filter="status=WORKING" --format="value(id)")
if [ ! -z "$CURRENT_BUILDS" ]; then
    echo "⚡ Active builds found:"
    for build_id in $CURRENT_BUILDS; do
        echo "Build ID: $build_id - Following logs..."
        gcloud builds log --follow $build_id
    done
else
    echo "📭 No active builds"
fi

echo ""
echo "🎯 Cloud Build Troubleshooting Tips:"
echo "1. Check if the Dockerfile is valid"
echo "2. Verify all secrets are properly configured"
echo "3. Check if the Cloud SQL instance is accessible"
echo "4. Verify IAM permissions for Cloud Build service account"
echo "5. Check if Container Registry has enough space"