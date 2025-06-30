# Iterative Heading Generation - Operation Limited

**Progress Update (2025-06-30)**: 
- ✅ Stage 1 (Foundation and prompt engineering) - Complete
- ✅ Stage 2 (API route enhancement) - Complete
- ✅ Stage 3 (Frontend UI) - Complete
- ✅ Stage 4 (Documentation) - Complete
- ⏳ Stage 5 (Safety mechanisms and testing) - In Progress (safety mechanisms complete, testing strategy review next)
- ⏳ Stage 6 (Final testing and rollout) - Pending

**Latest Implementation (2025-06-30)**: 
- ✅ Completed safety mechanisms implementation in Stage 5
- ✅ Added `isIterationInProgress` state variable to prevent concurrent iterations
- ✅ Implemented comprehensive disabled states for all buttons based on safety limits
- ✅ Added visual feedback showing remaining iterations/operations
- ✅ Implemented clear messaging when safety limits are reached
- ✅ All TypeScript and ESLint errors resolved
- ✅ Completed documentation updates in Stage 4:
  - Major rewrite of `TOOL_STRUCTURE_HEADINGS.md` with comprehensive iterative approach documentation
  - Updated `CLAUDE.md` and `DOCUMENTATION_ORGANISATION.md` references

**Test Strategy Review**: The extensive test updates phase requires 14-22 hours of effort. Given this significant time investment, it's recommended to discuss the approach before proceeding:
- **Option A**: Full test coverage (14-22 hours) - Update all affected test files comprehensively
- **Option B**: Minimal viable coverage (8-12 hours) - Focus only on Phase 1 critical tests
- **Option C**: Progressive updates (as-needed) - Update tests only when issues arise

**Recommendation**: Start with Phase 1 critical tests only and evaluate the necessity of additional phases based on actual usage and issues encountered.

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
- `docs/reference/TOOL_EXECUTION_FRAMEWORK.md` - Unified tool execution framework with type-safe wrappers and standardized API endpoints
- `docs/reference/TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md` - Comprehensive tool development guide including registry integration and implementation patterns
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

**Fail fatally & immediately**: Fail fast with clear, debuggable, user-visible error messages whenever errors or unforeseen situations occur. Don't mask problems - expose them clearly for debugging and user understanding.

**Anthropic prompt caching integration**: Once headings are finalized, cache complete document structure for 90% cost savings on subsequent operations (glossary, summary, chat).

## Stages & actions

### Stage: Foundation and prompt engineering
- [x] Use subagent to research existing iteration patterns in the codebase (glossary polling, tool execution)
- [x] Validate current mutation system supports operation limiting without modifications
- [x] **CLARIFY ITERATION INDEXING**: Use 0-based indexing internally (`iteration_count: 0, 1, 2, 3, 4`) and add 1 in presentation layer for user display ("Iteration 1 of 5", "Iteration 2 of 5")
- [x] Modify `lib/prompts/templates/headings.njk` to support iterative approach:
  - Add hierarchical priorities guidance (see Appendix A for full prompt)
  - Include special first iteration guidance for preserving author's original intent
  - Include `MAX_HEADING_OPERATIONS_PER_ITERATION` limit as a variable (default=10), defined in `lib/config.ts`
  - Add density guidance (~200 words between headings)
  - Include iteration context (what was done in previous iterations)
- [x] Extend `lib/prompts/templates/headings.ts` schema (CRITICAL: affects many files):
  - Add `more_changes_required: boolean` in response schema
  - Add `iteration_summary: string` describing changes made
  - Add `safety_check: { current_iteration: number, total_operations_so_far: number, max_iterations_reached: boolean }` for limits
  - **Schema Ripple Effects**: This change affects 15+ files across the codebase (see detailed analysis below)
  - Don't worry about backwards compatibility

### Stage: API route enhancement for iteration support
- [x] **CORRECTED**: Extend existing unified tool handler at `/app/api/tools/[toolId]/handlers/structure.ts` (NOT a separate route):
  - Use existing action-based routing pattern within `StructureHandler.handlePost()`
  - Add new adaptive action handler: `'iterate'` (single action that adapts based on parameters, following glossary pattern)
  - Adaptive behavior: detect initial vs continue mode via `existing_operations` parameter presence
  - Add iteration tracking and safety limits (max 5 iterations, 50 operations) - define these as variables with those defaults in `lib/config.ts`
  - Implement operation counting and validation
  - Add comprehensive logging for iteration metrics
  - Preserve all existing storage and error handling
- [x] Implement enhanced response format with iteration signals:
  ```typescript
  {
    operations: HeadingOperation[],
    more_changes_required: boolean,
    iteration_summary: string,
    safety_check: {
      current_iteration: number,
      total_operations_so_far: number,
      max_iterations_reached: boolean
    }
  }
  ```
