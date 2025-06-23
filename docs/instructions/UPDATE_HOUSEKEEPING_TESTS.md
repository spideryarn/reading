# Update Housekeeping Tests

This document describes the process for maintaining test quality and organisation while supporting rapid prototyping. Testing housekeeping should be performed regularly to consolidate redundant tests, remove obsolete files, and ensure the test suite provides high value with low maintenance burden.

## See also

- `docs/reference/TESTING_OVERVIEW.md` - Overall testing strategy and philosophy
- `docs/reference/TESTING_SETUP.md` - Test configuration and setup guidelines  
- `docs/reference/TESTING_TROUBLESHOOTING.md` - Known issues and debugging strategies  
- `docs/instructions/UPDATE_HOUSEKEEPING_DOCUMENTATION.md` - General housekeeping process pattern that inspired this approach
- `docs/instructions/WRITE_PLANNING_DOC.md` - For creating one-time test cleanup planning documents
- `docs/instructions/GIT_COMMIT_CHANGES.md` - How to commit test improvements
- `planning/250608a_test_infrastructure_cleanup.md` - Example one-time infrastructure cleanup planning
- `jest.config.js` & `jest.setup.js` - Jest configuration and test setup

## Testing Philosophy for Rapid Prototyping

**Integration-First Approach**: Focus on integration tests over detailed unit tests for AI-assisted development. Integration tests are more resilient to implementation changes and provide better value during rapid iteration.

**Test Consolidation Principles**:
- Merge detailed unit tests into fewer, high-coverage integration tests
- Remove tests that provide low value relative to maintenance burden
- Keep only unit tests for complex algorithms or critical business logic
- Prioritise behaviour verification over implementation details

**Cost-Effective Testing**: Avoid expensive LLM API calls and database operations in tests through strategic mocking and environment separation.

## When to Perform Testing Housekeeping

Perform testing housekeeping:
- **After major feature implementations** - Consolidate development tests into maintainable suite
- **Weekly during active development** - Remove redundant tests from recent work
- **When test execution becomes slow** - Identify and optimise expensive tests
- **When test failures become noisy** - Clean up flaky or unreliable tests  
- **Before major releases** - Ensure test suite is clean and reliable

## Process Overview

### Stage: Health Check & Analysis

**Test Suite Status Assessment:**
1. Run full test suite: `npm test`
2. Use subagent to provide structured analysis:
   - Total tests, pass/fail/skip counts
   - Categorise failures by type (infrastructure, flaky, outdated)
   - Identify slow-running tests (>5 seconds)
   - Note any console warnings or deprecation messages

**Test File Audit:**
1. Identify test files last modified >1 week ago (candidates for consolidation)
2. Check for duplicate test coverage across files
3. Find obsolete test files in `/tests/` or other non-standard locations
4. Look for standalone Node.js test scripts that should be Jest tests

**Infrastructure Validation:**
1. Verify `.env.test` exists (tests should abort if missing)
2. Check for real LLM API calls in tests (should be mocked)
3. Ensure database tests use proper isolation
4. Validate mock configurations are working

### Stage: Critical Issues Resolution

**Fix Broken Infrastructure:**
- Environment configuration issues (missing `.env.test`)
- Import path mismatches (`.js` vs `.ts` extensions)  
- Mock setup problems (NextRequest, LLM APIs)
- Test helper utility failures

**Address Reliability Issues:**
- Flaky tests that fail intermittently
- Tests dependent on external services
- Race conditions in async test code
- Resource cleanup problems

Use subagents for diagnosis and repair of complex infrastructure issues.

### Stage: Test Consolidation

**Identify Consolidation Candidates:**
1. **Component Unit Tests** → Feature-level integration tests
   - Example: Individual button, form, input tests → Complete form workflow test
2. **Service Unit Tests** → Behaviour verification tests  
   - Example: Multiple database method tests → End-to-end data flow test
3. **Mock-Heavy Tests** → Real integration tests (where valuable)
   - Example: Heavily mocked API tests → Real request/response integration

**Consolidation Strategy:**
1. Start with oldest tests (>2 weeks since last modification)
2. Group related tests by feature area
3. Create new integration test covering the behaviour
4. Remove redundant detailed tests
5. Keep unit tests only for complex algorithms or edge cases

**Use Subagents for Consolidation:**
- Provide rich context about feature goals and expected behaviour  
- Have subagent analyse test groups and propose consolidation plan
- Review proposed changes before implementation

### Stage: File Cleanup & Organisation  

**Remove Obsolete Files:**
- Delete empty or placeholder test files
- Remove duplicate test implementations
- Clean up development/debugging test scripts
- Archive useful standalone tests to Jest framework

**Improve Test Organisation:**
- Ensure tests are in `__tests__` directories alongside code
- Group related tests in appropriate modules
- Remove orphaned test files for deleted features
- Update test file naming for clarity

### Stage: Performance & Cost Optimisation

**Optimise Test Performance:**
- Identify and fix slow tests (database heavy, complex setup)
- Implement proper test parallelisation
- Reduce test data setup overhead
- Cache expensive test fixtures

**Eliminate Cost Leaks:**
- Verify all LLM API calls are mocked in tests
- Check for expensive database operations
- Ensure file upload tests use mock data
- Validate test environment separation

