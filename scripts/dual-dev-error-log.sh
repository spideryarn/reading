#!/bin/bash

# Enhanced dual logging utility - writes to both dev.log and error.log
# with improved error detection, categorization, and performance
#
# Usage: 
#   command 2>&1 | ./scripts/dual-dev-error-log.sh
#   command | ./scripts/dual-dev-error-log.sh

# Configuration
readonly MAX_LOG_SIZE=${MAX_LOG_SIZE:-10485760}  # 10MB default
readonly LOG_RETENTION_LINES=${LOG_RETENTION_LINES:-2000}  # Keep more lines on rotation
readonly ERROR_LOG_CONTEXT_LINES=${ERROR_LOG_CONTEXT_LINES:-2}  # Lines of context around errors

# ANSI color codes for terminal output (when running interactively)
readonly RED='\033[0;31m'
readonly YELLOW='\033[0;33m'
readonly NC='\033[0m' # No Color

# --- Bash-4 associative array version (disabled for Bash 3 compatibility) ---
# The following block requires Bash 4+ (macOS ships Bash 3.2). If you run this
# script under a newer Bash you can uncomment it and remove the Bash-3 fallback
# that follows to regain the associative-array implementation.
# declare -A ERROR_PATTERNS=(
#     # Critical errors that need immediate attention
#     ["CRITICAL"]="(FATAL|Fatal|fatal|CRITICAL|Critical|critical|PANIC|Panic|panic|EMERGENCY|Emergency|emergency)"
#     
#     # Standard errors
#     ["ERROR"]="(ERROR|Error|error:|TypeError|ReferenceError|SyntaxError|RangeError|InternalError|EvalError|URIError|AggregateError)"
#     
#     # Exceptions and stack traces
#     ["EXCEPTION"]="(Exception|exception|Traceback|stack trace|Stack trace|at .+\(.*:[0-9]+:[0-9]+\)|^\s+at\s+)"
#     
#     # Warnings that might indicate issues
#     ["WARNING"]="(WARN|Warn|warn|WARNING|Warning|warning|CAUTION|Caution|caution|DEPRECATED|Deprecated|deprecated)"
#     
#     # Failed operations
#     ["FAILED"]="(FAIL|Fail|fail|FAILED|Failed|failed|FAILURE|Failure|failure|unsuccessful|Unsuccessful)"
#     
#     # Build/compile errors
#     ["BUILD"]="(Build error|build error|Compile error|compile error|Module build failed|Failed to compile|⨯|✗)"
#     
#     # Test failures
#     ["TEST"]="(FAIL\s+\w+\.test\.|Test failed|test failed|✕|●|FAIL\s+src/|FAIL\s+tests/)"
#     
#     # Network/connection errors
#     ["NETWORK"]="(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EHOSTUNREACH|ENETUNREACH|Connection refused|connection refused|timeout|Timeout)"
#     
#     # Database errors
#     ["DATABASE"]="(database error|Database error|DB error|db error|SQL error|sql error|constraint violation|duplicate key)"
#     
#     # Authentication/permission errors
#     ["AUTH"]="(unauthorized|Unauthorized|forbidden|Forbidden|401|403|Permission denied|permission denied|Access denied|access denied)"
# )
# 
# readonly COMBINED_PATTERN="(${ERROR_PATTERNS[CRITICAL]}|${ERROR_PATTERNS[ERROR]}|${ERROR_PATTERNS[EXCEPTION]}|${ERROR_PATTERNS[WARNING]}|${ERROR_PATTERNS[FAILED]}|${ERROR_PATTERNS[BUILD]}|${ERROR_PATTERNS[TEST]}|${ERROR_PATTERNS[NETWORK]}|${ERROR_PATTERNS[DATABASE]}|${ERROR_PATTERNS[AUTH]})"
# --- End Bash-4 block ---

