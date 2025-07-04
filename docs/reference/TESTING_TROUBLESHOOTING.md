# Testing Troubleshooting

This document covers known issues, workarounds, and debugging strategies for testing in the Spideryarn Reading project.

## See also

- `docs/reference/TESTING_OVERVIEW.md` - Main testing guide with philosophy and basic usage
- `docs/reference/TESTING_SETUP.md` - Configuration and environment setup
- `docs/reference/TESTING_DATABASE.md` - Database-specific testing patterns
- `docs/planning/250608a_test_infrastructure_cleanup.md` - Detailed improvement plan for test infrastructure
- `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` - Test maintenance procedures

## Current Test Health

**Status**: Test infrastructure issues resolved ✅ All API route tests working correctly

**Resolved Issues**:
- ✅ NextRequest mocking infrastructure completely fixed
- ✅ All 13 high-priority API route tests now working

**Remaining Areas**:
- Some authentication test instability
- LLM API cost prevention measures need verification

## NextRequest Mocking Infrastructure Issues

### Issue Status: ✅ RESOLVED

**Previous Problem**: The Jest setup had broken NextRequest mocking that blocked API route testing. This issue has been **completely resolved**.

**What Was Fixed**: 
- Removed broken custom Request mock from `jest.setup.js` that conflicted with NextRequest's read-only properties
- Implemented proper API route testing using `next-test-api-route-handler`
- All 13 high-priority API route tests now work correctly with zero NextRequest errors

**Previous Symptoms (now fixed)**:
- ~~`TypeError: Cannot set property url of #<NextRequest> which has only a getter`~~ ✅ Fixed
- ~~API route tests fail when run together~~ ✅ Fixed
- ~~Individual test files may pass but full suite fails~~ ✅ Fixed

### Current Working Solution

**Using `next-test-api-route-handler`** (now implemented):

```bash
npm install --save-dev next-test-api-route-handler
```

**Working Pattern** (now in use across all API route tests):
```javascript
import { testApiHandler } from 'next-test-api-route-handler'
import * as route from './route'  // Import entire route module

// Test API route handlers
it('should handle API route correctly', async () => {
  await testApiHandler({
    appHandler: route,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test' }),
      })
      
      expect(res.status).toBe(200)
    },
  })
})
```

**Critical Pattern**: Must use `import * as route from './route'` to import the entire route module, not individual `POST`/`GET` handlers. This ensures proper Next.js App Router compatibility.

### Historical Context

**Root Cause (now fixed)**: Custom Request mock in `jest.setup.js` conflicted with NextRequest's read-only properties:
```javascript
// Broken implementation (now removed)
global.Request = class Request {
  constructor(input, init = {}) {
    this.url = input;  // ← Error: Cannot set read-only property
  }
}
```

**Workarounds No Longer Needed**:
- ~~Running tests individually~~ - Full test suite now works
- ~~Custom Request mocking~~ - Using next-test-api-route-handler instead
- ~~Avoiding API route tests in CI~~ - All tests run reliably

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