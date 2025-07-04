#!/bin/bash

# Enhanced dev server script with daemon mode support for AI-first development
# 
# USAGE:
#   ./scripts/dev-with-restart.sh                    # Normal mode (foreground, used by npm run dev)
#   ./scripts/dev-with-restart.sh --daemon           # Daemon mode (background with PID tracking)
#   ./scripts/dev-with-restart.sh --stop             # Stop daemon
#   ./scripts/dev-with-restart.sh --status           # Check daemon status
#   ./scripts/dev-with-restart.sh --clean            # Clean build (clear .next + force db:types)
#   ./scripts/dev-with-restart.sh --force-types      # Force database type regeneration only
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
# - Preserves .next directory by default (use --clean to clear)
# - Conditionally regenerates database types based on migration changes

set -e  # Exit on any error

# Configuration
SYR_DEVSERVER_PIDFILE="${SYR_DEVSERVER_PIDFILE:-.dev-server.pid}"
LOCKFILE=".dev-server.lock"
MAX_LOG_SIZE=10485760  # 10MB

# Parse command line arguments
MODE="normal"
FORCE_TYPES=false
CLEAN_BUILD=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --daemon)
            MODE="daemon"
            shift
            ;;
        --stop)
            MODE="stop"
            shift
            ;;
        --status)
            MODE="status"
            shift
            ;;
        --force-types)
            FORCE_TYPES=true
            shift
            ;;
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        *)
            echo "❌ Unknown argument: $1"
            echo "Usage: $0 [--daemon|--stop|--status] [--force-types] [--clean]"
            echo "  --daemon      Start dev server in background mode"
            echo "  --stop        Stop background daemon"
            echo "  --status      Check daemon status"
            echo "  --force-types Force regeneration of database types"
            echo "  --clean       Clear .next cache and regenerate database types"
            exit 1
            ;;
    esac
done

# Handle empty arguments case
if [ -z "$MODE" ]; then
    MODE="normal"
fi

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

should_regenerate_types() {
    # Check if we should regenerate database types
    # Returns 0 (true) if regeneration needed, 1 (false) otherwise
    
    local types_file="lib/types/database-auto-generated.ts"
    local migrations_dir="supabase/migrations"
    
    # Force regeneration if requested or clean build
    if [ "$FORCE_TYPES" = true ] || [ "$CLEAN_BUILD" = true ]; then
        return 0
    fi
    
    # If types file doesn't exist, regenerate
    if [ ! -f "$types_file" ]; then
        echo "ℹ️  Database types file not found, will regenerate"
        return 0
    fi
    
    # Check if any migration files are newer than the types file
    if [ -d "$migrations_dir" ]; then
        # Find any migration files newer than the types file
        local newer_files=$(find "$migrations_dir" -type f -name "*.sql" -newer "$types_file" 2>/dev/null | head -n 1)
        
        if [ -n "$newer_files" ]; then
            echo "ℹ️  Found newer migration files, will regenerate types"
            return 0
        fi
    fi
    
    # No regeneration needed
    return 1
}

check_stale_types() {
    # Check for stale database types and fail fast if found
    # Skip this check if --clean is used since it regenerates anyway
    if [ "$CLEAN_BUILD" = true ]; then
        return 0
    fi
    
    local types_file="lib/types/database-auto-generated.ts"
    local migrations_dir="supabase/migrations"
    
    # If types file doesn't exist, that's a problem
    if [ ! -f "$types_file" ]; then
        echo "❌ ERROR: Database types file not found!"
        echo ""
        echo "   Missing file: $types_file"
        echo ""
        echo "   This will cause TypeScript compilation errors."
        echo ""
        echo "   To fix this, run one of:"
        echo "     npm run dev:clean    # Regenerate types and clear cache"
        echo "     npm run db:types     # Just regenerate types"
        echo ""
        return 1
    fi
    
    # Check if any migration files are newer than the types file
    if [ -d "$migrations_dir" ]; then
        local newer_files=$(find "$migrations_dir" -type f -name "*.sql" -newer "$types_file" 2>/dev/null)
        
        if [ -n "$newer_files" ]; then
            echo "❌ ERROR: Database types are stale!"
            echo ""
            echo "   Generated types: $types_file"
            echo "   Last updated:    $(stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S' "$types_file" 2>/dev/null || date -r "$types_file" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'unknown')"
            echo ""
            echo "   Newer migration files found:"
            echo "$newer_files" | while read -r file; do
                echo "     - $file ($(stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S' "$file" 2>/dev/null || date -r "$file" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'unknown'))"
            done
            echo ""
            echo "   This will cause type mismatches and compilation errors."
            echo ""
            echo "   To fix this, run one of:"
            echo "     npm run dev:clean    # Regenerate types and clear cache"
            echo "     npm run db:types     # Just regenerate types"
            echo ""
            return 1
        fi
    fi
    
    return 0
}

