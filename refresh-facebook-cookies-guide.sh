#!/bin/bash

# Manual Facebook Cookie Refresh Guide
# Since Facebook cookies expire frequently, here's a simple way to refresh them

echo "🍪 Facebook Cookie Refresh Guide"
echo "================================="
echo ""
echo "📋 Steps to refresh Facebook cookies:"
echo ""
echo "1. 🌐 Open Chrome/Edge in a new incognito window"
echo "2. 🔗 Go to https://www.facebook.com"
echo "3. 🔐 Log in with your Facebook account"
echo "4. 🎯 Navigate to any Facebook group (like: https://www.facebook.com/groups/194826524192177)"
echo "5. 🛠️  Open Developer Tools (F12)"
echo "6. 📑 Go to Application tab > Storage > Cookies > https://www.facebook.com"
echo "7. 📋 Right-click in the cookies area and select 'Export' or copy all cookies"
echo "8. 💾 Save as data/facebook-cookies.json"
echo ""
echo "🎬 Alternative: Use Cookie Editor browser extension"
echo "1. Install 'Cookie Editor' extension"
echo "2. Navigate to Facebook while logged in"
echo "3. Click the extension and export cookies as JSON"
echo "4. Save to data/facebook-cookies.json"
echo ""
echo "⚡ Quick verification:"
echo "After saving cookies, run: node -e \"console.log('Cookies found:', JSON.parse(require('fs').readFileSync('data/facebook-cookies.json')).length)\""
echo ""
echo "🚀 Then update Cloud Run:"
echo "bash setup-facebook-cookies-cloud.sh"
echo "bash deploy.sh"
echo ""

# Check if cookies exist and show some info
if [ -f "data/facebook-cookies.json" ]; then
    echo "📊 Current cookie file info:"
    echo "File size: $(wc -c < data/facebook-cookies.json) bytes"
    echo "Modified: $(stat -c %y data/facebook-cookies.json 2>/dev/null || stat -f %Sm data/facebook-cookies.json 2>/dev/null || echo 'Unknown')"
    
    # Try to count cookies without jq dependency
    COOKIE_COUNT=$(grep -o '"name"' data/facebook-cookies.json | wc -l)
    echo "Cookie count: $COOKIE_COUNT"
    
    # Check for some important Facebook cookies
    if grep -q '"xs"' data/facebook-cookies.json; then
        echo "✅ Found 'xs' cookie (session cookie)"
    else
        echo "❌ Missing 'xs' cookie (required for authentication)"
    fi
    
    if grep -q '"c_user"' data/facebook-cookies.json; then
        echo "✅ Found 'c_user' cookie (user ID)"
    else
        echo "❌ Missing 'c_user' cookie (user authentication)"
    fi
else
    echo "❌ No facebook-cookies.json file found in data/ directory"
fi

echo ""
echo "🎯 Testing Facebook authentication..."
echo "You can test locally by running a single URL parse:"
echo "curl -X POST http://localhost:8000/api/parser/parse-url \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"url\": \"https://www.facebook.com/groups/194826524192177\", \"parseMethod\": \"screenshot\"}'"
