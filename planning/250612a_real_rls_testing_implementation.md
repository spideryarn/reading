# Real RLS Testing Implementation

## Goal, context

Replace the current simulated RLS testing infrastructure with real database-level authentication testing. The current implementation in `lib/services/database/__tests__/rls-policies-integration.test.ts` uses JavaScript filtering to simulate RLS policies instead of testing actual database authentication, leading to false confidence in security controls.

**Current Problems:**
- RLS tests simulate policies with client-side filtering rather than testing real database RLS
- Complex, brittle mocking infrastructure that duplicates RLS logic in test code
- Schema mismatches causing test crashes (`enhancement_data` vs `content` columns)
- Tests passing that don't actually validate database-level security
- Maintenance burden of keeping simulated logic in sync with real policies

**Target Outcome:**
- 3-4 essential RLS tests that use real Supabase authentication
- Tests validate actual database RLS policies work correctly
- Simple, maintainable test infrastructure following established patterns
- Higher confidence in security controls with less code to maintain

## References

- `docs/reference/AUTHENTICATION_TESTING.md` - Updated with RLS testing best practices and patterns
- `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` - Integration-first approach, fewer high-coverage tests
- `lib/services/database/__tests__/rls-policies-integration.test.ts` - Current failing simulated RLS tests
- `lib/testing/rls-database-test-utils.ts` - Complex simulation infrastructure to be replaced
- `supabase/migrations/20250610000001_implement_phase1_document_rls_policies.sql` - Actual RLS policies to test
- `lib/auth/__tests__/server-auth.test.ts` - Established auth testing patterns to follow
- Web research findings on Supabase RLS testing best practices

## Principles, key decisions

**Focus on Correctness Over Coverage:** Prioritize testing that actual RLS policies work rather than comprehensive edge case coverage. Better to have 3-4 tests that validate real security than 20 tests that simulate it incorrectly.

**Integration-First Testing:** Following housekeeping principles, consolidate into fewer high-coverage integration tests that verify end-to-end RLS behavior rather than detailed unit tests.

**Real Authentication:** Use actual Supabase authentication with JWT tokens or database context switching rather than client-side filtering simulation.

**Simple, Maintainable Infrastructure:** Avoid complex mocking layers. Use service role for test setup and real user authentication for RLS validation.

**Deprecate Rather Than Fix:** When cleaning up, delete/amalgamate old tests rather than trying to fix the fundamentally flawed simulation approach.

**Follow Established Patterns:** Use same Jest mocking patterns, environment setup, and error handling as existing auth tests in `lib/auth/__tests__/`.

## Stages & actions

### Stage: Preparation & Analysis
- [ ] Run `./scripts/sync-worktrees.ts` to sync latest changes from main
- [ ] Validate current test environment setup
  - [ ] Confirm `.env.test` exists and contains required Supabase variables
  - [ ] Run existing RLS tests to confirm current failure state
  - [ ] Document specific error patterns and failure modes

### Stage: Core RLS Test Implementation
- [ ] Create new real RLS testing infrastructure
  - [ ] Implement `lib/services/database/__tests__/rls-test-helpers.ts` with `RealRLSTestSetup` class
  - [ ] Choose and implement authentication approach (JWT generation vs database context setting)
  - [ ] Create helper functions for user client creation and test data setup
- [ ] Implement essential RLS tests in `lib/services/database/__tests__/rls-policies.test.ts`
  - [ ] Test 1: Document ownership isolation (users can only access their own documents)
  - [ ] Test 2: AI calls follow document ownership (relationship inheritance)  
  - [ ] Test 3: Profile access isolation (users can only access their own profile)
  - [ ] Test 4: Document enhancements follow document ownership
