#!/bin/bash

# Facebook Session Management Script
# This script helps manage Facebook sessions for the KaraokeHub parser

echo "🔧 Facebook Session Management"
echo "==============================="
echo ""

# Check if session file exists
if [ -f "data/facebook-cookies.json" ]; then
    echo "📄 Current session file found: data/facebook-cookies.json"
    
    # Show basic session info (without sensitive data)
    COOKIE_COUNT=$(cat data/facebook-cookies.json | grep -o '"name"' | wc -l)
    echo "   Contains $COOKIE_COUNT cookies"
    
    # Check file modification time
    echo "   Last modified: $(stat -c %y data/facebook-cookies.json 2>/dev/null || stat -f %Sm data/facebook-cookies.json)"
    echo ""
    
    echo "⚠️  This session may be causing conflicts with your personal Facebook/Messenger"
    echo ""
    
    read -p "Do you want to clear the current session? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Backup current session
        BACKUP_FILE="data/facebook-cookies-backup-$(date +%Y%m%d_%H%M%S).json"
        cp data/facebook-cookies.json "$BACKUP_FILE"
        echo "✅ Backed up current session to: $BACKUP_FILE"
        
        # Clear current session
        rm data/facebook-cookies.json
        echo "✅ Cleared current Facebook session"
        echo ""
        echo "📱 Your Messenger should now work normally on your phone"
        echo ""
        echo "🔄 Next steps:"
        echo "1. Check if your Messenger is working on your phone"
        echo "2. When you need to parse Facebook again:"
        echo "   - Use a dedicated Facebook account (recommended)"
        echo "   - Or temporarily use your personal account knowing it may log out your phone"
        echo ""
    else
        echo "❌ Session not cleared"
        echo ""
        echo "💡 Alternative: Create a dedicated Facebook account for parsing"
        echo "   See docs/FACEBOOK-DEDICATED-ACCOUNT-SETUP.md for details"
    fi
else
    echo "❌ No session file found at data/facebook-cookies.json"
    echo "   The parser will prompt for login when needed"
fi

echo ""
echo "🔧 Session Management Commands:"
echo "   Clear session:    rm data/facebook-cookies.json"
echo "   Backup session:   cp data/facebook-cookies.json data/backup-cookies.json"
echo "   Restore session:  cp data/backup-cookies.json data/facebook-cookies.json"
echo ""
