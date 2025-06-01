# Standardise ID Generation and Enable Tooltips for AI-Generated Headings

From the user: I am not *certain* this is a good idea.
  - One possible argument in favour of the existing purely content-based approach for generating IDs for new content is that it will be more robust if we apply/compose multiple mutations - in that case, the content-based approach might be more consistent.
  - That said, I worry about whether there might be a greater chance of collisions with the content-based approach.

YOU MUST discuss these issues with the user before starting work on any of the stages.


## Goal

Implement a unified ID generation system for both original and AI-generated elements, enabling tooltip summaries to work consistently across all heading types in the Table of Contents pane. Currently, original headings have tooltips but AI-generated headings don't, and the two use different ID generation approaches.

## Context

The Table of Contents pane has two tabs:
- **Original**: Shows headings from the unmutated document with AI-powered tooltip summaries
- **AI-generated**: Shows AI-inserted headings but lacks tooltip functionality

The current tooltip implementation relies on text matching to find headings, which is fragile and could break with duplicate text. Additionally, the ID generation systems differ:
- Original elements: `syr-XXXXXXXX` (8-char prefix from position-based UUID v5)
- AI headings: Full UUID v5 based on content

This divergence creates maintenance burden and conceptual complexity.

## References

- `docs/TABLE_OF_CONTENTS_PANE.md` - Documents the ToC architecture and current tooltip implementation
- `docs/AI_SUMMARISE.md` - Describes how AI summaries work for tooltips
- `docs/MUTATIONS.md` - Explains the document mutation system for AI headings
- `docs/ARCHITECTURE.md` - Overall system architecture including mutation design
- `planning/250526d_deterministic_id_generation.md` - Original ID generation design decisions
- `planning/250526g_ai_generated_headings.md` - AI heading implementation details
- `planning/250527a_reversible_document_mutations.md` - Comprehensive mutation system documentation
- `lib/services/deterministicId.ts` - Contains both ID generation approaches
- `lib/services/document-parser.ts` - Uses assignDeterministicIds for original elements
- `lib/services/heading-mutation-generator.ts` - Uses generateDeterministicId for AI headings
- `components/table-of-contents.tsx` - Current tooltip implementation with text matching

## Principles

- **Unified ID System**: All elements should use the same position-based ID generation approach
- **Stable References**: IDs should be reliable keys for caching and element lookup
- **Minimal Disruption**: Changes should not break existing functionality
- **Progressive Enhancement**: Start with ID standardisation, then add tooltip support
- **Maintainability**: One ID system is simpler than two

## Key Decisions

### ID Generation Standardisation

After discussion, we've decided to unify ID generation using the position-based approach from `assignDeterministicIds`. This means:

1. **Pre-calculate position-based IDs** for AI headings before insertion
2. **Use DOM path** (e.g., `/body/div[0]/p[1]`) as the basis for ID generation
3. **Generate IDs matching original pattern**: `syr-XXXXXXXX` format
4. **Avoid changing existing element IDs** when inserting new elements

The approach will be to calculate what the AI heading's path will be after insertion and generate its ID accordingly.

### Tooltip Implementation

1. **Annotate headings with element IDs** in the ToC component (both original and AI)
2. **Use ID-based caching** instead of text-based (more reliable, handles duplicates)
3. **Reuse existing tooltip machinery** for both heading types
4. **Search in appropriate document version**: Original tooltips use unmutated doc, AI tooltips use mutated doc

## Actions

### Stage 1: Implement Position-Based ID Generation for AI Headings

- [ ] **Create path calculation utility**
  - [ ] Add function to `lib/services/deterministicId.ts` to calculate element path from position
  - [ ] Function should take `afterId` and return the path where new element will be inserted
  - [ ] Handle edge cases (inserting at start, between siblings, at end)
  - [ ] Test with various document structures

- [ ] **Modify heading mutation generator**
  - [ ] Update `generateHeadingMutation` in `lib/services/heading-mutation-generator.ts`
  - [ ] Calculate position-based path for each heading before generating ID
  - [ ] Use existing `generateElementId` logic (extract from `assignDeterministicIds` if needed)
  - [ ] Ensure generated IDs follow `syr-XXXXXXXX` format

- [ ] **Write tests for ID generation consistency**
  - [ ] Test that AI heading IDs match pattern of original elements
  - [ ] Test ID stability across mutation/revert cycles
  - [ ] Test that sibling IDs don't change when headings are inserted
  - [ ] Add tests to existing test files or create new ones as appropriate

- [ ] **Test with real documents**
  - [ ] Apply AI heading generation to test documents
  - [ ] Verify IDs are generated correctly
  - [ ] Check that navigation still works
  - [ ] Ensure mutations can be reverted properly

### Stage 2: Refactor Tooltip Implementation

- [x] **Add ID annotation to heading objects** ✅ DONE (commit e004746)
  - [x] Modify heading extraction in `TableOfContents` to include element IDs
  - [x] Update `Heading` interface to include `elementId` field
  - [x] Ensure both original and AI heading extraction populates this field

- [x] **Update tooltip cache to use IDs** ✅ DONE (commit e004746)
  - [x] Change cache key from heading text to element ID
  - [x] Update `contentCache` Map to use ID-based keys
  - [x] Modify `loadingStates` Set to track by ID
  - [x] Update all cache access to use new keys

- [x] **Refactor generateHeadingSummary** ✅ DONE (commit e004746)
  - [x] Accept `elementId` parameter instead of `headingText`
  - [x] Add `elements` parameter to specify which document version to search
  - [x] Find heading by ID instead of text matching
  - [x] Keep hierarchical content extraction logic unchanged

