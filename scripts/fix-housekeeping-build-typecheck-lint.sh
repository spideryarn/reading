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

# Option 1: Use --dangerously-skip-permissions with verbose output (RECOMMENDED)
# This bypasses all permission checks and shows detailed progress - use with caution!
# --verbose: Shows full turn-by-turn output for debugging and progress tracking
# --max-turns: Limit turns to prevent runaway processes (adjust as needed)
# Use exec to replace the shell process and show live output
exec claude -p --model sonnet --verbose --output-format stream-json --max-turns 30 --dangerously-skip-permissions "Please follow the comprehensive process outlined in the attached instruction file to systematically fix build, TypeScript, and linting issues. Work through Stage 1 (Assessment), Stage 2 (Resolution), and Stage 3 (Verification) as documented. Use subagents where appropriate to avoid context pollution. Focus on production code over test code. If you encounter complex/ambiguous decisions that need discussion, then skip them." < "$INSTRUCTION_FILE"

# Option 2: Use specific --allowedTools with verbose output (FALLBACK - uncomment if Option 1 doesn't work)
# Note: This approach has known reliability issues in non-interactive mode
# claude -p --verbose --max-turns 50 --allowedTools "Bash(*),Edit,Read,Glob,Grep,TodoWrite,TodoRead,MultiEdit,Write,Task,WebSearch" "Please follow the comprehensive process outlined in the attached instruction file to systematically fix build, TypeScript, and linting issues. Work through Stage 1 (Assessment), Stage 2 (Resolution), and Stage 3 (Verification) as documented. Use subagents where appropriate to avoid context pollution. Focus on production code over test code, and stop if you encounter complex architectural decisions that need discussion." < "$INSTRUCTION_FILE"

# Note: No final echo statements after exec because exec replaces the shell process
# The Claude Code process will handle all output from this point forward
# This ensures live output is shown during execution