#!/bin/bash

# NOTE: This approach is promising but not working reliably right now due to
# a mix of timeouts and broken function calls. Use scripts/o3-critique-as-api.ts instead.
#
# OpenAI Codex CLI wrapper for planning document critique using o3 model
# Configured for read-only, non-interactive analysis with stdout output
# Usage: ./scripts/codex-with-env.sh planning/your-planning-doc.md

# Check if argument provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <path-to-planning-doc>"
    echo "Example: $0 planning/250620c_glossary_generate_more_timeout_mitigation.md"
    exit 1
fi

PLANNING_DOC="$1"

# Check if planning doc exists
if [ ! -f "$PLANNING_DOC" ]; then
    echo "Error: Planning document not found: $PLANNING_DOC"
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Error: .env.local file not found in current directory"
    echo "Make sure you're running this from the project root"
    exit 1
fi

# Extract and export OPENAI_API_KEY from .env.local
export OPENAI_API_KEY=$(grep "^OPENAI_API_KEY=" .env.local | cut -d'=' -f2)

# Check if API key was found
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: OPENAI_API_KEY not found in .env.local"
    exit 1
fi

# Set environment for optimal non-interactive usage
export CODEX_QUIET_MODE=1

# Construct the critique prompt
PROMPT="Please read CLAUDE.md for project context. Then read planning doc $PLANNING_DOC. Follow the critique methodology in docs/instructions/CRITIQUE_OF_PLANNING_DOC.md to analyze it."

# Create critiques directory if it doesn't exist
mkdir -p planning/critiques

# Extract planning doc filename without path and extension
PLANNING_DOC_BASENAME=$(basename "$PLANNING_DOC" .md)

# Generate timestamped filename for the raw output
TIMESTAMP=$(date +"%y%m%d_%H%M")
RAW_OUTPUT="planning/critiques/o3-pro__CRITIQUE_OF__${PLANNING_DOC_BASENAME}__${TIMESTAMP}.jsonl"

echo "Running codex critique (saving raw output to $RAW_OUTPUT)..."

# Run codex with optimal settings for document analysis:
# --model o3: Force o3 model for superior reasoning
# --quiet: Non-interactive mode, outputs to stdout
# --approval-mode suggest: Read-only mode (default), asks permission for file changes
# Save raw output first, then parse it
if codex --model o3-pro --quiet --approval-mode suggest "$PROMPT" > "$RAW_OUTPUT"; then
    echo "Raw output saved to: $RAW_OUTPUT"
    echo "Parsing critique..."
    echo ""
    
    # Parse and display the critique
    if ./scripts/parse-critique-output.ts "$RAW_OUTPUT"; then
        echo ""
        echo "✅ Critique parsed successfully from: $RAW_OUTPUT"
    else
        echo ""
        echo "❌ Failed to parse critique. Raw output available at: $RAW_OUTPUT"
        exit 1
    fi
else
    echo "❌ Codex command failed"
    exit 1
fi