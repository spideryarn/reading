# Update Housekeeping Tests

This document describes the process for maintaining test quality and organisation while supporting rapid prototyping. Testing housekeeping should be performed regularly to consolidate redundant tests, remove obsolete files, and ensure the test suite provides high value with low maintenance burden.

## See also

- `docs/reference/TESTING_OVERVIEW.md` - Overall testing strategy and philosophy
- `docs/reference/TESTING_SETUP.md` - Test configuration and setup guidelines  
- `docs/reference/TESTING_TROUBLESHOOTING.md` - Known issues and debugging strategies  
- `docs/instructions/UPDATE_INDEX_FOR_DOCUMENTATION.md` - General housekeeping process pattern that inspired this approach
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

**⚠️ IMPORTANT**: Use TodoWrite at the start of housekeeping to create a comprehensive task list covering all stages. Update todos as you progress through each stage, marking items completed and adding new todos as issues are discovered.

### Stage: Health Check & Analysis

**Create Initial Todolist:**
Use TodoWrite to create initial task tracking covering:
- Health check and analysis
- Critical issues resolution 
- Test consolidation (prioritizing older tests)
- File cleanup and organisation
- Performance optimisation
- Documentation updates
- Final validation

**Test Suite Status Assessment:**
1. Run full test suite: `npm test`
2. Use subagent to provide structured analysis:
   **Subagent Instructions**: "You are performing Stage 1 (Health Check & Analysis) of test housekeeping as outlined in docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md. Provide structured analysis focusing on:"
   - Total tests, pass/fail/skip counts
   - **PRIORITY**: Categorise failures by age - oldest failing tests first
   - Categorise failures by type (infrastructure, flaky, outdated)
   - Identify slow-running tests (>5 seconds)
   - Note any console warnings or deprecation messages
   - Flag any tests where the test appears correct but code may be wrong

**Test File Audit:**
1. **PRIORITY**: Sort test files by creation/modification date - focus on oldest files first
2. **Use subagent**: "You are performing test file audit in Stage 1 of docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md. Focus on oldest files first and identify:"
   - Test files last modified >1 week ago (prime candidates for aggressive consolidation)
   - Check for duplicate test coverage across files
   - Find obsolete test files in `/tests/` or other non-standard locations
   - Look for standalone Node.js test scripts that should be converted or removed
3. **Add todos**: Create specific todos for each problematic test file/area discovered

**Infrastructure Validation:**
1. Verify `.env.test` exists (tests should abort if missing)
2. Check for real LLM API calls in tests (should be mocked)
3. Ensure database tests use proper isolation
4. Validate mock configurations are working

### Stage: Critical Issues Resolution

**⚠️ CRITICAL DECISION POINT**: If you discover a test where you believe the test is correct but the code is wrong:
- **DO NOT fix the code** - this is outside the scope of test housekeeping
- **Skip the test** and mark it for user discussion
- **Add a todo**: "Discuss with user: Test XYZ appears correct but code may be wrong - needs investigation"
- **Document the issue** clearly for later review

**Fix Broken Infrastructure:**
- Environment configuration issues (missing `.env.test`)
- Import path mismatches (`.js` vs `.ts` extensions)  
- Mock setup problems (NextRequest, LLM APIs)
- Test helper utility failures

**Address Reliability Issues (Focus on Oldest First):**
- **PRIORITY**: Start with oldest failing tests
- Flaky tests that fail intermittently
- Tests dependent on external services
- Race conditions in async test code
- Resource cleanup problems

**Use subagents for complex issues:**
"You are performing Stage 2 (Critical Issues Resolution) from docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md. Focus on oldest failing tests first. If you find a test where the test logic appears correct but the code seems wrong, SKIP IT and report back for user discussion. Your goal: fix infrastructure and reliability issues only."

**Commit Progress**: After resolving critical infrastructure issues, commit changes: "fix: resolve test infrastructure issues for [specific area]"

### Stage: Test Consolidation

**Update Todolist**: Add specific todos for each consolidation area identified, prioritizing oldest tests first.

**Identify Consolidation Candidates (Oldest First):**
1. **Component Unit Tests** → Feature-level integration tests (preferably Playwright E2E)
   - Example: Individual button, form, input tests → Complete form workflow test
2. **Service Unit Tests** → Behaviour verification tests  
   - Example: Multiple database method tests → End-to-end data flow test