### Stage: fix linting errors in tests?
- Discuss with user. If we decide to fix linting, then use a subagent to run linting on the tests, and provide enough output for you to see what's going on, so that you can group the tests that need fixing, and ask multiple subagents in parallel to fix them.
- If in doubt, err on the side of caution, e.g. if some linting issues in tests look tricky, then discuss with user before proceeding
(Focus on linting issues that affect *tests* (rather than other parts of the code) for this piece of work)

### Stage: Documentation & Standards Update

**Update Documentation:**
- Update testing documentation with new patterns (TESTING_OVERVIEW.md for philosophy, TESTING_SETUP.md for configuration, TESTING_TROUBLESHOOTING.md for known issues)
- Document consolidation decisions and rationale
- Add examples of preferred testing approaches
- Update troubleshooting guides

**Establish Guidelines:**
- When to use unit vs integration tests
- Mocking strategies for different scenarios  
- Test file organisation standards
- Performance and cost targets

### Stage: Validation & Completion

**Final Validation:**
1. Run full test suite and verify 100% pass rate
2. Confirm test execution time is reasonable (<30 seconds)
3. Validate no LLM API calls during test execution
4. Check test coverage hasn't significantly decreased

**Documentation Update:**
- Update this document with lessons learned
- Document any new patterns or decisions
- Add troubleshooting notes for future issues

**Commit Changes:**
Use subagent following `docs/instructions/GIT_COMMIT_CHANGES.md` to commit test improvements in logical batches.

## Implementation Approaches

### Self-Contained Execution
For routine housekeeping, execute all stages using tasks and subagents without generating separate planning documents. This works well for:
- Regular weekly/monthly maintenance
- Small-scale consolidation efforts  
- Performance optimisations

### Planning Document Generation
For complex test infrastructure changes, generate a planning document using `docs/instructions/WRITE_PLANNING_DOC.md`. This approach is better for:
- Major testing framework changes
- Large-scale test consolidation projects
- Infrastructure modernisation efforts
- Multi-week test improvement initiatives

## Test Consolidation Guidelines

### Keep as Unit Tests
- **Complex Algorithms**: Mathematical calculations, data transformations
- **Critical Business Logic**: Payment processing, user permissions
- **Edge Case Handling**: Error conditions, boundary values
- **Performance-Critical Code**: Functions with specific performance requirements

### Consolidate into Integration Tests  
- **UI Component Interactions**: Form submissions, navigation flows
- **API Route Workflows**: Request/response cycles with database  
- **Feature Workflows**: Complete user actions across multiple components
- **Service Integrations**: Third-party API interactions

### Remove Entirely
- **Implementation Detail Tests**: Testing internal helper functions
- **Mock-Heavy Tests**: Tests with more mocking code than actual logic
- **Duplicate Coverage**: Multiple tests for the same behaviour
- **Obsolete Feature Tests**: Tests for removed or replaced functionality

## Common Patterns

### Before Consolidation
```javascript
// Multiple component unit tests
test('Button renders correctly', () => { ... });
test('Form validates input', () => { ... });  
test('Submit handler called', () => { ... });
test('Error message displays', () => { ... });
```

### After Consolidation
```javascript  
// Single integration test
test('Contact form submission workflow', () => {
  // Render form, fill inputs, submit, verify success
  // Covers button rendering, validation, submission, error handling
});
```

### LLM Mocking Pattern
```javascript
// __mocks__/@ai-sdk/anthropic.js
export const anthropic = {
  chat: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Mocked AI response' }],
    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
  })
};
```

## Troubleshooting Common Issues

### Environment Problems
- **Missing `.env.test`**: Copy from `.env.local` and update for test settings
- **Database connection failures**: Ensure Supabase test instance running
- **LLM API key errors**: Verify mocking is working, not hitting real APIs

### Performance Issues  
- **Slow test runs**: Check for database queries, file operations, unoptimised mocks
- **Memory leaks**: Ensure proper cleanup in `afterEach` hooks
- **Resource conflicts**: Use proper test isolation and parallel execution

### Reliability Issues
- **Flaky tests**: Look for timing issues, async/await problems, shared state
- **Intermittent failures**: Check for race conditions, external dependencies
- **Mock failures**: Verify mock setup matches actual API signatures

## Future Considerations (Appendix)

### Browser Automation Integration
Consider integrating Puppeteer/Playwright tests for critical user journeys:
- Use MCP Puppeteer (preferred) or Playwright for AI-assisted browser testing
- Focus on happy path workflows only
- Run separately from main test suite for performance
- Generate tests using AI based on user stories

### Advanced Testing Patterns
- **Contract Testing**: For API integrations and service boundaries
- **Visual Regression Testing**: For UI component changes
- **Performance Testing**: For database queries and LLM response times
- **Security Testing**: For authentication, file uploads, input validation

### Test Environment Evolution
- **Separate Test Database**: Dedicated Supabase project for testing
- **Test Data Factories**: Consistent test data generation
- **Parallel Test Execution**: Optimise CI/CD pipeline performance
- **Cost Monitoring**: Track and optimise testing expenses

These advanced patterns should be considered once the core testing infrastructure is stable and the basic housekeeping process is established.