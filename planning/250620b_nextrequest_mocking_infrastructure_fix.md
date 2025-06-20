# NextRequest Mocking Infrastructure Fix - Complete Migration Plan

## Goal and Context

**Problem**: Test suite has a 65% failure rate (606/941 tests passing) due to broken NextRequest mocking infrastructure that conflicts with read-only properties in Next.js App Router API routes.

**Root Cause**: Custom `Request` class in `jest.setup.js` attempts to set read-only properties (`url`, etc.) on NextRequest objects, causing "Cannot set property url of NextRequest which has only a getter" errors across all API route tests.

**Goal**: Implement complete migration to `next-test-api-route-handler` (already installed) to restore API route testing functionality and achieve 90%+ test pass rate.

**Business Impact**: Critical for development velocity - unable to confidently test API routes means higher risk of regressions and slower feature development.

## References

- `docs/reference/TESTING_TROUBLESHOOTING.md` - Documents the NextRequest mocking issues as known problems
- `docs/reference/TESTING_OVERVIEW.md` - Current testing approach and Jest configuration
- `docs/reference/TESTING_SETUP.md` - Test environment configuration
- `jest.setup.js` - Contains the broken Request mocking (lines 93-101)
- `package.json` - Shows `next-test-api-route-handler@4.0.16` already installed
- `lib/testing/test-isolation-utils.ts` - Database test isolation utilities
- Web research on NextRequest mocking best practices and `next-test-api-route-handler` usage

## Principles and Key Decisions

**Migration Strategy**: Complete replacement of manual NextRequest mocking with `next-test-api-route-handler` library
- **Principle**: Fix the root cause rather than band-aid solutions (per `docs/reference/CODING_PRINCIPLES.md`)
- **Approach**: Remove broken infrastructure entirely and standardize on proven library
- **Testing Philosophy**: Maintain shared database approach but improve test isolation
- **Cost Management**: Preserve existing LLM mocking to prevent expensive API calls during testing

**Key Decisions**:
1. **Complete removal** of custom Request mocking from `jest.setup.js`
2. **Standardize** all API route tests to use `next-test-api-route-handler`
3. **Improve** authentication test mocking with proper user fixtures
4. **Validate** and fix `.env.test` configuration issues
5. **Preserve** existing database testing approach (shared database with UUID isolation)

## Stages and Actions

### Stage: Pre-implementation Research and Setup
- [ ] Run `./scripts/sync-worktrees.ts` in subagent to sync latest changes from main
- [ ] Research `next-test-api-route-handler` best practices and migration patterns
  - Use subagent to search web for recent Next.js 15 App Router testing patterns
  - Review official documentation and examples
  - Document recommended patterns in appendix
- [ ] Audit current API route test files to understand existing patterns
  - Use subagent to analyze all test files in `app/api/*/tests/` directories
  - Document current mocking patterns and identify migration complexity
  - Create inventory of tests to migrate (see Appendix)

### Stage: Remove Broken Infrastructure
- [ ] Create backup of current `jest.setup.js` for reference
- [ ] Remove custom Request class from `jest.setup.js` (lines 93-101)
  - Document what was removed in commit message
  - Test that basic Jest setup still works after removal
- [ ] Validate `.env.test` configuration
  - Fix invalid LLM model strings (e.g., "anthropic-cheap" → "anthropic:claude-3-5-haiku:20241022")
  - Ensure all required environment variables are present and valid
  - Test environment loading with corrected configuration
- [ ] Run basic test suite to confirm infrastructure changes don't break non-API tests
  - Use subagent to run `npm test -- --testPathPattern="lib/.*\.test\.(js|ts)$"` 
  - Verify utility and service tests still pass
  - Document any new issues discovered

### Stage: Create Authentication Test Utilities
- [ ] Create proper authentication test fixtures in `lib/testing/auth-test-utils.ts`
  - Include `createTestUser()` function that returns valid user objects
  - Include `mockValidateAuth()` helper that properly configures auth mocks
  - Include patterns for testing both authenticated and unauthenticated scenarios
- [ ] Update existing authentication service tests to use new utilities
  - Fix tests where `validateAuth` mock returns undefined
  - Ensure consistent user object structure across tests
  - Test both success and failure authentication scenarios
- [ ] Run authentication-related tests to validate improvements
  - Use subagent to run `npm test -- --testPathPattern="auth"` 
  - Verify authentication tests pass with new utilities
  - Document any remaining authentication test issues

