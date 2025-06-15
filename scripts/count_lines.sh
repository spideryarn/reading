#!/bin/bash

# Count lines of actual source code in the Spideryarn Reading codebase
# Excludes: generated files, external dependencies, test data, documentation, and build artifacts
# Usage: ./count_lines.sh [--by-file] [--exclude-tests]

BY_FILE_FLAG=""
EXCLUDE_TESTS_FLAG=""

for arg in "$@"; do
    case $arg in
        --by-file)
            BY_FILE_FLAG="--by-file"
            ;;
        --exclude-tests)
            EXCLUDE_TESTS_FLAG="true"
            ;;
    esac
done

# Base exclusions
BASE_NOT_MATCH_F='.*\.md$|_secrets\.py|\.env\..*|npm-debug\.log.*|yarn-debug\.log.*|yarn-error\.log.*|\.pnpm-debug\.log.*|package-lock\.json|dev\.log|lib/types/database\.ts|next-env\.d\.ts'
BASE_NOT_MATCH_D='static/examples|components/ui'

# Add test exclusions if requested
if [[ "$EXCLUDE_TESTS_FLAG" == "true" ]]; then
    NOT_MATCH_F="$BASE_NOT_MATCH_F|.*\.test\.ts$|.*\.test\.tsx$|jest\.setup\.js$|.*\.spec\.ts$|.*\.spec\.tsx$"
    NOT_MATCH_D="$BASE_NOT_MATCH_D|__tests__|tests"
else
    NOT_MATCH_F="$BASE_NOT_MATCH_F"
    NOT_MATCH_D="$BASE_NOT_MATCH_D"
fi

if [[ "$EXCLUDE_TESTS_FLAG" == "true" ]]; then
    echo "=== SOURCE CODE ONLY (excluding tests) ==="
fi

cloc . \
    --exclude-dir=gjdutils,.next,.cursor,.claude,.swc,.vscode,coverage,node_modules,screenshots,obsolete_alternative_version,backup,data,dist,logs,obsolete,.vercel \
    --exclude-ext=log,png,jpg,jpeg,ico,zip,html,tsbuildinfo,webmanifest \
    --not-match-f="$NOT_MATCH_F" \
    --not-match-d="$NOT_MATCH_D" \
    $BY_FILE_FLAG | tee /tmp/cloc_source.txt

# If excluding tests, also show test-only count
if [[ "$EXCLUDE_TESTS_FLAG" == "true" ]]; then
    echo ""
    echo "=== TESTS ONLY ==="
    # Count test files by naming pattern
    cloc . \
        --exclude-dir=gjdutils,.next,.cursor,.claude,.swc,.vscode,coverage,node_modules,screenshots,obsolete_alternative_version,backup,data,dist,logs,obsolete,.vercel \
        --match-f='.*\.(test|spec)\.(ts|tsx|js|jsx)$|jest\.setup\.js$|jest\.config\.js$' | tee /tmp/cloc_tests.txt
    
    # Extract line counts from both outputs
    SOURCE_CODE=$(grep -E "^SUM:" /tmp/cloc_source.txt | awk '{print $NF}')
    TEST_CODE=$(grep -E "^SUM:" /tmp/cloc_tests.txt | awk '{print $NF}')
    
    if [[ -n "$SOURCE_CODE" && -n "$TEST_CODE" ]]; then
        TOTAL_CODE=$((SOURCE_CODE + TEST_CODE))
        TEST_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($TEST_CODE / $TOTAL_CODE) * 100}")
        
        echo ""
        echo "=== SUMMARY ==="
        echo "Source code: $SOURCE_CODE lines"
        echo "Test code: $TEST_CODE lines"
        echo "Total: $TOTAL_CODE lines"
        echo "Tests are ${TEST_PERCENT}% of codebase"
    fi
    
    # Clean up temp files
    rm -f /tmp/cloc_source.txt /tmp/cloc_tests.txt
fi
