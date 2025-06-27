# Refactor Insertion System: Explicit Naming + Dual Before/After Capabilities + Chained Insertions

**Status**: Ready for Implementation  
**Priority**: High  
**Type**: Major Refactor + Bug Fix  
**Complexity**: Medium-High  

## Goal & Context

**Primary Goals**:
1. **Fix insertion order bug**: AI-generated headings appear in reverse order when multiple headings target same insertion point
2. **Eliminate naming confusion**: Replace ambiguous `id_of_after`/`afterId` with explicit `insertNewAfterExistingId`
3. **Add semantic insertion**: Implement `insertNewBeforeExistingId` for headings (semantically correct) while keeping after-insertion for other content
4. **Shared machinery**: Implement both insertion types with common logic to avoid duplication

**Background**: 
- Current system uses confusing naming (`id_of_after` vs `afterId`) with unclear semantics
- Multiple insertions after same element cause reverse ordering due to serial application
- Research shows headings should insert before content they introduce (semantic correctness)
- Bullet points and similar content work better with after-insertion
- Zero users = perfect time for breaking changes to improve clarity

## User Stories & Acceptance Criteria

**As a document reader**, I want:
- Headings to appear before the content they introduce (semantic correctness)
- Logical heading hierarchy (H2 before H3 when both inserted at same point)
- Clear insertion behavior that matches my mental model from other editors

**As a developer**, I want:
- Explicit, unambiguous field names throughout the system
- Consistent camelCase naming from AI contract to internal implementation  
- Shared logic for insert-before and insert-after to minimize duplication
- Ability to use the right insertion type for different content types

**Acceptance Criteria**:
- ✅ Field names clearly indicate what they do: `insertNewBeforeExistingId` / `insertNewAfterExistingId`
- ✅ Headings insert before target element (semantic correctness)
- ✅ Multiple headings at same insertion point appear in correct order
- ✅ Both insertion types available with shared validation/error handling
- ✅ All existing functionality continues working
- ✅ Clear documentation explaining when to use each insertion type

## References

**Core Files to Update**:
- `lib/prompts/templates/headings.njk` - Update prompt text and field names for headings
- `lib/prompts/templates/headings.ts` - Update schema definitions for new field names
- `lib/types/mutation.ts` - Add new insertion types and rename existing fields
- `lib/services/mutation-engine.ts` - Implement insert-before logic alongside existing insert-after
- `lib/services/heading-mutation-generator.ts` - Switch to insert-before + implement chaining logic
- All test files - Update to use new field names and test both insertion types