- [x] **CRITICAL**: Add post-LLM validation using existing utilities:
  - ~~Use `heading-section-detector.ts` to validate heading hierarchy~~ Created custom `validateHeadingOperations()` function
  - ~~Use `html-fragment-validator.ts` to check for multiple H1s~~ Implemented in custom validation
  - Fail fast with clear, debuggable, user-visible error messages when validation fails
- [x] Add frontend state management to prevent concurrent iterations
- [ ] Test API changes with various document types and operation scenarios

### Stage: Frontend UI for iterative progression
- [x] **MAJOR REFACTOR**: Migrate `StructurePanel.tsx` from direct fetch to unified tool executor:
  - Current implementation bypasses shared execution hooks (creates technical debt)
  - Move from manual `fetch('/api/tools/structure')` to `useToolExecutorWithNavigation`
  - Integrate with existing cancellation and timeout mechanisms
  - Fix broken cancel behavior (currently has competing AbortControllers)
- [x] Modify `components/tools/StructurePanel.tsx` to support iteration workflow:
  - Replace single "Generate" button with "Improve Headings" button
  - Show iteration progress (e.g., "Iteration 2 of 5")
  - Display operation summary after each iteration
  - Add "Continue Improving" and "Finish" buttons after each iteration
  - Implement loading states with coordinated cancel control
- [x] **REQUIRED**: Extend `lib/tools/hooks/use-tool-executor-with-navigation.ts` for iterative execution:
  - ~~Add step-by-step execution support~~ Not needed - iteration logic handled in component
  - ~~Coordinate cancellation across multiple steps~~ Existing cancellation support sufficient
  - ~~Handle execution state for iterative operations~~ Managed in component state
- [x] Add iteration state management:
  - Track current iteration count and total operations
  - Store iteration summaries for user review
  - Handle iteration completion and stopping criteria
  - Preserve existing caching and error handling
- [x] Design simple progress UI (avoid "UI complexity creep" from o3 critique):
  - ~~Toast notifications for iteration completion~~ Inline UI instead
  - Simple operation count display
  - Clear continue/stop choice after each iteration
- [x] **CRITICAL**: Handle empty operations array edge case:
  - Fast-track when LLM returns no operations (perfect headings case)
  - Skip mutation application to avoid no-op mutations cluttering history
- [ ] Write tests for iterative generation UI flows

### Stage: Documentation
- [x] **MISSING DOCUMENTATION CREATION**:
  - Major rewrite of `docs/reference/TOOL_STRUCTURE_HEADINGS.md` with iterative approach
  - Update `CLAUDE.md` with very brief mention of new iterative heading generation context (only if needed)
  - Update `docs/reference/DOCUMENTATION_ORGANISATION.md` to reference new docs

### Stage: Safety mechanisms and testing
- [x] Implement hard safety limits (defined as variables with these defaults in `lib/config.ts`):
  - Maximum 5 iterations per document session
  - Maximum 50 total operations per document
  - Frontend disabled state when limits reached
  - Clear messaging about why iteration stopped
- [ ] **EXTENSIVE TEST UPDATES REQUIRED** (14-22 hour effort):
  - **Phase 1 - Critical (8-12 hours)**: Update 3 core test files:
    - `lib/services/__tests__/heading-mutation-generator.test.ts` (8 locations)
    - `lib/services/__tests__/headings-integration.test.ts` (9 locations)
    - `lib/services/__tests__/heading-mutation-generator-performance.test.ts` (4 locations)
  - **Phase 2 - Medium (4-6 hours)**: Update 5 integration test files:
    - `mixed-insertion-precedence.test.ts`, `heading-section-detector.test.ts`
    - Various HTML processing tests
  - **Phase 3 - Low (2-4 hours)**: Update 6+ UI/E2E test files:
    - `tests/e2e/ai-headings-insertion-order.spec.ts`
    - Command generation and tool integration tests
  - **Recommended Approach**: 
    - Use subagents for each phase to handle the verbose test updates
    - Consider focusing on critical path tests first (Phase 1)
    - May need to evaluate if all tests require updates or if some can be deferred
  - **Test Strategy Considerations**:
    - Given the significant time investment (14-22 hours), recommend discussing alternative approaches
    - Option A: Full test update - comprehensive but time-intensive
    - Option B: Minimal viable test coverage - update only critical path tests, defer others
    - Option C: Progressive test updates - update tests as issues arise in production
    - **Recommendation**: Start with Phase 1 critical tests only (8-12 hours) and evaluate necessity of Phases 2-3
- [ ] **REUSE EXISTING**: Leverage `heading-mutation-generator-performance.test.ts` infrastructure:
  - Performance timing patterns and stress test data generation
- [ ] Use subagent with browser automation to test complete iterative workflows
- [ ] Run `npm run check:health` to ensure no regressions

