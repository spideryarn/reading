#!/bin/bash

# Script to safely restart the Next.js dev server by killing any existing process on the port
# Used by npm run dev to handle multi-worktree development where ports may conflict

set -e  # Exit on any error

# Read PORT from .env.local
if [ -f ".env.local" ]; then
    PORT=$(grep '^PORT=' .env.local 2>/dev/null | cut -d'=' -f2 | tr -d ' ' || echo "")
else
    PORT=""
fi

if [ -z "$PORT" ]; then
    echo "⚠️  No PORT found in .env.local - skipping process cleanup"
    echo "   To enable auto-restart, add PORT=xxxx to your .env.local file"
else
    # Try to find and kill any process using this port
    if PID=$(lsof -ti:$PORT 2>/dev/null); then
        echo "🔄 Killing existing dev server on port $PORT (PID: $PID)"
        if kill $PID 2>/dev/null; then
            # Give it a moment to shut down gracefully
            sleep 1
            # Double-check it's gone
            if lsof -ti:$PORT >/dev/null 2>&1; then
                echo "⚠️  Failed to kill process on port $PORT. Please kill manually: kill $PID"
                exit 1
            else
                echo "✅ Successfully cleared port $PORT"
            fi
        else
            echo "⚠️  Failed to kill process $PID on port $PORT (permission denied?)"
            echo "   Please kill manually: kill $PID"
            exit 1
        fi
    fi
fi

# Run the original dev command
npm run db:types --silent && PATH="/opt/homebrew/bin:$PATH" dotenv -e .env.local -- next dev --turbopack > dev.log 2>&1