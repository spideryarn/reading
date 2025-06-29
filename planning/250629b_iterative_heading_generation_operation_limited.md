# Iterative Heading Generation - Operation Limited

## Goal, context

Replace the current all-at-once heading generation with an iterative, operation-limited approach that provides faster time-to-value while maintaining quality. The new system allows the LLM to make up to 10 heading operations (insert, replace, remove) per iteration, then returns with a `more_changes_required` signal to continue if needed.

Current system removes all existing headings and generates completely new ones. New approach preserves good existing headings, improves unclear ones, and adds missing structure using hierarchical priorities while maintaining existing mutation system architecture.

**Key simplification from level-by-level approach**: Instead of constraining by heading levels (H1, H2, H3), we constrain by operation count (max 10 per iteration) but provide hierarchical guidance in the prompt to ensure quality structure emerges naturally.

**Later stage enhancement**: Implement Anthropic prompt caching for finalized heading documents to reduce token costs by 90% for subsequent document analysis operations.

## User stories & acceptance criteria

**As a user, I want to see document structure improve iteratively** so that I get immediate value and can stop when the structure meets my needs.

**Acceptance criteria:**
- Each iteration completes in <20 seconds for typical documents
- Clear progress indication showing iteration count and changes made
- One-click continuation or stop after each iteration
- Maximum 5 iterations with hard stop to prevent infinite loops
- Ability to cancel in-progress iteration

**As a user, I want the LLM to follow smart priorities** so that the most important structural improvements happen first.

**Acceptance criteria:**
- H1 document title established first if missing
- H2 major sections created before H3+ subdivisions  
- Existing good headings preserved and enhanced rather than replaced
- Poor quality headings improved with clear authorial voice
- Target ~200 words between headings for optimal readability

**As a user, I want transparency about what changed** so I can understand the improvements and decide whether to continue.

**Acceptance criteria:**
- Clear summary of operations performed each iteration
- Before/after preview of key changes
- Count of headings added, modified, removed
- Estimated reading improvement metrics

## References

