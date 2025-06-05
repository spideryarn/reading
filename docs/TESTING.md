# Testing

This document describes the testing approach for the Spideryarn Reading project.

## See also

- `src/lib/hooks/__tests__/` - Jest test files for React hooks
- `src/lib/services/__tests__/` - Jest test files for services
- `tests/test-mutation-engine.ts` - legacy standalone test runner
- `docs/AUTHENTICATION_TESTING.md` - Comprehensive authentication testing patterns and strategies
- `docs/ARCHITECTURE.md` - for understanding the components being tested
- `docs/CODING_PRINCIPLES.md` - for testing philosophy and approach

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

## Testing Philosophy

Following our coding principles, tests should:
- Be simple and readable
- Test behaviour, not implementation details
- Provide clear failure messages
- Run quickly to encourage frequent execution

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

## Jest Testing Issues with NextRequest Mocking

### Issue Description

When running the full Jest test suite, some API route tests that use `NextRequest` mocking may fail due to conflicts between test setup and teardown. Individual tests pass reliably, but running multiple tests together can cause mock conflicts.

**Symptoms:**
- Individual test files pass: `npm test path/to/specific.test.ts`
- Full test suite may show failures for some API route tests
- Error messages related to `NextRequest` construction or mocking

### Current Workaround

**Run tests individually when debugging API routes:**

```bash
# Run specific test file
npm test app/api/__tests__/chat.test.ts

# Run multiple specific files
npm test app/api/__tests__/chat.test.ts app/api/__tests__/summarise.test.ts
```

**Test isolation strategy:**
- API route tests are designed to run independently
- Each test file includes proper setup and teardown
- Mock conflicts primarily affect cross-test interactions

### Root Cause

The issue stems from how Jest handles NextRequest mocking across multiple test files:
- NextRequest depends on global browser APIs (Request, Response)
- Mock setup/teardown timing can create conflicts
- Test isolation isn't perfect for these global dependencies

### Future Improvements

**Recommended solutions for better test reliability:**

1. **Mock Service Worker (MSW)**: Replace NextRequest mocking with MSW for more realistic request/response handling
2. **Test environment isolation**: Improve Jest configuration for better test isolation
3. **Test utilities refactoring**: Create more robust test helper utilities for API route testing

### Test File Comments

Individual test files that experience this issue include comments pointing to this documentation:

```typescript
// Note: This test may fail when run as part of the full suite due to 
// NextRequest mocking conflicts. See docs/TESTING.md appendix for details.
// Run individually: npm test path/to/this.test.ts
```
