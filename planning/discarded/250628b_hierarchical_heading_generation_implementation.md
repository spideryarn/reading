# Hierarchical Heading Generation Implementation

## Goal, context

Implement level-by-level heading generation to replace the current all-at-once approach, providing faster time-to-value, better quality control, and research-backed hierarchical structure generation. Based on comprehensive research showing hierarchical approaches outperform flat generation by significant margins, and that optimal heading density (~200 words between headings) produces better comprehension than both sparse and over-dense alternatives.

The current system removes all existing headings and generates completely new ones. The new approach will preserve good existing headings, improve unclear ones, and add missing structure using full mutation operations (insert, replace, remove) available to the LLM at each level.

**Note from user**. We don't care about backwards compatibility. We have zero users currently.

**Later stage enhancement**: Implement Anthropic prompt caching for finalized heading documents to reduce token costs by 90% for subsequent document analysis operations, requiring design discussion for integration with our tool execution framework.

## User stories & acceptance criteria

**As a user, I want to see document structure emerge progressively** so that I get value immediately and can stop when sufficient detail is reached.

**Acceptance criteria:**
- H1+H2 generation completes in <30 seconds for typical documents
- Each subsequent level (H3, H4, etc.) completes in <20 seconds  
- Clear UI indication of current level and available next steps
- One-click progression to next level with cancel control
- Ability to stop at any level when structure is sufficient

**As a user, I want the LLM to have full control over heading operations** so that it can preserve good existing headings while improving the overall structure.

**Acceptance criteria:**
- LLM can insert new headings where structure is missing
- LLM can replace existing headings that are unclear or poor quality
- LLM can remove redundant or unnecessary headings
- All operations work correctly within the mutation system
- Original author intent is preserved where headings are already good

**As a user, I want automatic progression when the system knows more levels would help** so that I don't have to manually click through obvious improvements.

**Acceptance criteria:**
- LLM provides `more_headings_available` signal like glossary system
- Auto-progression available with clear cancel control
- Smart stopping based on density analysis (~200 words between headings)
- User can override auto-progression preferences

**As a user, I want fast subsequent operations on documents with finalized headings** so that glossary, summary, and chat operations are cheaper and faster.

**Acceptance criteria:**
- Finalized document with headings cached in Anthropic prompt cache
- 90% token cost reduction for subsequent LLM operations on same document
- Cache invalidation when document structure changes
- Seamless integration with existing tool execution framework

## References

