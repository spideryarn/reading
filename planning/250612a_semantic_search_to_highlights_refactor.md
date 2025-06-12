# Semantic Search to Highlights Tab Refactor

## Goal

Transform the current Semantic Search functionality (within the Search tab) into a dedicated Highlights tab, establishing highlights as the core semantic analysis feature. This refactor treats semantic search and highlighting as conceptually identical - both are AI-powered criterion-based text identification with visual marking and navigation.

The key insight: semantic search results ARE highlights, just with different visual treatment and persistence behaviour.

## Context

Currently, the unified left pane has 6 tabs, with semantic search living alongside text search in a single "Search" tab. This creates conceptual confusion between exact-match text search (temporary, real-time) and AI-powered semantic analysis (persistent, criterion-based). 

The user has decided to separate these concerns cleanly: keep exact text search in its own tab, and elevate semantic search to become the primary "Highlights" feature with enhanced visual treatment using the existing confidence scores.

## References

- `components/unified-left-pane.tsx` - Main left pane implementation with current search tab logic
- `components/vertical-icon-nav.tsx` - Tab navigation definitions 
- `docs/reference/UNIFIED_LEFT_PANE.md` - Current left pane architecture documentation
- `docs/reference/AI_SUMMARISE.md` - Example of existing AI feature documentation pattern
- `docs/instructions/WRITE_EVERGREEN_DOC.md` - Guidelines for creating TOOL_HIGHLIGHT.md documentation
- `/api/semantic-search` route - Existing LLM integration that returns confidence scores
- Mark.js integration - Current highlighting implementation for text search
- `document_enhancements` table - Existing persistence for semantic search results

## Principles & Key Decisions

**Conceptual Model**: Semantic Search === Highlights. They are the same feature with different framing:
- **Semantic Search**: "Find content matching this criterion" 
- **Highlights**: "Mark content matching this criterion"

**UI Organisation**:
- **Text Search Tab**: Simple, exact-match, temporary highlighting (Mark.js)
- **Highlights Tab**: AI-powered, criterion-based, persistent highlighting with confidence-based intensity

**Visual Treatment**:
- Use existing semantic search confidence scores (0-100%) to determine highlight colour intensity
- Maintain existing persistence in `document_enhancements` table
- Automatic highlighting of all matches when query is performed

**Future Features** (noted for documentation):
- Previous/Next navigation buttons for highlights
- Multiple highlight colours/categories (red/green for bad/good)
- Clickable highlights for editing/annotation
- User notes on highlights

## Stages & Actions

### Stage: Preparation & Setup
- [ ] Run `./scripts/sync-worktrees.ts` to sync latest changes from main
- [ ] Create comprehensive tests for current semantic search functionality to prevent regressions
  - [ ] Test semantic search API integration
  - [ ] Test results persistence and caching
  - [ ] Test confidence score handling
  - [ ] Test query history functionality

### Stage: Create New Highlights Tab Infrastructure  
- [ ] Update `components/vertical-icon-nav.tsx` to add new "Highlights" tab
  - [ ] Remove semantic search toggle from existing Search tab definition
  - [ ] Add new highlights tab with appropriate icon (HighlighterCircle or similar)
  - [ ] Update tooltips to reflect new separation
- [ ] Create `renderHighlightsTab()` function in `unified-left-pane.tsx`
  - [ ] Extract semantic search logic from current `renderSearchTab()`
  - [ ] Maintain all existing functionality (API calls, caching, persistence)
  - [ ] Focus UI messaging on "highlighting" rather than "searching"
- [ ] Update tab rendering logic to include highlights tab
- [ ] Test that new Highlights tab renders and functions identically to current semantic search

### Stage: Simplify Search Tab to Text-Only
- [ ] Refactor `renderSearchTab()` to remove semantic search functionality
  - [ ] Remove semantic/text search toggle buttons
  - [ ] Remove semantic search input, results, and history
  - [ ] Keep only text search input with Mark.js integration
  - [ ] Simplify UI to focus on exact text matching
- [ ] Update search tab styling for simplified single-purpose interface
- [ ] Test that text search functionality remains fully functional
- [ ] Verify no semantic search remnants remain in search tab

### Stage: Enhance Highlights Visual Treatment
- [ ] Implement confidence-based highlight intensity in CSS
  - [ ] Create highlight CSS classes with opacity/color variations based on confidence scores
  - [ ] Map confidence percentages (0-100%) to visual intensity levels
  - [ ] Ensure highlights are visually distinct from text search highlights
- [ ] Update highlight rendering to use confidence scores from semantic search results
- [ ] Test highlight intensity variations across different confidence levels
- [ ] Verify highlights display correctly across different document content types

### Stage: Update Documentation & Tests
- [ ] Create `docs/reference/TOOL_HIGHLIGHT.md` following `docs/instructions/WRITE_EVERGREEN_DOC.md`
  - [ ] Document the highlights feature as primary semantic analysis tool
  - [ ] Include confidence-based visual treatment
  - [ ] Note future features (prev/next navigation, multiple colors, user notes)
  - [ ] Reference relationship to simplified text search
- [ ] Update `docs/reference/UNIFIED_LEFT_PANE.md` to reflect new tab organisation
- [ ] Create/update integration tests for new tab structure
- [ ] Update component tests to reflect separated functionality
- [ ] Run full test suite to ensure no regressions

### Stage: Polish & Final Testing
- [ ] Review UX flow from user perspective - test highlights workflow end-to-end
- [ ] Verify all existing semantic search features work in new Highlights tab
- [ ] Confirm persistence, caching, and query history functions correctly
- [ ] Test tab switching and state management between Search and Highlights
- [ ] Review visual consistency of highlight colors and intensity
- [ ] Use subagent to run comprehensive automated test suite

### Stage: Documentation & Completion
- [ ] Stop & review with user - demonstrate new tab organisation and visual treatment
- [ ] Follow instructions in `docs/instructions/DEBRIEF_PROGRESS.md` to summarise progress
- [ ] Git commit using subagent following `docs/instructions/GIT_COMMITS.md`
- [ ] Move this doc to `planning/finished/` and commit

# Appendix

## Current Semantic Search Implementation Details

**API Integration**: `/api/semantic-search` route processes natural language queries using LLM and returns results with confidence scores and reasoning.

**Persistence**: Results stored in `document_enhancements` table with type `'semantic-search'`, including full query text, results array, and metadata.

**Caching**: Semantic search results are cached and displayed with cache timestamp. Users can see when results were generated.

**Query History**: Previous semantic queries stored and displayed in dropdown for quick re-selection.

**UI Components**: Current implementation includes search type toggle, input field, results list with confidence scores, sorting options, and advanced options panel.

## Key User Decisions & Rationale

**Why Separate Text and Semantic Search?**
- Text search is immediate, temporary, exact-match finding
- Semantic search is thoughtful, persistent, AI-powered analysis
- These are fundamentally different user intents that deserve separate interfaces

**Why Highlights Instead of Semantic Search?**
- "Highlights" better captures the persistent, visual-marking nature of the feature
- Users think in terms of "highlighting important content" rather than "searching semantically"
- The confidence scores naturally map to highlight intensity for better visual feedback

**Why Keep Existing Infrastructure?**
- Current semantic search implementation already handles persistence, caching, and LLM integration correctly
- Confidence scores are perfect for driving highlight visual intensity
- Query history and advanced options remain valuable for criterion-based highlighting

This refactor is primarily a conceptual reorganisation with enhanced visual treatment rather than a fundamental rewrite of functionality.