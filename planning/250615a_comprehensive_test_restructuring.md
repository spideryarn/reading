# Comprehensive Test Restructuring Planning Document

**Date**: 2025-06-15  
**Author**: Claude (AI Assistant)  
**Status**: IN PROGRESS - Stage 1 Complete  
**Type**: Infrastructure Overhaul  
**Estimated Duration**: 2-3 weeks

## Stage 1 Update (2025-06-15)

Stage 1 Deep Audit & Categorisation is **COMPLETE**. Key findings:
- **Actual test volume**: ~34,519 lines (higher than initial 20k estimate)
- **Infrastructure issues**: Blocking 284+ tests from running
- **Consolidation opportunity**: 74% reduction achievable (to ~9,000 lines)
- **Quick wins identified**: Can remove 4,593 lines immediately

See deliverables:
- Infrastructure Analysis: Identified ESM, database model, UUID issues
- Component Inventory: `docs/planning/test-inventory-stage1-components-ui.md`
- Service Inventory: Comprehensive analysis in subagent report
- Hooks/API Inventory: `docs/reference/TEST_INVENTORY_HOOKS_UTILS_API.md`
- AI Feature Analysis: `AI_FEATURE_TEST_ANALYSIS.md`
- Consolidation Matrix: `docs/planning/test-consolidation-opportunity-matrix.md`

## Key Learnings from Stage 1

### 1. Infrastructure Fixes Are Critical Path
- 284+ tests are blocked by 5 infrastructure issues
- Fixing these first will dramatically improve metrics
- ESM/nuqs issue alone blocks 18 test suites

### 2. AI Test Failures Are Mostly False Alarms
- Chat functionality is actually working (API tests pass)
- Auth middleware is blocking most AI route tests
- Component tests just need mock updates

### 3. Massive Duplication in Component Tests
- UnifiedLeftPane has 8 separate test files!
- Same functionality tested multiple ways
- Easy consolidation opportunity

### 4. API Tests Are Wrong Abstraction Level
- 7,823 lines testing HTTP request/response
- Better tested through browser automation
- Keep only internal API validation

### 5. Pure Function Tests Are High Value
- Utils tests are clean and valuable
- No need for hooks unit tests
- Keep algorithmic/security tests

## Executive Summary

This document outlines a comprehensive restructuring of the Spideryarn Reading test suite to address the current challenges of:
- ~20k lines of tests (36% of codebase) with ~70% failure rate
- AI-related features (chat, headings) currently broken in tests
- Need to transition towards integration and browser automation testing
- Excessive unit test granularity hindering rapid AI-first development

The goal is to reduce test volume by 60-80% while improving reliability and value, focusing on critical user flows and integration testing.

## See Also

- `docs/reference/TESTING_OVERVIEW.md` - Current testing philosophy and approach
- `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` - Test maintenance process
- `docs/reference/TESTING_DATABASE.md` - Database testing patterns
- `docs/reference/CODING_PRINCIPLES.md` - AI-first development principles
- `planning/250608a_test_infrastructure_cleanup.md` - Previous test cleanup effort

## Background & Context

### Current State Analysis
- **Total codebase**: ~55k lines
- **Test code**: ~34,519 lines (63% - much higher than initial estimate)
- **Pass rate**: ~76% at test level, but 58.5% of test suites failing
- **Key failures**: Infrastructure issues blocking 284+ tests from even running
- **Test distribution**: 
  - Components & UI: 16,749 lines (48.5%)
  - Services & Logic: 7,923 lines (23%)
  - API Routes: 7,823 lines (22.7%)
  - Hooks & Utils: 2,024 lines (5.8%)

### Pain Points
1. **Maintenance burden**: Too many granular tests breaking with minor changes
2. **False signals**: Many test failures not indicating real bugs
3. **AI feature gaps**: Critical features like chat/headings poorly tested
4. **Development friction**: Tests hindering rather than helping AI-first development

### Strategic Goals
1. Reduce test volume to ~5-8k lines (10-15% of codebase)
2. Achieve 90%+ pass rate on remaining tests
3. Focus on integration and browser automation tests
4. Prioritise critical user flows over implementation details
5. Make tests useful for AI agents detecting regressions

## Success Criteria

