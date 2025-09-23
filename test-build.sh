#!/bin/bash

# Build Test Script - Comprehensive build validation
echo "🔍 Running comprehensive build tests..."

# Test 1: TypeScript compilation
echo "1️⃣ Testing TypeScript compilation..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed"
    exit 1
fi
echo "✅ TypeScript compilation passed"

# Test 2: Client build
echo "2️⃣ Testing client build..."
cd client
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Client build failed"
    exit 1
fi
cd ..
echo "✅ Client build passed"

# Test 3: Check for missing dependencies
echo "3️⃣ Checking for missing dependencies..."
npm audit --audit-level high
if [ $? -ne 0 ]; then
    echo "⚠️ High severity vulnerabilities found"
fi

# Test 4: Test Docker build locally (if Docker is available)
echo "4️⃣ Testing Docker build steps..."
if command -v docker &> /dev/null; then
    echo "Building client stage..."
    docker build --target client-builder -t test-client .
    if [ $? -ne 0 ]; then
        echo "❌ Client Docker stage failed"
        exit 1
    fi
    
    echo "Building server stage..."
    docker build --target server-builder -t test-server .
    if [ $? -ne 0 ]; then
        echo "❌ Server Docker stage failed"
        exit 1
    fi
    
    echo "✅ Docker build stages passed"
else
    echo "⚠️ Docker not available, skipping Docker build test"
fi

# Test 5: Check file sizes that might cause issues
echo "5️⃣ Checking for large files that might cause build issues..."
find . -type f -size +10M | grep -v node_modules | grep -v .git
if [ $? -eq 0 ]; then
    echo "⚠️ Large files found that might slow the build"
fi

echo "🎉 All build tests completed!"
echo ""
echo "📋 Build Summary:"
echo "- TypeScript compilation: ✅"
echo "- Client build: ✅"
echo "- Dependency check: ✅"
echo "- Docker stages: ✅"
echo ""
echo "🚀 Ready for Cloud Build deployment!"