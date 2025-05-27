# Reversible Document Mutations System

## Goal & Context

Implement a reversible mutation system that allows applying and reverting document transformations. This emerged from the AI-generated headings feature, where we want users to switch between "Original" and "AI headings" views, but the concept extends to a broader vision of document "lenses" or transformations.

**Core Vision**: Users should be able to apply transformations like:
- "Add AI-generated headings" 
- "Replace every paragraph with a 1-sentence summary"
- "Filter content to just sections relevant to theme X"
- Future: combinations like "AI headings + paragraph summaries"

And then revert back to the original document or try different transformations.

**Current Context**: We have a working AI headings feature with tabbed interface (Original vs AI headings), but switching tabs just changes the navigation list. The document structure itself remains unchanged, and AI headings don't actually scroll to proper positions because they're not inserted into the document.

## Principles & Key Decisions

### Architecture Decisions
- **Reversible by design**: Every transformation must include both forward and reverse operations
- **Single mutation mode initially**: Only one transformation active at a time for v1 simplicity
- **Future composability**: Design data structures to support mutation stacks later
- **Performance secondary**: Prioritise simple code and great UI over performance optimisation
- **Actual document modification**: Transform the document structure, don't just change navigation

### Specific UI Decisions
- When AI headings are active, hide original headings (and vice versa)
- Maintain tabbed interface but make it actually switch between document versions
- Ensure transformed headings enable proper scrolling by being inserted into document structure

### Open Questions to Resolve
- **Mutation composition**: How do multiple mutations interact? Apply in sequence? Conflict resolution?
- **State management**: Apply mutations to React state directly vs maintain "base + mutations" model?
- **Performance implications**: Re-applying mutation stacks on state changes - acceptable for smallish docs?

## Actions

### Stage 1: Core Mutation Data Structure
- [x] Design and implement core mutation interfaces
  - [x] `Mutation` interface with id, type, forward/reverse transforms, metadata
  - [x] `DocumentTransform` interface with action types (insert, replace, remove, modify)
  - [x] Support for targetId, afterId, content, originalContent fields
  - [x] TypeScript types in `lib/types/` directory
  - [x] MutationEngine class with apply/revert/validate methods
  - [x] Type guards for transform validation
  - [x] Comprehensive test suite (8 tests, all passing)
  - [x] Created docs/TESTING.md for test documentation

### Stage 2: Single Mutation State Management  
- [ ] Implement mutation application system
  - [ ] Function to apply forward transforms to document structure
  - [ ] Function to apply reverse transforms (undo)
  - [ ] State management for active mutation (single mutation mode)
  - [ ] Integration with existing document state/context

### Stage 3: Convert AI Headings to Mutation System
- [ ] Refactor AI headings feature to use mutation framework
  - [ ] Generate mutation object from AI headings API response
  - [ ] Create transforms to insert AI headings at `id_of_after` positions
  - [ ] Create reverse transforms to remove inserted headings
  - [ ] Update table of contents component to apply/unapply mutations on tab switch
- [ ] Git commit, following `GIT_COMMITS.md`
- [ ] Document in new `docs/MUTATIONS.md` - follow `docs/WRITING_EVERGREEN_DOCS.md` for this
  - [ ] 

### Stage 4: Document Structure Integration
- [ ] Ensure mutations properly modify document structure for navigation
  - [ ] AI headings inserted into DOM get proper IDs for scrolling
  - [ ] Original headings hidden/shown based on active mutation
  - [ ] Verify scroll-to-heading functionality works with transformed document

### Stage 5: Testing & Polish
- [ ] Write tests for mutation system
  - [ ] Unit tests for mutation application/reversal
  - [ ] Integration tests for AI headings mutation
  - [ ] E2E tests for tab switching and navigation
- [ ] Error handling and edge cases
- [ ] Update documentation

### Stage 6: Foundation for Future Mutations
- [ ] Create example mutation for paragraph summarisation
  - [ ] Design API endpoint for paragraph summaries  
  - [ ] Implement mutation that replaces paragraph content with summaries
  - [ ] Add third tab to table of contents for testing
- [ ] Validate architecture scales to multiple mutation types

## Appendix

### Detailed Mutation Design

```typescript
interface Mutation {
  id: string
  type: 'insert-headings' | 'summarize-paragraphs' | 'filter-theme' | string
  forward: DocumentTransform[]
  reverse: DocumentTransform[]
  metadata?: {
    description?: string
    timestamp?: number
    [key: string]: any
  }
}

interface DocumentTransform {
  action: 'insert' | 'replace' | 'remove' | 'modify'
  targetId?: string      // element to modify/remove
  afterId?: string       // for insertions - insert after this element
  content?: any          // new content to insert/replace with
  originalContent?: any  // original content for reversibility
  attributes?: Record<string, string>  // for attribute modifications
}
```

### AI Headings Mutation Example

```typescript
// Generated from API response: {headings: [{id_of_after: "para-123", html: "<h2>New Section</h2>"}]}
{
  id: "ai-headings-1234",
  type: "insert-headings", 
  forward: [
    { 
      action: 'insert', 
      afterId: 'para-123', 
      content: '<h2 id="ai-heading-1">New Section</h2>' 
    },
    { 
      action: 'insert', 
      afterId: 'para-456', 
      content: '<h3 id="ai-heading-2">Subsection</h3>' 
    }
  ],
  reverse: [
    { action: 'remove', targetId: 'ai-heading-1' },
    { action: 'remove', targetId: 'ai-heading-2' }
  ],
  metadata: {
    description: "AI-generated semantic headings",
    originalHeadingCount: 2,
    generatedHeadingCount: 15
  }
}
```

### Future Mutation Examples

**Paragraph Summarisation:**
```typescript
{
  type: 'summarize-paragraphs',
  forward: [
    { 
      action: 'replace', 
      targetId: 'para-123', 
      content: 'This section argues that consciousness poses a hard problem.',
      originalContent: 'Original long paragraph discussing various aspects...'
    }
  ],
  reverse: [
    { 
      action: 'replace', 
      targetId: 'para-123', 
      content: 'Original long paragraph discussing various aspects...'
    }
  ]
}
```

### Technical Considerations

**State Management Options:**
1. **Direct state mutation**: Apply transforms directly to React document state
   - Pros: Simple, immediate DOM updates
   - Cons: Need to carefully track changes for reversibility

2. **Base + mutations model**: Keep original document + applied mutations list  
   - Pros: Always can reconstruct any state, easier debugging
   - Cons: Need to recompute document on each render

**Performance Notes:**
- For v1, acceptable to re-apply mutations on state changes 
- Future optimisation: incremental updates, memoisation
- Document size expected to be "smallish" initially

**Conflict Resolution (Future):**
- For mutation stacks: apply in order, later mutations override earlier ones
- Need strategy for mutations targeting same elements
- Consider mutation dependencies/prerequisites