### Stage: Final testing and rollout
- [ ] Comprehensive testing with subagent using Playwright (headless) for full iterative workflows
- [ ] Final health check: `npm run build`, `npm run lint`, `npm test` (use subagent if verbose output)
- [ ] Move doc to `planning/finished/` and commit

## Appendix

### Appendix A: Hierarchical Prompt Engineering Approach

**Key prompt priorities to include in `headings.njk`:**

```njk
{% if iteration_count == 0 or not iteration_count %}
**FIRST ITERATION - ORIGINAL HEADINGS**: The current headings were created by the original author. These represent their intended structure and organisation. While you can edit, insert, or remove headings to improve clarity and navigation, please try to broadly preserve the author's original high-level intent and structural approach where reasonable.
{% endif %}

Make up to 10 improvements to the heading structure. Prioritize in this order:

1. **Establish clear document structure first**: 
   - Ensure there's exactly one H1 for the document title
   - Create H2 major sections to organize the main topics
   {% if iteration_count == 0 or not iteration_count %}
   - Respect the author's original sectioning approach where it works well
   {% endif %}
   
2. **Add subdivisions where sections are too long**:
   - Add H3+ sub-headings where sections exceed ~400 words
   - Focus on sections that would benefit from subdivision
   
3. **Improve existing headings following best practices**:
   - Make headings more descriptive and scannable
   - Ensure consistent voice and style
   {% if iteration_count == 0 or not iteration_count %}
   - Enhance rather than replace author's headings when possible
   {% endif %}
   - Remove redundant or unclear headings
   
4. **Optimize for readability**:
   - Target approximately 200 words between headings
   - Ensure headings serve as useful navigation waypoints

Current iteration: {{ (iteration_count || 0) + 1 }} {# 0-indexed internally, 1-indexed for display #}
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


### Appendix D: Comprehensive Schema Ripple Effect Analysis

**Files Requiring Updates When Extending `headingsResponseSchema`:**

**Core Schema & Validation (CRITICAL)**:
- `lib/prompts/templates/headings.ts` - Schema definition
- `app/api/tools/[toolId]/handlers/structure.ts` - Response parsing & validation
- `lib/tools/implementations/structure.ts` - Tool configuration

**Test Files (HIGH IMPACT - 14-22 hours)**:
- `lib/services/__tests__/heading-mutation-generator.test.ts` - 8 test locations
- `lib/services/__tests__/headings-integration.test.ts` - 9 test locations  
- `lib/services/__tests__/heading-mutation-generator-performance.test.ts` - 4 locations
- `lib/services/__tests__/mixed-insertion-precedence.test.ts` - 8 locations
- `lib/services/__tests__/heading-section-detector.test.ts` - Validation logic
- `tests/e2e/ai-headings-insertion-order.spec.ts` - UI integration

**Frontend Components (MEDIUM IMPACT)**:
- `components/tools/StructurePanel.tsx` - Response handling
- `lib/tools/hooks/use-tool-executor-with-navigation.ts` - Execution patterns

**Documentation (CREATION REQUIRED)**:
- `docs/reference/TOOL_STRUCTURE_HEADINGS.md` - Major rewrite needed

### Appendix E: Route Architecture Clarification

**CORRECTION**: The planning document initially mentioned extending `/app/api/tools/structure/route.ts` which **does not exist**. 

**Correct Implementation Approach**:
- Use existing unified tool dispatcher: `/app/api/tools/[toolId]/route.ts`
- Route pattern: `/api/tools/structure` (where `toolId = 'structure'`)
- Extend `StructureHandler` class with new adaptive action handler
- Maintain consistency with existing tool architecture
- Use single adaptive action: `'iterate'` (adapts based on parameters like glossary pattern)

### Appendix F: Validation Infrastructure Integration

**Post-LLM Validation Strategy**:
```typescript
// After LLM generates operations, before applying mutations:
function validateHeadingOperations(operations: HeadingOperation[], currentDocument: DocumentElement[]): ValidationResult {
  // 1. Simulate operations application
  const simulatedDocument = applyOperationsSimulation(operations, currentDocument)
  
  // 2. Use existing utilities for validation
  const headings = extractHeadingElements(simulatedDocument) // from heading-section-detector.ts
  const h1Count = headings.filter(h => h.tag_name === 'h1').length
  
  // 3. Check hierarchy using existing validator logic
  const hierarchyValidation = validateHeadingHierarchy(headings) // from html-fragment-validator.ts
  
  // 4. Return comprehensive validation result
  return {
    isValid: h1Count === 1 && hierarchyValidation.isValid,
    errors: [...h1Errors, ...hierarchyValidation.errors],
    warnings: hierarchyValidation.warnings
  }
}
```

**Validation Rules**:
- Exactly one H1 in the document
- No skip-level hierarchies (H1 → H3 without H2)
- Valid element IDs for all operation targets
- Reasonable hierarchy depth (max 3 levels span)

