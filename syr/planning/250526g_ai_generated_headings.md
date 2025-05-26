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

### Stage 1: Core API Implementation

- [ ] **Create prompt template and schema**
  - [ ] Create `lib/prompts/templates/headings.njk` based on obsolete_alternative_version prompt
  - [ ] Create `lib/prompts/templates/headings.ts` with Zod schema for heading generation
  - [ ] Modify prompt to work with our document structure and deterministic IDs
  - [ ] Remove complex action-based structure from original prompt - simplify to just heading insertion

- [ ] **Implement headings API endpoint**
  - [ ] Create `app/api/headings/route.ts` following pattern from glossary/summarise APIs
  - [ ] Use Cheerio (or similar) to remove all existing headings from HTML before passing to LLM
  - [ ] Implement HTML content processing and LLM integration
  - [ ] Add proper error handling and JSON response formatting
  - [ ] Log generated headings to console with indentation (H1-H6 visual hierarchy)

- [ ] **Test API with curl**
  - [ ] Test with sample document content
  - [ ] Verify JSON response format matches schema
  - [ ] Confirm headings are logical and well-structured
  - [ ] Check that insertion points (`id_of_after`) reference valid element IDs

### Stage 2: UI Integration - Tabbed ToC Pane

- [ ] **Add tab structure to Table of Contents pane**
  - [ ] Modify `components/table-of-contents.tsx` to include tab interface
  - [ ] Create "Original" tab containing existing ToC functionality
  - [ ] Create "AI-generated" tab with initial "Generate new headings" button
  - [ ] Ensure tab switching works smoothly with consistent styling

- [ ] **Implement generate button placeholder**
  - [ ] Add "Generate new headings" button in AI-generated tab
  - [ ] Replace button with "Placeholder for AI-generated headings" message when clicked
  - [ ] Add loading states and basic error handling
  - [ ] Test tab switching and button interaction

### Stage 3: STOP AND REVIEW WITH USER

User review point to validate approach and UI before connecting real data.

### Stage 4: Connect Real Heading Generation

- [ ] **Integrate API with UI**
  - [ ] Connect "Generate new headings" button to `/api/headings` endpoint
  - [ ] Replace placeholder with actual generated headings from LLM
  - [ ] Implement loading states during API calls
  - [ ] Add proper error handling with user-friendly messages

- [ ] **Reuse existing ToC patterns**
  - [ ] Apply same visual hierarchy (indentation, level labels) as original ToC
  - [ ] Implement click-to-scroll functionality for generated headings
  - [ ] Add tooltip summaries using existing hierarchical content extraction
  - [ ] Ensure generated headings trigger same document viewer selection behaviour

- [ ] **Disable original ToC tab after the user presses "Generate new headings" button**
  - [ ] Hide or disable "Original" tab to focus on AI-generated structure
  - [ ] Ensure all existing functionality works with generated headings
  - [ ] If the user reloads the page, things should revert to the starting state, i.e. displaying the "Original" tab as active, with the button ready to be pressed again in the "AI-generated" tabs
  - [ ] Test navigation and scrolling with new heading structure

### Stage 5: Documentation and Commit

- [ ] **Update documentation**
  - [ ] Update `docs/TABLE_OF_CONTENTS_PANE.md` to document new tabbed interface
  - [ ] Document AI heading generation architecture and patterns
  - [ ] Add troubleshooting section for common heading generation issues

- [ ] **Git commit following conventions**
  - [ ] Test that build/lint/typecheck all pass before committing
  - [ ] Create comprehensive commit following `docs/GIT_COMMITS.md` guidelines

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

(THIS NEEDS DISCUSSION - How should we define the position of a new heading? The old approached used `id_of_after`, i.e. you specified the ID of the element that would follow the new heading. Would it work better if we specified `id_of_before`, i.e. specify the ID of the element that will precede the new heading? Or both (and then raise an exception if they aren't contiguous?)? )


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

- [ ] API generates logical heading structure that improves document navigation
- [ ] UI provides clear loading and error states during heading generation
- [ ] Generated headings support same interactions as original ToC (click-to-scroll, tooltips)
- [ ] Tab interface is intuitive and consistent with application design
- [ ] Console logging shows clear heading hierarchy during development
- [ ] All existing functionality continues to work without regression
- [ ] Documentation accurately reflects new architecture and usage patterns