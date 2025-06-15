# Test Inventory: Hooks, Utils & API Routes

**Date**: 2025-06-15  
**Stage**: 1 - Test Inventory and Analysis  
**Focus**: Hooks, Utils, and API Route Tests

## Executive Summary

This inventory analyzes hooks, utils, and API route tests in the Spideryarn Reading project. Key findings:

- **Hook Tests**: 0 tests found (2 hooks exist but are untested)
- **API Tests**: 16 test files, 7,823 lines total
- **Utils Tests**: 9 test files, 2,024 lines total
- **Total**: 25 test files, 9,847 lines (~50% of all test code)

The majority of these tests are heavily mocked unit tests that could be better served by integration or browser automation tests.

## Hook Tests Inventory

### Existing Hooks (Untested)
1. `/lib/hooks/useElementVisibility.ts` (127 lines)
   - Complex IntersectionObserver hook for tracking element visibility
   - Uses refs, callbacks, debouncing, and state management
   - **Recommendation**: Perfect candidate for browser automation testing
   - **Reason**: Testing DOM interactions and visibility requires real browser environment

2. `/lib/hooks/useMultiSummary.ts` (186 lines)
   - Manages multi-dimensional summary state with API calls
   - Complex state management and URL synchronization
   - **Recommendation**: Integration test with real API calls
   - **Reason**: Testing fetch, state updates, and URL sync needs integration context

### Analysis
- Both hooks are complex and involve browser APIs or network calls
- Unit testing these would require extensive mocking
- Better tested through component integration tests or browser automation

## API Route Tests Inventory

### Test Files by Size

| File | Lines | Tests | Status | Type | Recommendation |
|------|-------|-------|--------|------|----------------|
| `fake-success-delay.test.ts` | 29 | 1 | Simple | Mock delay | Keep (minimal) |
| `summarise.test.ts` | 257 | ~8 | Complex mocks | AI calls | Browser automation |
| `upload-pdf.test.ts` | 314 | ~10 | File upload | Integration | Browser automation |
| `semantic-search.test.ts` | 340 | ~12 | Search | AI/DB | Integration test |
| `tweet-thread.test.ts` | 390 | ~15 | AI generation | Complex | Browser automation |
| `headings.test.ts` | 422 | ~16 | AI extraction | Complex | Browser automation |
| `extract-url-content-fidelity-static.test.ts` | 434 | ~10 | Static HTML | Unit | Keep |
| `sanitization-edge-cases-performance.test.ts` | 493 | ~20 | Edge cases | Unit | Keep (valuable) |
| `semantic-search-enhanced.test.ts` | 544 | ~18 | Enhanced search | Complex | Integration |
| `usage-tracking-integration.test.ts` | 547 | ~15 | DB integration | Integration | Keep |
| `chat-persistence.test.ts` | 572 | ~20 | Chat + DB | Complex | Browser automation |
| `extract-url-content-fidelity.test.ts` | 584 | ~12 | URL extraction | Complex | Browser automation |
| `chat.test.ts` | 601 | ~22 | AI chat | Complex mocks | Browser automation |
| `upload-pdf-sanitization-integration.test.ts` | 602 | ~15 | Integration | Complex | Browser automation |
| `cross-api-sanitization-consistency.test.ts` | 650 | ~25 | Cross-API | Integration | Keep |
| `extract-url-sanitization-integration.test.ts` | 1044 | ~30 | Large integration | Complex | Simplify + browser |

### API Test Analysis

**Heavy Mocking Pattern**:
```typescript
jest.mock('ai')
jest.mock('@/lib/services/llm-provider')
jest.mock('@/lib/prompts/templates/chat')
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/services/database/enhancements')
```

**Common Dependencies**:
- AI/LLM services (generateText, executePrompt)
- Supabase client and database services
- Authentication (createClient)
- File processing (PDFs, URLs)

**Test Categories**:
1. **Pure Unit Tests** (3 files, ~950 lines) - Keep
   - Sanitization edge cases
   - Static content processing
   - Cross-API consistency

2. **Integration Tests** (4 files, ~2,100 lines) - Keep but simplify
   - Usage tracking
   - Database operations
   - Cross-service validation

3. **Mock-Heavy Tests** (9 files, ~4,800 lines) - Convert to browser automation
   - AI API calls
   - File uploads
   - Chat interactions
   - URL extraction

## Utils Tests Inventory

