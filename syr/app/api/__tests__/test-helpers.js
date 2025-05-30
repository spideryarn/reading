// @ts-nocheck
const { NextRequest } = require('next/server');

// Helper to create NextRequest instances for testing
function createMockRequest(url, options = {}) {
  let body = options.body;
  
  // Convert body to proper format if it's not already a string
  if (body && typeof body !== 'string') {
    body = JSON.stringify(body);
  }
  
  // Create a proper Request object
  const request = new Request(url, {
    method: options.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...options.headers
    },
    body: body
  });
  
  // Return as NextRequest
  return new NextRequest(request);
}

module.exports = { createMockRequest };