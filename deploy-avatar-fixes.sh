#!/bin/bash

# Production Deployment and Avatar Fix Script
# Run this script to deploy the avatar fixes to production

set -e

echo "🚀 Starting Production Avatar Fix Deployment"
echo "============================================="

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# Check if all changes are committed
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: You have uncommitted changes"
    echo "Please commit all changes before deploying"
    exit 1
fi

echo "✅ All changes committed"

# Build locally first to check for errors
echo ""
echo "🔨 Building locally to verify..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Local build failed - aborting deployment"
    exit 1
fi
echo "✅ Local build successful"

# Deploy to production
echo ""
echo "☁️ Deploying to Google Cloud..."
gcloud builds submit --config cloudbuild.yaml --project heroic-footing-460117-k8

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Wait a few minutes for the deployment to propagate"
    echo "2. Run the production avatar data fix:"
    echo "   node dev-tools/migrations/fix-production-avatar-data.js"
    echo "3. Test avatar functionality in production"
    echo ""
    echo "📝 Avatar System Changes Deployed:"
    echo "   ✅ Backend service uses correct database column (avatarId)"
    echo "   ✅ Frontend uses name-based avatar image lookup"
    echo "   ✅ Database migration ready to fix data inconsistencies"
    echo "   ✅ SQL logging disabled for performance"
else
    echo "❌ Deployment failed"
    exit 1
fi