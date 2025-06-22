# E2E Test Consolidation and Coverage Improvement

## Goal

Dramatically reduce the number of lines of code in our test suite while maintaining or improving our ability to catch regression bugs. We will achieve this by:
1. Expanding E2E test coverage to replace redundant unit tests
2. Consolidating overlapping unit tests into comprehensive E2E scenarios
3. Maintaining only high-value unit tests for complex algorithms and critical business logic

**Current State**: 22,205 lines of unit tests vs 2,331 lines of E2E tests (9.5:1 ratio)
**Target State**: ~14,700 lines of unit tests vs ~3,500 lines of E2E tests (4:1 ratio)
**Net Reduction**: ~6,300 lines of test code (~27% reduction)

## Context

Our test suite has grown organically with AI-first development, resulting in significant overlap between unit and E2E tests. Many unit tests heavily mock system behaviour that could be better tested through actual user journeys. The recent addition of Playwright E2E tests has shown that one comprehensive E2E test can replace 50+ unit tests while providing better confidence in system behaviour.

## References

- `docs/reference/TESTING_OVERVIEW.md` - Current testing infrastructure and philosophy
- `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` - Playwright E2E testing capabilities and patterns
- `docs/reference/TESTING_E2E_COVERAGE.md` - Current E2E test coverage tracking
- `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` - Test maintenance guidelines
- `docs/reference/TESTING_DATABASE.md` - Real RLS testing patterns (keep security-critical tests)
- `docs/reference/TESTING_AUTHENTICATION.md` - Authentication testing patterns
- `docs/reference/CODING_PRINCIPLES.md` - AI-first development principles

## Principles & Key Decisions

1. **E2E-First Approach**: Prefer E2E tests for user-facing features and workflows
2. **Keep Critical Unit Tests**: Maintain unit tests only for:
   - Complex algorithmic logic with edge cases
   - Security-critical code (e.g., RLS policies)
   - Performance-critical calculations
   - Pure utility functions without UI
3. **Avoid Mock-Heavy Tests**: Any test with >5 mocks is a candidate for E2E replacement
4. **Real System Behaviour**: Test actual API calls, database operations, and user interactions
5. **Consolidation Over Coverage**: Better to have fewer, high-quality tests than many brittle ones
6. **Gradual Migration**: Phase the consolidation to maintain test coverage during transition

## Stages & Actions

### Stage: Preparation and Analysis
- [ ] Run `./scripts/sync-worktrees.ts` in a subagent to pull latest changes from main
- [ ] Create detailed inventory of current test files with line counts and mock usage
- [ ] Identify test files with highest mock usage for prioritisation
- [ ] Review E2E test infrastructure to ensure it's ready for expansion

### Stage: Phase 1 - Authentication and Authorization Consolidation
- [ ] Write comprehensive E2E test for authentication flows covering:
  - Email login/signup with validation
  - Google OAuth flow
  - Session persistence and refresh
  - Protected route access patterns
  - API authorization checks
- [ ] Identify unit tests to remove:
  - `auth-user-workflows-integration.test.tsx`
  - `auth-system-integration.test.tsx` 
  - API auth validation tests
  - Mock-heavy auth component tests
- [ ] Keep only critical auth unit tests:
  - RLS policy tests (security-critical)
  - Token validation logic
- [ ] Run all tests in subagent to ensure no regressions
- [ ] Remove identified redundant unit tests
- [ ] Update `docs/reference/TESTING_E2E_COVERAGE.md` with new coverage
- [ ] Git commit changes with clear message about consolidation

### Stage: Phase 2 - Document Upload and Processing Consolidation
- [ ] Write E2E tests for document upload scenarios:
  - PDF upload with progress tracking
  - URL extraction and processing
  - HTML content upload
  - Error handling and validation
  - Upload metadata tracking
- [ ] Identify unit tests to remove:
  - Mock-heavy upload API tests
  - File handling simulation tests
  - Upload progress component tests
- [ ] Keep only:
  - Content sanitization logic tests
  - File type detection utilities
- [ ] Verify upload functionality with Playwright MCP in subagent
- [ ] Remove redundant unit tests
- [ ] Update E2E coverage documentation
- [ ] Git commit consolidation changes

