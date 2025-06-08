# Testing

This document describes the testing approach for the Spideryarn Reading project.

## See also

- `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` - Process for maintaining test quality and organisation
- `planning/250608a_test_infrastructure_cleanup.md` - Example one-time test infrastructure cleanup
- `src/lib/hooks/__tests__/` - Jest test files for React hooks
- `src/lib/services/__tests__/` - Jest test files for services
- `docs/reference/AUTHENTICATION_TESTING.md` - Comprehensive authentication testing patterns and strategies
- `docs/reference/ARCHITECTURE.md` - for understanding the components being tested
- `docs/reference/CODING_PRINCIPLES.md` - for testing philosophy and approach

## Current Testing Approach

**Current State**: Jest with React Testing Library ✓  
**Migration Status**: Framework setup complete, expanding test coverage

### Running Tests

To run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

Prefer to use a subagent to run tests (to avoid overloading the context window).

All tests now use Jest - no standalone test runners needed.

### Database Tests

Database integration tests require a running Supabase instance and environment variables. The project uses Next.js best practices for loading environment variables in tests.

```bash
# Run all tests including database tests
npm test

# Run database tests specifically
npm test -- --testPathPattern=database-schema
```

**Environment Setup**: Tests use `.env.test` for environment variables (following Next.js conventions). See the "Environment Variables in Tests" section below for setup instructions.

### Test Structure

Tests are organised in `__tests__` directories alongside the code they test:
- `src/lib/hooks/__tests__/` - React hook tests
- `src/lib/services/__tests__/` - Service layer tests

### Writing Tests

Example test structure:

```typescript
import { renderHook } from '@testing-library/react';
import { myHook } from '../myHook';

describe('myHook', () => {
  it('should do something', () => {
    const { result } = renderHook(() => myHook());
    expect(result.current).toBeDefined();
  });
});
```


## Framework Choice

We've chosen **Jest** with **React Testing Library** because:
- Mature ecosystem with excellent React integration
- Built-in support from Next.js
- Comprehensive testing utilities and assertions
- Good performance and developer experience
- Wide community adoption and support

### Testing Stack
- **Jest**: Testing framework with assertions, mocking, and test running
- **React Testing Library**: For component testing with focus on user behaviour
- **@testing-library/jest-dom**: Additional DOM matchers for Jest
- **jsdom**: Browser environment simulation for testing
- **next-test-api-route-handler**: 📋 Planned solution for Next.js API route testing

## Testing Philosophy

Following our coding principles, tests should:
- **Integration-first approach**: Focus on integration tests for AI-assisted rapid prototyping
- **Behaviour over implementation**: Test what the code does, not how it does it
- **Cost-effective**: Mock LLM API calls to avoid expenses during testing
- **High value, low maintenance**: Consolidate detailed tests into fewer, high-coverage tests
- **Simple and readable**: Clear test structure and failure messages
- **Fast execution**: Encourage frequent testing during development

## Configuration

Jest is configured in `jest.config.js` with:
- Next.js integration for proper module resolution
- jsdom environment for browser simulation
- Test file patterns in `__tests__` directories and `.test.` files
- Module path mapping for project imports
- Coverage collection from TypeScript files
- Setup file at `jest.setup.js` for global test configuration
- Global setup at `test/setupEnv.js` for loading environment variables

## Environment Variables in Tests

The project follows Next.js best practices for loading environment variables during testing:

### Setup Instructions

1. **Create `.env.test`**: Copy your `.env.local` file to `.env.test`:
   ```bash
   cp .env.local .env.test
   ```

   **⚠️ Required**: Tests will abort if `.env.test` is missing. This ensures consistent test environment setup.

2. **Run tests**: Environment variables will be loaded automatically:
   ```bash
   npm test
   ```

### How It Works

- **Next.js Convention**: When `NODE_ENV=test`, Next.js loads `.env.test` instead of `.env.local`
- **Automatic Loading**: The `test/setupEnv.js` file uses `@next/env` to load environment variables before tests run
- **No Manual Commands**: No need for special dotenv commands or workarounds

### Environment Loading Order

When running tests, Next.js loads environment files in this order:
1. `.env.test.local` (not committed, local overrides)
2. `.env.test` (committed test defaults - though we gitignore it for sensitive data)
3. `.env` (committed shared defaults)

Note: `.env.local` is explicitly NOT loaded during tests to ensure reproducible test environments.

## Existing Tests

Current test coverage includes:
- `src/lib/hooks/__tests__/useChatRuntime.test.ts` - Chat runtime hook testing
- `src/lib/services/__tests__/deterministicId.test.ts` - Deterministic ID generation
- `src/lib/services/__tests__/mutation-engine.test.ts` - Mutation engine tests
- `src/lib/services/__tests__/heading-mutation-generator-simple.test.ts` - Heading mutation generator tests
- `tests/test-mutation-engine.ts` - Comprehensive mutation engine tests
- `tests/test-document-rendering.ts` - Document rendering with AI headings tests
- `tests/test-edge-cases.ts` - Edge case testing for mutations
- `tests/test-heading-mutation-generator.ts` - Heading mutation generator tests
- `tests/test-mutation-edge-cases.ts` - Additional mutation edge case tests

**Authentication Test Suite** ✅:
- `lib/auth/__tests__/` - Server and client authentication utilities
- `app/auth/__tests__/` - Authentication pages and components
- `__tests__/auth-integration.test.ts` - Cross-component authentication flows
- `lib/services/database/__tests__/profiles.test.ts` - Profile management
- See `docs/AUTHENTICATION_TESTING.md` for comprehensive authentication testing patterns

**Chat Persistence Test Suite** ✅:
- `src/lib/hooks/__tests__/usePersistentChat.test.ts` - Core persistence hook testing
- `components/__tests__/assistant-chat-persistence.test.tsx` - Component integration with persistence
- `app/api/__tests__/chat-persistence.test.ts` - API route persistence support
- Uses mock system user ID: `00000000-0000-0000-0000-000000000001`
- See `docs/CHATBOT_ASSISTANT_UI_INTEGRATION.md` for implementation details

Additional tests should be added as new features are developed.

# Appendix: Known Issues and Workarounds

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

### LLM API Cost Prevention

**Critical**: Ensure all LLM API calls are mocked in tests to prevent cost explosion:

```javascript
// __mocks__/@ai-sdk/anthropic.js
export const anthropic = {
  chat: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Mocked response' }],
    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
  })
};
```


## Test Maintenance

See `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` for comprehensive guidance on:
- Consolidating redundant tests into high-value integration tests
- Removing obsolete test files and standalone test scripts
- Optimising test performance and cost
- Regular test quality maintenance procedures

**Current Test Health**: ~71% pass rate with critical infrastructure issues requiring attention (see `planning/250608a_test_infrastructure_cleanup.md` for detailed improvement plan).
