# E2E Test Coverage Reference

**Status**: Living document - Update after adding/modifying E2E tests  
**Purpose**: Simple coverage tracking to avoid overlap and identify gaps

see: `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md`

> **🚧 2025-07-07 Consolidation in progress**
>
> The E2E suite is being aggressively consolidated to "fewer tests, richer journeys".  The tables below are **out of date**.  New super-specs already merged:
> • `ai-features-comprehensive.spec.ts` – Headings, Glossary, Summary, Tweet Thread
> • `search-and-command-palette.spec.ts` – In-doc search plus command-palette
>
> Removed legacy specs:
> • ai-headings-*, ai-glossary-*, ai-tweet-thread-generation.spec.ts
> • search-with-*, command-palette-*, document-search-navigation-workflow.spec.ts
> • optimized-ai-features-journey.spec.ts
>
> A full rewrite of this coverage table will land after the next full-suite run.

## Current E2E Test Coverage

### Core Workflow Tests

#### 1. `complete-document-workflow-with-authentication.spec.ts`
- ✅ Complete user workflow from authentication through document processing to AI interactions
- ✅ Comprehensive integration test replacing 50+ unit tests
- ✅ Document upload, processing, and AI feature integration
- ✅ Authentication flows and protected route access

#### 2. `document-upload-processing-with-ai-integration.spec.ts`
- ✅ Complete document upload and processing pipeline
- ✅ AI integration workflow (chat, headings, glossary, summary)
- ✅ Authentication through document processing journey
- ✅ Real LLM calls and AI feature validation

### Search & Navigation Tests

#### 3. `search-with-document-creation.spec.ts`
- ✅ Document creation and search functionality integration
- ✅ End-to-end search workflow
- ✅ Search result navigation and highlighting

#### 4. `search-with-highlight-validation.spec.ts`
- ✅ Search highlight accuracy validation
- ✅ Case-insensitive search testing
- ✅ Precise highlight positioning and appearance

#### 5. `document-search-navigation-workflow.spec.ts`
- ✅ Comprehensive search and navigation user experience
- ✅ Semantic AI search integration
- ✅ Context extraction and navigation workflows
- ✅ URL state management during search

### Access Control & Security Tests

#### 6. `document-access-control.spec.ts`
- ✅ Anonymous user access to public documents
- ✅ Anonymous user blocked from private documents (404)
- ✅ Authenticated user access to owned documents
- ✅ Authenticated user blocked from other users' private documents
- ✅ Search engine bot access to public documents
- ✅ Security-first error conflation (not found vs no permission)
- ✅ HTTP status code consistency
- ✅ Cross-document navigation access control

### AI Feature Tests

#### 7. `ai-tweet-thread-generation.spec.ts`
- ✅ Complete tweet thread generation workflow
- ✅ Document upload and AI processing pipeline
- ✅ Tweet thread generation with real LLM calls
- ✅ Character limit validation and error handling
- ✅ Copy/share functionality testing
- ✅ Different content types (HTML upload, URL extraction)

#### 8. `ai-glossary-comprehensive.spec.ts`
- ✅ Complete glossary functionality with real AI integration
- ✅ Glossary generation and Load More features
- ✅ Position tracking (Stage 3) and error handling
- ✅ Glossary UI interaction and display

#### 9. `glossary-reset-highlight-removal.spec.ts`
- ✅ Glossary reset workflow validation
- ✅ Document pane highlight removal verification
- ✅ Complete reset functionality testing

#### 10. `ai-headings-insertion-order.spec.ts`
- ✅ AI headings insertion order fixes
- ✅ Headings appear before content they introduce
- ✅ Correct hierarchical order (H2 → H3 → H4)
- ✅ Heading positioning validation

#### 11. `ai-headings-persistence-refresh.spec.ts`
- ✅ AI-generated headings persist after page refresh
- ✅ Headings saved to database and restored on reload
- ✅ UI state (AI-enhanced/Original) persists correctly
- ✅ Heading removal persistence after refresh
- ✅ Complete persistence workflow validation

### User Interface & Interaction Tests

#### 12. `command-palette-basic-debug.spec.ts`
- ✅ Basic command palette functionality
- ✅ Console error checking
- ✅ Opening/closing behaviour validation