- [ ] Validate tests using real database RLS policies
  - [ ] Run tests and confirm they pass with proper authentication
  - [ ] Verify tests fail when RLS policies are bypassed/disabled
  - [ ] Test with both existing seed data users (system + Greg's test user)

### Stage: Schema & Data Fixes
- [ ] Fix immediate schema mismatches in existing tests
  - [ ] Update `enhancement_data` → `content` and `enhancement_type` → `type` in test fixtures
  - [ ] Fix any other column name mismatches discovered during testing
- [ ] Ensure test data compatibility
  - [ ] Verify existing `TEST_USER_IDS` work with new approach
  - [ ] Update `security-fixtures.ts` if needed for schema compatibility
  - [ ] Test cleanup procedures work correctly

### Stage: Validation & Integration Testing
- [ ] Run comprehensive test validation
  - [ ] Execute new RLS tests multiple times to ensure consistency
  - [ ] Verify no false positives (tests should fail when they should)
  - [ ] Check performance - tests should complete in <10 seconds total
  - [ ] Validate integration with existing Jest setup and CI/CD
- [ ] Integration testing with database services
  - [ ] Test with `DocumentService`, `ProfileService`, `AiCallService`
  - [ ] Verify service layer correctly relies on RLS policies
  - [ ] Test error propagation (PGRST116 error codes)

### Stage: Documentation & Cleanup
- [ ] Update documentation
  - [ ] Add implementation examples to `docs/reference/AUTHENTICATION_TESTING.md`
  - [ ] Document new test patterns and helper functions
  - [ ] Add troubleshooting notes for common issues
- [ ] Clean up old testing infrastructure
  - [ ] Mark `lib/testing/rls-database-test-utils.ts` as deprecated
  - [ ] Remove or simplify complex simulation logic
  - [ ] Delete redundant test fixtures and utilities
  - [ ] Update imports and references to use new helpers

### Stage: Deprecate Old Tests
- [ ] Replace old simulated RLS tests
  - [ ] Mark `rls-policies-integration.test.ts` as deprecated with clear comment
  - [ ] Ensure new tests provide equivalent or better coverage
  - [ ] Remove failing tests that provide no value
- [ ] Validate test suite health
  - [ ] Run full test suite to ensure no regressions
  - [ ] Confirm test execution time is reasonable
  - [ ] Verify no LLM API calls in test execution
  - [ ] Check test coverage hasn't significantly decreased

### Stage: Final Validation & Documentation
- [ ] End-to-end validation
  - [ ] Run `npm test` to ensure 100% pass rate for RLS tests
  - [ ] Test with different database states and user scenarios
  - [ ] Verify tests catch actual RLS policy violations
- [ ] Update project documentation
  - [ ] Update `docs/reference/TESTING.md` with new RLS patterns
  - [ ] Add examples to `CLAUDE.md` for future AI development
  - [ ] Document lessons learned and gotchas
- [ ] Git commit following `docs/instructions/GIT_COMMITS.md`
- [ ] Move this planning doc to `planning/finished/` and commit

# Appendix

## Code Snippets & Implementation Details

### New RLS Test Helper Structure
```typescript
// lib/services/database/__tests__/rls-test-helpers.ts
export class RealRLSTestSetup {
  private adminClient: SupabaseClient
  
  constructor() {
    this.adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  async createUserClient(userId: string): Promise<SupabaseClient> {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Set auth context for RLS evaluation
    await this.setAuthContext(client, userId)
    return client
  }

  async createTestDocument(data: Partial<Document>, ownerId: string) {
    return this.adminClient.from('documents').insert({
      ...data,
      created_by: ownerId
    }).select().single()
  }
}
```

### Essential Test Structure
```typescript
// lib/services/database/__tests__/rls-policies.test.ts
describe('Essential RLS Policy Tests', () => {
  let setup: RealRLSTestSetup
  let userAClient: SupabaseClient  
  let userBClient: SupabaseClient
  
  beforeAll(async () => {
    setup = new RealRLSTestSetup()
    userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
    userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)
  })

  test('Users can only access their own documents', async () => {
    // Real RLS testing implementation
  })
})
```

## Authentication Approach Options

**Option A: JWT Token Generation**
- Use Supabase admin API to generate real JWT tokens
- Most comprehensive but more complex setup
- Validates complete authentication flow

**Option B: Database Context Setting**  
- Use SQL to set `request.jwt.claims` directly
- Simpler implementation, still tests real RLS policies
- Recommended for rapid prototyping needs

**Option C: Hybrid Approach**
- Service role for test setup (bypasses RLS)
- User context switching for RLS validation
- Balance of simplicity and real testing

## Current Test User Setup
```typescript
// From lib/testing/rls-test-context.ts
export const TEST_USER_IDS = {
  SYSTEM: '00000000-0000-0000-0000-000000000001',
  USER_A: '00000000-0000-0000-0000-000000000001', // System user
  USER_B: '7bfcabea-690c-4754-936d-1a194f4244c2', // Greg's test user
} as const
```

## RLS Policies to Test
From migration `20250610000001_implement_phase1_document_rls_policies.sql`:

1. **Documents**: `auth.uid() = created_by`
2. **Document Enhancements**: Access via document ownership
3. **AI Calls**: Document ownership OR document-independent calls  
4. **Profiles**: `auth.uid() = user_id`
5. **Chat System**: Access via document ownership

## Web Research Summary

Key findings from industry research:
- **Database-level testing preferred** over application simulation
- **Use separate test database** for RLS validation
- **Test both positive and negative scenarios** (allowed/blocked access)
- **Verify specific error codes** (PGRST116 for "no rows returned")
- **Focus on essential scenarios** rather than comprehensive edge cases
- **Service role for setup, user authentication for testing**

## Error Patterns to Test
```typescript
// RLS properly blocks access - returns null data, no error
expect(blockedData).toBeNull()
expect(error?.code).toBe('PGRST116') // No rows returned

// RLS allows access - returns data, no error  
expect(allowedData).not.toBeNull()
expect(error).toBeNull()
```

## User Feedback & Requirements
- Focus on making tests "easy to write, correct, and useful"
- Don't care about performance optimization at this stage
- Prefer fewer, high-coverage tests over comprehensive edge case testing
- Delete/amalgamate old tests rather than maintaining cruft
- Follow established authentication testing patterns in codebase