1. **Volume Reduction**: Test codebase reduced by 60-80%
2. **Pass Rate**: >90% of remaining tests passing consistently
3. **Coverage Focus**: Critical user flows have integration test coverage:
   - Document upload flow
   - AI semantic search/highlighting
   - Chat functionality
   - Authentication flow
4. **AI Usability**: Tests provide clear signals for AI agents about functionality
5. **Performance**: Full test suite runs in <2 minutes

## Risk Assessment

### High Risk
- **Removing too much**: Loss of critical regression detection
  - *Mitigation*: Careful categorisation, keep tests for complex algorithms
- **Breaking changes**: Test removal might hide real bugs
  - *Mitigation*: Run full test suite before/after each phase, monitor production

### Medium Risk
- **Time investment**: 2-3 weeks is significant
  - *Mitigation*: Deliver value incrementally, can pause after any phase
- **Concurrent development**: Other agents modifying code during restructure
  - *Mitigation*: Focus on stable areas first, coordinate on active areas

### Low Risk
- **Browser test complexity**: Puppeteer/Playwright learning curve
  - *Mitigation*: Start simple, use AI assistance for test generation

## Implementation Plan

### Stage 1: Deep Audit & Categorisation (Days 1-3)

**Objective**: Comprehensive understanding of test landscape and failure patterns

**Actions**:
1. **Infrastructure Analysis** (Subagent A)
   - Identify all mock/environment configuration issues
   - Document NextRequest mocking problems
   - List database isolation failures
   - Catalog import/module resolution errors

2. **Test Inventory by Category** (Subagents B, C, D in parallel)
   - B: Components & UI (`components/__tests__/`, `app/*/__tests__/`)
   - C: Services & Business Logic (`lib/services/__tests__/`)
   - D: Hooks, Utils & API Routes (`lib/hooks/__tests__/`, `app/api/__tests__/`)
   
   For each category, document:
   - Total test count and line count
   - Pass/fail/skip breakdown
   - Failure categorisation (infrastructure vs logic vs obsolete)
   - Duplicate coverage identification
   - Value assessment (critical/useful/redundant)

3. **AI Feature Test Analysis** (Subagent E)
   - Deep dive on chat test failures
   - Analyse heading generation test issues
   - Review content fidelity test approach
   - Identify missing AI feature coverage

4. **Consolidation Opportunity Matrix**
   - Map overlapping test coverage
   - Identify unit tests replaceable by integration tests
   - Highlight areas with zero business value
   - Create priority list for removal/consolidation

**Deliverables**:
- Detailed test inventory spreadsheet/markdown
- Failure pattern analysis document
- Consolidation opportunity matrix
- Priority removal list

### Stage 2: Infrastructure Stabilisation (Days 4-5)

**Objective**: Fix systemic issues preventing tests from running

**CRITICAL - Order of Operations** (based on Stage 1 findings):
1. **ESM/nuqs Fix FIRST** - Blocking 18+ test suites
   - Add nuqs to Jest transformIgnorePatterns
   - Or create proper mock for nuqs package
   - This alone will unblock ~200+ tests

2. **Database Model Seeding** - Blocking 24 tests
   - Add claude-3-5-haiku-20241022 to ai_models table
   - Ensure test database has all required models
   - Create migration or seed script

3. **UUID Generation Fix** - Breaking 10+ tests
   - Fix `createTestUser` in test-isolation-utils.ts
   - Ensure all test IDs are proper UUIDs
   - Update namespace generation logic

4. **Authentication Mocking** - Blocking most API tests
   - Fix Supabase auth middleware mocking
   - Ensure auth bypass for test environment
   - Update jest.setup.js with proper auth mocks

5. **AI SDK Mock Updates**
   - Implement missing `doGenerate` method
   - Update mock responses to match current SDK
   - Create realistic response patterns

**Deliverables**:
- Fixed test infrastructure (284+ tests now running)
- Mock pattern documentation
- Updated TESTING_TROUBLESHOOTING.md
- Test execution metrics before/after

### Stage 3: Aggressive Consolidation - Components & UI (Days 6-8)

**Objective**: Replace granular component tests with feature-level integration tests

**Target Reduction**: 79% of component tests (16,749 → 3,500 lines)

**Priority Consolidations** (based on Stage 1 matrix):
1. **UnifiedLeftPane Monster** (3,566 lines → 400 lines)
   - 8 separate test files testing same component!
   - Merge into single comprehensive integration test
   - Focus on user interactions, not implementation

