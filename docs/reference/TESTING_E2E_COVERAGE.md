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

## Coverage Gaps (Not Yet Tested)

### High Priority
- ❌ AI chat conversation with real responses
- ❌ Document deletion flow
- ❌ AI heading generation
- ❌ Glossary generation and display
- ❌ Summary generation (multiple levels)

### Medium Priority
- ❌ Tweet thread generation
- ❌ Keyboard shortcuts (Cmd+K, etc.)
- ❌ Cross-document navigation
- ❌ Settings management
- ❌ Reading difficulty metrics
- ❌ Highlight management

### Low Priority
- ❌ Export functionality
- ❌ Print styling
- ❌ Mobile responsive behavior
- ❌ Error recovery flows

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
└── search-*.spec.ts         # Search variants
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

## Maintenance

- Update this file when adding new E2E tests
- Mark items with ✅ when covered
- Remove from gaps when implemented
- Keep descriptions concise (one line per feature)