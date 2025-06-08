# Test Infrastructure Cleanup & Modernisation

## Goal, context

Fix critical testing infrastructure issues blocking development velocity and consolidate test suite for maintainability. Current test suite has ~71% success rate with systematic failures in NextRequest mocking, missing environment configuration, and redundant test files. 

The immediate goal is to achieve 100% test pass rate while implementing modern testing patterns suitable for AI-assisted rapid prototyping. This includes fixing critical infrastructure issues, implementing cost-effective LLM testing strategies, and consolidating overlapping tests into high-value integration tests.

Post-cleanup, we should have a reliable test suite that supports rapid feature development without maintenance burden or cost explosion from LLM API calls.

## References

- `docs/reference/TESTING.md` - Current testing overview and setup instructions
- `docs/instructions/WRITE_PLANNING_DOC.md` - Structure and process guidelines for this document  
- `planning/250608a_test_infrastructure_cleanup.md` - This document (self-reference)
- `jest.config.js` & `jest.setup.js` - Current Jest configuration with broken Request mocking
- `app/api/__tests__/test-helpers.ts` - Contains broken NextRequest helper utilities
- Research findings from subagents on next-test-api-route-handler and testing best practices

## Principles, key decisions

**User Requirements:**
- Separate one-time cleanup (this doc) from recurring housekeeping (evergreen doc)
- Make `.env.test` required - tests should abort if missing
- Focus on consolidating old/detailed tests (>1 week) into fewer high-coverage tests
- Use tasks and subagents to avoid context window overload
- Research-first approach to identify best practices before implementation

**Testing Philosophy:**
- Integration-first testing approach for AI-assisted development
- Cost-effective LLM testing with mocking layers
- Focus on behaviour over implementation details
- Reliable test infrastructure over comprehensive coverage initially

**Critical Issues Identified:**
1. NextRequest mocking infrastructure completely broken (blocks API route testing)
2. Missing `.env.test` causing database test failures
3. LLM API calls in tests creating cost/reliability issues
4. Obsolete test files in `/tests/` directory need auditing
5. Import path mismatches (`.js` vs `.ts` extensions)

## Stages & actions

### Stage: Preparation & Sync
- [ ] Run `./scripts/sync-worktrees.ts` to sync latest changes from main
- [ ] Create `.env.test` requirement check in Jest configuration
  - [ ] Add validation in `jest.setup.js` to abort if `.env.test` missing
  - [ ] Update `docs/reference/TESTING.md` to document this requirement
  - [ ] Test the validation works by temporarily removing `.env.test`

### Stage: Critical Infrastructure Fixes
- [ ] Fix NextRequest mocking infrastructure (Priority: Critical)
  - [ ] Research and implement `next-test-api-route-handler` package as primary solution
    - [ ] Install package: `npm install --save-dev next-test-api-route-handler`
    - [ ] Create new test helper utilities using the package
    - [ ] Test with one simple API route first (e.g., `/api/fake_success_delay`)
  - [ ] Remove broken Request mock from `jest.setup.js`
  - [ ] Update `app/api/__tests__/test-helpers.ts` with working implementations
  - [ ] Fix import path error in `app/api/__tests__/tweet-thread.test.ts` (`.js` → `.ts`)
- [ ] Create `.env.test` file and verify database tests pass
  - [ ] Copy `.env.local` to `.env.test`: `cp .env.local .env.test`
  - [ ] Update `.env.test` to use test-optimised settings (e.g., `LLM_MODEL=claude-3-haiku`)
  - [ ] Run database tests to verify they now pass
- [ ] Implement LLM API mocking layer (Priority: Critical)
  - [ ] Create mock implementations for `@ai-sdk/anthropic` and `@ai-sdk/google`
  - [ ] Add mocking configuration to Jest setup
  - [ ] Update existing LLM-calling tests to use mocks
  - [ ] Verify no real API calls during test runs