#### 13. `command-palette-dynamic-generation.spec.ts`
- ✅ Command palette with Ctrl+K shortcut
- ✅ Dynamically generated tool commands
- ✅ Command palette interaction workflow

#### 14. `tool-keyboard-shortcuts.spec.ts`
- ✅ All tool keyboard shortcuts (Cmd+1 through Cmd+9)
- ✅ Tool access via keyboard navigation
- ✅ URL changes validation during tool switching

### Error Handling & Recovery Tests

#### 15. `error-page-testing.spec.ts`
- ✅ Custom 404 page display and functionality
- ✅ Custom 500 error page display and functionality  
- ✅ Error page navigation (Go Home, Go Back buttons)
- ✅ Error boundary handling of React component errors
- ✅ Development error details display
- ✅ Error page styling and layout consistency

### Regression Tests

#### 16. `left-margin-regression.spec.ts`
- ✅ Document text visibility with collapsed left pane
- ✅ Vertical icon navigation bar positioning
- ✅ Narrow screen layout (638px width) testing

### Optimized Test Suite (Comprehensive Journey Tests)

#### 17. `optimized-authenticated-onboarding-journey.spec.ts`
- ✅ Complete user authentication and onboarding experience
- ✅ User registration, login, and initial setup
- ✅ Protected route access and session management

#### 18. `optimized-ai-features-journey.spec.ts`
- ✅ Complete AI-powered feature experience
- ✅ Document reading with AI enhancements
- ✅ AI tool integration and interaction workflow

#### 19. `optimized-anonymous-access-journey.spec.ts`
- ✅ Comprehensive anonymous user journey
- ✅ Public document access and limitations
- ✅ Anonymous user experience validation

#### 20. `optimized-document-library-journey.spec.ts`
- ✅ Complete document library management experience
- ✅ Document creation, organization, and navigation
- ✅ Library search and filtering functionality

#### 21. `optimized-error-recovery.spec.ts`
- ✅ Error handling and recovery mechanisms
- ✅ Graceful degradation testing
- ✅ Error scenario comprehensive coverage

#### 22. `optimized-mobile-experience.spec.ts`
- ✅ Mobile responsiveness testing
- ✅ Touch interaction validation
- ✅ Mobile-specific UI behaviour

#### 23. `optimized-route-smoke-tests.spec.ts`
- ✅ Comprehensive route accessibility validation
- ✅ Public, protected, API, and error routes
- ✅ Basic functionality across all routes

## Coverage Gaps (Not Yet Tested)

### High Priority
- ❌ Document deletion flow
- ❌ Summary generation (multiple levels)
- ❌ Settings management

### Medium Priority
- ❌ Reading difficulty metrics
- ❌ Cross-document navigation (beyond access control)
- ❌ Document sharing and collaboration features

### Low Priority
- ❌ Export functionality
- ❌ Print styling
- ❌ Advanced mobile gestures
- ❌ Offline functionality

## Quick Coverage Check

When adding a new E2E test:
1. Check this file for existing coverage
2. Name test file descriptively (e.g., `ai-chat.spec.ts`)
3. Add coverage summary here
4. Focus on user journeys, not features

## Test Organization Pattern

```
tests/e2e/
├── auth.spec.ts              # Authentication flows
├── document-*.spec.ts        # Document operations
├── ai-*.spec.ts             # AI features
├── navigation.spec.ts        # General navigation
├── search-*.spec.ts         # Search variants
└── error-states.spec.ts     # Error handling and recovery
```

## Test Consolidation Progress

### Phase 1: Authentication and Authorization (✅ Completed)
**Completed**: 2025-06-22

**Consolidation Summary**:
- **Removed**: 1,462 lines of redundant auth unit tests that were superseded by comprehensive E2E auth coverage
- **Preserved**: 914 lines of security-critical tests (RLS policies, admin utilities)

**Files Removed**:
- `/components/__tests__/auth-user-workflows-integration.test.tsx` (272 lines)
- `/lib/__tests__/auth-system-integration.test.tsx` (345 lines)  
- `/app/api/chat/__tests__/chat-auth-validation.test.ts` (421 lines)
- `/app/api/extract-url/__tests__/extract-url-auth-validation.test.ts` (424 lines)