**Related Documentation**:
- `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Core mutations system architecture
- `docs/reference/TOOL_HEADINGS.md` - AI headings feature documentation
- `docs/conversations/250627b_ai_headings_insertion_order_fix.md` - Problem analysis and research findings
- `planning/250527a_reversible_document_mutations.md` - Original mutation system design decisions
- `lib/services/deterministicId.ts` - Existing deterministic ID generation utility with collision detection

**Research Context**:
- Document editing best practices research showing headings should introduce content
- Analysis of Google Docs, Word, Notion patterns for semantic insertion expectations

## Principles & Key Decisions

**Semantic Correctness Over Technical Simplicity**:
- Headings should insert before content they introduce (matches user expectations from other editors)
- Bullet points and similar content can continue using after-insertion (feels more natural for appending)

**Explicit Naming Throughout**:
- Replace `id_of_after`/`afterId` with `insertNewBeforeExistingId`/`insertNewAfterExistingId`
- Same field names from AI contract through to internal implementation (eliminate translation layer)
- Long but unambiguous names preferred over short but confusing ones

**Shared Machinery for DRY Principles**:
- Common validation, error handling, and logging for both insertion types
- Reuse position updating, ID generation, and reversal logic
- Different insertion types should be implementation variants, not separate systems

**Breaking Changes Acceptable**:
- Zero users means we can make optimal decisions without backwards compatibility concerns
- Prioritize long-term clarity over short-term preservation of existing patterns

**Mixed Insertion Type Handling**:
- When both before and after insertions target same element, enforce deterministic precedence
- **Precedence rule**: `before-insertions → original-element → after-insertions`
- Example: H2 (before) + para-123 + bullet (after) = correct semantic order
- Must be consistently implemented and thoroughly tested

**ID Generation Strategy**:
- Leverage existing `generateContentBasedId()` from `lib/services/deterministicId.ts`
- Ensures collision detection and deterministic chaining behavior
- Critical for chained insertion reliability and regeneration scenarios

## Stages & Actions

### Stage: Foundation - Rename Existing System
- [ ] **Research current usage patterns** (use subagent to grep for all usages of `afterId`, `id_of_after`)
- [ ] **Update core types** in `lib/types/mutation.ts`:
  - [ ] Rename `afterId` to `insertNewAfterExistingId` in `DocumentTransform`
  - [ ] Update type guards and helper functions
  - [ ] Add comprehensive JSDoc comments explaining insertion semantics
- [ ] **Update mutation engine** in `lib/services/mutation-engine.ts`:
  - [ ] Rename variables throughout for clarity
  - [ ] Add comprehensive logging for insertion decisions
  - [ ] Ensure error messages reference new field names
- [ ] **Run initial tests** to ensure renaming didn't break functionality
- [ ] **Health check**: `npm run check:health` (use subagent if >3 files with issues)

### Stage: Add Insert-Before Capability  
- [ ] **Design shared insertion machinery** (see Appendix A for approach)
- [ ] **Extend `DocumentTransform` interface** with new `insertNewBeforeExistingId` field
- [ ] **Implement insert-before logic** in mutation engine:
  - [ ] Add `applyInsertBefore()` method alongside existing `applyInsert()` 
  - [ ] Share validation, position updating, and error handling logic
  - [ ] Add type guards for new insertion type
  - [ ] **Implement mixed insertion precedence rule**: before → original → after
- [ ] **Write comprehensive tests** for insert-before functionality:
  - [ ] Single insertion before element
  - [ ] Multiple insertions before same element (should work correctly)
  - [ ] **Mixed insertion types on same target** (before + after precedence)
  - [ ] Edge cases: first element, nested structures
  - [ ] Reversal of before-insertions
  - [ ] **ID collision scenarios** with chained insertions
- [ ] **Health check**: `npm run check:health`

### Stage: Switch Headings to Insert-Before
- [ ] **Update AI prompt contract** in `lib/prompts/templates/headings.njk`:
  - [ ] Change field name to `insertNewBeforeExistingId` 
  - [ ] Update prompt text to explain "insert this heading before the specified element"
  - [ ] Update examples in prompt to be clearer
- [ ] **Update prompt schema** in `lib/prompts/templates/headings.ts`:
  - [ ] Rename field in Zod schema
  - [ ] Update type definitions for new field name
- [ ] **Update heading mutation generator** in `lib/services/heading-mutation-generator.ts`:
  - [ ] Switch from `insertNewAfterExistingId` to `insertNewBeforeExistingId`
  - [ ] Update variable names throughout for clarity
  - [ ] Add logging for insertion type choice
- [ ] **Test with real AI generation** to verify semantic correctness
- [ ] **Health check**: `npm run check:health`

### Stage: Implement Chained Insertion Fix
- [ ] **Add chaining logic** to heading mutation generator (see Appendix B for detailed approach):
  - [ ] Group headings by insertion point
  - [ ] Create chains within each group using generated IDs
  - [ ] **Use existing `generateContentBasedId()` for deterministic chaining**
  - [ ] **Validate ID uniqueness** using existing collision detection
  - [ ] Add comprehensive logging for chaining decisions
- [ ] **Test chained insertion scenarios**:
  - [ ] Multiple headings at same insertion point appear in correct order
  - [ ] Mixed scenarios (some chained, some independent)
  - [ ] Complex hierarchies (H2 → H3 → H4 chains)
  - [ ] Reversal of entire chains works correctly
- [ ] **Performance testing** to ensure chaining doesn't add significant overhead
- [ ] **Health check**: `npm run check:health`

### Stage: Comprehensive Testing & Integration
- [ ] **Update all existing tests** to use new field names (use subagent for comprehensive search/replace)
- [ ] **Add integration tests** covering both insertion types:
  - [ ] Headings using insert-before with correct semantic positioning
  - [ ] Other content types using insert-after (future-proofing)
  - [ ] **Mixed mutations using both insertion types with precedence validation**
  - [ ] **Complex chaining scenarios** with ID collision edge cases
  - [ ] **Precedence rule compliance** in all mutation combinations
- [ ] **E2E testing** with browser automation (use subagent with Playwright MCP):
  - [ ] Generate AI headings and verify they appear in correct positions
  - [ ] Test insertion order visually in rendered document
  - [ ] Verify table of contents reflects correct hierarchy
- [ ] **Test consolidation** (use subagent to identify redundant tests and consolidate)
- [ ] **Final health check**: `npm run build && npm run lint && npm test`

### Stage: Documentation & Cleanup
- [ ] **Update mutation system documentation** in `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md`:
  - [ ] Document both insertion types with clear examples
  - [ ] Explain when to use insert-before vs insert-after
  - [ ] Update code examples to use new field names
- [ ] **Update headings documentation** in `docs/reference/TOOL_HEADINGS.md`:
  - [ ] Document semantic insert-before behavior
  - [ ] Explain chaining logic for multiple insertions
  - [ ] Add troubleshooting section for insertion issues
- [ ] **Code cleanup**:
  - [ ] Remove any obsolete comments referring to old field names
  - [ ] Ensure consistent variable naming throughout
  - [ ] Add comprehensive JSDoc comments for new functionality
- [ ] **Commit final changes** (use subagent following `docs/instructions/GIT_COMMIT_CHANGES.md`)
- [ ] **Move doc to `planning/finished/`** and commit

# Appendix

## Appendix A: Shared Insertion Machinery Design

**Common Interface**:
```typescript
interface InsertionConfig {
  type: 'before' | 'after'
  targetElementId: string
  newElement: DocumentElement
  document: DocumentElement[]
}

