#!/bin/bash

# Test and Refresh Facebook Session Cookies
# This script will test the current cookies and refresh them if needed

echo "🧪 Testing Facebook session cookies..."

# First, let's check if the local cookies are valid by testing them
echo "📂 Checking local facebook-cookies.json..."

if [ ! -f "data/facebook-cookies.json" ]; then
    echo "❌ Error: data/facebook-cookies.json not found"
    echo "You need to log into Facebook manually and save fresh cookies first"
    exit 1
fi

# Check cookie expiry times
echo "🕒 Checking cookie expiry times..."
CURRENT_TIME=$(date +%s)
EXPIRED_COOKIES=$(cat data/facebook-cookies.json | jq --arg current_time "$CURRENT_TIME" '[.[] | select(.expires != -1 and .expires < ($current_time | tonumber))] | length')

if [ "$EXPIRED_COOKIES" -gt 0 ]; then
    echo "⚠️ Found $EXPIRED_COOKIES expired cookies in local file"
    echo "💡 You may need to log into Facebook again to get fresh cookies"
else
    echo "✅ Local cookies appear to be valid (not expired)"
fi

# Test if we can access a Facebook page with these cookies
echo "🔍 Testing cookies by accessing Facebook..."

# Use curl to test cookie validity
COOKIE_STRING=$(cat data/facebook-cookies.json | jq -r '.[] | "\(.name)=\(.value)"' | tr '\n' ';')

# Test accessing Facebook with cookies
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/fb_test.html \
    -H "Cookie: $COOKIE_STRING" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
    "https://www.facebook.com/me")

if [ "$RESPONSE" == "200" ]; then
    echo "✅ Cookies appear to be working (HTTP 200)"
    
    # Check if the response contains login form (indicates not logged in)
    if grep -q "login" /tmp/fb_test.html; then
        echo "⚠️ Response contains login form - cookies may not be working properly"
        echo "💡 You may need to refresh your Facebook login"
    else
        echo "✅ Successfully authenticated with Facebook"
    fi
else
    echo "❌ Failed to access Facebook (HTTP $RESPONSE)"
    echo "💡 Cookies may be expired or invalid"
fi

# Clean up
rm -f /tmp/fb_test.html

echo ""
echo "📋 Next steps if cookies are invalid:"
echo "1. Open a browser and log into Facebook"
echo "2. Use browser dev tools to export cookies"
echo "3. Save them to data/facebook-cookies.json"
echo "4. Run: bash setup-facebook-cookies-cloud.sh"
echo "5. Redeploy: bash deploy.sh"

echo ""
echo "🚀 Current deployment status:"
gcloud run services describe karaokehub --region=us-central1 --project=heroic-footing-460117-k8 --format="value(status.latestReadyRevisionName)"
