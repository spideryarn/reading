# Enhanced Glossary Navigation with Multiple Occurrence Support

## Goal

Replace the current glossary's simple first-occurrence linking with a robust multi-occurrence navigation system that:
- Finds ALL occurrences of glossary entities (including aliases) in the document
- Shows clickable superscript numbers `[1] [2] [3]` next to entity names
- Enables navigation to any specific occurrence
- Shares underlying text-finding machinery with the Search feature for consistency and maintainability

## Context

Currently, the glossary uses a basic `findFirstOccurrence()` function that:
- Sometimes misses entities when the match spans elements
- Only finds the first occurrence
- Uses simple string matching that isn't as robust as our Search feature

The Search Text feature already has sophisticated machinery using Mark.js that:
- Finds all occurrences robustly across element boundaries
- Provides context extraction and highlighting
- Has been battle-tested and works well

## References

- `docs/reference/TOOL_GLOSSARY.md` - Current glossary feature documentation
- `docs/reference/TOOL_SEARCH_TEXT.md` - Search text feature with Mark.js implementation
- `components/unified-left-pane.tsx` - Contains both GlossaryDisplay and search implementation
- `lib/utils/search-context-extraction.ts` - Context extraction utilities (for future tooltip feature)
- `docs/reference/CODING_PRINCIPLES.md` - Emphasizes simple, reusable code and fast prototyping

## Principles & Key Decisions

1. **Separate UI, Shared Machinery**: Keep Search and Glossary as distinct features from the user's perspective, but share underlying text-finding code
2. **Simple Implementation First**: Use sequential searching (Strategy A) initially - one Mark.js call per entity
3. **All Occurrences Upfront**: Find all occurrences when glossary loads, not on-demand
4. **Unified Entity Matching**: Treat entity names and aliases as equivalent - finding either counts as an occurrence
5. **Show All Numbers**: Display all occurrence numbers (no truncation initially)
6. **Clear Feedback**: If no occurrences found, show mild warning with helpful console logging
7. **Reusable Hook Pattern**: Create `useTextOccurrences` hook for shared functionality
8. **No Fallback Mechanisms**: Prefer clear failures for debugging - if an entity isn't found, we want to know about it rather than silently degrading
9. **Word Boundary Awareness**: Matches should respect word boundaries to avoid false positives (e.g., "AI" should not match within "PAID")

## Stages & Actions

### Stage: Preparation
- [ ] Run `./scripts/sync-worktrees.ts` in a subagent to pull latest changes
- [ ] Review current glossary and search implementations to understand patterns

### Stage: Create shared text occurrence finding utility
- [ ] Create new file `lib/hooks/use-text-occurrences.ts`
- [ ] Implement `useTextOccurrences` hook that:
  - [ ] Accepts array of search terms (entity names + aliases)
  - [ ] Uses Mark.js to find all occurrences
  - [ ] Returns map of term → array of occurrences with elementId and position
  - [ ] Handles cleanup on unmount
- [ ] Write unit tests for the hook in `lib/hooks/__tests__/use-text-occurrences.test.tsx`
- [ ] Run tests in subagent to ensure they pass

### Stage: Update GlossaryDisplay to use new hook
- [ ] Import and use `useTextOccurrences` in GlossaryDisplay component
- [ ] Replace `findFirstOccurrence` with new occurrence finding logic
- [ ] Store occurrence data as `Map<entityIndex, Array<{elementId, position, termMatched}>>`
- [ ] Add console logging for debugging when entities have no occurrences
- [ ] Test manually with existing glossary to ensure finding works

### Stage: Implement superscript occurrence UI
- [ ] Update entity display to show clickable superscript numbers
- [ ] Style superscripts using Tailwind classes (small, blue, hover effects)
- [ ] Make entity name clickable for first occurrence (backward compatibility)
- [ ] Make each superscript number clickable for specific occurrence
- [ ] Add visual indicator (gray text?) when entity has no occurrences
- [ ] Use Puppeteer MCP in subagent to verify UI looks correct

### Stage: Implement multi-occurrence navigation
- [ ] Update click handlers to accept occurrence index
- [ ] Use existing `actions.scrollToElement()` for navigation
- [ ] Test navigation to multiple occurrences works correctly
- [ ] Ensure smooth scrolling behavior matches current implementation

### Stage: Test with critical edge cases
- [ ] Test false positive prevention:
  - [ ] Entity "AI" should NOT match within "PAID", "AISLE", "AIC"
  - [ ] Entity "EU" should NOT match within "EUROPE", "NEURAL"