- `docs/conversations/250628c_conversation_hierarchical_heading_generation_approach.md` - Decision rationale and research findings supporting level-by-level approach
- `docs/reference/TOOL_STRUCTURE_HEADINGS.md` - Current heading system architecture and mutation integration
- `planning/finished/250620c_glossary_generate_more_timeout_mitigation.md` - Progressive loading pattern with `more_entities_available` signal that we'll adapt
- `docs/reference/LLM_PROMPT_CACHING.md` - Anthropic caching capabilities (90% savings, 5-min TTL, manual setup required)
- `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Mutation system supporting insert, replace, remove operations
- `lib/prompts/templates/headings.njk` - Current prompt template requiring modification for level-specific generation
- `lib/prompts/templates/headings.ts` - Schema validation requiring extension for level constraints and stopping signals

## Principles, key decisions

**Level-by-level progression over operation-limited**: Research shows hierarchical models significantly outperform flat approaches. Start with H1+H2 together (establishes document title + major sections), then H3, H4, etc. as needed.

**All three operations available**: LLM gets insert, replace, and remove operations at each level to preserve author intent while improving structure. This is more sophisticated than the previous "remove all, regenerate all" approach.

**Research-backed optimal density**: Target ~200 words between headings based on University of Washington study showing this produces best comprehension. High-frequency headings (every paragraph) actually reduce comprehension.

**Manual progression initially, auto-progression later**: Start with user-controlled progression for predictability, add auto-progression with cancel control once the pattern is proven.

**Anthropic prompt caching for cost optimization**: Once headings are finalized, cache the complete document structure for 90% cost savings on subsequent operations (glossary, summary, chat). Requires discussion about integration approach with tool execution framework.

**Quality over speed**: Continue using Claude Sonnet 4 for accuracy as requested, but achieve speed through progressive disclosure rather than model switching.

## Stages & actions

### Stage: Research validation and foundation
- [ ] Run `./scripts/sync-worktrees.ts` in subagent to sync latest changes from main
- [ ] Use subagent to search for any existing level-by-level or progressive generation patterns in the codebase that we could build on
- [ ] Review current heading generation performance metrics and identify specific bottlenecks (token usage, response time, user complaints)
- [ ] Validate that current mutation system can handle level-constrained operations without modifications

### Stage: Prompt template adaptation for level-specific generation
- [ ] Modify `lib/prompts/templates/headings.njk` to support level-specific instructions
  - Add conditional logic for level focus (e.g., "Generate only H3 headings" when `target_level: 3`)
  - Include density guidance (~200 words between headings)
  - Preserve context about existing headings while focusing on target level
- [ ] Extend `lib/prompts/templates/headings.ts` schema to support:
  - `target_level?: number` parameter for level-specific generation
  - `existing_headings?: HeadingData[]` to provide context of current structure
  - `more_headings_available: boolean` in response schema
  - `density_analysis?: { current_avg_words: number, sections_needing_detail: string[] }` for stopping signals
- [ ] Add validation logic to ensure operations match target level (e.g., only H3 operations when `target_level: 3`)
- [ ] Write tests for level-constrained prompt generation and validation

### Stage: API route enhancement for progressive generation
- [ ] Extend `/app/api/tools/structure/route.ts` to support level-specific requests
  - Add `target_level` parameter handling
  - Implement existing headings extraction from current document state
  - Add stopping criteria logic based on density analysis
  - Preserve all existing caching and error handling
- [ ] Implement response format extension with stopping signals:
  ```typescript
  {
    operations: HeadingOperation[],
    more_headings_available: boolean,
    density_analysis: {
      current_avg_words_between_headings: number,
      sections_needing_detail: string[],
      optimal_density_reached: boolean
    },
    recommended_next_level?: number
  }
  ```
- [ ] Add comprehensive logging for level-specific generation metrics
- [ ] Test API changes with various document types and heading structures

### Stage: Frontend UI for progressive generation
- [ ] Modify `components/tools/StructurePanel.tsx` to support level-by-level progression
  - Add "Generate H3s" button when H2s exist and more levels recommended
  - Show current level status and available next steps
  - Implement progress indicators for each level generation
  - Add density information display (words between headings)
- [ ] Implement state management for progressive generation:
  - Track current maximum level generated
  - Store stopping signals from API responses
  - Handle level-specific loading states
  - Preserve existing caching and error handling
- [ ] Add level-specific mutation application:
  - Filter operations by target level during application
  - Validate operation consistency before applying
  - Update UI state after successful level completion
- [ ] Design and implement cancel control for level progression
- [ ] Write tests for progressive generation UI flows

### Stage: Manual progression implementation and testing
- [ ] Implement complete manual progression workflow (H1+H2 → H3 → H4 → H5 → H6)
- [ ] Test with variety of document types:
  - Academic papers (complex structure expected)
  - Blog posts (simpler structure expected)  
  - Technical documentation (moderate structure expected)
  - Books/chapters (deep structure expected)
- [ ] Validate stopping criteria accuracy:
  - Does LLM correctly identify when optimal density is reached?
  - Are density calculations accurate for different content types?
  - Do stopping recommendations align with user expectations?
- [ ] Use subagent with browser automation to test complete user workflow
- [ ] Run `npm run check:health` to ensure no regressions in other components

### Stage: Auto-progression with cancel control
- [ ] Implement auto-progression logic based on `more_headings_available` signal
  - Add user preference for enabling auto-progression
  - Implement automatic triggering of next level generation
  - Add clear cancel control during auto-progression
  - Respect density limits to prevent over-generation
- [ ] Add configuration options for auto-progression:
  - Enable/disable auto-progression per user
  - Maximum depth for auto-progression (e.g., stop at H4)
  - Density threshold overrides for different document types
- [ ] Implement abort controller for canceling in-flight requests
- [ ] Test auto-progression with various scenarios:
  - Long documents that benefit from deep structure
  - Short documents that should stop early
  - User cancellation during auto-progression
  - Error handling during auto-progression
- [ ] Add user feedback for auto-progression status

### Stage: Anthropic prompt caching integration - discussion required

**Discussion needed with user**: How should prompt caching integrate with our tool execution framework?

**Key questions for user:**
- Should cached documents be automatically used for subsequent operations (glossary, summary, chat)?
- How should cache invalidation work when headings are modified or removed?
- Should caching be opt-in per document or automatic for all finalized headings?
- How should cache status be displayed to users (hidden, summary badge, detailed metrics)?

**Proposed approach pending user input:**
- [ ] Design cache key strategy for finalized heading documents
- [ ] Implement Anthropic cache control integration in LLM operations
- [ ] Add cache metadata tracking (hit rates, cost savings, invalidation events)
- [ ] Create cache invalidation logic for heading modifications
- [ ] Implement cache status UI and cost savings display
- [ ] Test cache effectiveness with realistic document analysis workflows

### Stage: Performance optimization and monitoring
- [ ] Implement detailed timing metrics for each level generation
- [ ] Add token usage tracking for level-by-level vs all-at-once comparison
- [ ] Create dashboard/logging for generation performance:
  - Average time per level
  - Token usage per level
  - User stopping patterns (when do they stop progression?)
  - Cache hit rates and cost savings (when implemented)
- [ ] Optimize for common patterns:
  - Preload next level if high confidence in `more_headings_available`
  - Batch operations when multiple levels obviously needed
  - Smart retry logic for failed level generations
- [ ] Use subagent to analyze performance logs and identify optimization opportunities

### Stage: Final testing and rollout preparation
- [ ] Comprehensive testing with subagent using Playwright for full user workflows
- [ ] Load testing with various document sizes and complexities
- [ ] Validate backward compatibility with existing cached headings
- [ ] Test integration with other tools (glossary, summary, chat) using progressively generated headings
- [ ] Create rollout plan:
  - Feature flag for level-by-level vs current system
  - User preference for auto-progression
  - Monitoring alerts for performance regressions
  - Rollback plan if issues discovered
- [ ] Update user documentation and help text
- [ ] Final health check: `npm run check:health` with comprehensive validation

### Stage: Documentation and knowledge transfer
- [ ] Update `docs/reference/TOOL_STRUCTURE_HEADINGS.md` with level-by-level approach
- [ ] Create implementation guide for future AI agents working on heading generation
- [ ] Document prompt caching integration patterns for other tools to follow
- [ ] Add troubleshooting guide for level-specific generation issues
- [ ] Update cost optimization documentation with level-by-level + caching benefits

### Stage: Future enhancements planning
- [ ] Identify opportunities for cross-tool progressive generation patterns
- [ ] Plan integration with document editing features (live heading updates)
- [ ] Design smart suggestions for when to use different levels based on document type
- [ ] Consider user customization options for density preferences and stopping criteria
- [ ] Plan potential integration with collaborative editing (multiple users refining structure)

## Appendix

### Research Summary from Previous Discussion

**University of Washington Study Results:**
- Optimal heading frequency: ~200 words between headings
- High frequency (every ~100 words): Poor comprehension (tied for worst)
- Online vs Print: Digital reading requires different heading strategies
- Quality insight: "It's not enough to say: 'Write headings'. They have to be good headings, and placed thoughtfully."

**Academic Evidence for Hierarchical Approaches:**
- Top-down parsing more efficient than bottom-up aggregation
- Hierarchical models achieve "significantly better scores on all metrics"
- Structure is "crucial for semantic understanding and saliency"
- Incremental approaches can adapt clustering structures effectively

**Industry Gap Analysis:**
- Neither Google Docs nor Notion offers AI-powered heading suggestions
- Represents genuine competitive differentiation opportunity
- Current tools focus on manual heading creation + automatic ToC generation

### Current System Analysis

**Performance Bottlenecks:**
- Single large LLM call processing entire document (potentially 500KB+)
- High token costs with Claude Sonnet 4 ($15/1M output tokens)
- 30-60 second latency for large documents
- All-or-nothing approach provides no partial results

**Mutation System Advantages:**
- Already supports insert, replace, remove operations
- Level specification via `tag_name` parameter (`h1`, `h2`, etc.)
- Reversible transformations with full rollback capability
- Existing validation and error handling

### Prompt Caching Cost Analysis

**Potential Savings for Document Analysis:**
- Current cost: 5,000 tokens × $3/MTok = $0.015 per operation
- With 90% caching: 5,000 tokens × $0.30/MTok = $0.0015 per operation
- **10x cost reduction** for subsequent operations on same document

**Implementation Requirements:**
- Anthropic API header: `anthropic-beta: prompt-caching-2024-07-31`
- Minimum 1,024 tokens for Sonnet 4 caching
- 5-minute TTL (refreshed on access)
- Cache control parameter: `{ type: "ephemeral" }`

### Alternative Approaches Considered and Rejected

**Operation-Limited Approach ("10 operations at a time"):**
- Advantage: More LLM flexibility in mixing levels
- Disadvantage: Unpredictable hierarchy, unclear stopping criteria
- Rejected: Research shows hierarchical approaches superior to mixed approaches

**Paragraph-Per-Heading Approach:**
- Advantage: Clear stopping criteria, enables "zoomed out" view
- Disadvantage: Research shows high-frequency headings reduce comprehension
- Preserved: As separate "paragraph summaries" feature for scanning mode

**Model Switching for Speed:**
- Advantage: Faster generation with Gemini Flash
- Disadvantage: Quality concerns, user preference for Sonnet accuracy
- Rejected: User explicitly chose "accuracy over speed" with Sonnet preference

### Code Examples and Technical Patterns

**Level-Constrained Prompt Template Pattern:**
```njk
{% if target_level %}
Focus on generating H{{ target_level }} headings only. 
{% if target_level === 3 %}
Given the existing H1 and H2 structure shown below, add H3 sub-headings 
where sections are complex or would benefit from subdivision.
{% endif %}
{% endif %}

