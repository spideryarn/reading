#!/bin/bash

# Check if mmdc is installed
if ! command -v mmdc &> /dev/null; then
    echo "Mermaid CLI not found. Please install with: npm install -g @mermaid-js/mermaid-cli"
    exit 1
fi

# Generate PNG file
mmdc -i docs/architecture.mmd -o docs/architecture.png

# Generate SVG (commented out but preserved)
# mmdc -i docs/architecture.mmd -o docs/architecture.svg

echo "Generated docs/architecture.png" 