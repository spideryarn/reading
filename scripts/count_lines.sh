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
    $BY_FILE_FLAG

# If excluding tests, also show test-only count
if [[ "$EXCLUDE_TESTS_FLAG" == "true" ]]; then
    echo ""
    echo "=== TESTS ONLY ==="
    cloc . \
        --exclude-dir=gjdutils,.next,.cursor,.claude,.swc,.vscode,coverage,node_modules,screenshots,obsolete_alternative_version,backup,data,dist,logs,obsolete,.vercel \
        --exclude-ext=log,png,jpg,jpeg,ico,zip,html,tsbuildinfo,webmanifest \
        --not-match-f='.*\.md$|_secrets\.py|\.env\..*|npm-debug\.log.*|yarn-debug\.log.*|yarn-error\.log.*|\.pnpm-debug\.log.*|package-lock\.json|dev\.log|lib/types/database\.ts|next-env\.d\.ts' \
        --not-match-d='static/examples|components/ui' \
        --match-f='.*\.test\.ts$|.*\.test\.tsx$|jest\.setup\.js$|.*\.spec\.ts$|.*\.spec\.tsx$' \
        --match-d='__tests__|tests'
fi