- [x] **Update tooltip event handlers** ✅ DONE (commit e004746)
  - [x] Pass element ID to tooltip show handler
  - [x] Update loading state management to use IDs
  - [x] Ensure error messages still display properly

- [x] **Clean up legacy headingText parameter** ✅ DONE
  - [x] Remove `headingText` parameter from `handleTooltipShow` function signature
  - [x] Remove `headingText` parameter from `generateHeadingSummary` function signature
  - [x] Update all call sites in `table-of-contents.tsx` 
  - [x] Update call sites in `heading-tree.tsx`
  - [x] Update console.warn message to use element ID only

### Stage 3: Add Tooltips to AI-Generated Headings

- [ ] **Extract tooltip logic into reusable component**
  - [ ] Create shared tooltip wrapper that works for any heading
  - [ ] Accept heading object with ID, text, and level
  - [ ] Handle loading states and caching internally
  - [ ] Use same styling and positioning as current tooltips

- [ ] **Implement tooltips in AI-generated tab**
  - [ ] Wrap AI headings with tooltip component
  - [ ] Pass mutated document elements for content extraction
  - [ ] Ensure tooltips show summaries from AI-heading version of doc
  - [ ] Test tooltip behaviour matches original tab

- [ ] **Test tooltip functionality**
  - [ ] Verify tooltips appear on hover for both tabs
  - [ ] Check that summaries reflect correct document version
  - [ ] Test caching works properly with tab switching
  - [ ] Ensure loading states display correctly

### Stage 4: Testing and Polish

- [ ] **Write comprehensive tests**
  - [ ] Unit tests for path calculation logic
  - [ ] Integration tests for ID generation with mutations
  - [ ] Component tests for tooltip functionality
  - [ ] Test rapid tab switching scenarios

- [ ] **Handle edge cases**
  - [ ] Documents with no suitable insertion points
  - [ ] Headings with very long text content
  - [ ] Empty or malformed documents
  - [ ] Concurrent tooltip requests

- [ ] **Performance testing**
  - [ ] Test with large documents (100+ headings)
  - [ ] Verify caching prevents redundant API calls
  - [ ] Check memory usage with many cached summaries

- [ ] **Update planning doc with progress**

- [ ] **Git commit following docs/GIT_COMMITS.md**

### Stage 5: Documentation

- [ ] **Update evergreen documentation**
  - [ ] Update `docs/TABLE_OF_CONTENTS_PANE.md` with new tooltip architecture
  - [ ] Document unified ID generation approach
  - [ ] Add section on ID-based caching strategy
  - [ ] Include examples of both heading types with tooltips

- [ ] **Create troubleshooting guide**
  - [ ] Common issues with ID generation
  - [ ] Debugging tooltip cache problems
  - [ ] How to verify correct document version is used

- [ ] **Final git commit and review**

## Appendix

### Current ID Generation Comparison

**Original Elements (assignDeterministicIds)**:
```typescript
// Uses hierarchical path + content fingerprinting
const path = `/body/div[0]/p[1]`
const fingerprint = `${path}|${className}|${dataAttrs}|${role}|${type}|${textContent}`
const uuid = uuidv5(fingerprint, NAMESPACE)
return `syr-${uuid.substring(0, 8)}` // e.g., syr-a1b2c3d4
```

**AI Headings (generateDeterministicId)**:
```typescript
// Uses document ID + content
const inputString = `${docId}:${elementType}:${textContent}`
return uuidv5(inputString, NAMESPACE) // Full UUID
```

### Conversation Context

The original discussion revealed that:

1. **Text matching is fragile**: Current implementation finds headings by matching text content, which fails with duplicates
2. **ID systems diverged**: Two different approaches evolved separately without coordination
3. **Content-based IDs were a shortcut**: Easier to implement than calculating positions
4. **Position-based is more correct**: Maintains consistency with how original elements work

User's key insight: "Why can't we insert the AI-generated headings one at a time, and then generate IDs for them (once they're in the DOM) using the original assignDeterministicIds approach?"

This led to exploring three options:
1. Insert then regenerate all IDs (rejected: would change existing IDs)
2. Virtual DOM approach (possible but complex)
3. **Pre-calculate position paths** (chosen: cleanest approach)

### Technical Implementation Notes

**Path Calculation Algorithm**:
1. Find the `afterId` element in the document
2. Determine its position among siblings
3. Calculate the new element's path as if inserted after it
4. Account for parent hierarchy

**Example Path Calculation**:
```
If afterId element has path: /body/div[0]/p[2]
And it's the last child of div[0]
Then new heading path would be: /body/div[0]/h2[3]
```

**Caching Strategy**:
- Cache key: Element ID (e.g., `syr-a1b2c3d4`)
- Cache value: Summary text
- Cache scope: Component instance (cleared on unmount)
- Future: Could persist cache in localStorage or Supabase

### Risks and Mitigations

**Risk**: Changing ID generation could break existing functionality
- *Mitigation*: Extensive testing, keep old system as fallback initially

**Risk**: Path calculation could be complex for deeply nested documents  
- *Mitigation*: Start with simple cases, add complexity gradually

**Risk**: Performance impact of path calculation
- *Mitigation*: Profile and optimise if needed, paths are calculated once per heading

**Risk**: Cache invalidation when document structure changes
- *Mitigation*: Clear cache when mutations are applied/reverted