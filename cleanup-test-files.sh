#!/bin/bash

echo "🧹 CLEANING UP TEST FILES CREATED DURING ADDRESS PARSING DEBUG..."
echo ""

# List of files to remove (created during debugging)
files_to_remove=(
    "debug-address-expectations.js"
    "debug-address-parsing.js"
    "debug-gemini-output.js"
    "debug-production-parser.js"
    "fix-address-parsing.js"
    "parsing-cleanup-summary.js"
    "test-address-functionality.js"
    "test-address-parsing-summary.js"
    "test-address-parsing.js"
    "test-address-preprocessing.js"
    "test-comma-addresses.js"
    "test-current-parsing-issues.js"
    "test-gemini-addresses.js"
    "test-improved-parsing.js"
    "test-library-comparison.js"
    "test-prompt-simplification.js"
    "test-real-addresses.js"
    "test-simplified-address-parsing.js"
    "test-simplified-prompt.js"
    "test-stevesdj-parsing.js"
)

echo "Files to be removed:"
for file in "${files_to_remove[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  - $file (not found)"
    fi
done

echo ""
read -p "Do you want to proceed with cleanup? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing files..."
    removed_count=0
    for file in "${files_to_remove[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "  ✅ Removed: $file"
            ((removed_count++))
        fi
    done
    
    echo ""
    echo "🎉 Cleanup complete! Removed $removed_count test files."
    echo ""
    echo "📁 Keeping these important files:"
    echo "  • test/ directory (unit tests)"
    echo "  • Standard project files"
    echo "  • Production scripts"
    echo ""
else
    echo "❌ Cleanup cancelled."
fi
