#!/bin/bash

# 🧪 Test Image Parsing Functionality
# This script tests the new image parsing endpoints with the Crescent Lounge example

BASE_URL="http://localhost:8000/api/parser"
IMAGE_URL="https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/479675883_610547821608741_5223623110230996688_n.jpg?stp=c0.394.1545.806a_cp6_dst-jpg_s1545x806_tt6&_nc_cat=110&ccb=1-7&_nc_sid=75d36f&_nc_ohc=FzGTzQ6Fzq8Q7kNvwHNqlb2&_nc_oc=AdmzuSIBaP3dF06vwKfCBgbNV4ae6oXDrQNQng_ND_2ax8Sxoy1OaUjnawuT8p3WIDE&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=BuspIiJkodJ484HWj3ceQQ&oh=00_AfW9TbWaeMfq8YQTQk3jIThY05ZdIeH--PFOcK-VzHnE2Q&oe=68A57C0C"

echo "🖼️  Testing Image Parsing Functionality"
echo "========================================"
echo ""

# Test 1: Parse Image (Preview Only)
echo "📋 Test 1: Parse Image Directly (Preview)"
echo "URL: $IMAGE_URL"
echo ""

curl -X POST "$BASE_URL/parse-image" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"imageUrl\": \"$IMAGE_URL\"}" \
  --connect-timeout 30 \
  --max-time 60 \
  -w "\n\nResponse Time: %{time_total}s\nHTTP Status: %{http_code}\n" 2>/dev/null

echo ""
echo "============================================"
echo ""

# Test 2: Parse and Save Image (Admin Review)
echo "💾 Test 2: Parse and Save Image (Admin Review)"
echo "URL: $IMAGE_URL"
echo ""

curl -X POST "$BASE_URL/parse-and-save-image" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"imageUrl\": \"$IMAGE_URL\"}" \
  --connect-timeout 30 \
  --max-time 60 \
  -w "\n\nResponse Time: %{time_total}s\nHTTP Status: %{http_code}\n" 2>/dev/null

echo ""
echo "============================================"
echo ""

# Expected Results Summary
echo "🎯 Expected Results:"
echo "- Venue: 'The Crescent Lounge'"
echo "- Address: '5240 Godown Road, Columbus, Ohio'"
echo "- DJ: 'DJ MAX614' or similar"
echo "- Time: '8PM-12AM' or '8:00 PM - 12:00 AM'"
echo "- Event: 'Karaoke Every Saturday'"
echo "- Features: Pizza, craft cocktails, free parking"
echo ""

# Test Social Media Post (if URL provided)
if [ ! -z "$FACEBOOK_POST_URL" ]; then
    echo "📱 Test 3: Parse Social Media Post"
    echo "URL: $FACEBOOK_POST_URL"
    echo ""
    
    curl -X POST "$BASE_URL/parse-social-media-post" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -d "{\"url\": \"$FACEBOOK_POST_URL\"}" \
      --connect-timeout 30 \
      --max-time 60 \
      -w "\n\nResponse Time: %{time_total}s\nHTTP Status: %{http_code}\n" 2>/dev/null
fi

echo ""
echo "✅ Testing Complete!"
echo ""
echo "📊 Next Steps:"
echo "1. Check server logs for detailed processing info"
echo "2. Verify parsed data accuracy"
echo "3. Review admin dashboard for pending items"
echo "4. Test with different image URLs"
