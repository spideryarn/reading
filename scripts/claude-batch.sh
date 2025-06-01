#!/bin/bash

# Claude Code Non-Interactive Runner
# Provides core tool access for batch processing without MCP/interactive tools

# Core tools for non-interactive usage (no MCP, testing, or browser tools)
CLAUDE_LOCAL_TOOLS="Bash Edit MultiEdit Read Write Glob Grep LS Task WebFetch WebSearch TodoRead TodoWrite"

# Function to run claude in batch mode
claude_batch() {
    if [ $# -eq 0 ]; then
        echo "Usage: claude_batch \"your prompt here\""
        echo "Example: claude_batch \"analyze the codebase and suggest improvements\""
        return 1
    fi
    
    local prompt="$1"
    shift # Remove first argument, keep any additional flags
    
    echo "Running Claude in batch mode..."
    echo "Prompt: $prompt"
    echo ""
    
    claude -p "$prompt" \
        --allowedTools "$CLAUDE_LOCAL_TOOLS" \
        --output-format stream-json \
        --verbose \
        "$@"
}

# If script is run directly (not sourced), execute the function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    claude_batch "$@"
fi