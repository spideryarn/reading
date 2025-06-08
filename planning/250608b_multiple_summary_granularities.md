# Multiple Summary Granularities Implementation

## Goal

Enhance the summary feature to generate and display three different granularity levels, allowing users to quickly switch between different levels of detail using a slider interface.

**Specific objectives:**
- Generate three summary levels in parallel: 'sentence or two', 'single short paragraph', and 'page'
- Store all three summaries efficiently in a single database row
- Implement slider UI for seamless granularity switching
- Leverage prompt caching for cost-effective parallel generation

## Context

Currently, the summary tab generates a single adaptive-length summary. Users would benefit from having multiple granularity options to quickly get different levels of detail - from a quick overview to a comprehensive summary. With prompt caching implemented, generating multiple summaries in parallel becomes cost-effective.

## References

- `docs/AI_SUMMARISE.md` - Current summary implementation documentation
- `lib/prompts/templates/summarise.njk` - Summary prompt template
- `components/summary-pane.tsx` - Summary UI component
- `app/api/summarise/route.ts` - Summary API endpoint
- `planning/250608a_prompt_caching_implementation.md` - Prerequisite caching implementation
- Previous analysis in `regenerate-summary-analysis.md` - Identified current implementation details

## Principles & Key Decisions

### Granularity Selection
- **Three levels chosen**:
  - 'sentence or two' (50 tokens) - Quick overview
  - 'single short paragraph' (200 tokens) - Balanced summary
  - 'page' (800 tokens) - Detailed summary
- **Fixed granularities**: Not adapting based on document length for v1 simplicity
- **Default to middle**: Start with 'single short paragraph' as default view

### Technical Approach
- **Parallel generation**: Use `Promise.all()` for three concurrent API calls
- **Leverage caching**: Ensure prompt caching is enabled for all three calls
- **Single storage**: Store all three summaries in one JSON field in database
- **Clean migration**: OK to delete existing summary rows for prototype

### UI Design
- **Slider interface**: Similar to ToC depth control for consistency
- **Instant switching**: All summaries pre-loaded, no delay when changing levels
- **Visual feedback**: Clear indication of current granularity level

## Actions

### Stage: Verify prompt caching is implemented
- [ ] Confirm `planning/250608a_prompt_caching_implementation.md` is complete
- [ ] Verify summarise API route has `enableCaching: true`
- [ ] Check that summarise template uses common document prefix
- [ ] If caching not ready, STOP and complete that first

### Stage: Update database storage structure
- [ ] Design JSON structure for storing multiple summaries:
  ```json
  {
    "sentence_or_two": "...",
    "single_short_paragraph": "...",
    "page": "..."
  }
  ```
- [ ] Delete existing summary enhancement rows from local database using psql
- [ ] Update TypeScript types for new storage format
- [ ] Write tests for new storage structure

### Stage: Modify summary API for parallel generation
- [ ] Update `/api/summarise/route.ts` to accept multiple granularities parameter
- [ ] Implement parallel generation using Promise.all():
  ```typescript
  const summaries = await Promise.all([
    generateSummary(content, 'sentence or two'),
    generateSummary(content, 'single short paragraph'),
    generateSummary(content, 'page')
  ]);
  ```
- [ ] Ensure all three calls use prompt caching
- [ ] Store results in new JSON structure
- [ ] Add error handling for partial failures
- [ ] Write unit tests for parallel generation
- [ ] Run tests to verify functionality
- [ ] Update planning doc with progress
- [ ] Follow `docs/DEBRIEF_PROGRESS.md` for progress summary
- [ ] Commit changes following `docs/GIT_COMMITS.md`

### Stage: Update summary fetching logic
- [ ] Modify database query to handle new JSON structure
- [ ] Update client-side data fetching in `SummaryPane`
- [ ] Add TypeScript types for multi-granularity response
- [ ] Test data fetching with new structure

### Stage: Implement UI slider control
- [ ] Create granularity slider component similar to ToC depth slider
- [ ] Add three discrete positions for the granularities
- [ ] Implement state management for selected granularity
- [ ] Style slider to match existing UI patterns
- [ ] Add labels or tooltips to indicate granularity levels
- [ ] Write component tests

### Stage: Integrate slider with summary display
- [ ] Update `SummaryPane` to use slider component
- [ ] Implement switching logic to display selected summary
- [ ] Add smooth transitions when changing granularity
- [ ] Ensure default selection is 'single short paragraph'
- [ ] Maintain scroll position when switching
- [ ] Test all three granularity displays
- [ ] Run automated tests
- [ ] Update planning doc with progress
- [ ] Follow `docs/DEBRIEF_PROGRESS.md` for progress summary
- [ ] Commit changes following `docs/GIT_COMMITS.md`

### Stage: Integration testing
- [ ] Use subagent with Playwright MCP to test:
  - Upload a new document
  - Wait for summary generation
  - Test slider interaction
  - Verify all three summaries display correctly
  - Check performance and responsiveness
- [ ] Test with documents of varying lengths
- [ ] Verify caching is working (check network tab)
- [ ] Test error scenarios (partial generation failure)
- [ ] Document any issues found

### Stage: Cost and performance validation
- [ ] Monitor API usage to confirm caching benefits
- [ ] Measure generation time for three parallel calls
- [ ] Compare costs with/without caching
- [ ] Document actual vs expected savings
- [ ] Adjust implementation if needed
- [ ] Update planning doc with findings
- [ ] Follow `docs/DEBRIEF_PROGRESS.md` for progress summary
- [ ] Commit changes following `docs/GIT_COMMITS.md`

### Stage: Documentation and cleanup
- [ ] Update `docs/AI_SUMMARISE.md` with multiple granularity feature
- [ ] Document the parallel generation approach
- [ ] Add user-facing documentation about the slider
- [ ] Update any API documentation
- [ ] Review all changes for consistency
- [ ] Move this planning doc to `planning/finished/`
- [ ] Final commit

## Appendix

### Cost Analysis with Caching

With prompt caching enabled:
- First call: 100% base cost + 25% cache write
- Second call: 10% base cost (90% savings)
- Third call: 10% base cost (90% savings)
- **Total: 1.45x single call cost** (vs 3x without caching)

### UI Slider Design Considerations

- Similar to existing ToC depth slider for consistency
- Three discrete positions (not continuous)
- Labels could be: "Brief", "Standard", "Detailed"
- Or use icons: single line, paragraph, full page
- Keyboard accessible (arrow keys to change)

### Database Migration Strategy

For this prototype:
- Simple approach: Delete existing summary rows with psql
- No backwards compatibility needed - we have no users yet
- Future consideration: versioning summaries when we have production users

### Parallel Generation Benefits

- User experience: All summaries ready immediately
- Caching efficiency: Maximum benefit from shared prefix
- Simpler than progressive generation
- Clean error handling with Promise.allSettled if needed