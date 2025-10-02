#!/bin/bash
# Complete test script for avatar/microphone display and multi-user experience

echo "🎤 KaraokeHub Complete Test - Avatar Display & Multi-User"
echo "========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="http://localhost:3001/api"

echo -e "${BLUE}1. Checking server status...${NC}"
if curl -s "$API_BASE/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running${NC}"
else 
    echo -e "${RED}❌ Server is not running. Please start it with: npm run start:dev${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}2. Instructions for Testing:${NC}"
echo "=============================="
echo -e "${YELLOW}Step 1: Set Active Users${NC}"
echo "- Go to: http://localhost:3000/admin/live-show-test"
echo "- In the 'Fake Users' tab, toggle users to ACTIVE:"
echo "  • DJ Mike (should show as DJ)"
echo "  • Sarah Star (should show as Singer)" 
echo "  • Rock Andy (should show as Singer)"

echo ""
echo -e "${YELLOW}Step 2: Start Live Show${NC}"
echo "- In the 'Simulations' tab, click 'Start Live Show'"
echo "- This will create a show and redirect you to it"
echo "- The show will be automatically populated with your active test users"

echo ""
echo -e "${YELLOW}Step 3: Verify Multi-User Display${NC}"
echo "- You should see multiple participants in the sidebar"
echo "- Current singer display should show:"
echo "  ✓ Large 200px avatar image (not fallback 'N')"
echo "  ✓ 120px microphone image (not 'Default Microphone' text)"
echo "  ✓ Real names and equipment from test data"

echo ""
echo -e "${YELLOW}Step 4: Test DJ vs Singer Experience${NC}"
echo "- Look for 'Switch to DJ/Singer' button (admin only)"
echo "- Try both roles to see different interfaces:"
echo ""
echo -e "${GREEN}📋 DJ Experience:${NC}"
echo "  • Queue management controls"
echo "  • Set current singer button"  
echo "  • Send announcements"
echo "  • See all participant details"
echo ""
echo -e "${GREEN}🎤 Singer Experience:${NC}"
echo "  • Join queue button"
echo "  • Chat with other singers"
echo "  • See current performance"
echo "  • Wait for turn"

echo ""
echo -e "${BLUE}3. Technical Details:${NC}"
echo "===================="
echo -e "${GREEN}✅ Backend Changes Applied:${NC}"
echo "  • Removed database relation dependencies"
echo "  • Added test user avatar/microphone assignments"
echo "  • Created test show population endpoint"
echo "  • Added role switching for DJ testing"
echo "  • Location validation bypassed for test mode"

echo ""
echo -e "${GREEN}✅ Frontend Features:${NC}"
echo "  • Large prominent avatar display (200px)"
echo "  • Clear microphone showcase (120px)" 
echo "  • Role switching button for admin testing"
echo "  • Multi-user participant display"

echo ""
echo -e "${BLUE}4. Troubleshooting:${NC}"
echo "==================="
echo -e "${RED}If avatars still show as fallback:${NC}"
echo "  • Check browser console for image loading errors"
echo "  • Verify image paths: /images/avatar/avatar_*.png"
echo "  • Check server logs for backend avatar retrieval"

echo -e "${RED}If no participants show up:${NC}"
echo "  • Make sure you activated test users first"
echo "  • Check that 'populate-test-users' endpoint was called"
echo "  • Verify show creation succeeded"

echo -e "${RED}If role switching doesn't work:${NC}"
echo "  • Ensure you're logged in as admin user"
echo "  • Check network tab for API call success"
echo "  • Try refreshing page after role switch"

echo ""
echo -e "${GREEN}🎯 Success Criteria:${NC}"
echo "==================="
echo "✓ See multiple test users in participant list"
echo "✓ Avatar shows actual image, not 'N' fallback"
echo "✓ Microphone shows actual image, not text fallback"
echo "✓ Can switch between DJ and Singer roles"
echo "✓ Different interface elements based on role"
echo "✓ Test users appear with realistic equipment"

echo ""
echo -e "${BLUE}Ready to test! 🚀${NC}"
echo "Open: ${GREEN}http://localhost:3000/admin/live-show-test${NC}"