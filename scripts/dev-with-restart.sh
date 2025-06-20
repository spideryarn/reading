#!/bin/bash

# Enhanced dev server script with daemon mode support for AI-first development
# 
# USAGE:
#   ./scripts/dev-with-restart.sh           # Normal mode (foreground, used by npm run dev)
#   ./scripts/dev-with-restart.sh --daemon  # Daemon mode (background with PID tracking)
#   ./scripts/dev-with-restart.sh --stop    # Stop daemon
#   ./scripts/dev-with-restart.sh --status  # Check daemon status
#
# DAEMON MODE:
# - Starts dev server in background for LLM agent automation
# - Stores PID in environment variable SYR_DEVSERVER_PIDFILE
# - Includes health checking beyond just PID existence
# - Graceful shutdown with SIGTERM before SIGKILL
#
# WORKTREE SUPPORT:
# - Automatically detects PORT from .env.local for multi-worktree development
# - Uses existing port conflict resolution logic
# - Each worktree runs independently with its own PID tracking

set -e  # Exit on any error

# Configuration
SYR_DEVSERVER_PIDFILE="${SYR_DEVSERVER_PIDFILE:-.dev-server.pid}"
LOCKFILE=".dev-server.lock"
MAX_LOG_SIZE=10485760  # 10MB

# Parse command line arguments
MODE="normal"
case "${1:-}" in
    --daemon)
        MODE="daemon"
        ;;
    --stop)
        MODE="stop"
        ;;
    --status)
        MODE="status"
        ;;
    "")
        MODE="normal"
        ;;
    *)
        echo "❌ Unknown argument: $1"
        echo "Usage: $0 [--daemon|--stop|--status]"
        exit 1
        ;;
esac

# Helper functions
get_port() {
    if [ -f ".env.local" ]; then
        grep '^PORT=' .env.local 2>/dev/null | cut -d'=' -f2 | tr -d ' ' || echo ""
    else
        echo ""
    fi
}