# --- Bash-3 fallback implementation ---
# Pattern variables (one per category)
CRITICAL_PATTERN='(FATAL|Fatal|fatal|CRITICAL|Critical|critical|PANIC|Panic|panic|EMERGENCY|Emergency|emergency)'
ERROR_PATTERN='(ERROR|Error|error:|TypeError|ReferenceError|SyntaxError|RangeError|InternalError|EvalError|URIError|AggregateError)'
EXCEPTION_PATTERN='(Exception|exception|Traceback|stack trace|Stack trace|at .+\(.*:[0-9]+:[0-9]+\)|^\s+at\s+)'
WARNING_PATTERN='(WARN|Warn|warn|WARNING|Warning|warning|CAUTION|Caution|caution|DEPRECATED|Deprecated|deprecated)'
FAILED_PATTERN='(FAIL|Fail|fail|FAILED|Failed|failed|FAILURE|Failure|failure|unsuccessful|Unsuccessful)'
BUILD_PATTERN='(Build error|build error|Compile error|compile error|Module build failed|Failed to compile|⨯|✗)'
TEST_PATTERN='(FAIL\s+\w+\.test\.|Test failed|test failed|✕|●|FAIL\s+src/|FAIL\s+tests/)'
NETWORK_PATTERN='(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EHOSTUNREACH|ENETUNREACH|Connection refused|connection refused|timeout|Timeout)'
DATABASE_PATTERN='(database error|Database error|DB error|db error|SQL error|sql error|constraint violation|duplicate key)'
AUTH_PATTERN='(unauthorized|Unauthorized|forbidden|Forbidden|401|403|Permission denied|permission denied|Access denied|access denied)'

# Space-separated list of categories for iteration in Bash 3
ERROR_CATEGORIES="CRITICAL ERROR EXCEPTION WARNING FAILED BUILD TEST NETWORK DATABASE AUTH"

# Combined regex for quick matching
COMBINED_PATTERN="(${CRITICAL_PATTERN}|${ERROR_PATTERN}|${EXCEPTION_PATTERN}|${WARNING_PATTERN}|${FAILED_PATTERN}|${BUILD_PATTERN}|${TEST_PATTERN}|${NETWORK_PATTERN}|${DATABASE_PATTERN}|${AUTH_PATTERN})"
# --- End Bash-3 fallback ---

# Function to clear both log files
clear_logs() {
    > dev.log
    > error.log
    echo "🧹 Cleared dev.log and error.log at $(date)" | tee -a dev.log
}

# Function to rotate both log files if they get too large
rotate_logs_if_needed() {
    local max_size=${1:-$MAX_LOG_SIZE}
    
    # Rotate dev.log if needed
    if [ -f "dev.log" ] && [ $(wc -c < dev.log 2>/dev/null || echo 0) -gt $max_size ]; then
        echo "📋 Rotating large dev.log file (keeping last $LOG_RETENTION_LINES lines)" | tee -a dev.log error.log
        tail -n $LOG_RETENTION_LINES dev.log > dev.log.tmp && mv dev.log.tmp dev.log
    fi
    
    # Rotate error.log if needed  
    if [ -f "error.log" ] && [ $(wc -c < error.log 2>/dev/null || echo 0) -gt $max_size ]; then
        echo "📋 Rotating large error.log file (keeping last $LOG_RETENTION_LINES lines)" | tee -a dev.log error.log
        tail -n $LOG_RETENTION_LINES error.log > error.log.tmp && mv error.log.tmp error.log
    fi
}

# Bash-3 compatible categorize_error implementation
categorize_error() {
    local line="$1"
    for category in $ERROR_CATEGORIES; do
        local pattern_var="${category}_PATTERN"
        # Indirect expansion to get the pattern stored in the variable whose name is in $pattern_var
        local pattern="${!pattern_var}"
        if echo "$line" | grep -qE "$pattern" 2>/dev/null; then
            echo "$category"
            return
        fi
    done
    echo "UNKNOWN"
}

# Function to format error with timestamp and category
format_error() {
    local line="$1"
    local category="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$category] $line"
}

# Buffer for context lines
declare -a context_buffer=()
declare -i context_buffer_size=0

# Function to add line to context buffer
add_to_context_buffer() {
    local line="$1"
    
    # Add line to buffer
    context_buffer[context_buffer_size]="$line"
    ((context_buffer_size++))
    
    # Keep only the last N lines
    if [ $context_buffer_size -gt $ERROR_LOG_CONTEXT_LINES ]; then
        # Shift array elements
        for ((i=0; i<$ERROR_LOG_CONTEXT_LINES; i++)); do
            context_buffer[$i]="${context_buffer[$((i+1))]}"
        done
        context_buffer_size=$ERROR_LOG_CONTEXT_LINES
    fi
}

# Function to write context lines to error log
write_context_to_error_log() {
    local error_pipe="$1"
    
    if [ $context_buffer_size -gt 0 ] && [ $ERROR_LOG_CONTEXT_LINES -gt 0 ]; then
        echo "--- Context (previous $context_buffer_size lines) ---" > "$error_pipe"
        for ((i=0; i<$context_buffer_size; i++)); do
            echo "  ${context_buffer[$i]}" > "$error_pipe"
        done
        echo "--- End Context ---" > "$error_pipe"
    fi
}