2. **Obsolete Component Tests** (2,093 lines → 0)
   - Delete tests for removed features immediately
   - No migration needed - pure removal

3. **Authentication Components** (2,430 lines → 300 lines)
   - Convert to browser automation in Stage 6
   - Keep minimal unit tests for edge cases

4. **Tool Components** (1,890 lines → 600 lines)
   - One integration test per tool (Chat, Glossary, etc.)
   - Focus on tool functionality, not UI details

**Specific Actions**:
- Use subagents to consolidate by feature area
- Create mapping of old tests → new tests for coverage tracking
- Document patterns for future test writers
- Archive useful test utilities before deletion

**Quick Win Strategy**:
- Day 6: Remove obsolete tests (2,093 lines deleted)
- Day 7: Consolidate UnifiedLeftPane (3,166 lines saved)
- Day 8: Merge remaining component tests

### Stage 4: Service Layer Streamlining (Days 9-11)

**Objective**: Focus on behaviour verification over implementation testing

**Target Reduction**: 60-70% of service tests

**Actions**:
1. **Service Test Analysis**
   - Group by business capability
   - Identify true unit tests vs integration candidates
   - Mark complex algorithms to keep

2. **Consolidation Strategy**
   - Database services: Individual CRUD → Data flow integration tests
   - AI services: Mock-heavy tests → Real integration with controlled responses
   - Document processing: Step tests → End-to-end processing tests

3. **Critical Path Tests**
   - Document creation → storage → retrieval flow
   - AI content extraction pipeline
   - User permission verification
   - Search and highlighting functionality

**Keep as Unit Tests**:
- Deterministic ID generation
- Complex content transformation algorithms
- Permission calculation logic
- Performance-critical functions

### Stage 5: AI Feature Test Rebuild (Days 12-14)

**Objective**: Comprehensive testing for failing AI features

**Key Insight from Stage 1**: Most AI test failures are infrastructure issues, not bugs!
- Chat API tests: Actually passing (16/16) ✅
- Chat component tests: Failing due to outdated mocks
- Headings/Search API tests: Failing due to auth middleware

**Revised Actions**:
1. **Fix Infrastructure First** (Day 12)
   - Update @assistant-ui/react mocks for new API
   - Fix auth middleware for API route tests
   - This alone will recover ~50% of AI tests

2. **Chat Functionality** (Already mostly working!)
   - Update component tests for new `usePersistentChat` hook
   - Add integration test for full conversation flow
   - Test streaming responses and error recovery

3. **AI-Generated Headings**
   - Fix auth issues first (will unblock 10/11 tests)
   - Add performance benchmarks for large documents
   - Test mutation engine integration thoroughly

4. **Semantic Search/Highlighting**
   - Fix auth middleware (will unblock all 10 tests)
   - Add relevance scoring tests
   - Test highlighting accuracy edge cases

5. **New Coverage Areas**
   - Multi-provider switching (Anthropic ↔ Google)
   - Token usage tracking and limits
   - Reasoning token support (new feature)
   - Rate limiting and retry logic

### Stage 6: Browser Automation Foundation (Days 15-17)

**Objective**: Establish browser testing for critical user journeys

**Technology**: Puppeteer via MCP (preferred for AI assistance)

**Critical User Journeys**:
1. **Document Upload Flow**
   ```
   - Navigate to upload page
   - Select PDF/enter URL
   - Wait for processing
   - Verify document display
   - Check AI features activated
   ```

2. **Authentication Flow**
   ```
   - Sign up new user
   - Verify email (if enabled)
   - Login/logout cycles
   - Profile management
   - Document ownership
   ```

3. **AI Interaction Flow**
   ```
   - Open document
   - Interact with chat
   - Verify AI headings display
   - Test search/highlight
   - Navigate via AI-generated ToC
   ```

4. **Cross-Document Navigation**
   ```
   - Document list navigation
   - Recent documents
   - Search across documents
   - Maintain context between documents
   ```

**Implementation Approach**:
- Start with happy paths only
- Use visual regression for UI changes
- Record test runs for debugging
- Generate tests with AI assistance

### Stage 7: Cleanup & Documentation (Days 18-20)