- [ ] Test possessive and punctuation handling:
  - [ ] Entity "Maxwell" SHOULD match "Maxwell's"
  - [ ] Entity "U.S." should handle periods correctly
- [ ] Test multi-word entities:
  - [ ] "United States" should match exact phrase
  - [ ] Test with varying whitespace between words
- [ ] Test case insensitivity:
  - [ ] "AI", "ai", "Ai" should all match entity "AI"
- [ ] Add warning message for entities with no occurrences found
- [ ] Add helpful console output for debugging occurrence finding

### Stage: Handle edge cases and polish
- [ ] Test with documents containing many glossary entities (~50)
- [ ] Test with entities that have multiple aliases
- [ ] Verify performance remains acceptable
- [ ] Run full test suite in subagent

### Stage: Investigate Mark.js configuration (Later stage)
- [ ] Research Mark.js word boundary options:
  - [ ] Test `accuracy` option (e.g., "exactly" vs "partially") 
  - [ ] Investigate `wildcards` and `diacritics` options
  - [ ] Document findings for future reference
- [ ] Handle special characters in entity names:
  - [ ] Test entities like "C++", "Node.js", ".NET"
  - [ ] Implement regex escaping if needed: `name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`
  - [ ] Test that escaping doesn't break Mark.js
- [ ] Create guidelines for entity naming to avoid matching issues

### Stage: Documentation and cleanup
- [ ] Update `docs/reference/TOOL_GLOSSARY.md` with new multi-occurrence feature
- [ ] Add code comments explaining the shared machinery approach
- [ ] Git commit following `docs/instructions/DO_GIT_COMMITS.md` (use subagent)
- [ ] Move this planning doc to `docs/planning/finished/`

## Appendix

### Test-Driven Development Cases

Priority test cases for implementation (most important first):

1. **False Positive Prevention**
   ```
   Document: "The company PAID for AI services"
   Entity: "AI"
   Expected: Find 1 occurrence (only "AI services")
   NOT: "PAID"
   ```

2. **Possessive Handling**
   ```
   Document: "Maxwell's equations describe electromagnetic fields"
   Entity: "Maxwell"
   Expected: Find 1 occurrence ("Maxwell's")
   ```

3. **Multi-word Entities**
   ```
   Document: "The United States of America"
   Entity: "United States"
   Expected: Find 1 occurrence
   ```

4. **Case Insensitivity**
   ```
   Document: "AI and ai are the same. Even Ai."
   Entity: "AI"
   Expected: Find 3 occurrences
   ```

5. **Special Characters (Later stage)**
   ```
   Document: "We use C++ and Node.js"
   Entities: "C++", "Node.js"
   Expected: Find exact matches without breaking
   ```

### Example UI mockup
```
Person [1] [2] [3]
PERSON
Albert Einstein
Pioneering physicist who developed the theory of relativity...

Place [1]
PLACE  
Berlin
Capital city of Germany where Einstein worked...

Concept (no occurrences found)
CONCEPT
Quantum Entanglement
A phenomenon in quantum physics...
```

### Mark.js usage pattern from search
```typescript
markInstance.mark(searchTerms, {
  separateWordSearch: false,
  acrossElements: true,
  className: 'glossary-occurrence',
  caseSensitive: false,
  each: function(element) {
    // Track which element and position
  },
  done: function() {
    // Process results
  }
})
```

### Performance considerations
With 50 entities and average 2 terms each (name + aliases), we'd make ~50 Mark.js calls. This should be fast enough for initial implementation. Can optimize later with batch approach if needed.

### Mark.js Configuration Notes (from old planning doc research)

The old planning doc (`docs/planning/later/250527b_glossary_robust_text_matching.md`) identified key matching issues that Mark.js needs to handle:
- Word boundary matching to prevent false positives
- Multi-word entities potentially spanning HTML elements
- Special character handling in entity names
- Case-insensitive matching while preserving display case

Mark.js options to investigate in later stage:
- `accuracy`: Controls matching precision ("exactly" vs "partially")
- `wordBoundary`: Custom word boundary detection
- `separateWordSearch`: How to handle multi-word phrases
- `diacritics`: Handling of accented characters

### Future enhancements (not in scope)
- Hover tooltips on superscript numbers showing context
- Highlight all occurrences in document when entity selected
- Batch Mark.js calls for better performance
- Visual distinction between name vs alias matches
- Handling hyphenated word variations (e.g., "twenty-first century" vs "twenty first century")