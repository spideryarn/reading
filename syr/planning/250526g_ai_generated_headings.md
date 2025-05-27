# AI-Generated Headings Feature

## Goal

Implement AI-powered heading generation that creates new semantic headings for documents to improve table of contents structure and readability. The system will analyse HTML content and generate hierarchical headings (H1-H6) that better reflect the semantic structure of the text, replacing or augmenting existing headings.

## Context

- Documents often have poor or missing heading structure that makes navigation difficult
- Existing Table of Contents pane shows original headings but could benefit from AI-enhanced structure
- We have established patterns for LLM integration via API routes and prompt templates
- The obsolete_alternative_version contains a working `generate_headings` prompt that we can adapt
- UI already has a 4-pane layout with no room for additional panes, so we'll add tabs to the ToC pane

## Principles

- **Throw away existing headings**: AI generates completely new heading structure from scratch
- **Non-destructive**: Cannot modify original HTML text or break up elements - headings insert between existing elements
- **Progressive enhancement**: Start with console logging, then UI display, then full integration
- **Reuse existing patterns**: Follow established API route, prompt template, and UI component patterns
- **Console-first testing**: Use curl and logging to verify functionality before UI integration

## Key Decisions

- Use modified version of `generate_headings` prompt from obsolete_alternative_version
- Follow existing API structure pattern (similar to `/api/glossary` and `/api/summarise`)
- Add tabbed interface to existing Table of Contents pane with "Original" and "AI-generated" tabs
- Store generated headings temporarily in frontend state (Supabase storage is future enhancement)
- Maintain same visual hierarchy and interaction patterns as existing ToC
- Use deterministic IDs to identify insertion points between existing HTML elements

## Actions

### Stage 1: Core API Implementation ✅ COMPLETED

- [x] **Create prompt template and schema**
  - [x] Create `lib/prompts/templates/headings.njk` based on obsolete_alternative_version prompt
  - [x] Create `lib/prompts/templates/headings.ts` with Zod schema for heading generation
  - [x] Modify prompt to work with our document structure and deterministic IDs
  - [x] Remove complex action-based structure from original prompt - simplify to just heading insertion

- [x] **Implement headings API endpoint**
  - [x] Create `app/api/headings/route.ts` following pattern from glossary/summarise APIs
  - [x] Use Cheerio to remove all existing headings from HTML before passing to LLM
  - [x] Implement HTML content processing and LLM integration
  - [x] Add proper error handling and JSON response formatting
  - [x] Log generated headings to console with indentation (H1-H6 visual hierarchy)

- [x] **Test API with curl**
  - [x] Test with sample document content
  - [x] Verify JSON response format matches schema
  - [x] Confirm headings are logical and well-structured
  - [x] Check that insertion points (`id_of_after`) reference valid element IDs

### Stage 2: UI Integration - Tabbed ToC Pane ✅ COMPLETED

- [x] **Add tab structure to Table of Contents pane**
  - [x] Modify `components/table-of-contents.tsx` to include tab interface
  - [x] Create "Original" tab containing existing ToC functionality
  - [x] Create "AI-generated" tab with initial "Generate new headings" button
  - [x] Ensure tab switching works smoothly with consistent styling

- [x] **Implement generate button placeholder**
  - [x] Add "Generate new headings" button in AI-generated tab
  - [x] Replace button with "Placeholder for AI-generated headings" message when clicked
  - [x] Add loading states and basic error handling
  - [x] Test tab switching and button interaction

### Stage 3: STOP AND REVIEW WITH USER ✅ COMPLETED

User review point to validate approach and UI before connecting real data.
**Result**: User approved the approach and requested proceeding to Stage 4.

### Stage 4: Connect Real Heading Generation ✅ COMPLETED

- [x] **Integrate API with UI**
  - [x] Connect "Generate new headings" button to `/api/headings` endpoint
  - [x] Replace placeholder with actual generated headings from LLM
  - [x] Implement loading states during API calls
  - [x] Add proper error handling with user-friendly messages