**Files Preserved** (Security-Critical):
- `/lib/services/database/__tests__/rls-policies-real.test.ts` (370 lines) - Database security
- `/lib/services/database/__tests__/rls-policies-extended.test.ts` (419 lines) - Extended RLS testing
- `/lib/auth/__tests__/admin-utils.test.ts` (125 lines) - Admin functionality

**Justification**: Comprehensive E2E authentication tests (8 scenarios in `document-access-control.spec.ts` and `auth.spec.ts`) provide superior coverage to heavily mocked unit tests. Real RLS testing and admin utilities are security-critical and test actual database-level enforcement.

### Phase 4: AI Features and Tools Consolidation (✅ Completed)
**Completed**: 2025-06-23

**Consolidation Summary**:
- **Removed**: 3,005 lines of heavily mocked AI unit tests that were superseded by comprehensive E2E AI coverage
- **Preserved**: 1,328 lines of algorithmic and utility tests
- **Added**: 1 new E2E test for tweet thread generation (240 lines)

**Files Removed**:
- `/app/api/__tests__/tools-api-integration.test.ts` (713 lines) - Heavily mocked API integration
- `/app/api/chat/__tests__/chat-streaming.test.ts` (439 lines) - Mocked streaming functionality
- `/app/api/__tests__/headings.test.ts` (601 lines) - Heavily mocked headings generation
- `/app/api/__tests__/tweet-thread.test.ts` (393 lines) - Mocked tweet generation
- `/lib/services/__tests__/llm-provider-switching.test.ts` (424 lines) - Provider configuration tests
- `/app/api/__tests__/headings-performance.test.ts` (435 lines) - Performance testing with mocks

**Files Preserved** (Algorithmic Logic):
- `/lib/services/__tests__/llm-provider.test.ts` (99 lines) - Core LLM provider configuration logic
- `/lib/services/__tests__/heading-section-detector.test.ts` (111 lines) - Algorithmic heading detection
- `/lib/services/database/__tests__/ai-calls-usage-tracking.test.ts` (257 lines) - Database tracking logic
- Various tool URL state tests (861 lines) - URL state management algorithms

**E2E Coverage Added**:
- `/tests/e2e/ai-tweet-thread-generation.spec.ts` (240 lines) - Complete tweet thread workflow

**Justification**: Existing E2E tests in `document-upload-processing-with-ai-integration.spec.ts` already provided comprehensive AI feature coverage (chat, headings, glossary, summary). The heavily mocked unit tests provided no additional value over real user workflow testing. Algorithmic and configuration logic preserved as unit tests.

### Phase 3: Search Functionality Consolidation (✅ Completed)
**Completed**: 2025-06-23

**Consolidation Summary**:
- **Removed**: 566 lines of redundant search API unit tests superseded by comprehensive E2E search coverage
- **Preserved**: 618 lines of algorithmic and utility tests that E2E cannot effectively replace

**E2E Search Coverage** (1,259 lines across 4 test files):
- `document-search-navigation-workflow.spec.ts` (481 lines) - Complete search workflow with semantic AI
- `search-with-highlight-validation.spec.ts` (236 lines) - Precise highlight validation and accuracy
- `search-with-document-creation.spec.ts` (242 lines) - End-to-end document creation and search
- `document-search-navigation-simplified.spec.ts` (300 lines) - Simplified search flow and edge cases

**Files Removed**:
- `/app/api/__tests__/semantic-search-consolidated.test.ts` (566 lines, 70 mocks) - Heavy API route mocking

**Files Preserved** (Algorithmic Logic):
- `/lib/utils/__tests__/search-context-extraction.test.ts` (286 lines) - Text context extraction algorithms
- `/lib/utils/__tests__/semantic-search.test.ts` (56 lines) - String normalization utilities  
- `/lib/prompts/templates/__tests__/semantic-search.test.ts` (167 lines) - Zod schema validation
- `/lib/services/__tests__/semantic-search-formatter.test.ts` (109 lines) - Document formatting algorithms
- `/lib/tools/__tests__/url-state*.test.ts` - URL parameter handling utilities

**Justification**: E2E tests provide comprehensive coverage of search user experience including text search, semantic AI search, highlighting, navigation, and URL state management. Preserved tests cover pure algorithmic logic and utility functions that cannot be effectively tested through user interface interactions.

