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
# - Uses robust port-based process killing with npx kill-port
# - Each worktree runs independently with its own PID tracking
#
# PROCESS MANAGEMENT:
# - Uses npx kill-port for reliable port-based process cleanup
# - Handles orphaned processes that aren't tracked by PID files
# - Falls back gracefully when npx is not available
# - Always clears .next directory for fresh builds to avoid cache issues

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

kill_port_processes() {
    local port="$1"
    local description="$2"
    
    echo "🔄 Killing all processes on port $port ($description)"
    
    # Use npx kill-port for robust port-based process killing
    if npx kill-port "$port" 2>/dev/null; then
        echo "✅ Successfully cleared port $port"
        return 0
    else
        echo "⚠️  Failed to clear port $port using npx kill-port"
        echo "   This may indicate no processes were running on that port"
        return 1
    fi
}

clear_next_cache() {
    if [ -d ".next" ]; then
        echo "🧹 Clearing Next.js build cache (.next directory)"
        rm -rf .next
        echo "✅ Build cache cleared"
    else
        echo "ℹ️  No .next directory found to clear"
    fi
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
        PORT=$(get_port)
        
        # Try PID-based killing first if we have a daemon PID
        pid_killed=false
        if [ -n "$daemon_pid" ]; then
            if is_process_running "$daemon_pid"; then
                if kill_process_gracefully "$daemon_pid" "dev server daemon"; then
                    pid_killed=true
                else
                    echo "⚠️  PID-based killing failed, falling back to port-based cleanup"
                fi
            else
                echo "❌ Daemon not running (stale PID: $daemon_pid)"
                rm -f "$SYR_DEVSERVER_PIDFILE"
            fi
        fi
        
        # Always try port-based cleanup as well (catches orphaned processes)
        port_killed=false
        if [ -n "$PORT" ]; then
            if kill_port_processes "$PORT" "dev server on port $PORT"; then
                port_killed=true
            fi
        fi
        
        # Clean up files
        rm -f "$SYR_DEVSERVER_PIDFILE" "$LOCKFILE"
        
        # Determine success based on what we tried to kill
        if [ -n "$daemon_pid" ] && [ -n "$PORT" ]; then
            # Had both PID and port
            if [ "$pid_killed" = true ] || [ "$port_killed" = true ]; then
                echo "✅ Daemon stopped successfully"
                exit 0
            else
                echo "❌ Failed to stop daemon (both PID and port cleanup failed)"
                exit 1
            fi
        elif [ -n "$daemon_pid" ]; then
            # Only had PID
            if [ "$pid_killed" = true ]; then
                echo "✅ Daemon stopped successfully"
                exit 0
            else
                echo "❌ Failed to stop daemon"
                exit 1
            fi
        elif [ -n "$PORT" ]; then
            # Only had port
            if [ "$port_killed" = true ]; then
                echo "✅ Port $PORT cleared successfully"
                exit 0
            else
                echo "❌ No processes found on port $PORT"
                exit 1
            fi
        else
            echo "❌ No daemon PID or PORT found - nothing to stop"
            exit 1
        fi
        ;;
        
    "daemon")
        # Check for existing daemon
        cleanup_stale_files
        daemon_pid=$(get_daemon_pid)
        PORT=$(get_port)
        
        # Try quick restart first if daemon exists and is healthy
        if [ -n "$daemon_pid" ] && is_process_running "$daemon_pid"; then
            if [ -n "$PORT" ] && is_port_responding "$PORT"; then
                echo "🔄 Quick restarting healthy daemon (PID: $daemon_pid)"
                if kill_process_gracefully "$daemon_pid" "existing daemon"; then
                    rm -f "$SYR_DEVSERVER_PIDFILE" "$LOCKFILE"
                    # Skip port cleanup since daemon was healthy
                    echo "✅ Quick restart - skipping port cleanup"
                    skip_port_cleanup=true
                else
                    echo "⚠️  Quick restart failed, falling back to full cleanup"
                    skip_port_cleanup=false
                fi
            else
                echo "🔄 Restarting unhealthy daemon (PID: $daemon_pid)"
                kill_process_gracefully "$daemon_pid" "existing daemon"
                rm -f "$SYR_DEVSERVER_PIDFILE" "$LOCKFILE"
                skip_port_cleanup=false
            fi
        else
            skip_port_cleanup=false
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
        
        # Get port and clear any existing processes (if needed)
        if [ -z "$PORT" ]; then
            rm -f "$LOCKFILE"
            echo "❌ No PORT found in .env.local"
            echo "   Add PORT=xxxx to your .env.local file"
            exit 1
        fi
        
        # Clear port using robust npx kill-port (unless quick restart succeeded)
        if [ "$skip_port_cleanup" != true ]; then
            kill_port_processes "$PORT" "any existing processes"
        fi
        
        # Always clear Next.js build cache for fresh start
        clear_next_cache
        
        # Rotate log if needed
        rotate_log_if_needed
        
        # Start dev server in background
        echo "🚀 Starting dev server daemon on port $PORT"
        npm run db:types --silent && PATH="/opt/homebrew/bin:$PATH" dotenv -e .env.local -- next dev > dev.log 2>&1 &
        dev_server_pid=$!
        
        # Store PID and remove lock
        echo "$dev_server_pid" > "$SYR_DEVSERVER_PIDFILE"
        rm -f "$LOCKFILE"
        
        # Wait a moment and verify it started
        sleep 2
        if is_process_running "$dev_server_pid"; then
            echo "✅ Daemon started successfully (PID: $dev_server_pid) at $(date)"
            echo "   Use --status to check health, --stop to stop"
            exit 0
        else
            echo "❌ Daemon failed to start at $(date)"
            rm -f "$SYR_DEVSERVER_PIDFILE"
            exit 1
        fi
        ;;
        
    "normal")
        # Enhanced foreground mode for npm run dev
        PORT=$(get_port)
        
        echo "🚀 Starting dev server in foreground mode at $(date)"
        
        if [ -z "$PORT" ]; then
            echo "⚠️  No PORT found in .env.local - skipping process cleanup"
            echo "   To enable auto-restart, add PORT=xxxx to your .env.local file"
        else
            echo "🔄 Port: $PORT"
            # Use robust port-based process killing
            kill_port_processes "$PORT" "existing dev server"
        fi
        
        # Always clear Next.js build cache for fresh start
        clear_next_cache
        
        # Rotate log if needed
        rotate_log_if_needed
        
        # Set up trap to output timestamp when dev server exits
        trap 'echo "📅 Dev server finished at $(date)"' EXIT
        
        echo "🎯 Use npm run dev:daemon for background mode with PID tracking"
        echo "📋 Logs will be written to dev.log - use 'tail -f dev.log' to follow"
        echo ""
        
        # Run the original dev command in foreground
        npm run db:types --silent && PATH="/opt/homebrew/bin:$PATH" dotenv -e .env.local -- next dev > dev.log 2>&1
        ;;
esac