**Objective**: Finalise restructuring and update all documentation

**Actions**:
1. **Final Cleanup**
   - Remove all marked obsolete tests
   - Archive useful patterns
   - Organise remaining tests
   - Update test file naming

2. **Documentation Updates**
   - Update TESTING_OVERVIEW.md with new philosophy
   - Create browser testing guide
   - Document integration test patterns
   - Update troubleshooting guide

3. **CI/CD Integration**
   - Configure browser tests in CI
   - Set up test reporting
   - Performance benchmarks
   - Failure notifications

4. **Knowledge Transfer**
   - Create test writing guide for AI agents
   - Document common patterns
   - Establish naming conventions
   - Define when to add new tests

**Deliverables**:
- Clean, organised test suite
- Comprehensive documentation
- CI/CD configuration
- Test writing guidelines

## Alternative Approaches Considered

### 1. Clean Slate Approach
- **Pros**: Faster, cleaner result, no legacy baggage
- **Cons**: Risk of missing edge cases, loss of accumulated knowledge
- **Decision**: Rejected in favour of incremental approach per user preference

### 2. Test-per-Feature Packages
- **Pros**: Better organisation, clear ownership
- **Cons**: More complex setup, potential duplication
- **Decision**: Consider for future after initial restructuring

### 3. Contract Testing Focus
- **Pros**: Good for API boundaries, stable interfaces
- **Cons**: Overhead for rapid prototyping phase
- **Decision**: Defer until API patterns stabilise

## Execution Strategy

### Subagent Utilisation
- Use parallel subagents for independent analysis tasks
- Provide rich context about feature goals and architecture
- Set clear boundaries to prevent scope creep
- Review outputs before implementing changes

### Incremental Delivery
- Each stage independently valuable
- Can pause/adjust between stages
- Regular check-ins with user
- Commit improvements incrementally

### Coordination
- Monitor concurrent development
- Coordinate with agent working on document upload
- Flag any blocking issues immediately
- Maintain running notes of decisions

## Success Metrics & Monitoring

### Quantitative Metrics (Updated from Stage 1)
- Test volume: 34,519 → 9,000 lines (74% reduction)
- Test suites: 82 → ~30 (63% reduction)
- Pass rate: 76% → 95%+ (after infrastructure fixes)
- Failed suites: 48 → <3 (94% reduction)
- Execution time: Unknown → <2 minutes
- Coverage: Critical user flows 100%

### Infrastructure Recovery Metrics
- Blocked tests recovered: 284+ tests
- ESM fix impact: +18 test suites
- Auth fix impact: +30 API tests
- Total test recovery: ~50% of current failures

### Qualitative Metrics
- Mock complexity: 60% reduction
- AI agent debugging time: 80% reduction
- False positive rate: 90% → <10%
- Maintenance burden: High → Low

### Monitoring Plan
- Stage completion metrics
- Before/after test runs per stage
- Performance benchmarks
- Bug detection effectiveness

## Post-Implementation Considerations

### Future Enhancements
1. Visual regression testing for UI
2. Performance testing suite
3. Security testing automation
4. Load testing for AI features

### Maintenance Process
1. Weekly test health checks
2. Monthly consolidation reviews
3. Quarterly strategy assessment
4. Continuous documentation updates

### Evolution Path
1. Current: Stabilise and consolidate
2. Next: Browser automation maturity
3. Future: Advanced testing patterns
4. Long-term: Full CI/CD integration

## Appendix: Technical Decisions

### Why Puppeteer over Playwright?
- Better MCP integration
- AI assistance availability
- Simpler API for basic needs
- Can migrate later if needed

### Integration Test Boundaries
- API level for backend logic
- Browser level for user flows
- Mock at external service boundaries
- Real database with test isolation

### Test Data Strategy
- Namespace isolation for parallel execution
- Deterministic test data generation
- Cleanup in afterEach hooks
- No shared state between tests

## Next Steps

1. **Approval**: Review plan with user, adjust as needed
2. **Kick-off**: Begin Stage 1 audit with parallel subagents
3. **Daily Updates**: Brief progress summaries
4. **Flexibility**: Adjust plan based on findings

---

This plan provides a structured approach to dramatically simplify the test suite while improving its effectiveness for AI-first development. The incremental stages allow for course correction and ensure value delivery throughout the process.