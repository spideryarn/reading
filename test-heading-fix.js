// Test script to verify the AI headings fix
// Run this in the browser console to check if the issue is resolved

console.log('=== Testing AI Headings Fix ===');

// Check if multiple API calls are being made
const originalFetch = window.fetch;
let headingApiCalls = 0;

window.fetch = function(...args) {
  const url = args[0];
  if (url && url.includes('/api/headings')) {
    headingApiCalls++;
    console.log(`[${new Date().toISOString()}] API call #${headingApiCalls} to:`, url);
    console.trace('Call stack');
  }
  return originalFetch.apply(this, args);
};

console.log('Fetch interceptor installed. Now switch to the AI-generated tab to test.');
console.log('Expected: Only 1 API call should be made when the tab is first opened.');

// Reset counter after 10 seconds
setTimeout(() => {
  console.log(`\n=== Test Results ===`);
  console.log(`Total /api/headings API calls: ${headingApiCalls}`);
  if (headingApiCalls === 0) {
    console.log('✅ No API calls made (cached headings were used)');
  } else if (headingApiCalls === 1) {
    console.log('✅ Only 1 API call made (correct behavior)');
  } else {
    console.log(`❌ ${headingApiCalls} API calls made (should be 0 or 1)`);
  }
  
  // Restore original fetch
  window.fetch = originalFetch;
  console.log('\nFetch interceptor removed.');
}, 10000);