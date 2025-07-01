#!/bin/bash

# Fix Housekeeping Build, TypeCheck & Lint Issues
# Automated script to run Claude Code with appropriate permissions

set -e  # Exit on any error

echo "🔧 Starting housekeeping fix process..."
echo "📍 Working directory: $(pwd)"
echo "🌿 Current branch: $(git branch --show-current)"
echo ""

# Check if Claude Code is available
if ! command -v claude &> /dev/null; then
    echo "❌ Claude Code not found. Please install it first."
    exit 1
fi

# Check if the instruction file exists
INSTRUCTION_FILE="docs/instructions/FIX_HOUSEKEEPING_BUILD_TYPECHECK_LINT.md"
if [[ ! -f "$INSTRUCTION_FILE" ]]; then
    echo "❌ Instruction file not found: $INSTRUCTION_FILE"
    exit 1
fi

echo "📋 Using instruction file: $INSTRUCTION_FILE"
echo "🚀 Launching Claude Code..."
echo ""

# Option 1: Use --dangerously-skip-permissions (RECOMMENDED)
# This bypasses all permission checks - use with caution!
claude -p --dangerously-skip-permissions "Please follow the comprehensive process outlined in the attached instruction file to systematically fix build, TypeScript, and linting issues. Work through Stage 1 (Assessment), Stage 2 (Resolution), and Stage 3 (Verification) as documented. Use subagents where appropriate to avoid context pollution. Focus on production code over test code. If you encounter complex/ambiguous decisions that need discussion, then skip them." < "$INSTRUCTION_FILE"

# Option 2: Use specific --allowedTools (FALLBACK - uncomment if Option 1 doesn't work)
# Note: This approach has known reliability issues in non-interactive mode
# claude -p --allowedTools "Bash(*),Edit,Read,Glob,Grep,TodoWrite,TodoRead,MultiEdit,Write,Task,WebSearch" "Please follow the comprehensive process outlined in the attached instruction file to systematically fix build, TypeScript, and linting issues. Work through Stage 1 (Assessment), Stage 2 (Resolution), and Stage 3 (Verification) as documented. Use subagents where appropriate to avoid context pollution. Focus on production code over test code, and stop if you encounter complex architectural decisions that need discussion." < "$INSTRUCTION_FILE"

echo ""
echo "✅ Housekeeping process completed!"
echo "🔍 Check the output above for any remaining issues or required manual intervention."