// Shared logic for both insertion types
function executeInsertion(config: InsertionConfig): DocumentElement[]
function validateInsertion(config: InsertionConfig): ValidationResult
function updatePositions(document: DocumentElement[], insertIndex: number): DocumentElement[]
```

**Benefits**:
- Single source of truth for validation logic
- Consistent error handling and logging
- Easy to add new insertion types in future (e.g., "replace-with")
- Reduced code duplication and maintenance burden

## Appendix B: Chained Insertion Algorithm

**Current Problem**:
```typescript
// Multiple insertions at same point
[ 
  { insertNewBeforeExistingId: "para-123", html: "<h2>Main</h2>" },
  { insertNewBeforeExistingId: "para-123", html: "<h3>Sub</h3>" }
]
// Results in: H3, H2, para-123 (reverse order)
```

**Solution - Chaining**:
```typescript
// Transform to chained insertions
[
  { insertNewBeforeExistingId: "para-123", html: "<h2>Main</h2>" },
  { insertNewBeforeExistingId: "generated-h2-id", html: "<h3>Sub</h3>" }
]
// Results in: H2, H3, para-123 (correct order)
```

**Implementation Strategy**:
1. Group headings by target insertion point
2. Within each group, chain subsequent insertions to previous generated IDs
3. Preserve original LLM ordering through chaining
4. **Use `generateContentBasedId()` for deterministic chaining IDs**
5. **Leverage existing collision detection** from `lib/services/deterministicId.ts`

## Appendix C: Research Summary

**Document Editor Patterns**:
- Google Docs, Word: Headings introduce following content sections
- Notion, WordPress: Block editors provide explicit above/below insertion controls  
- Industry standard: Headings semantically introduce content, not conclude it

**Mental Model**: Users expect "Insert heading before paragraph X" to result in heading appearing above paragraph X, introducing it as a section.

**Technical Benefits of Insert-Before for Headings**:
- Better accessibility (screen readers navigate by headings)
- Semantic HTML structure matches user expectations
- Table of contents generation works more intuitively
- Matches patterns from established document editors

## Appendix D: Edge Cases & Risk Mitigation

**Insertion Type Selection**:
- Most content types default to insert-after (appending behavior)
- Headings specifically use insert-before (semantic introduction)
- Future content types can choose appropriate insertion semantics

**Chaining Edge Cases**:
- **Mixed insertion types targeting same element** (enforce precedence: before → original → after)
- Nested document structures with complex hierarchies
- **ID collision handling using existing `validateIdUniqueness()`** from deterministicId.ts
- Partial chain failures (some elements succeed, others fail)
- **Deterministic behavior across regeneration scenarios**

**Migration Risks**:
- All existing AI calls will fail until prompts updated (acceptable with zero users)
- Tests need comprehensive updates for new field names
- Any cached AI responses become invalid (regeneration required)

**Performance Considerations**:
- Chaining logic adds computational overhead (estimated <5ms per mutation)
- Shared machinery should reduce overall code complexity despite feature additions
- Large documents with many insertions may need optimization later

**Quality Assurance**:
- Comprehensive test coverage for both insertion types **and mixed scenarios**
- **Precedence rule validation** in all test cases involving same-target insertions
- Integration testing with real AI generation
- Visual verification of document structure correctness
- **ID collision testing** with existing deterministicId utilities
- Logging throughout to aid debugging during transition period