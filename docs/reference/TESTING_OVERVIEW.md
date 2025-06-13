# Testing Overview

This document describes the testing approach and philosophy for the Spideryarn Reading project.

## See also

- `docs/reference/TESTING_SETUP.md` - Configuration and environment setup for tests
- `docs/reference/TESTING_TROUBLESHOOTING.md` - Known issues and workarounds
- `docs/reference/TESTING_DATABASE.md` - Database-specific testing patterns
- `docs/reference/TESTING_AUTHENTICATION.md` - Authentication testing patterns (→ AUTHENTICATION_TESTING.md)
- `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` - Process for maintaining test quality and organisation
- `planning/250608a_test_infrastructure_cleanup.md` - Example one-time test infrastructure cleanup
- `src/lib/hooks/__tests__/` - Jest test files for React hooks
- `src/lib/services/__tests__/` - Jest test files for services
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - for understanding the components being tested
- `docs/reference/CODING_PRINCIPLES.md` - for testing philosophy and approach

## Current Testing Approach

**Current State**: Jest with React Testing Library ✓  
**Migration Status**: Framework setup complete, expanding test coverage

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

**Setup Requirements**: See `docs/reference/TESTING_SETUP.md` for environment configuration.

**Database Tests**: See `docs/reference/TESTING_DATABASE.md` for database-specific testing patterns.

**Troubleshooting**: See `docs/reference/TESTING_TROUBLESHOOTING.md` for known issues and solutions.

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

We've chosen **Jest** with **React Testing Library** for comprehensive testing capabilities:
- Mature ecosystem with excellent React integration
- Built-in support from Next.js
- Focus on user behaviour over implementation details
- Good performance and developer experience

**Technical Details**: See `docs/reference/TESTING_SETUP.md` for complete testing stack configuration.

## Testing Philosophy

Following our coding principles, tests should:
- **Integration-first approach**: Focus on integration tests for AI-assisted rapid prototyping
- **Behaviour over implementation**: Test what the code does, not how it does it
- **Cost-effective**: Mock LLM API calls to avoid expenses during testing
- **High value, low maintenance**: Consolidate detailed tests into fewer, high-coverage tests
- **Simple and readable**: Clear test structure and failure messages
- **Fast execution**: Encourage frequent testing during development


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
- See `docs/reference/AUTHENTICATION_TESTING.md` for comprehensive authentication testing patterns

**Chat Persistence Test Suite** ✅:
- `src/lib/hooks/__tests__/usePersistentChat.test.ts` - Core persistence hook testing
- `components/__tests__/assistant-chat-persistence.test.tsx` - Component integration with persistence
- `app/api/__tests__/chat-persistence.test.ts` - API route persistence support
- Uses mock system user ID: `00000000-0000-0000-0000-000000000001`
- See `docs/reference/AI_CHATBOT_ASSISTANT_UI_INTEGRATION.md` for implementation details

Additional tests should be added as new features are developed.

## Test Maintenance

See `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` for comprehensive guidance on maintaining test quality and organisation.

**Current Test Health**: ~71% pass rate with infrastructure issues requiring attention. See `docs/reference/TESTING_TROUBLESHOOTING.md` for detailed issue descriptions and solutions.
