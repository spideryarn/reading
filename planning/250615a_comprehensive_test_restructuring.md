# Comprehensive Test Restructuring Planning Document

**Date**: 2025-06-15  
**Author**: Claude (AI Assistant)  
**Status**: PLANNING  
**Type**: Infrastructure Overhaul  
**Estimated Duration**: 2-3 weeks

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
- **Test code**: ~20k lines (36%)
- **Pass rate**: ~30% (majority failing)
- **Key failures**: AI features (chat, headings), content fidelity checks
- **Test distribution**: Heavy unit test coverage, minimal integration tests

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

**Actions**:
1. **Environment Configuration**
   - Verify `.env.test` setup
   - Fix LLM API mocking infrastructure
   - Resolve NextRequest mocking issues
   - Update database test isolation patterns

2. **Mock Infrastructure Overhaul**
   - Create centralised mock configuration
   - Fix Anthropic/AI SDK mocking
   - Implement consistent database mocking
   - Document mock patterns for AI agents

3. **Import Resolution**
   - Fix `.js` vs `.ts` extension issues
   - Resolve module path problems
   - Update Jest configuration as needed

**Deliverables**:
- Fixed test infrastructure
- Mock pattern documentation
- Updated TESTING_TROUBLESHOOTING.md

### Stage 3: Aggressive Consolidation - Components & UI (Days 6-8)

**Objective**: Replace granular component tests with feature-level integration tests

**Target Reduction**: 70-80% of component tests

**Actions**:
1. **Component Test Consolidation** (Multiple subagents by feature area)
   - Authentication flow: Login/Signup/Profile components → Single auth integration test
   - Document display: Individual viewer components → Document rendering integration test
   - Navigation: Separate nav tests → Full navigation flow test
   - Forms: Individual input tests → Complete form workflow tests

2. **Remove Redundant Tests**
   - Delete implementation detail tests
   - Remove shallow rendering tests
   - Eliminate mock-heavy component tests
   - Archive useful patterns for future reference

3. **Create Integration Tests**
   - User authentication flow (login → profile → logout)
   - Document upload → processing → display flow
   - Navigation between documents
   - Error handling scenarios

**Example Consolidation**:
```
Before: 15 tests across Button, Form, Input, Validation, Submit handler
After: 1 integration test covering entire form submission workflow
```

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

**Actions**:
1. **Chat Functionality**
   - New integration test: User → Chat UI → API → AI → Response → Persistence
   - Mock AI responses at API boundary, not component level
   - Test conversation persistence and retrieval
   - Error handling and retry logic

2. **AI-Generated Headings**
   - Integration test: Document → Heading extraction → Display → Interaction
   - Test heading quality validation
   - Mutation engine integration
   - Performance benchmarks

3. **Semantic Search/Highlighting**
   - Full flow: Query → AI processing → Result highlighting → Navigation
   - Test relevance and accuracy
   - Performance under various document sizes
   - Edge cases (no results, multiple matches)

4. **Content Fidelity** (Assess and potentially defer)
   - Review current approach
   - Determine if premature given upcoming rework
   - Create minimal smoke tests only

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

### Quantitative Metrics
- Test count: 20k → 5-8k lines
- Pass rate: 30% → 90%+
- Execution time: ? → <2 minutes
- Coverage: Critical paths 100%

### Qualitative Metrics
- AI agent ease of use
- Developer confidence
- Regression detection effectiveness
- Maintenance burden reduction

### Monitoring Plan
- Daily test run summaries
- Failure pattern tracking
- Performance benchmarks
- Production issue correlation

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