check_stale_cache() {
    # Check for potentially stale .next cache and fail fast if found
    # Skip this check if --clean is used since it clears cache anyway
    if [ "$CLEAN_BUILD" = true ]; then
        return 0
    fi
    
    # Only check if .next directory exists
    if [ ! -d ".next" ]; then
        return 0
    fi
    
    local package_json="package.json"
    local package_lock="package-lock.json"
    local next_cache=".next"
    
    # Check if package.json or package-lock.json are newer than .next directory
    local cache_stale=false
    local stale_reason=""
    
    if [ -f "$package_json" ] && [ "$package_json" -nt "$next_cache" ]; then
        cache_stale=true
        stale_reason="package.json has been modified"
        local package_time=$(stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S' "$package_json" 2>/dev/null || date -r "$package_json" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'unknown')
    fi
    
    if [ -f "$package_lock" ] && [ "$package_lock" -nt "$next_cache" ]; then
        cache_stale=true
        if [ -n "$stale_reason" ]; then
            stale_reason="$stale_reason and package-lock.json has been modified"
        else
            stale_reason="package-lock.json has been modified"
        fi
        local lock_time=$(stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S' "$package_lock" 2>/dev/null || date -r "$package_lock" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'unknown')
    fi
    
    if [ "$cache_stale" = true ]; then
        echo "❌ ERROR: Next.js cache is potentially stale!"
        echo ""
        echo "   Cache directory: $next_cache"
        echo "   Last updated:    $(stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S' "$next_cache" 2>/dev/null || date -r "$next_cache" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'unknown')"
        echo ""
        echo "   Problem: $stale_reason"
        if [ -n "$package_time" ]; then
            echo "   package.json:    $package_time"
        fi
        if [ -n "$lock_time" ]; then
            echo "   package-lock.json: $lock_time"
        fi
        echo ""
        echo "   This can cause 'module not found' errors and other issues."
        echo ""
        echo "   To fix this, run:"
        echo "     npm run dev:clean    # Clear cache and regenerate types"
        echo ""
        return 1
    fi
    
    return 0
}

regenerate_types_if_needed() {
    if should_regenerate_types; then
        echo "🔄 Regenerating database types"
        if npm run db:types --silent; then
            echo "✅ Database types regenerated successfully"
        else
            echo "❌ Failed to regenerate database types"
            return 1
        fi
    else
        echo "✅ Database types are up to date, skipping regeneration"
    fi
    return 0
}

clear_logs() {
    # Clear both dev.log and error.log for fresh start
    echo "🧹 Clearing log files at $(date)"
    > dev.log
    > error.log
    echo "🧹 Cleared dev.log and error.log at $(date)" | tee -a dev.log
}

rotate_logs_if_needed() {
    # Use the dual-log utility for rotation
    ./scripts/dual-dev-error-log.sh --rotate-logs $MAX_LOG_SIZE
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
        # Perform fail-fast checks before starting daemon
        if ! check_stale_types; then
            exit 1
        fi
        
        if ! check_stale_cache; then
            exit 1
        fi
        
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
        
        # Clear Next.js build cache if requested or always for clean build
        if [ "$CLEAN_BUILD" = true ]; then
            clear_next_cache
        else
            echo "ℹ️  Preserving .next directory (use --clean to clear)"
        fi
        
        # Clear and rotate logs
        clear_logs
        rotate_logs_if_needed
        
        # Regenerate types if needed
        if ! regenerate_types_if_needed; then
            rm -f "$LOCKFILE" "$SYR_DEVSERVER_PIDFILE"
            exit 1
        fi
        
        # Start dev server in background with dual logging
        echo "🚀 Starting dev server daemon on port $PORT"
        (
            PATH="/opt/homebrew/bin:$PATH" dotenv -e .env.local -- next dev 2>&1 | ./scripts/dual-dev-error-log.sh
        ) &
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
        # Perform fail-fast checks before starting dev server
        if ! check_stale_types; then
            exit 1
        fi
        
        if ! check_stale_cache; then
            exit 1
        fi
        
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
        
        # Clear Next.js build cache if requested
        if [ "$CLEAN_BUILD" = true ]; then
            clear_next_cache
        else
            echo "ℹ️  Preserving .next directory (use --clean to clear)"
        fi
        
        # Clear and rotate logs
        clear_logs
        rotate_logs_if_needed
        
        # Regenerate types if needed
        if ! regenerate_types_if_needed; then
            exit 1
        fi
        
        # Set up trap to output timestamp when dev server exits
        trap 'echo "📅 Dev server finished at $(date)"' EXIT
        
        echo "🎯 Use npm run dev:daemon for background mode with PID tracking"
        echo "📋 Logs will be written to dev.log and error.log - use 'tail -f dev.log' or 'tail -f error.log' to follow"
        echo ""
        
        # Run the dev command with dual logging in foreground
        PATH="/opt/homebrew/bin:$PATH" dotenv -e .env.local -- next dev 2>&1 | ./scripts/dual-dev-error-log.sh
        ;;
esac