### Stage: Migrate Core API Route Tests (High Priority)
- [ ] Create standard `next-test-api-route-handler` patterns in `lib/testing/api-test-utils.ts`
  - Include helper functions for common API testing patterns
  - Include authentication setup patterns
  - Include request/response assertion helpers
  - Document usage patterns with examples (see Appendix)
- [ ] Migrate critical API route tests first:
  - [ ] `/api/upload-pdf` tests - document upload functionality
  - [ ] `/api/extract-url` tests - URL extraction functionality  
  - [ ] `/api/chat` tests - chatbot streaming functionality
  - [ ] `/api/semantic-search` tests - search functionality
- [ ] Run migrated tests to validate functionality
  - Use subagent to run `npm test -- --testPathPattern="api/(upload-pdf|extract-url|chat|semantic-search)"` 
  - Verify all migrated tests pass
  - Document any issues or patterns discovered
- [ ] Fix any discovered issues and iterate on patterns
- [ ] Run full test suite to check for regressions
  - Use subagent to run `npm test` and analyze results
  - Document improvement in pass rate
  - Identify remaining high-priority failures

### Stage: Complete API Route Migration
- [ ] Migrate remaining API route tests using established patterns:
  - [ ] `/api/headings` tests - AI heading generation
  - [ ] `/api/tweet-thread` tests - thread generation
  - [ ] `/api/glossary` tests - glossary extraction
  - [ ] `/api/summaries` tests - summary generation
  - [ ] All other API routes in `app/api/*/tests/` directories
- [ ] Update test utilities based on learnings from migration
  - Refine helper functions based on common patterns
  - Add missing authentication scenarios
  - Improve error handling patterns
- [ ] Run comprehensive API route test suite
  - Use subagent to run `npm test -- --testPathPattern="api/"` 
  - Verify all API route tests pass
  - Document final API test pass rate
- [ ] Run linter and build to ensure code quality
  - `npm run lint` - fix any linting issues
  - `npm run build` - ensure TypeScript compilation succeeds
- [ ] Git commit API route migration
  - Use subagent to commit changes following `docs/instructions/GIT_COMMIT_CHANGES.md`
  - Include comprehensive commit message documenting migration

### Stage: Address Component and Service Test Issues
- [ ] Fix React component prop validation issues
  - Review failing component tests for prop forwarding issues
  - Fix "React does not recognize the `isActive` prop on a DOM element" errors
  - Update component props interfaces as needed
- [ ] Review and fix database/RLS test isolation issues
  - Investigate failing RLS tests with user isolation problems
  - Ensure proper namespace usage in all database tests
  - Update cleanup utilities if needed
- [ ] Fix any remaining LLM model configuration issues in tests
  - Ensure all test files use valid model strings
  - Update mock configurations as needed
- [ ] Run non-API test suites to validate improvements
  - Use subagent to run `npm test -- --testPathPattern="components/|lib/"` 
  - Document improvement in component and service test pass rates
  - Identify any remaining systematic issues

### Stage: Validation and Documentation
- [ ] Run complete test suite and analyze final results
  - Use subagent to run `npm test` with full output analysis
  - Document final pass rate and remaining issues
  - Compare before/after metrics
- [ ] Test critical user flows with browser automation
  - Use Puppeteer MCP to test document upload, chat, and search functionality
  - Verify UI functionality works as expected
  - Check for any regressions in user experience
- [ ] Update testing documentation
  - Update `docs/reference/TESTING_TROUBLESHOOTING.md` to remove NextRequest issues
  - Update `docs/reference/TESTING_OVERVIEW.md` with new API testing patterns
  - Document `next-test-api-route-handler` usage patterns
  - Update `docs/reference/TESTING_SETUP.md` if needed
- [ ] Create PR with comprehensive testing infrastructure improvements
  - Use subagent to create pull request following GitHub best practices
  - Include before/after test metrics
  - Document migration approach and benefits
  - Request review focusing on testing infrastructure

### Stage: Cleanup and Optimization
- [ ] Remove redundant test utilities and patterns
  - Clean up obsolete authentication mocking patterns
  - Remove unused test helper functions
  - Consolidate similar test utilities
- [ ] Optimize test performance and organization
  - Review test file organization and naming
  - Optimize slow-running tests where possible
  - Consider test grouping for better parallelization
- [ ] Add comprehensive integration tests for critical paths
  - Create high-level integration tests for key user flows
  - Focus on tests that catch important regressions
  - Balance coverage with test maintenance burden