### Test Files by Size

| File | Lines | Tests | Type | Recommendation |
|------|-------|-------|------|----------------|
| `semantic-search.test.ts` | 56 | ~5 | Pure function | Keep |
| `readability-metrics.test.ts` | 140 | ~15 | Pure calculation | Keep |
| `semantic-highlighting.test.ts` | 149 | ~20 | Pure function | Keep |
| `pdf-converter.test.ts` | 189 | ~8 | Mock-heavy | Browser automation |
| `slug.test.ts` | 221 | ~25 | Pure function | Keep |
| `html-text-extraction.test.ts` | 258 | ~12 | DOM manipulation | Keep (uses jsdom) |
| `search-context-extraction.test.ts` | 286 | ~15 | Text processing | Keep |
| `html-prettifier.test.ts` | 301 | ~18 | HTML processing | Keep |
| `html-sanitizer.test.ts` | 424 | ~25 | Security critical | Keep |

### Utils Test Analysis

**Pure Function Tests** (6 files, ~1,500 lines):
- Test mathematical calculations, text processing, HTML manipulation
- No external dependencies
- High value, low maintenance
- **Recommendation**: Keep all

**Mock-Heavy Tests** (1 file, 189 lines):
- `pdf-converter.test.ts` mocks external PDF libraries
- **Recommendation**: Convert to browser automation with real PDFs

**DOM Tests** (2 files, ~680 lines):
- Use jsdom for DOM manipulation
- Test real HTML processing
- **Recommendation**: Keep, valuable for edge cases

## Browser Automation Candidates

### High Priority (Immediate Conversion)
1. **Chat API Tests** (~1,200 lines)
   - Test real chat interactions through UI
   - Verify message persistence
   - Test error states visually

2. **File Upload Tests** (~900 lines)
   - Upload real PDFs through UI
   - Test progress indicators
   - Verify document processing

3. **URL Extraction Tests** (~1,600 lines)
   - Enter URLs in UI
   - Test loading states
   - Verify content extraction

### Medium Priority
1. **AI Feature Tests** (~1,400 lines)
   - Headings generation
   - Summarization
   - Tweet thread creation

2. **Search Tests** (~900 lines)
   - Semantic search through UI
   - Search result navigation
   - Highlighting verification

### Test Consolidation Opportunities

**Merge Similar Tests**:
- 3 sanitization test files → 1 comprehensive suite
- 2 semantic search test files → 1 integrated test
- 2 content fidelity test files → 1 unified test

**Estimated Reduction**:
- Current: 16 API test files
- After consolidation: ~8-10 files
- Line reduction: ~30% through deduplication

## Recommendations

### 1. No Hook Unit Tests Needed
- Both hooks are browser/integration focused
- Test through component tests or browser automation
- Avoid mock-heavy unit tests

### 2. API Route Test Strategy
**Keep** (3 files, ~950 lines):
- Edge case and security tests
- Cross-API validation
- Pure transformation tests

**Convert to Browser Automation** (9 files, ~4,800 lines):
- All AI interaction tests
- File upload/download tests
- User-facing features

**Simplify** (4 files, ~2,100 lines):
- Database integration tests
- Reduce mock complexity
- Focus on critical paths

### 3. Utils Test Strategy
**Keep All** (9 files, 2,024 lines):
- High-value pure function tests
- Security-critical sanitization
- Well-isolated and maintainable

### 4. Expected Outcomes
- **Line Reduction**: ~5,000 lines (50% of hook/API/utils tests)
- **File Reduction**: 16 → 8 API test files
- **Maintenance**: Significantly reduced mock maintenance
- **Coverage**: Better real-world coverage through browser tests
- **Speed**: Faster unit test suite

### 5. Browser Automation Test Structure
```
e2e/
├── chat/
│   ├── conversation.test.ts
│   └── persistence.test.ts
├── upload/
│   ├── pdf-upload.test.ts
│   └── url-extraction.test.ts
├── ai-features/
│   ├── headings.test.ts
│   ├── summarization.test.ts
│   └── tweet-generation.test.ts
└── search/
    ├── semantic-search.test.ts
    └── result-navigation.test.ts
```

## Next Steps

1. **Stage 2**: Component test inventory
2. **Stage 3**: Service and database test inventory
4. **Stage 4**: Create browser automation test plan
5. **Stage 5**: Begin test migration (highest value first)