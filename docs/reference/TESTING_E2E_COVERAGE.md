# E2E Test Coverage Reference

**Status**: Living document - Update after adding/modifying E2E tests  
**Purpose**: Simple coverage tracking to avoid overlap and identify gaps

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

## Coverage Gaps (Not Yet Tested)

### High Priority
- ❌ AI chat conversation with real responses
- ❌ Document deletion flow
- ❌ AI heading generation
- ❌ Glossary generation and display
- ❌ Summary generation (multiple levels)
- ❌ Document sharing/permissions

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

## Maintenance

- Update this file when adding new E2E tests
- Mark items with ✅ when covered
- Remove from gaps when implemented
- Keep descriptions concise (one line per feature)