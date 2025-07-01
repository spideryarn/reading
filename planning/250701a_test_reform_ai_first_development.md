# Test Reform for AI-First Development

## Goal

Reform our testing approach to address the current situation where ~28% of test suites are broken, tests are brittle, and AI agents struggle with mock-heavy unit tests. Move towards a more pragmatic testing strategy that provides high confidence with less maintenance burden.

## Context

Current pain points:
- 28.2% of test suites have failures despite 90.5% individual test pass rate
- Mock configuration issues causing TypeScript module mocking failures
- Database isolation problems with foreign key constraints and RLS violations
- AI agents often encounter "page won't load" issues that tests don't catch
- Tests are brittle and break on minor refactors
- Concern about AI modifying tests to make them pass rather than fixing code

## User Stories & Acceptance Criteria

As a developer using AI agents for coding:
- I want tests that catch real bugs, not implementation details
- I want to spend less time fixing broken tests and more time building features
- I want confidence that when tests pass, the application actually works
- I want tests that don't break when AI agents refactor code

Success criteria:
- Reduce test suite failure rate from 28% to 0%
- Tests catch "page won't load" issues before manual testing
- Test maintenance time reduced by >50%
- $20/month LLM cost budget is sufficient for all testing
- Test runtime under 5 minutes for common development workflows
- Very few mocks remaining (maybe a few of the most expensive LLM calls)
- Less than 20% of lines of code as tests - run `./scripts/count_lines.sh --exclude-tests` with a subagent to count. This script uses `cloc` to count source code lines, excluding tests by file patterns (`.*\.(test|spec)\.(ts|tsx|js|jsx)$|jest\.setup\.js$|jest\.config\.js$`) and directories (`__tests__|tests`). The final percentage is calculated as: `test_lines / (source_lines + test_lines) * 100`
- No linter failures


## References

- `docs/reference/TESTING_AI_FEATURE_TEST_ANALYSIS.md` - Analysis of testing challenges in AI-first development
- `docs/reference/TESTING_DATABASE.md` - Current database isolation approach using RLSTestDatabase
- `docs/reference/TESTING_OVERVIEW.md` - Existing testing philosophy
- `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` - E2E testing with Playwright
- `CLAUDE.md` - Existing guidance about test modification

## Principles & Key Decisions

1. **Fewer, higher-confidence tests** - 50% coverage of critical paths beats 100% coverage with brittle tests
2. **Real over mocked** - Use database isolation instead of mocks wherever possible
3. **E2E first** - Test user journeys, not implementation details
4. **Budget-conscious LLM testing** - Use cheap models (Haiku/Gemini) within $20/month budget
5. **Fail fast** - Surface issues early rather than masking them
6. **Test immutability** - AI must discuss test changes with user before modifying

## Stages & Actions

### Stage: Research and Analysis
- [x] Analyze current test suite health and failure patterns
- [x] Research 2025 best practices for AI-first development testing
- [ ] Use subagent to identify which test files provide highest value vs maintenance cost
- [ ] Create proof-of-concept comparing testing approaches for one feature

**Parallel execution opportunity**: The value analysis and proof-of-concept can be run concurrently with separate subagents, both referencing this planning doc and the current test failure patterns.

### Stage: Update Testing Guidelines *(Sequential)*
- [ ] Update `docs/reference/TESTING_AI_FEATURE_TEST_ANALYSIS.md` with agreed approach
- [ ] Create new section in CLAUDE.md about test modification policy
- [ ] Update `docs/reference/TESTING_OVERVIEW.md` with new testing hierarchy

**Sequential requirement**: These documentation updates should be done sequentially to ensure consistency across files and prevent conflicting updates.

### Stage: Mock Elimination Phase 1 - Database Mocks *(Parallel candidate)*
- [ ] Identify all tests using database mocks
- [ ] Convert to use RLSTestDatabase with real database calls
- [ ] Remove obsolete database mock files
- [ ] Run tests to verify no regressions

**Parallel execution opportunity**: Multiple subagents can work on different test files simultaneously. Each subagent should:
- Reference this planning doc for context and approach
- Use `docs/reference/TESTING_DATABASE.md` for RLSTestDatabase patterns
- Focus on specific test directories to avoid conflicts
- Report back which files they modified for coordination