# Main dual logging function with enhanced error detection
dual_log() {
    # Handle command line arguments
    case "${1:-}" in
        --clear-logs)
            clear_logs
            return 0
            ;;
        --rotate-logs)
            rotate_logs_if_needed "${2:-}"
            return 0
            ;;
        --help)
            echo "Enhanced dual logging utility for dev.log and error.log"
            echo "Usage: command 2>&1 | $0 [options]"
            echo "Options:"
            echo "  --clear-logs    Clear both log files"
            echo "  --rotate-logs   Rotate logs if they exceed size limit"
            echo "  --help          Show this help message"
            return 0
            ;;
    esac
    
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
    
    # Track if we're in an error block (for multi-line errors like stack traces)
    local in_error_block=false
    local lines_since_error=0
    local last_error_category=""
    
    # Main logging loop with enhanced error detection
    while IFS= read -r line; do
        # Always write to dev.log
        echo "$line" >> dev.log
        
        # Check if this line contains an error pattern
        if echo "$line" | grep -qE "$COMBINED_PATTERN" 2>/dev/null; then
            # Categorize the error
            local category=$(categorize_error "$line")
            last_error_category="$category"
            
            # Write context lines if enabled
            if [ $ERROR_LOG_CONTEXT_LINES -gt 0 ] && [ "$in_error_block" = false ]; then
                write_context_to_error_log "$error_pipe"
            fi
            
            # Format and write the error line
            local formatted_error=$(format_error "$line" "$category")
            echo "$formatted_error" > "$error_pipe"
            
            # Mark that we're in an error block
            in_error_block=true
            lines_since_error=0
            
            # Also output to terminal with color if interactive
            if [ -t 1 ]; then
                case "$category" in
                    CRITICAL|ERROR|EXCEPTION|FAILED|BUILD)
                        echo -e "${RED}${formatted_error}${NC}"
                        ;;
                    WARNING)
                        echo -e "${YELLOW}${formatted_error}${NC}"
                        ;;
                    *)
                        echo "$formatted_error"
                        ;;
                esac
            fi
        else
            # Check if we're in an error block and this might be a continuation
            if [ "$in_error_block" = true ]; then
                # Check for stack trace continuation patterns
                if echo "$line" | grep -qE "^(\s+at\s+|Caused by:|^\s+\.{3}|^\s+File\s+.*line\s+[0-9]+|^\s*\^|^\s*\||^\s+→)" 2>/dev/null; then
                    # This is likely a continuation of the error (stack trace, etc.)
                    echo "  $line" > "$error_pipe"
                    lines_since_error=0
                else
                    # Count lines since last error
                    ((lines_since_error++))
                    
                    # If we've seen enough non-error lines, exit error block
                    if [ $lines_since_error -gt 3 ]; then
                        in_error_block=false
                        last_error_category=""
                    else
                        # Still might be part of error context, include it
                        echo "  $line" > "$error_pipe"
                    fi
                fi
            fi
            
            # Add to context buffer for future errors
            add_to_context_buffer "$line"
        fi
        
        # Periodically check if logs need rotation (every 1000 lines)
        if (( SECONDS % 60 == 0 )); then
            rotate_logs_if_needed
        fi
    done
    
    # Cleanup
    kill $error_logger_pid 2>/dev/null || true
    rm -f "$error_pipe"
}

# Generate error summary report
generate_error_summary() {
    if [ ! -f "error.log" ]; then
        echo "No error.log file found"
        return 1
    fi
    
    echo "=== Error Log Summary ==="
    echo "Generated at: $(date)"
    echo ""
    
    # Count errors by category
    echo "Error counts by category:"
    for category in $ERROR_CATEGORIES; do
        local count=$(grep -c "\[$category\]" error.log 2>/dev/null || echo 0)
        if [ $count -gt 0 ]; then
            printf "  %-12s: %d\n" "$category" "$count"
        fi
    done
    echo ""
    
    # Recent errors (last 10)
    echo "Recent errors (last 10):"
    tail -n 50 error.log | grep -E "^\[.*\]\s+\[(CRITICAL|ERROR|EXCEPTION)\]" | tail -n 10
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
    export -f categorize_error
    export -f format_error
    export -f generate_error_summary
fi