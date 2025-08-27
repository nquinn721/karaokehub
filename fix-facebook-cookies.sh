#!/bin/bash

# Quick Facebook Cookie Fix for Production
# This script provides a step-by-step solution to fix Facebook authentication

echo "🔧 Facebook Cookie Fix - Production Issue Resolution"
echo "=================================================="
echo ""
echo "📊 DIAGNOSIS:"
echo "✅ Cookies exist in correct format (10 cookies found)"
echo "✅ All required cookies present (xs, c_user, datr, sb)"
echo "✅ No expired cookies detected locally"
echo "❌ Facebook servers rejecting authentication"
echo ""
echo "🔍 ROOT CAUSE:"
echo "Facebook has likely changed session validation or detected unusual activity"
echo "The cookies need to be refreshed with a fresh login session"
echo ""
echo "🛠️  QUICK FIX STEPS:"
echo ""
echo "1. 🌐 Open a PRIVATE/INCOGNITO browser window"
echo "2. 🔗 Go to https://facebook.com"
echo "3. 🔐 Log in with your Facebook account"
echo "4. 🎯 Navigate to a Facebook group page (any group)"
echo "5. 🔧 Open Developer Tools (F12)"
echo "6. 📑 Go to: Application > Storage > Cookies > https://www.facebook.com"
echo "7. 📋 Select all cookies and copy them"
echo "8. 💾 Save as data/facebook-cookies.json in this format:"
echo ""
echo "   [{"
echo "     \"name\": \"xs\","
echo "     \"value\": \"your_value_here\","
echo "     \"domain\": \".facebook.com\","
echo "     \"path\": \"/\","
echo "     \"expires\": 1787698544,"
echo "     \"httpOnly\": true,"
echo "     \"secure\": true"
echo "   }, ...]"
echo ""
echo "9. 🚀 Update production:"
echo "   bash setup-facebook-cookies-cloud.sh"
echo "   bash deploy.sh"
echo ""
echo "⚡ ALTERNATIVE - Cookie Editor Extension:"
echo "1. Install 'Cookie Editor' Chrome extension"
echo "2. Log into Facebook"
echo "3. Click extension icon → Export → Save as JSON"
echo "4. Save to data/facebook-cookies.json"
echo "5. Update production (steps 9 above)"
echo ""
echo "🔍 VERIFICATION:"
echo "After updating, you can test locally:"
echo "curl -X GET http://localhost:8000/api/parser/facebook-cookies/validate"
echo "curl -X POST http://localhost:8000/api/parser/facebook-cookies/test"
echo ""
echo "📊 Current cookie status:"

# Show current cookie info if file exists
if [ -f "data/facebook-cookies.json" ]; then
    echo "File exists: $(ls -la data/facebook-cookies.json)"
    echo "File size: $(wc -c < data/facebook-cookies.json) bytes"
    echo "Last modified: $(stat -c %y data/facebook-cookies.json 2>/dev/null || stat -f %Sm data/facebook-cookies.json 2>/dev/null || echo 'Unknown')"
    
    # Try to extract some cookie info without jq
    if grep -q '"xs"' data/facebook-cookies.json; then
        echo "✅ Contains xs cookie (session)"
    else
        echo "❌ Missing xs cookie"
    fi
    
    if grep -q '"c_user"' data/facebook-cookies.json; then
        echo "✅ Contains c_user cookie (user ID)"
    else
        echo "❌ Missing c_user cookie"
    fi
else
    echo "❌ No facebook-cookies.json file found"
fi

echo ""
echo "🎯 PRIORITY ACTION NEEDED:"
echo "The Facebook Group Discovery system cannot work until fresh cookies are obtained."
echo "This is blocking the automated karaoke group discovery across all 865 cities."
echo ""
echo "💡 TIP: Use incognito mode to avoid affecting your personal Facebook session"