Target density: Approximately 200 words between headings for optimal readability.
```

**API Response Format Enhancement:**
```typescript
{
  operations: HeadingOperation[],
  more_headings_available: boolean,
  density_analysis: {
    current_avg_words_between_headings: 180,
    sections_needing_detail: ["methodology", "results"],
    optimal_density_reached: false
  },
  recommended_next_level: 4
}
```

**Cache Control Integration Example:**
```typescript
const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  messages: [{
    role: "user",
    content: [{
      type: "text",
      text: finalizedDocumentWithHeadings,
      cache_control: { type: "ephemeral" }
    }, {
      type: "text", 
      text: "Generate glossary for this document..."
    }]
  }]
}, {
  headers: { "anthropic-beta": "prompt-caching-2024-07-31" }
});
```


## Appendix - critique from o3 AI

--------------------------------------------------------------------
High-level assessment
--------------------------------------------------------------------
The document is thorough and ambitious.  It identifies current pain-points (latency, cost, “all-or-nothing” UX) and proposes a research-backed, hierarchical, operation-based solution that fits our mutation architecture.  It also aligns with existing progressive-loading patterns already used by the glossary tool, and it keeps Claude Sonnet 4 as the quality benchmark.

However, several areas need tightening to reduce project risk, prevent regressions and ensure the plan meshes cleanly with today’s codebase.

--------------------------------------------------------------------
Major concerns & recommendations
--------------------------------------------------------------------
1. Mismatch with current prompt & schema  
   → Update the zod schema in a non-breaking way: wrap new keys in an optional `progressive` object to avoid exploding every existing validator while the feature flag is off.

2. Storage & migration path  
   • `StructureHandler` currently **does not persist** operations (`// Storage currently disabled – operations are generated but not persisted`).  
   • Old enhancements are stored as the legacy “items” array, not operations.  
   → Before layering level-by-level generation we must finish the ops-based persistence (or we lose any partial results after refresh).  
   → Plan should include a data migration step (transform `items[]` → `operations[]`) or mark legacy rows with a version, else density analysis will mis-count headings.

