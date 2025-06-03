#!/bin/bash

# Count lines of actual source code in the Spideryarn Reading codebase
# Excludes: generated files, external dependencies, test data, documentation, and build artifacts
# Usage: ./count_lines.sh [--by-file]

BY_FILE_FLAG=""
if [[ "$1" == "--by-file" ]]; then
    BY_FILE_FLAG="--by-file"
fi

cloc . \
    --exclude-dir=gjdutils,.next,.cursor,.claude,.swc,.vscode,coverage,node_modules,screenshots,obsolete_alternative_version,backup,data,dist,logs,obsolete,.vercel \
    --exclude-ext=log,png,jpg,jpeg,ico,zip,html,tsbuildinfo,webmanifest \
    --not-match-f='.*\.md$|_secrets\.py|\.env\..*|npm-debug\.log.*|yarn-debug\.log.*|yarn-error\.log.*|\.pnpm-debug\.log.*|package-lock\.json|dev\.log|lib/types/database\.ts|next-env\.d\.ts' \
    --not-match-d='static/examples|components/ui' \
    $BY_FILE_FLAG