- [ ] Final validation and documentation update
  - Run final test suite validation
  - Update `docs/reference/TESTING_OVERVIEW.md` with final metrics
  - Document lessons learned and future testing guidelines
- [ ] Move planning doc to `planning/finished/` and commit

## Appendix

### Current Test Failure Analysis

**Total Tests**: 941 tests
**Current Pass Rate**: 64.4% (606 passing, 333 failing)
**Target Pass Rate**: 90%+ (850+ passing tests)

**Failure Categories**:
1. **API Route Tests** (~150 failures) - NextRequest mocking issues
2. **Authentication Tests** (~50 failures) - Mock configuration issues  
3. **Component Tests** (~80 failures) - Prop validation and state issues
4. **Service Tests** (~30 failures) - Database/RLS and configuration issues
5. **Miscellaneous** (~23 failures) - Environment and setup issues

### next-test-api-route-handler Usage Patterns

**Basic API Route Test Pattern**:
```typescript
import { testApiHandler } from 'next-test-api-route-handler'
import { POST } from '@/app/api/upload-pdf/route'

describe('/api/upload-pdf', () => {
  it('should upload PDF successfully', async () => {
    await testApiHandler({
      appHandler: POST,
      url: '/api/upload-pdf',
      test: async ({ fetch }) => {
        const formData = new FormData()
        formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }))
        
        const response = await fetch({
          method: 'POST',
          body: formData
        })
        
        expect(response.status).toBe(200)
        const result = await response.json()
        expect(result).toHaveProperty('documentId')
      }
    })
  })
})
```

**Authenticated API Route Pattern**:
```typescript
import { testApiHandler } from 'next-test-api-route-handler'
import { createTestUser, mockValidateAuth } from '@/lib/testing/auth-test-utils'

describe('/api/chat', () => {
  it('should handle authenticated chat request', async () => {
    const testUser = createTestUser()
    mockValidateAuth(testUser)
    
    await testApiHandler({
      appHandler: POST,
      url: '/api/chat',
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Hello', documentId: 'test-doc-id' })
        })
        
        expect(response.status).toBe(200)
        // Additional streaming response assertions
      }
    })
  })
})
```

### Risk Assessment

**Low Risk**:
- Removing broken Request mock (already non-functional)
- Adding `next-test-api-route-handler` (already installed, battle-tested)
- Improving authentication test utilities

**Medium Risk**:
- Large-scale test migration (could introduce new patterns of failure)
- Changes to test environment configuration
- Component prop validation fixes

**High Risk**:
- None identified - all changes are improvements to non-functional test infrastructure

### Alternative Approaches Considered

**Option B - Hybrid Approach**: Keep some manual mocking, add `next-test-api-route-handler` for new tests
- **Pros**: Lower migration effort, preserves existing patterns
- **Cons**: Maintains broken infrastructure, inconsistent testing patterns
- **Rejected**: Doesn't fix root cause, continues technical debt

**Option C - MSW (Mock Service Worker)**: Use MSW for API mocking instead
- **Pros**: Different approach, good for complex API scenarios
- **Cons**: Requires extensive rework, different paradigm from current tests
- **Rejected**: More complex migration, `next-test-api-route-handler` is specifically designed for Next.js

**Selected Option A - Complete Migration**: Remove broken infrastructure, standardize on `next-test-api-route-handler`
- **Pros**: Fixes root cause, modern best practices, proven library
- **Cons**: Requires comprehensive migration effort
- **Selected**: Highest probability of success, cleanest long-term architecture

### Key Implementation Details

**Environment Variables to Fix**:
- `LLM_MODEL=anthropic-cheap` → `LLM_MODEL=anthropic:claude-3-5-haiku:20241022`
- Validate all Supabase connection strings
- Ensure test database isolation settings are correct

**Critical Test Files to Migrate** (Priority Order):
1. `app/api/upload-pdf/tests/` - Core document upload functionality
2. `app/api/extract-url/tests/` - URL extraction functionality
3. `app/api/chat/tests/` - Chat/AI interaction functionality
4. `app/api/semantic-search/tests/` - Search functionality
5. `app/api/headings/tests/` - AI heading generation
6. `app/api/summaries/tests/` - Summary generation
7. All remaining API route test directories

**Success Metrics**:
- API route test pass rate: 0% → 95%+
- Overall test pass rate: 64% → 90%+
- Test execution time: Maintain or improve current performance
- Zero NextRequest-related errors in test output
- Consistent authentication test patterns across all API tests