3. Concurrency / locking  
   • Nothing in the stage list covers concurrent requests (user clicks “Generate H3” twice or auto-progress fires while a manual click is pending).  
   → Need front-end state after button press to avoid duelling mutations.

4. UI complexity creep  
   • StructurePanel will need: current level badge, density stats, cancel button, auto-progress toggles, possibly progress per-level.  
   • This is a large jump from today’s fairly simple component (639 LOC handler but only ~350 LOC panel).  
   → Consider shipping minimal UI first (separate “Generate next level” button & plain toast for density) and iterate; otherwise we risk blocking real users for weeks.

5. Prompt-caching integration details  
   • Plan needs a clear invalidation contract: mutations that touch headings (even manual edits) must purge cache.

6. Testing strategy gaps  
   • Density calculations and “stop” recommendations need unit tests with synthetic HTML of varying length.

7. Security / RLS considerations  
   • If auto-progression runs in background, long-running jobs must still run under the user’s JWT, not a service role, to avoid bypassing RLS.

8. DX & backwards-compatibility  
   • Many external docs (TOOL_STRUCTURE_HEADINGS, LLM_PROMPT_TEMPLATES, etc.) reference the existing flat approach.  The plan lists updates but not a doc-update gating criterion.  
   • Codemods may be needed for any tests or fixtures that assume `headings[]`, not `operations[]`.