is_process_running() {
    local pid="$1"
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

is_port_responding() {
    local port="$1"
    [ -n "$port" ] && curl -f "http://localhost:$port/" >/dev/null 2>&1
}

get_daemon_pid() {
    if [ -f "$SYR_DEVSERVER_PIDFILE" ]; then
        cat "$SYR_DEVSERVER_PIDFILE" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

cleanup_stale_files() {
    # Remove stale PID file if process not running
    local pid="$(get_daemon_pid)"
    if [ -n "$pid" ] && ! is_process_running "$pid"; then
        rm -f "$SYR_DEVSERVER_PIDFILE"
    fi
    
    # Remove stale lock file
    if [ -f "$LOCKFILE" ]; then
        local lock_pid=$(cat "$LOCKFILE" 2>/dev/null || echo "")
        if [ -z "$lock_pid" ] || ! is_process_running "$lock_pid"; then
            rm -f "$LOCKFILE"
        fi
    fi
}

kill_process_gracefully() {
    local pid="$1"
    local description="$2"
    
    echo "🔄 Stopping $description (PID: $pid)"
    
    # Try SIGTERM first (graceful shutdown)
    if kill -TERM "$pid" 2>/dev/null; then
        echo "   Sent SIGTERM, waiting for graceful shutdown..."
        
        # Wait up to 5 seconds for graceful shutdown
        for i in {1..5}; do
            if ! is_process_running "$pid"; then
                echo "✅ $description stopped gracefully"
                return 0
            fi
            sleep 1
        done
        
        echo "   Graceful shutdown timed out, forcing kill..."
        if kill -KILL "$pid" 2>/dev/null; then
            sleep 1
            if ! is_process_running "$pid"; then
                echo "✅ $description force-killed"
                return 0
            fi
        fi
    fi
    
    echo "⚠️  Failed to kill $description (PID: $pid)"
    return 1
}

rotate_log_if_needed() {
    # Rotate dev.log if it gets too large (for daemon mode)
    if [ -f "dev.log" ] && [ $(wc -c < dev.log 2>/dev/null || echo 0) -gt $MAX_LOG_SIZE ]; then
        echo "📋 Rotating large dev.log file"
        tail -n 1000 dev.log > dev.log.tmp && mv dev.log.tmp dev.log
    fi
}

# Main logic based on mode
case "$MODE" in
    "status")
        PORT=$(get_port)
        daemon_pid=$(get_daemon_pid)
        
        if [ -z "$daemon_pid" ]; then
            echo "❌ No daemon running (no PID file)"
            exit 1
        fi
        
        if ! is_process_running "$daemon_pid"; then
            echo "❌ Daemon not running (stale PID: $daemon_pid)"
            rm -f "$SYR_DEVSERVER_PIDFILE"
            exit 1
        fi
        
        if [ -n "$PORT" ] && is_port_responding "$PORT"; then
            echo "✅ Daemon running and healthy (PID: $daemon_pid, Port: $PORT)"
            exit 0
        else
            echo "⚠️  Daemon running but not responding (PID: $daemon_pid, Port: ${PORT:-unknown})"
            exit 1
        fi
        ;;
        
    "stop")
        cleanup_stale_files
        daemon_pid=$(get_daemon_pid)
        
        if [ -z "$daemon_pid" ]; then
            echo "❌ No daemon to stop"
            exit 1
        fi
        
        if ! is_process_running "$daemon_pid"; then
            echo "❌ Daemon not running (stale PID)"
            rm -f "$SYR_DEVSERVER_PIDFILE"
            exit 1
        fi
        
        if kill_process_gracefully "$daemon_pid" "dev server daemon"; then
            rm -f "$SYR_DEVSERVER_PIDFILE" "$LOCKFILE"
            echo "✅ Daemon stopped successfully"
            exit 0
        else
            echo "❌ Failed to stop daemon"
            exit 1
        fi
        ;;
        
    "daemon")
        # Check for existing daemon
        cleanup_stale_files
        daemon_pid=$(get_daemon_pid)
        
        if [ -n "$daemon_pid" ] && is_process_running "$daemon_pid"; then
            echo "🔄 Restarting existing daemon (PID: $daemon_pid)"
            kill_process_gracefully "$daemon_pid" "existing daemon"
            rm -f "$SYR_DEVSERVER_PIDFILE" "$LOCKFILE"
        fi
        
        # Prevent multiple daemon instances
        if [ -f "$LOCKFILE" ]; then
            lock_pid=$(cat "$LOCKFILE" 2>/dev/null || echo "")
            if [ -n "$lock_pid" ] && is_process_running "$lock_pid"; then
                echo "❌ Another daemon startup in progress (PID: $lock_pid)"
                exit 1
            fi
            rm -f "$LOCKFILE"
        fi
        
        # Create lock file
        echo $$ > "$LOCKFILE"
        
        # Get port and clear any existing processes
        PORT=$(get_port)
        if [ -z "$PORT" ]; then
            rm -f "$LOCKFILE"
            echo "❌ No PORT found in .env.local"
            echo "   Add PORT=xxxx to your .env.local file"
            exit 1
        fi
        
        # Clear port using existing logic
        if existing_pid=$(lsof -ti:$PORT 2>/dev/null); then
            echo "🔄 Found existing process on port $PORT (PID: $existing_pid)"
            kill_process_gracefully "$existing_pid" "process on port $PORT"
        fi
        
        # Rotate log if needed
        rotate_log_if_needed
        
        # Start dev server in background
        echo "🚀 Starting dev server daemon on port $PORT"
        npm run db:types --silent && PATH="/opt/homebrew/bin:$PATH" dotenv -e .env.local -- next dev --turbopack > dev.log 2>&1 &
        dev_server_pid=$!
        
        # Store PID and remove lock
        echo "$dev_server_pid" > "$SYR_DEVSERVER_PIDFILE"
        rm -f "$LOCKFILE"
        
        # Wait a moment and verify it started
        sleep 2
        if is_process_running "$dev_server_pid"; then
            echo "✅ Daemon started successfully (PID: $dev_server_pid)"
            echo "   Use --status to check health, --stop to stop"
            exit 0
        else
            echo "❌ Daemon failed to start"
            rm -f "$SYR_DEVSERVER_PIDFILE"
            exit 1
        fi
        ;;
        
    "normal")
        # Original behavior - foreground mode for npm run dev
        PORT=$(get_port)
        
        if [ -z "$PORT" ]; then
            echo "⚠️  No PORT found in .env.local - skipping process cleanup"
            echo "   To enable auto-restart, add PORT=xxxx to your .env.local file"
        else
            # Try to find and kill any process using this port
            if existing_pid=$(lsof -ti:$PORT 2>/dev/null); then
                echo "🔄 Killing existing dev server on port $PORT (PID: $existing_pid)"
                if kill "$existing_pid" 2>/dev/null; then
                    # Give it a moment to shut down gracefully
                    sleep 1
                    # Double-check it's gone
                    if lsof -ti:$PORT >/dev/null 2>&1; then
                        echo "⚠️  Failed to kill process on port $PORT. Please kill manually: kill $existing_pid"
                        exit 1
                    else
                        echo "✅ Successfully cleared port $PORT"
                    fi
                else
                    echo "⚠️  Failed to kill process $existing_pid on port $PORT (permission denied?)"
                    echo "   Please kill manually: kill $existing_pid"
                    exit 1
                fi
            fi
        fi
        
        # Run the original dev command in foreground
        npm run db:types --silent && PATH="/opt/homebrew/bin:$PATH" dotenv -e .env.local -- next dev --turbopack > dev.log 2>&1
        ;;
esac