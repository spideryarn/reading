# Testing

This document describes the testing approach for the Spideryarn Reading project.

## See also

- `src/lib/hooks/__tests__/` - Jest test files for React hooks
- `src/lib/services/__tests__/` - Jest test files for services
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

## Existing Tests

Current test coverage includes:
- `src/lib/hooks/__tests__/useChatRuntime.test.ts` - Chat runtime hook testing
- `src/lib/services/__tests__/deterministicId.test.ts` - Deterministic ID generation

Additional tests should be added as new features are developed.
