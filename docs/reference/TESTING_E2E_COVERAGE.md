# E2E Test Coverage Reference

**Status**: Living document - Update after adding/modifying E2E tests  
**Purpose**: Simple coverage tracking to avoid overlap and identify gaps

see: `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md`

## Current E2E Test Coverage

### 1. `auth.spec.ts` - Authentication Flows
- ✅ Email login flow
- ✅ Email signup flow  
- ✅ Google OAuth login
- ✅ Logout functionality
- ✅ Protected route access
- ✅ Session persistence

### 2. `document-creation.spec.ts` - Document Creation
- ✅ URL extraction and document creation
- ✅ Form validation (empty URL, invalid URL)
- ✅ Success redirect to document view
- ✅ Error handling display

### 3. `document-search.spec.ts` - Search Functionality
- ✅ Basic text search within document
- ✅ Search result highlighting
- ✅ Multiple match navigation
- ✅ Search persistence across reloads
- ✅ Clear search functionality
- ✅ Case-insensitive search

### 4. `document-upload.spec.ts` - File Upload
- ✅ PDF file upload flow
- ✅ Upload progress indication
- ✅ Document processing status
- ✅ Redirect to processed document

### 5. `navigation.spec.ts` - App Navigation
- ✅ Homepage to documents list
- ✅ Document selection and viewing
- ✅ Tab switching (Doc/ToC/Headings/Tools)
- ✅ Public document access (unauthenticated)

### 6. `semantic-search.spec.ts` - Advanced Search
- ✅ Semantic search query execution
- ✅ Search results display
- ✅ Result navigation
- ✅ Context preview in results

### 7. `document-viewing.spec.ts` - Document Display
- ✅ Document content rendering
- ✅ Document metadata display
- ✅ Public/private document access
- ✅ Document not found handling

### 8. `document-access-control.spec.ts` - Access Control & Security
- ✅ Anonymous user access to public documents
- ✅ Anonymous user blocked from private documents (404)
- ✅ Authenticated user access to owned documents
- ✅ Authenticated user blocked from other users' private documents
- ✅ Search engine bot access to public documents
- ✅ Security-first error conflation (not found vs no permission)
- ✅ HTTP status code consistency
- ✅ Cross-document navigation access control

### 9. `document-access-control-basic.spec.ts` - Access Control Smoke Tests
- ✅ Anonymous application access
- ✅ 404 handling for non-existent documents
- ✅ Authentication system accessibility
- ✅ Bot user agent handling

### 9. `ai-tweet-thread-generation.spec.ts` - AI Tweet Thread Generation
- ✅ Complete tweet thread generation workflow
- ✅ Document upload and AI processing pipeline
- ✅ Tweet thread generation with real LLM calls
- ✅ Character limit validation and error handling
- ✅ Copy/share functionality testing
- ✅ Different content types (HTML upload, URL extraction)

## Coverage Gaps (Not Yet Tested)

### High Priority
- ❌ Document deletion flow
- ❌ AI heading generation
- ❌ Glossary generation and display
- ❌ Summary generation (multiple levels)

### Medium Priority
- ❌ Keyboard shortcuts (Cmd+K, etc.)
- ❌ Cross-document navigation
- ❌ Settings management
- ❌ Reading difficulty metrics
- ❌ Highlight management

### 10. `error-states.spec.ts` - Error Handling
- ✅ Custom 404 page display and functionality
- ✅ Custom 500 error page display and functionality  
- ✅ Error page navigation (Go Home, Go Back buttons)
- ✅ Error boundary handling of React component errors
- ✅ Development error details display
- ✅ Error page styling and layout consistency

### Low Priority
- ❌ Export functionality
- ❌ Print styling
- ❌ Mobile responsive behavior
- ❌ Error recovery flows (beyond basic error boundary)

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
├── ai-*.spec.ts             # AI features (TODO)
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

## Maintenance

- Update this file when adding new E2E tests
- Mark items with ✅ when covered
- Remove from gaps when implemented
- Keep descriptions concise (one line per feature)