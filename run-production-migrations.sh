#!/bin/bash

# Migration execution script for production
echo "🔄 Running critical migrations in production..."

BASE_URL="https://karaoke-hub.com"

echo "📊 Checking current migration status..."
curl -X GET "${BASE_URL}/admin/migrations/status" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "🚀 Running critical migrations..."
curl -X POST "${BASE_URL}/admin/migrations/run-critical" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "📊 Checking migration status after execution..."
curl -X GET "${BASE_URL}/admin/migrations/status" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "✅ Migration execution complete!"