- [x] **Reuse existing ToC patterns**
  - [x] Apply same visual hierarchy (indentation, level labels) as original ToC
  - [x] Implement click-to-scroll functionality for generated headings
  - [x] Use green-themed styling to distinguish from original ToC (blue theme)
  - [x] Parse HTML headings to extract text and level information

- [ ] **Optional enhancements not implemented**:
  - [ ] Add tooltip summaries using existing hierarchical content extraction
  - [ ] Ensure generated headings trigger same document viewer selection behaviour
  - [ ] Disable original ToC tab after generation (kept both tabs available per implementation)

### Stage 5: Documentation and Commit ✅ COMPLETED

- [x] **Git commits following conventions**
  - [x] Stage 1: Created prompt templates and API endpoint
  - [x] Stage 2: Added tabbed interface with placeholder functionality
  - [x] Stage 4: Connected real API integration
  - [x] All commits follow `docs/GIT_COMMITS.md` guidelines

- [ ] **Documentation updates** (OPTIONAL - basic functionality complete)
  - [ ] Update `docs/TABLE_OF_CONTENTS_PANE.md` to document new tabbed interface
  - [ ] Document AI heading generation architecture and patterns
  - [ ] Add troubleshooting section for common heading generation issues

### Future Enhancements (Not for Today)

- [ ] **Supabase storage integration**
  - [ ] Store generated headings as 'action' or 'edit' or 'lens' in enhancement system
  - [ ] Implement reversible changes to base HTML document
  - [ ] Enable headings to persist across sessions
  - [ ] Add versioning and history for different heading generations

## Technical Notes

### API Response Format

Based on obsolete_alternative_version prompt, API could return:
```json
[
  {
    "id_of_after": "element_123", 
    "html": "<h3>Section Title</h3>"
  }
]
```

**RESOLVED**: We use `id_of_after` to specify the element that should follow the new heading. This works well for the current implementation where headings are displayed in the UI but not actually inserted into the DOM.


### UI Component Structure
```
TableOfContents
├── Tab: "Original" (existing functionality)
└── Tab: "AI-generated" 
    ├── GenerateButton (initial state)
    ├── LoadingState (during API call)  
    ├── ErrorState (on API failure)
    └── HeadingsList (success state)
```

### Integration Points
- Follow existing prompt template patterns in `lib/prompts/`
- Use established API route structure from `/api/glossary` and `/api/summarise`
- Reuse ToC styling and interaction patterns from `components/table-of-contents.tsx`
- Leverage existing hierarchical content extraction for tooltip summaries
- Use existing document element selection coordination patterns

## Acceptance Criteria

- [x] API generates logical heading structure that improves document navigation
- [x] UI provides clear loading and error states during heading generation
- [x] Generated headings support click-to-scroll functionality (tooltips not implemented)
- [x] Tab interface is intuitive and consistent with application design
- [x] Console logging shows clear heading hierarchy during development
- [x] All existing functionality continues to work without regression
- [ ] Documentation accurately reflects new architecture and usage patterns (optional)

## Implementation Results

### Successfully Tested
- ✅ API tested with sample content: generates 4 headings (1 H1, 3 H2s)
- ✅ API tested with real document: generates 43 headings with complex hierarchy (H1-H4)
- ✅ UI integration working: button → loading → headings display
- ✅ Visual distinction: green theme for AI headings vs blue for original
- ✅ All error handling and loading states functional
- ✅ Tab switching works smoothly
- ✅ Click-to-scroll navigation works with generated headings

### Technical Implementation
- **API Endpoint**: `/api/headings` with proper Zod validation
- **Prompt Template**: `headings.njk` with 8000 token limit
- **Response Format**: `{headings: [{id_of_after, html}]}` array
- **UI Integration**: State management for `aiHeadings[]` array
- **Styling**: Green hover states (hover:bg-green-50, text-green-600/900)
- **HTML Parsing**: Regex extraction of heading text and level from API response