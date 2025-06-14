# Testing Troubleshooting

This document covers known issues, workarounds, and debugging strategies for testing in the Spideryarn Reading project.

## See also

- `docs/reference/TESTING_OVERVIEW.md` - Main testing guide with philosophy and basic usage
- `docs/reference/TESTING_SETUP.md` - Configuration and environment setup
- `docs/reference/TESTING_DATABASE.md` - Database-specific testing patterns
- `planning/250608a_test_infrastructure_cleanup.md` - Detailed improvement plan for test infrastructure
- `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` - Test maintenance procedures

## Current Test Health

**Status**: ~71% pass rate with critical infrastructure issues requiring attention ⚠️

**Primary Issues**:
- NextRequest mocking conflicts preventing API route testing
- Some authentication test instability
- LLM API cost prevention measures need verification

## NextRequest Mocking Infrastructure Issues

### Issue Description

**Critical Infrastructure Problem**: The current Jest setup has broken NextRequest mocking that blocks API route testing.

**Root Cause**: Custom Request mock in `jest.setup.js` conflicts with NextRequest's read-only properties:
```javascript
// Broken implementation in jest.setup.js
global.Request = class Request {
  constructor(input, init = {}) {
    this.url = input;  // ← Error: Cannot set read-only property
  }
}
```

**Symptoms:**
- `TypeError: Cannot set property url of #<NextRequest> which has only a getter`
- API route tests fail when run together
- Individual test files may pass but full suite fails
- Test helper utilities in `app/api/__tests__/test-helpers.ts` also affected

### Recommended Solution

**Use `next-test-api-route-handler`** (see `planning/250608a_test_infrastructure_cleanup.md`):

```bash
npm install --save-dev next-test-api-route-handler
```

This package is specifically designed for Next.js App Router API testing and solves the NextRequest mocking complexity.

**Alternative: Enhanced Request/Response Mocking**:
```javascript
// Alternative pattern for API route testing
import { NextRequest, NextResponse } from 'next/server'

// Mock NextRequest properly for API routes
const createMockRequest = (url: string, options: RequestInit = {}) => {
  return new NextRequest(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
}

// Test API route handlers
it('should handle API route correctly', async () => {
  const request = createMockRequest('http://localhost:3000/api/test', {
    method: 'POST',
    body: JSON.stringify({ data: 'test' }),
  })
  
  const response = await POST(request)
  expect(response.status).toBe(200)
})
```

### Current Workaround

**Run tests individually when debugging API routes:**

```bash
# Run specific test file
npm test app/api/__tests__/chat.test.ts

# Run multiple specific files
npm test app/api/__tests__/chat.test.ts app/api/__tests__/summarise.test.ts
```

## LLM API Cost Prevention

**Critical**: Ensure all LLM API calls are mocked in tests to prevent cost explosion during test runs.

### Verification Steps

1. **Check mock files exist**:
   ```bash
   ls __mocks__/@ai-sdk/
   ```

2. **Verify mocking setup**:
   ```javascript
   // __mocks__/@ai-sdk/anthropic.js
   export const anthropic = {
     chat: jest.fn().mockResolvedValue({
       content: [{ type: 'text', text: 'Mocked response' }],
       usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
     })
   };
   ```

3. **Test mock effectiveness**:
   ```bash
   # Run tests and check for actual API calls
   npm test -- --verbose
   ```

### Warning Signs
- Tests making actual network requests
- Unexpected latency in test runs
- API usage showing up in Anthropic dashboard during testing

## Supabase + Jest ESM Module Issues

### Issue Description

**Problem**: Jest encounters "Cannot use import statement outside a module" errors when running tests that import Supabase packages.

**Root Cause**: Supabase's `@supabase/realtime-js` and related packages use ESM (ES Modules) imports, but Jest by default runs in CommonJS mode. This creates a module format mismatch.

**Common Error Messages**:
```
Cannot use import statement outside a module
SyntaxError: Unexpected token 'export'
Module parse failed: Unexpected token
```

### Solution: Async Jest Configuration

**Fixed Configuration Pattern** (`jest.config.js`):
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

// Use async configuration for proper ESM handling
module.exports = async () => ({
  ...(await createJestConfig(customJestConfig)()),
  
  // Transform ESM packages to CommonJS for Jest compatibility
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|@supabase/.*|@assistant-ui|cheerio|nanoid|htmlparser2|domhandler|domutils|dom-serializer|entities|parse5|parse5-htmlparser2-tree-adapter|@assistant-ui/react-markdown|slug)/)'
  ]
})
```

### Key Configuration Elements

1. **Async Configuration**: Export an async function instead of a plain object
2. **transformIgnorePatterns**: Tell Jest to transform specific ESM packages
3. **Package List**: Include all Supabase and related ESM packages

### Packages Requiring ESM Transform

**Supabase packages**:
- `@supabase/*` - All Supabase packages
- `@supabase/realtime-js` - Main culprit for ESM errors

**Related ESM packages**:
- `cheerio` - HTML parsing (used by our HTML processing)
- `nanoid` - ID generation
- HTML parsing utilities: `htmlparser2`, `domhandler`, `domutils`, etc.

### Testing the Fix

**Verify configuration works**:
```bash
# Run full test suite
npm test

# Run specific Supabase-dependent tests
npm test lib/services/database/
npm test lib/services/__tests__/html-document-processor.test.ts
```

**No more ESM errors**: Tests should run without "Cannot use import statement" errors.

## Database Testing Issues

### Common Problems

1. **Missing `.env.test` file**:
   ```bash
   cp .env.local .env.test
   ```

2. **Supabase connection failures**:
   - Verify Supabase instance is running
   - Check environment variables are correctly loaded
   - Ensure test database permissions

3. **ESM module errors** (now fixed with async Jest configuration above)

4. **Test data pollution**:
   - Consider using separate test database
   - Implement proper test cleanup procedures

## Test Debugging Strategies

### Individual Test Debugging

```bash
# Run single test file with verbose output
npm test -- --testPathPattern=specific-test --verbose

# Run tests in watch mode for rapid iteration
npm run test:watch
```

### Coverage Analysis

```bash
# Generate coverage report
npm run test:coverage

# Open coverage report in browser
open coverage/lcov-report/index.html
```

### Common Test Failure Patterns

1. **Import path issues**: Check module resolution in `jest.config.js`
2. **Environment variable missing**: Verify `.env.test` setup
3. **Async operation timing**: Add proper async/await handling
4. **Mock not applying**: Check mock file location and import paths

## Performance Issues

### Slow Test Runs

**Symptoms**: Tests taking longer than expected
**Solutions**:
- Verify all external API calls are mocked
- Check for unnecessary database operations
- Use Jest's `--maxWorkers` option to limit parallelism

### Memory Issues

**Symptoms**: Jest running out of memory on large test suites
**Solutions**:
- Use `--forceExit` flag if needed
- Implement proper test cleanup
- Consider splitting large test files

## Getting Help

### Debugging Test Failures

1. **Run individual tests** to isolate issues
2. **Check logs** for specific error messages
3. **Verify environment setup** matches requirements
4. **Review recent changes** that might have broken tests

### When to Seek Help

- Infrastructure issues affecting multiple test files
- Mysterious failures that don't reproduce consistently  
- Performance degradation across the test suite
- Questions about testing patterns and best practices