#!/bin/bash

# Migration cleanup script for production
echo "🧹 Cleaning up migration artifacts..."

BASE_URL="https://karaoke-hub.com"

echo "📊 Checking current migration status..."
curl -X GET "${BASE_URL}/admin/migrations/status" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "🧹 Running cleanup..."
curl -X POST "${BASE_URL}/admin/migrations/cleanup" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "📊 Checking status after cleanup..."
curl -X GET "${BASE_URL}/admin/migrations/status" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "🚀 Now attempting to run critical migrations..."
curl -X POST "${BASE_URL}/admin/migrations/run-critical" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "📊 Final status check..."
curl -X GET "${BASE_URL}/admin/migrations/status" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "✅ Migration cleanup and retry complete!"