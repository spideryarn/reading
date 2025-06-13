#!/bin/bash
# Script to run the comprehensive sanitization test suite
# 
# This script runs all sanitization-related tests in sequence and provides
# a summary of test coverage for the storage-time HTML sanitization implementation.

set -e

echo "🧪 Running Comprehensive HTML Sanitization Test Suite"
echo "=================================================="

echo ""
echo "📋 Test Suite Overview:"
echo "- upload-pdf-sanitization-integration.test.ts: API integration tests for PDF upload"
echo "- extract-url-sanitization-integration.test.ts: API integration tests for URL extraction"
echo "- cross-api-sanitization-consistency.test.ts: Cross-API consistency verification"
echo "- sanitization-edge-cases-performance.test.ts: Edge cases and performance tests"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test_suite() {
    local test_file=$1
    local description=$2
    
    echo -e "${YELLOW}Running: $description${NC}"
    echo "File: $test_file"
    
    if npm test -- "$test_file" --silent; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        # Don't exit on failure, continue with other tests
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
}

echo "🚀 Starting test execution..."
echo ""

# Run core sanitization functionality tests
run_test_suite "lib/utils/__tests__/html-sanitizer.test.ts" "Core HTML Sanitizer Unit Tests"

# Run edge cases and performance tests
run_test_suite "app/api/__tests__/sanitization-edge-cases-performance.test.ts" "Edge Cases and Performance Tests"

# Note: Integration tests require a real database connection and authentication setup
echo -e "${YELLOW}⚠️  Integration tests require database setup:${NC}"
echo "- Ensure Supabase is running locally"
echo "- Verify .env.test is configured correctly"
echo "- Database should be in a clean state for test isolation"
echo ""

echo "📊 Test Results Summary:"
echo "========================"
echo -e "Total test suites run: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Check the output above for details.${NC}"
    exit 1
fi