--------------------------------------------------------------------
Smaller / tactical notes
--------------------------------------------------------------------
• Feature flag: define `features.progressiveHeadings` in `lib/config/models.ts` rather than an env var sprinkled in pages.  
• `current_avg_words` density metric should exclude headings themselves to avoid skew.  
• Need a fail-safe “Stop auto-progression after N total operations” to guard against runaway loops misreading `more_headings_available`.  
• Consider re-using the glossary’s `useToolExecutorWithNavigation` hook to avoid duplicating polling logic.  
• Accessibility: progress indicators must have ARIA live regions for screen-reader users.  
• Internationalisation: density rules (~200 words) vary by language; flag as “English-tuned” in copy for now.

--------------------------------------------------------------------
Is the overall direction sound?
--------------------------------------------------------------------
Yes: research supports hierarchical generation; incremental UX is aligned with our progressive disclosure design language; “insert/replace/remove” matches existing mutation engine.  The plan mostly builds on present infrastructure (tool registry, unified handler, mutation system) and should be deliverable in staged increments.

--------------------------------------------------------------------
Action-oriented suggestions
--------------------------------------------------------------------
1. Add a **Stage 0** (prerequisite):  
   a. Finish operations persistence + migration script.  
   b. Introduce feature flag and dual-path handler logic.

2. Split prompt & schema work into a separate NPM package or directory (`prompts/headings-progressive`) to keep old prompt stable during rollout.

3. Prototype density calculation & level-targeting quickly in a branch and run against three sample docs to validate performance goals before deeper UI work.

4. Document race-condition handling strategy (front-end lock or DB semaphore) in the plan.

--------------------------------------------------------------------
Conclusion
--------------------------------------------------------------------
The plan is solid but over-ambitious in areas that touch storage, caching and UI.  Tighten prerequisites, simplify first UI milestone, and add concurrency, migration and test considerations to de-risk delivery.