### Stage: Mock Elimination Phase 2 - Service Mocks *(Parallel candidate)*
- [ ] Map all service-level mocks in the codebase
- [ ] Create test doubles at service boundaries (not implementation level)
- [ ] Convert tests to use higher-level mocks or real services
- [ ] Document remaining essential mocks and why they're needed

**Parallel execution opportunity**: After mapping is complete, conversion work can be parallelized by service area. Provide subagents with the mapping results and this planning doc for guidance.

### Stage: E2E Test Suite Development *(Parallel candidate)*
- [ ] Identify top 10 critical user journeys
- [ ] Write E2E tests for each journey using Playwright
- [ ] Add "page loads successfully" smoke tests for all routes
- [ ] Create E2E test running guide for AI agents

**Parallel execution opportunity**: After journey identification, multiple subagents can write E2E tests for different user journeys simultaneously. Each subagent should:
- Reference `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md`
- Use headless and isolated mode for Playwright
- Ensure dev server is running before starting tests
- Follow the authentication patterns from existing E2E tests

### Stage: Test Culling *(Parallel candidate)*
- [ ] Fix linter failures
- [ ] Use subagent to identify tests that:
  - Test trivial transformations
  - Break on every refactor
  - Mock everything
  - Have never caught real bugs
- [ ] Create list for user review
- [ ] Delete approved tests
- [ ] Update test coverage metrics to reflect new approach
- [ ] Aim to end up with <20% lines of code as tests (use `./scripts/count_lines.sh --exclude-tests` methodology)

**Parallel execution opportunity**: Different subagents can analyze different test directories for culling candidates. Each should reference this planning doc and provide detailed rationale for deletion recommendations.

### Stage: LLM Testing Patterns *(Parallel candidate)*
- [ ] Implement snapshot testing for AI outputs
- [ ] Create property-based tests for AI feature invariants
- [ ] Set up response caching for expensive LLM calls in tests
- [ ] Document patterns in testing guides
- [ ] Determine which are probably the most expensive tests (in terms of LLM outputs), and use mocks only for those

**Parallel execution opportunity**: Different AI testing patterns can be implemented concurrently by separate subagents, each focusing on specific AI features (summarize, glossary, headings, etc.).

### Stage: CI/CD Integration *(Sequential)*
- [ ] Create fast smoke test suite (< 1 minute)
- [ ] Set up parallel test execution for E2E tests (make sure we always run E2E tests with Playwright in *headless* and *isolated* mode)
- [ ] Configure test result reporting with failure patterns

**Sequential requirement**: CI/CD integration needs to happen after test restructuring is complete to avoid conflicts.

### Stage: Final Cleanup and Documentation *(Sequential)*
- [ ] Run final health check: `npm run check:health --rigorous`
- [ ] Update all testing documentation with new approach
- [ ] Create migration guide for remaining old-style tests
- [ ] Move planning doc to `planning/finished/`

**Sequential requirement**: Final cleanup and documentation must happen last to capture the complete transformation.

## Appendix

### Test Hierarchy (New Approach)

```
1. Critical E2E Tests (5-10 tests) - 80% confidence
   - User can sign up and access dashboard
   - Document upload and processing works
   - AI features generate expected outputs
   
2. API Contract Tests - 15% confidence  
   - API endpoints return expected shapes
   - Database operations respect constraints
   - Service boundaries are maintained
   
3. Complex Logic Unit Tests - 5% confidence
   - Algorithm correctness
   - Edge case handling
   - Performance-critical code
```

### Mock Migration Example

Before (brittle):
```typescript
jest.mock('@/lib/services/DocumentService')
jest.mock('@/lib/prompts/types')
```

After (robust):
```typescript
const testDb = new RLSTestDatabase(namespace)
const realService = new DocumentService(testDb.client)
// Test with real service, real DB, isolated data
```

### LLM Cost Calculation

With $20/month budget:
- Claude Haiku: ~13M tokens/month
- Gemini Flash: ~40M tokens/month
- Average test: ~1K tokens
- Capacity: 13,000-40,000 test runs/month
- With caching: effectively unlimited for most use cases

### Property-Based Testing Example

Instead of:
```typescript
expect(glossary).toEqual({ 
  "AI": "Artificial Intelligence",
  "ML": "Machine Learning" 
})
```

Use:
```typescript
expect(glossary).toMatchObject({
  // Must be valid JSON
  // All values must be strings
  // No empty values
})
expect(Object.keys(glossary).length).toBeGreaterThan(0)
```