### Stage: Test Suite Health Check
- [ ] Run full test suite and document results
  - [ ] Use subagent to run `npm test` and provide structured analysis
  - [ ] Categorise remaining failures by root cause
  - [ ] Create action plan for any remaining infrastructure issues
- [ ] Audit obsolete test files
  - [ ] Use subagent to analyse files in `/tests/` directory
  - [ ] Determine which are obsolete vs useful standalone tests
  - [ ] Plan migration of useful tests to Jest framework

### Stage: Test Consolidation & Modernisation
- [ ] Implement test consolidation strategy
  - [ ] Identify detailed unit tests that can be merged into integration tests
  - [ ] Focus on tests last modified >1 week ago for consolidation
  - [ ] Prioritise high-maintenance/low-value tests for removal
  - [ ] Use subagent to group tests by feature area and propose consolidation plan
- [ ] Migrate useful standalone tests to Jest
  - [ ] Convert Node.js standalone tests to Jest format
  - [ ] Remove obsolete test files from `/tests/` directory
  - [ ] Update any remaining scripts to use Jest infrastructure
- [ ] Implement modern testing patterns
  - [ ] Add integration-first testing for new features
  - [ ] Establish guidelines for when to use unit vs integration tests
  - [ ] Document testing patterns for AI-assisted development

### Stage: Documentation & Process Updates
- [ ] Update testing documentation
  - [ ] Update `docs/reference/TESTING.md` with new requirements and patterns
  - [ ] Document LLM mocking strategy and cost considerations
  - [ ] Add troubleshooting section for common issues
- [ ] Create test infrastructure monitoring
  - [ ] Add test performance tracking
  - [ ] Document test environment separation strategy
  - [ ] Plan future browser automation integration

### Stage: Validation & Completion
- [ ] Final test suite validation
  - [ ] Achieve 100% test pass rate
  - [ ] Verify no real LLM API calls during tests
  - [ ] Confirm test execution time is reasonable (<30 seconds)
- [ ] Update planning doc with final results
- [ ] Commit changes following `docs/instructions/GIT_COMMITS.md`
- [ ] Move this doc to `planning/finished/` and commit

# Appendix

## Research Summary: Next.js API Testing Solutions

**next-test-api-route-handler** emerges as the clear winner:
- Specifically designed for Next.js App Router API testing
- Compatible with Next.js 15 and React 19
- Handles NextRequest/NextResponse complexity automatically
- Active maintenance and community support
- Simple migration path from broken current approach

**Alternative approaches considered:**
- Manual NextRequest construction (complex, error-prone)
- Mock Service Worker (overkill for current needs)
- next-router-mock (doesn't solve API route testing)

## Current Test Health Baseline

From subagent analysis:
- **Total**: 830 tests (594 passed, 212 failed, 24 skipped)
- **Success Rate**: ~71.5%
- **Major Failure Categories**:
  1. Environment config issues (missing `.env.test`)
  2. NextRequest mocking failures 
  3. Import path mismatches
  4. React Testing Library DOM issues

## Critical Implementation Notes

**LLM Mocking Strategy:**
```typescript
// __mocks__/@ai-sdk/anthropic.js
export const anthropic = {
  chat: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Mocked response' }],
    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
  })
};
```

**Cost-Effective Testing Hierarchy:**
1. Unit tests: Full mocking (99% of tests)
2. Integration tests: Cheap models with rate limits  
3. E2E tests: Real APIs, limited runs

**File Consolidation Candidates:**
- Component unit tests → Feature integration tests
- Detailed service tests → Behaviour verification tests
- Mock-heavy tests → Real integration tests where valuable

## Security & Performance Considerations

**Missing Security Tests:**
- File upload validation and security
- RLS policy testing completeness
- API rate limiting verification
- Input sanitisation for AI outputs

**Performance Targets:**
- Full test suite: <30 seconds
- Individual test files: <5 seconds
- Database test isolation: <1 second per test
- Zero LLM API costs during testing