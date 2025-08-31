#!/bin/bash

# Example: Safe Data Transfer Workflow
# This demonstrates how to safely transfer data from local to production

echo "🔄 Safe Data Transfer Example"
echo "============================="

# Step 1: Export from local environment
echo "📦 Step 1: Exporting safe data from local..."
npm run data:export-local

# Check if export was successful
if [ $? -eq 0 ]; then
    echo "✅ Export successful!"
    
    # Find the latest export file
    LATEST_EXPORT=$(ls -t exports/local-safe-export-*.sql | head -n1)
    echo "📁 Export file: $LATEST_EXPORT"
    
    # Step 2: Test import with dry run
    echo ""
    echo "🧪 Step 2: Testing import (dry run)..."
    npm run data:import-dry -- --source "$LATEST_EXPORT"
    
    if [ $? -eq 0 ]; then
        echo "✅ Dry run successful!"
        echo ""
        echo "🚀 Ready for production import!"
        echo ""
        echo "To import to production:"
        echo "  1. Transfer $LATEST_EXPORT to production server"
        echo "  2. Run: npm run data:import -- --source $LATEST_EXPORT"
        echo ""
        echo "⚠️  Remember: This will only affect show/venue/vendor/DJ data"
        echo "    User data will remain untouched!"
    else
        echo "❌ Dry run failed - check the errors above"
        exit 1
    fi
else
    echo "❌ Export failed - check the errors above"
    exit 1
fi
