# Multiple Summary Granularities Implementation

## Goal

Enhance the summary feature to generate and display summaries across two dimensions: expertise level and summary length, allowing users to quickly switch between different combinations using dual slider interfaces.

**Specific objectives:**
- Generate 9 summaries in parallel: 3 expertise levels × 3 length levels
- Expertise levels: Beginner, Intermediate, Expert
- Length levels: 'sentence or two', 'single short paragraph', 'page'
- Store all 9 summaries efficiently in a single database row
- Implement dual slider UI for seamless switching between combinations
- Create new multi-summarise API alongside existing single-summary API
- Leverage prompt caching for cost-effective parallel generation
- Generate summaries in markdown format with proper UI display

## Context

Currently, the summary tab generates a single adaptive-length summary. Users would benefit from having multiple options across two dimensions:
1. **Expertise level**: How much domain knowledge to assume (affects jargon, background explanations, reading level)
2. **Summary length**: How much detail to include (quick overview vs comprehensive summary)

With prompt caching implemented, generating 9 summaries (3×3 combinations) in parallel becomes cost-effective. The existing single-summary API will remain for other use cases.

## References

- `docs/AI_SUMMARISE.md` - Current summary implementation documentation
- `lib/prompts/templates/summarise.njk` - Summary prompt template
- `components/summary-pane.tsx` - Summary UI component
- `app/api/summarise/route.ts` - Summary API endpoint
- `planning/250608a_prompt_caching_implementation.md` - Prerequisite caching implementation
- Previous analysis in `regenerate-summary-analysis.md` - Identified current implementation details

## Principles & Key Decisions

### Two-Dimensional Approach
- **Expertise levels**: 
  - Beginner: Minimal jargon, more background explanations, accessible language
  - Intermediate: Some jargon okay, balanced explanations
  - Expert: Technical language, assume domain knowledge
- **Length levels**:
  - 'sentence or two' (50 tokens) - Quick overview
  - 'single short paragraph' (200 tokens) - Balanced summary
  - 'page' (800 tokens) - Detailed summary
- **Combinatorial approach**: 3×3 = 9 total summaries generated in parallel
- **Fixed granularities**: Not adapting based on document length for v1 simplicity
- **Default selection**: Intermediate expertise + single short paragraph

### Technical Approach
- **New API endpoint**: Create `/api/multi-summarise` alongside existing `/api/summarise`
- **Parallel generation**: Use `Promise.all()` for nine concurrent API calls
- **Leverage caching**: Ensure prompt caching is enabled for all nine calls
- **Single storage**: Store all 9 summaries in one JSON field in database
- **All-or-nothing**: If any summary fails, entire operation fails
- **Markdown format**: Generate summaries in markdown for proper formatting
- **Clean migration**: OK to delete existing summary rows for prototype

### UI Design
- **Dual slider interface**: Two discrete sliders similar to ToC depth control
  - Expertise slider: Beginner | Intermediate | Expert
  - Length slider: Brief | Standard | Detailed
- **Both sliders visible**: Simultaneous display for easy access
- **Discrete positions**: Click-to-select rather than continuous sliders
- **Instant switching**: All 9 summaries pre-loaded, no delay when changing combinations
- **Visual feedback**: Clear indication of current selections
- **Markdown display**: Proper rendering of formatted summaries

## Actions

### Stage: Verify prompt caching is implemented
- [ ] Confirm `planning/250608a_prompt_caching_implementation.md` is complete
- [ ] Verify summarise API route has `enableCaching: true`
- [ ] Check that summarise template uses common document prefix
- [ ] If caching not ready, STOP and complete that first

### Stage: Update database storage structure
- [ ] Design JSON structure for storing 9 summaries (3×3 combinations):
  ```json
  {
    "beginner": {
      "sentence_or_two": "...",
      "single_short_paragraph": "...",
      "page": "..."
    },
    "intermediate": {
      "sentence_or_two": "...",
      "single_short_paragraph": "...",
      "page": "..."
    },
    "expert": {
      "sentence_or_two": "...",
      "single_short_paragraph": "...",
      "page": "..."
    }
  }
  ```