### Stage: Phase 3 - Search Functionality Consolidation
- [ ] Write comprehensive E2E search tests:
  - Basic text search with highlighting
  - Semantic search with AI
  - Search result navigation
  - Cross-document search
  - Search persistence
- [ ] Consolidate 23+ search unit test files into E2E coverage
- [ ] Keep only:
  - Search algorithm optimisation tests
  - Text extraction utility tests
- [ ] Test search UI with various edge cases
- [ ] Remove redundant search unit tests
- [ ] Update coverage tracking
- [ ] Git commit changes

### Stage: Phase 4 - AI Features and Tools Consolidation
- [ ] Write E2E tests for AI features:
  - Chat conversation flow with real LLM calls
  - AI heading generation and display
  - Glossary generation
  - Summary generation at multiple levels
  - Tweet thread generation
- [ ] Use test-appropriate LLM models (Haiku/Gemini) for cost efficiency
- [ ] Remove mock-heavy AI unit tests
- [ ] Keep algorithm-specific tests (e.g., prompt construction)
- [ ] Verify AI features work end-to-end
- [ ] Remove redundant tests
- [ ] Update documentation
- [ ] Git commit

### Stage: Phase 5 - Component Integration Test Replacement
- [ ] Convert component integration tests to E2E:
  - Layout and navigation flows
  - Unified left pane interactions
  - Tools pane functionality
  - Cross-pane communication
- [ ] These are already integration tests - natural E2E candidates
- [ ] Remove all `*-integration.test.tsx` files
- [ ] Verify UI behaviour with Playwright screenshots
- [ ] Update coverage documentation
- [ ] Git commit final consolidation

### Stage: External Review and Documentation
- [ ] Follow `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS.md` for external critique
- [ ] Update `docs/reference/TESTING_OVERVIEW.md` with new testing philosophy
- [ ] Update `docs/reference/TESTING_E2E_COVERAGE.md` with final coverage map
- [ ] Create migration guide for future test writing
- [ ] Document patterns for when to write unit vs E2E tests

### Stage: Final Validation and Cleanup
- [ ] Run comprehensive test suite in subagent:
  - `npm run build` - TypeScript compilation
  - `npm run lint` - Code quality
  - `npm test` - All remaining unit tests
  - `npx playwright test` - All E2E tests
- [ ] Analyse final metrics:
  - Total line reduction achieved
  - Test execution time comparison
  - Coverage percentage maintained
- [ ] Use subagent to identify any missed consolidation opportunities
- [ ] Create summary report of consolidation results
- [ ] Git commit any final changes
- [ ] Move this planning doc to `planning/finished/`

## Appendix

### A. High-Impact Unit Test Removal Candidates

Based on analysis, these test files are prime candidates for removal after E2E coverage:

**Authentication (24 files, ~3,000 lines)**:
- Heavy mocking of Supabase auth
- Testing UI state that's better verified through actual login flows
- API route auth that's covered by E2E API calls

**Upload/Processing (15 files, ~2,500 lines)**:
- Extensive FormData and file mocking
- API response simulation
- Progress tracking that's visible in E2E

**Search (23 files, ~2,000 lines)**:
- Mock search results and highlighting
- Duplicated semantic search tests
- UI state management tests

### B. Unit Tests to Keep

These categories should remain as unit tests:

1. **Security-Critical**:
   - RLS policy tests (real database testing)
   - Permission calculation logic
   - Token validation

2. **Algorithm-Heavy**:
   - Text extraction algorithms
   - Search ranking calculations
   - Content sanitization rules

3. **Pure Utilities**:
   - Date formatting
   - ID generation
   - String manipulation

### C. E2E Test Optimisation Strategies

To keep E2E tests fast and maintainable:

1. **Parallel Execution**: Run independent scenarios concurrently
2. **Smart Waits**: Use Playwright's auto-waiting instead of arbitrary timeouts
3. **Test Data Isolation**: UUID namespaces prevent conflicts
4. **Selective Screenshots**: Only on failures or key checkpoints
5. **Shared Authentication**: Reuse auth state across related tests

### D. Migration Metrics Tracking

Track these metrics throughout consolidation:
- Lines of code removed vs added
- Test execution time before/after
- Number of mocks eliminated
- API calls now tested real vs mocked
- Developer feedback on test reliability