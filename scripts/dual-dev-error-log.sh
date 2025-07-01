#!/bin/bash

# Dual logging utility - writes to both dev.log and error.log
# Errors (stderr) go to both files, stdout only goes to dev.log
#
# Usage: 
#   command 2>&1 | ./scripts/dual-log.sh
#   command | ./scripts/dual-log.sh

# Function to clear both log files
clear_logs() {
    > dev.log
    > error.log
    echo "🧹 Cleared dev.log and error.log at $(date)" | tee -a dev.log
}

# Function to rotate both log files if they get too large
rotate_logs_if_needed() {
    local max_size=${1:-10485760}  # 10MB default
    
    # Rotate dev.log if needed
    if [ -f "dev.log" ] && [ $(wc -c < dev.log 2>/dev/null || echo 0) -gt $max_size ]; then
        echo "📋 Rotating large dev.log file" | tee -a dev.log error.log
        tail -n 1000 dev.log > dev.log.tmp && mv dev.log.tmp dev.log
    fi
    
    # Rotate error.log if needed  
    if [ -f "error.log" ] && [ $(wc -c < error.log 2>/dev/null || echo 0) -gt $max_size ]; then
        echo "📋 Rotating large error.log file" | tee -a dev.log error.log
        tail -n 1000 error.log > error.log.tmp && mv error.log.tmp error.log
    fi
}

# Main dual logging function
dual_log() {
    # If this script is called with --clear-logs argument
    if [ "${1:-}" = "--clear-logs" ]; then
        clear_logs
        return 0
    fi
    
    # If this script is called with --rotate-logs argument
    if [ "${1:-}" = "--rotate-logs" ]; then
        rotate_logs_if_needed "${2:-}"
        return 0
    fi
    
    # Create a named pipe for error detection
    local error_pipe=$(mktemp -u)
    mkfifo "$error_pipe"
    
    # Start background process to handle error logging
    (
        while IFS= read -r line; do
            echo "$line" >> error.log
        done < "$error_pipe"
    ) &
    local error_logger_pid=$!
    
    # Main logging loop
    while IFS= read -r line; do
        # Always write to dev.log
        echo "$line" >> dev.log
        
        # Detect error patterns and also write to error.log
        if echo "$line" | grep -qE "(ERROR|Error|error|WARN|Warning|warning|FAIL|Failed|failed|Exception|exception)" 2>/dev/null; then
            echo "$line" > "$error_pipe"
        fi
    done
    
    # Cleanup
    kill $error_logger_pid 2>/dev/null || true
    rm -f "$error_pipe"
}

# Export functions for use in other scripts
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # Script is being executed directly
    dual_log "$@"
else
    # Script is being sourced
    export -f clear_logs
    export -f rotate_logs_if_needed
    export -f dual_log
fi