- [ ] Delete existing summary enhancement rows from local database using psql
- [ ] Update TypeScript types for new multi-dimensional storage format
- [ ] Update database service methods for loading/storing multi-summaries
- [ ] Add reset functionality to clear cached multi-summaries
- [ ] Write tests for new storage structure

### Stage: Create new multi-summarise API
- [ ] Create new `/app/api/multi-summarise/route.ts` (keep existing `/api/summarise` unchanged)
- [ ] Create new multi-summarise prompt template with expertise and length variables
- [ ] Implement parallel generation using Promise.all() for 9 combinations:
  ```typescript
  const summaries = await Promise.all([
    // All 9 combinations of expertise × length
    generateSummary(content, 'beginner', 'sentence or two'),
    generateSummary(content, 'beginner', 'single short paragraph'),
    // ... etc for all 9 combinations
  ]);
  ```
- [ ] Ensure all 9 calls use prompt caching with common document prefix
- [ ] Generate summaries in markdown format
- [ ] Store results in new nested JSON structure
- [ ] Add all-or-nothing error handling (any failure = total failure)
- [ ] Write unit tests for parallel generation
- [ ] Run tests to verify functionality
- [ ] Update planning doc with progress
- [ ] Follow `docs/DEBRIEF_PROGRESS.md` for progress summary
- [ ] Commit changes following `docs/GIT_COMMITS.md`

### Stage: Update summary fetching logic
- [ ] Create new database methods for multi-summary storage/retrieval
- [ ] Update client-side data fetching in `SummaryPane` to use new API
- [ ] Add TypeScript types for multi-dimensional response structure
- [ ] Add state management for both expertise and length selections
- [ ] Test data fetching with new nested structure

### Stage: Implement dual slider controls
- [ ] Create expertise level slider component (3 discrete positions: Beginner | Intermediate | Expert)
- [ ] Create length slider component (3 discrete positions: Brief | Standard | Detailed)
- [ ] Style both sliders similar to existing ToC depth slider
- [ ] Implement state management for both selections (default: Intermediate + Standard)
- [ ] Add clear labels for both slider axes
- [ ] Ensure both sliders are visible simultaneously
- [ ] Write component tests for dual slider interaction

### Stage: Integrate dual sliders with summary display
- [ ] Update `SummaryPane` to use both slider components
- [ ] Implement switching logic to display selected summary from 9-combination matrix
- [ ] Add smooth transitions when changing either expertise or length
- [ ] Ensure default selection is Intermediate + Standard (single short paragraph)
- [ ] Maintain scroll position when switching between summaries
- [ ] Test all 9 summary combinations display correctly
- [ ] Run automated tests
- [ ] Update planning doc with progress
- [ ] Follow `docs/DEBRIEF_PROGRESS.md` for progress summary
- [ ] Commit changes following `docs/GIT_COMMITS.md`

### Stage: Ensure proper markdown display
- [ ] Verify existing markdown rendering machinery in codebase (check chat-markdown.tsx)
- [ ] Ensure SummaryPane properly renders markdown-formatted summaries
- [ ] Test that markdown features (bold, italics, lists, etc.) display correctly
- [ ] Verify consistent styling with rest of application
- [ ] Test across all 9 summary combinations
- [ ] Update documentation if new markdown components needed

### Stage: Integration testing
- [ ] Use subagent with Playwright MCP to test:
  - Upload a new document
  - Wait for multi-summary generation (all 9 summaries)
  - Test both slider interactions independently
  - Test combined slider interactions (9 total combinations)
  - Verify all summaries display correctly with markdown formatting
  - Check performance and responsiveness