## Current Test Status (2025-07-06)

### Test Execution Results

**Major Progress**: Authentication setup fixed! Auth no longer blocking 77 tests.

#### Confirmed Passing (4/91 - 4.4%)
- ✅ `auth.setup.ts` - Authentication setup (FIXED!)
- ✅ `optimized-anonymous-access-journey.spec.ts` - Complete anonymous user journey
- ✅ `optimized-error-recovery.spec.ts` - Network connectivity and API error recovery (2 tests)
- ✅ `optimized-authenticated-onboarding-journey.spec.ts` - Full authentication flow (NEW!)

#### Expected to Pass (77 tests unblocked by auth fix)
All tests previously blocked by authentication setup failure are now unblocked:
- 🔄 `ai-glossary-comprehensive.spec.ts` - Unblocked, needs full test run
- 🔄 `ai-headings-persistence-refresh.spec.ts` - Unblocked, needs full test run
- 🔄 `ai-summarization-comprehensive.spec.ts` - Unblocked, needs full test run
- 🔄 `ai-tweet-thread-generation.spec.ts` - Unblocked, needs full test run
- 🔄 `command-palette-basic-debug.spec.ts` - Unblocked, needs full test run
- 🔄 `complete-document-workflow-with-authentication.spec.ts` - Unblocked, needs full test run
- 🔄 `document-access-control.spec.ts` - Unblocked, needs full test run
- 🔄 `document-search-navigation-workflow.spec.ts` - Unblocked, needs full test run
- 🔄 `document-upload-processing-with-ai-integration.spec.ts` - Unblocked, needs full test run
- 🔄 And 68 more authentication-dependent tests...

#### Known Issues (10 tests with specific problems)
- ⚠️ API Authentication Context - Browser auth works but API calls fail with "Authentication required"
- ⚠️ Performance Issues - Some tests timing out after 5+ minutes
- ⚠️ `tool-keyboard-shortcuts.spec.ts` - Has test.skip() annotation
- ⚠️ Infrastructure timeouts in mobile and route smoke tests

### Issue Categories

#### 1. API Authentication Context (NEW - Primary Blocker)
- Browser authentication works correctly
- API calls fail with "Authentication required" errors
- Affects document upload and AI feature tests
- Cookie/header propagation issue between browser and API

#### 2. Performance Issues
- Some tests timing out after 5+ minutes
- Dev server memory accumulation during long runs
- Need batch execution strategy for stability

#### 3. Minor Issues
- Post-logout route accessibility (security consideration)
- Test configuration (skip annotations, etc.)

### Test Overlap Analysis

#### Redundant Coverage
1. **Authentication Testing**
   - `complete-document-workflow-with-authentication.spec.ts`
   - `document-upload-processing-with-ai-integration.spec.ts`
   - `optimized-authenticated-onboarding-journey.spec.ts`
   - All test similar auth flows with slight variations

2. **Search Functionality**
   - `search-with-document-creation.spec.ts` ✅
   - `search-with-highlight-validation.spec.ts` ✅
   - `document-search-navigation-workflow.spec.ts`
   - Significant overlap in basic search testing

3. **AI Features**
   - `complete-document-workflow-with-authentication.spec.ts`
   - `document-upload-processing-with-ai-integration.spec.ts`
   - `optimized-ai-features-journey.spec.ts`
   - Multiple tests covering same AI workflows

4. **Error Handling**
   - `error-page-testing.spec.ts`
   - `optimized-error-recovery.spec.ts`
   - Both test error scenarios with different approaches

#### Recommended Consolidation
- Merge the three authentication workflow tests into one comprehensive test
- Keep search tests separate as they test different aspects
- Consolidate AI feature tests into the optimized journey test
- Combine error handling tests into single comprehensive suite

### Critical Next Steps
1. ✅ Authentication setup fixed - auth.setup.ts now passes
2. ✅ E2E test runner configuration fixed - removed invalid flags
3. 🚧 Investigate API authentication context propagation
4. 🚧 Run full test suite to determine actual pass rate
5. 🚧 Address performance issues for long-running tests

## Maintenance

- Update this file when adding new E2E tests
- Mark items with ✅ when covered
- Remove from gaps when implemented
- Keep descriptions concise (one line per feature)
- Run full test suite monthly to track status changes