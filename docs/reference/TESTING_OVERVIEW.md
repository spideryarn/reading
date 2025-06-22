# Testing Overview

> ✅ **UPDATED**: This documentation reflects the shared database testing approach adopted in June 2025.

This document describes the testing approach and philosophy for the Spideryarn Reading project.

## See also

- `docs/reference/TESTING_SETUP.md` - Configuration and environment setup for tests
- `docs/reference/TESTING_TROUBLESHOOTING.md` - Known issues and workarounds
- `docs/reference/TESTING_DATABASE.md` - Database-specific testing patterns and shared database approach
- `docs/reference/TESTING_AUTHENTICATION.md` - Authentication testing patterns (→ AUTHENTICATION_TESTING.md)
- `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` - Browser automation and E2E testing options for AI-assisted development
- `lib/testing/test-isolation-utils.ts` - Test isolation utilities for shared database
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

### Database Testing Pattern (Shared Database Approach)

We use a **shared database** approach following Supabase's recommendations. Tests that interact with the database MUST use UUID-based isolation:

```typescript
import { getTestNamespace, createTestUser, createTestDocument, getCleanupFunctions } from '@/lib/testing/test-isolation-utils'

describe('DocumentService', () => {
  const namespace = getTestNamespace('document-service-test')
  let documentService: DocumentService
  
  beforeEach(() => {
    documentService = new DocumentService(supabase)
  })
  
  afterEach(async () => {
    // CRITICAL: Always clean up test data
    const cleanup = getCleanupFunctions(namespace, supabase)
    await cleanup.all()
  })
  
  it('should create and retrieve document', async () => {
    // Create test data with namespace
    const testDoc = createTestDocument(namespace, {
      title: 'My Test Document',
      content: '<p>Test content</p>'
    })
    
    // Perform operations
    const created = await documentService.create(testDoc)
    const retrieved = await documentService.getById(created.id)
    
    // Assertions
    expect(retrieved?.title).toBe('My Test Document')
    expect(retrieved?.metadata.test_namespace).toBe(namespace)
  })
})
```

**Critical Rules**:
- ⛔ NEVER reset or truncate the database
- ⛔ NEVER use `npm run db:reset:DANGEROUS` in tests
- ✅ ALWAYS use unique namespaces for test isolation
- ✅ ALWAYS clean up test data in afterEach hooks
- ✅ Use the provided test utilities for consistency

See `docs/reference/TESTING_DATABASE.md` for comprehensive patterns and examples.


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

**Row Level Security (RLS) Test Suite** ✅:
- `lib/services/database/__tests__/rls-policies-real.test.ts` - Real database-level RLS testing
- Uses `RLSTestDatabase` class for genuine security validation
- Tests document ownership isolation, AI calls, profiles, and enhancements
- **Performance**: 8 tests in ~330ms - significantly faster than simulation approaches
- **Security**: Discovered and fixed critical AI calls RLS vulnerability
- See `docs/reference/TESTING_DATABASE.md` for comprehensive real RLS testing guide

**DEPRECATED RLS Tests** (marked for removal):
- `lib/services/database/__tests__/rls-policies-integration.test.ts` - Deprecated simulation approach
- `lib/services/database/__tests__/rls-policies.test.ts` - Deprecated simulation approach
- `lib/testing/rls-test-context.ts` - Deprecated simulation infrastructure
- Replaced by real RLS testing for genuine security validation

Additional tests should be added as new features are developed.

## Test Maintenance

See `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` for comprehensive guidance on maintaining test quality and organisation.

**Current Test Health**: ~71% pass rate with infrastructure issues requiring attention. See `docs/reference/TESTING_TROUBLESHOOTING.md` for detailed issue descriptions and solutions.