- [ ] Test with documents of varying lengths
- [ ] Verify caching is working for all 9 parallel calls (check network tab)
- [ ] Test error scenarios (any summary failure = total failure)
- [ ] Document any issues found

### Stage: Cost and performance validation
- [ ] Monitor API usage to confirm caching benefits for 9 parallel calls
- [ ] Measure generation time for nine parallel calls vs sequential
- [ ] Compare costs with/without caching (expected: ~2.8x single call vs 9x without caching)
- [ ] Document actual vs expected savings
- [ ] Adjust implementation if needed
- [ ] Update planning doc with findings
- [ ] Follow `docs/DEBRIEF_PROGRESS.md` for progress summary
- [ ] Commit changes following `docs/GIT_COMMITS.md`

### Stage: Documentation and cleanup
- [ ] Update `docs/reference/AI_SUMMARISE.md` with multi-dimensional summary feature
- [ ] Document the dual-slider interface and 9-combination approach
- [ ] Document the new multi-summarise API alongside existing API
- [ ] Add user-facing documentation about both expertise and length controls
- [ ] Update any API documentation
- [ ] Review all changes for consistency
- [ ] Move this planning doc to `planning/finished/`
- [ ] Final commit

### Stage: Optional future expansion
- [ ] **Future consideration**: Extend multi-level summaries to individual headings
  - Generate summaries for each heading with all constituent content
  - Apply same 3×3 expertise/length matrix to heading-level summaries
  - Store in separate enhancement type or extend current structure
- [ ] **Future consideration**: Extend to paragraph-level summaries
  - Generate summaries for individual paragraphs/blocks/lists/images
  - Apply same multi-dimensional approach
  - Likely requires separate API due to volume
- [ ] **Note**: These features would require new/separate APIs due to different content scope

## Appendix

### Cost Analysis with Caching

With prompt caching enabled for 9 parallel calls:
- First call: 100% base cost + 25% cache write
- Calls 2-9: 10% base cost each (90% savings per call)
- **Total: 1.0 + 0.25 + (8 × 0.1) = 2.05x single call cost** (vs 9x without caching)
- **Savings: ~77% vs non-cached approach**

### UI Slider Design Considerations

**Dual Slider Layout:**
- Both sliders visible simultaneously for easy access
- Similar styling to existing ToC depth slider for consistency
- Discrete positions (click-to-select) rather than continuous

**Expertise Slider:**
- Labels: "Beginner" | "Intermediate" | "Expert"
- Default: Intermediate
- Affects: jargon level, background explanations, reading complexity

**Length Slider:**
- Labels: "Brief" | "Standard" | "Detailed" 
- Default: Standard (single short paragraph)
- Maps to: 50 tokens | 200 tokens | 800 tokens

**Interaction:**
- Both keyboard accessible (arrow keys to change)
- Immediate preview of selected combination
- Clear visual feedback for current selections

### Database Migration Strategy

For this prototype:
- Simple approach: Delete existing summary rows with psql
- No backwards compatibility needed - we have no users yet
- All-or-nothing storage: if any of 9 summaries fail, store none
- Future consideration: versioning summaries when we have production users
- Keep existing single-summary API functionality unchanged

### Parallel Generation Benefits

- User experience: All 9 summaries ready immediately for instant switching
- Caching efficiency: Maximum benefit from shared document prefix across 9 calls
- Simpler than progressive/on-demand generation
- Clean error handling: all-or-nothing approach (any failure = total failure)
- Cost effective: ~2.05x single call cost vs 9x without caching

### Alternative Expertise Level Labels (for reference)

**Option A (Experience-based):**
- "New to topic" → "Some experience" → "Expert knowledge"

**Option B (Audience-based):**
- "General audience" → "Familiar with topic" → "Domain expert"

**Option C (Accessibility-based):**
- "Accessible" → "Standard" → "Technical"

**Chosen approach:** Beginner/Intermediate/Expert for clarity and directness