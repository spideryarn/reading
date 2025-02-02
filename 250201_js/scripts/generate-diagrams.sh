#!/bin/bash
set -euo pipefail

# Ensure docs directory exists
mkdir -p docs

# Check if mmdc is installed
if ! command -v mmdc &> /dev/null; then
    echo "Mermaid CLI not found. see SETUP.md"
fi

# Generate PNG file
echo "Generating PNG diagram..."
mmdc -i docs/architecture.mmd -o docs/architecture.png

# Generate SVG (commented out but preserved)
# mmdc -i docs/architecture.mmd -o docs/architecture.svg

echo "Generated docs/architecture.png"