3. **Mock-Heavy Tests** → Real integration tests (where valuable)
   - Example: Heavily mocked API tests → Real request/response integration

**Consolidation Strategy:**
1. **PRIORITY: Focus on oldest tests first** (check file creation/modification dates to avoid conflicts with other agents)
2. **Be ruthless**: Aim to replace many unit tests with fewer, high-coverage Playwright tests
3. Group related tests by feature area
4. Create new integration test covering the behaviour (prefer Playwright E2E where possible)
5. Remove redundant detailed tests aggressively
6. Keep unit tests only for complex algorithms or critical business logic

**Use Subagents for Consolidation:**
**Subagent Instructions**: "You are performing Stage 3 (Test Consolidation) from docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md. You are working on [specific test area]. Goals: consolidate older tests first, be ruthless about removing redundant tests, create fewer but higher-coverage tests. Context: [provide feature goals and expected behaviour]. If you find tests that seem correct but code seems wrong, SKIP and report for user discussion."
- Provide rich context about feature goals and expected behaviour  
- Have subagent analyse test groups and propose consolidation plan
- Review proposed changes before implementation
- **Mark todos complete** as consolidation areas are finished

**Commit Progress**: After major consolidation work, commit changes: "test: consolidate [area] tests - reduce from X to Y tests with better coverage"

### Stage: File Cleanup & Organisation  

**Update Todolist**: Add specific todos for each cleanup area discovered.

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

**Use Subagent for File Operations:**
"You are performing Stage 4 (File Cleanup & Organisation) from docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md. Focus on removing obsolete files and improving organisation. Be conservative - when in doubt, ask before deleting files."

**Commit Progress**: After cleanup work, commit changes: "test: clean up obsolete test files and improve organisation"

### Stage: Performance & Cost Optimisation

**Update Todolist**: Add performance todos for slow tests and cost leaks identified.

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

**Use Subagent for Performance Analysis:**
"You are performing Stage 5 (Performance & Cost Optimisation) from docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md. Identify slow tests and cost leaks. Focus on LLM API mocking verification and database operation optimisation."

**Commit Progress**: After optimisation work, commit changes: "test: optimise performance and eliminate cost leaks"

### Stage: Fix Linting Errors in Tests

**Decision Point**: Discuss with user whether to fix linting errors in tests.

**If proceeding with linting fixes:**
1. **Use subagent to assess scope**: "You are performing Stage 6 (Linting Fixes) from docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md. Run linting on test files only and provide structured analysis of errors by type and complexity. Group similar issues together."
2. **Update todolist**: Add specific todos for each linting error category
3. **Use parallel subagents**: For each error category, use separate subagents with instructions: "You are fixing [specific linting error type] in test files as part of docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md Stage 6. Focus only on test files. If any fixes seem complex or risky, report back for discussion."
4. **Conservative approach**: If any linting issues look tricky, discuss with user before proceeding

**Focus**: Linting issues that affect *tests* only, not other parts of the codebase.

**Commit Progress**: After linting fixes, commit changes: "test: fix linting errors in test files"

### Stage: Documentation & Standards Update

**Update Todolist**: Add documentation todos for each area that needs updating based on consolidation work performed.

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

**Use Subagent for Documentation:**
"You are performing Stage 7 (Documentation & Standards Update) from docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md. Update testing documentation to reflect the consolidation work performed. Document new patterns and decisions made during this housekeeping session."

**Commit Progress**: After documentation updates, commit changes: "docs: update testing documentation after housekeeping consolidation"

### Stage: Validation & Completion

**Update Todolist**: Mark remaining todos complete and add any final validation todos.

**Final Validation:**
1. Run full test suite and verify 100% pass rate
2. Confirm test execution time is reasonable (<30 seconds)
3. Validate no LLM API calls during test execution
4. Check test coverage hasn't significantly decreased

**Create Summary Todo**: Add final todo to discuss any skipped tests (where test was correct but code seemed wrong) with user.

**Documentation Update:**
- Update this document with lessons learned
- Document any new patterns or decisions
- Add troubleshooting notes for future issues

**Final Commit:**
Use subagent following `docs/instructions/GIT_COMMIT_CHANGES.md` to commit final test improvements: "You are performing final commit for test housekeeping following docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md. Batch remaining changes logically and create appropriate commit messages."

**Mark All Todos Complete**: Use TodoWrite to mark housekeeping process complete.

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