- `docs/conversations/250628c_hierarchical_heading_generation_approach.md` - Research foundation and density analysis supporting this approach
- `planning/250628b_hierarchical_heading_generation_implementation.md` - Previous level-by-level approach with valuable research and technical analysis  
- `docs/reference/TOOL_STRUCTURE_HEADINGS.md` - Current heading system architecture and mutation integration
- `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Mutation system supporting insert, replace, remove operations
- `lib/prompts/templates/headings.njk` - Current prompt template requiring modification for iterative approach
- `lib/prompts/templates/headings.ts` - Schema validation requiring extension for iteration signals
- `docs/reference/LLM_PROMPT_CACHING.md` - Anthropic caching capabilities for cost optimization

## Principles, key decisions

**Operation-limited over level-limited**: User chose simpler approach to avoid implementation complexity while maintaining progressive improvement benefits. Max 10 operations per iteration with hierarchical guidance in prompt.

**Hierarchical priorities in prompt**: Rather than enforcing level constraints technically, use prompt engineering to guide LLM toward proper hierarchical thinking:
1. Establish clear H1 document title if missing
2. Create H2 major sections before subdividing  
3. Improve existing headings following best practices
4. Add H3+ subdivisions where sections are too long (>400 words)

**Research-backed density target**: ~200 words between headings based on University of Washington study showing optimal comprehension. High-frequency headings (every paragraph) reduce comprehension.

**Hard safety limits**: Maximum 5 iterations and 50 total operations per document to prevent infinite loops. Frontend state management prevents concurrent iterations.

**Quality over speed**: Continue using Claude Sonnet 4 for accuracy, achieve speed through progressive iteration rather than model switching.

**Anthropic prompt caching integration**: Once headings are finalized, cache complete document structure for 90% cost savings on subsequent operations (glossary, summary, chat).

## Stages & actions

### Stage: Foundation and prompt engineering
- [ ] Run `./scripts/sync-worktrees.ts` in subagent to sync latest changes from main
- [ ] Use subagent to research existing iteration patterns in the codebase (glossary polling, tool execution)
- [ ] Validate current mutation system supports operation limiting without modifications
- [ ] Modify `lib/prompts/templates/headings.njk` to support iterative approach:
  - Add hierarchical priorities guidance (see Appendix A for full prompt)
  - Include operation count limit (max 10 per iteration)
  - Add density guidance (~200 words between headings)
  - Include iteration context (what was done in previous iterations)
- [ ] Extend `lib/prompts/templates/headings.ts` schema:
  - Add `more_changes_required: boolean` in response schema
  - Add `iteration_summary: string` describing changes made
  - Add `confidence_score: number` (0-100) in completion
  - Add `safety_check: { total_operations: number, iterations: number }` for limits

### Stage: API route enhancement for iteration support
- [ ] Extend `/app/api/tools/structure/route.ts` to support iterative requests:
  - Add iteration tracking and safety limits (max 5 iterations, 50 operations)
  - Implement operation counting and validation
  - Add comprehensive logging for iteration metrics
  - Preserve all existing caching and error handling
- [ ] Implement enhanced response format with iteration signals:
  ```typescript
  {
    operations: HeadingOperation[],
    more_changes_required: boolean,
    iteration_summary: string,
    confidence_score: number,
    safety_check: {
      current_iteration: number,
      total_operations_so_far: number,
      max_iterations_reached: boolean
    }
  }
  ```
- [ ] Add frontend state management to prevent concurrent iterations
- [ ] Test API changes with various document types and operation scenarios

### Stage: Frontend UI for iterative progression
- [ ] Modify `components/tools/StructurePanel.tsx` to support iteration workflow:
  - Replace single "Generate" button with "Improve Headings" button
  - Show iteration progress (e.g., "Iteration 2 of 5")
  - Display operation summary after each iteration
  - Add "Continue Improving" and "Finish" buttons after each iteration
  - Implement loading states with cancel control
- [ ] Add iteration state management:
  - Track current iteration count and total operations
  - Store iteration summaries for user review
  - Handle iteration completion and stopping criteria
  - Preserve existing caching and error handling
- [ ] Design simple progress UI (avoid "UI complexity creep" from o3 critique):
  - Toast notifications for iteration completion
  - Simple operation count display
  - Clear continue/stop choice after each iteration
- [ ] Write tests for iterative generation UI flows

### Stage: Safety mechanisms and testing
- [ ] Implement hard safety limits:
  - Maximum 5 iterations per document session
  - Maximum 50 total operations per document
  - Frontend disabled state when limits reached
  - Clear messaging about why iteration stopped
- [ ] Add operation loop detection:
  - Track operation fingerprints to detect oscillation
  - Stop if same operations are being undone/redone
  - Log loop detection events for analysis
- [ ] Test iteration approach with variety of document types:
  - Academic papers (expect 3-4 iterations for complex structure)
  - Blog posts (expect 1-2 iterations for simple structure)
  - Technical documentation (expect 2-3 iterations)
  - Books/chapters (expect 4-5 iterations up to limit)
- [ ] Use subagent with browser automation to test complete iterative workflows
- [ ] Run `npm run check:health` to ensure no regressions

### Stage: Performance monitoring and optimization
- [ ] Implement detailed iteration metrics:
  - Time per iteration and total session time
  - Token usage per iteration vs old all-at-once approach
  - User stopping patterns (when do they choose to finish?)
  - Operation type distribution (insert vs replace vs remove)
- [ ] Add iteration-specific logging using existing `logAIOperation()` patterns:
  - Track iteration progression for performance analysis
  - Monitor safety limit triggers and reasons
  - Log user satisfaction signals (early stopping vs hitting limits)
- [ ] Use subagent to analyze performance logs and identify optimization opportunities

### Stage: Anthropic prompt caching integration - simplified approach
- [ ] Design cache strategy for finalized heading documents:
  - Cache complete document + headings after user chooses "Finish"
  - Simple key based on document ID + heading version
  - Automatic integration with subsequent tool operations (glossary, summary, chat)
- [ ] Implement cache control in LLM operations:
  - Add Anthropic cache headers for finalized documents
  - Cache invalidation when headings modified
  - Track cache hit rates and cost savings
- [ ] Test cache effectiveness with realistic document analysis workflows

### Stage: Final testing and rollout
- [ ] Comprehensive testing with subagent using Playwright for full iterative workflows
- [ ] Load testing with various document sizes and iteration scenarios
- [ ] Test integration with other tools using iteratively-generated headings
- [ ] Final health check: `npm run build`, `npm run lint`, `npm test` (use subagent if verbose output)
- [ ] Update `docs/reference/TOOL_STRUCTURE_HEADINGS.md` with iterative approach documentation
- [ ] Move doc to `planning/finished/` and commit

## Appendix

### Appendix A: Hierarchical Prompt Engineering Approach

**Key prompt priorities to include in `headings.njk`:**

```njk
Make up to 10 improvements to the heading structure. Prioritize in this order:

1. **Establish clear document structure first**: 
   - Ensure there's exactly one H1 for the document title
   - Create H2 major sections to organize the main topics
   
2. **Add subdivisions where sections are too long**:
   - Add H3+ sub-headings where sections exceed ~400 words
   - Focus on sections that would benefit from subdivision
   
3. **Improve existing headings following best practices**:
   - Make headings more descriptive and scannable
   - Ensure consistent voice and style
   - Remove redundant or unclear headings
   
4. **Optimize for readability**:
   - Target approximately 200 words between headings
   - Ensure headings serve as useful navigation waypoints

Current iteration: {{ iteration_count || 1 }}
Previous changes: {{ previous_iteration_summary || "None - this is the first iteration" }}
```

### Appendix B: Research Foundation from Previous Planning

**University of Washington Study Results:**
- Optimal heading frequency: ~200 words between headings
- High frequency (every ~100 words): Poor comprehension (tied for worst)
- Quality insight: "It's not enough to say: 'Write headings'. They have to be good headings, and placed thoughtfully."

**Why Operation-Limited vs Level-Limited:**
- **Simplicity**: Avoids complex UI state management for different levels
- **Flexibility**: LLM can mix levels intelligently based on content needs
- **User feedback**: Addresses concern about "implementation complexity/over-engineering"
- **Research alignment**: Still follows hierarchical principles through prompt guidance

### Appendix C: Migration from Previous Plan

**Elements preserved from level-by-level approach:**
- Research foundation on optimal heading density (~200 words)
- Mutation system integration (insert, replace, remove operations)
- Progressive improvement UX (faster time-to-value)
- Anthropic prompt caching for cost optimization
- Quality over speed principle (Claude Sonnet 4)
- Performance monitoring and token tracking

**Elements simplified:**
- No level-specific UI components (badges, level indicators)
- No complex progression logic (H1+H2 → H3 → H4 etc.)
- No level-constrained operation validation
- No density analysis per level
- Single simple "Continue/Finish" choice instead of level progression

**Key benefits retained:**
- Progressive disclosure (see improvements iteratively)
- User control (stop when satisfied)
- Preserve good existing headings
- Research-backed heading density optimization
- Cost savings through prompt caching

### Appendix D: Safety and Edge Case Handling

**Infinite loop prevention:**
- Hard limit: 5 iterations maximum
- Hard limit: 50 operations maximum per document
- Operation fingerprint tracking to detect oscillation
- Frontend disabled state with clear messaging

**User experience edge cases:**
- Document already has perfect headings: LLM returns `more_changes_required: false` on first iteration
- Very short document: LLM focuses on improving existing headings rather than adding many new ones
- Very long document: Iteration limits ensure process completes in reasonable time
- User cancellation: Abort controller cancels in-flight requests cleanly

**Error handling:**
- LLM fails to provide stopping signal: Default to requiring user choice after each iteration
- Network timeout during iteration: Clear error state with option to retry
- Invalid operations returned: Validation layer catches and requests re-iteration