# AI-powered Collapse/Expand with Summaries

## Goal, context

Enhance the Document pane with AI-generated summaries for collapsed content blocks. When users collapse any block-level element (paragraphs, lists, blockquotes, etc.), the system will replace the full content with a concise 1-sentence AI-generated summary. Expanding restores the original content, optionally showing the summary as a tooltip.

This builds upon the basic collapse/expand functionality from Stage 3 of `planning/250528b_merge_document_panes.md`, replacing simple truncation with intelligent summarisation.

Target behaviour:
- Each block element above a certain character threshold shows a collapse button
- Clicking collapse replaces content with AI-generated 1-sentence summary
- Summaries are generated on-demand and cached in memory
- Expanding restores original content
- "Collapse All" / "Expand All" buttons affect entire document
- All state resets on page reload

## References

- `planning/250528b_merge_document_panes.md` - Prerequisite merge of document panes (Stages 1-5 must be complete)
- `docs/MUTATIONS.md` - Document transformation system that will power content replacement
- `lib/services/mutation-engine.ts` - Core mutation engine implementation
- `lib/context/mutation-context.tsx` - State management for mutations
- `components/document-viewer.tsx` - Document rendering component to be enhanced
- `docs/LLM_PROMPT_TEMPLATES.md` - Template system for AI calls
- `docs/ARCHITECTURE.md#document-mutations-system` - High-level mutations architecture
- `lib/prompts/templates/summarise.njk` - Existing summarisation template to adapt

## Principles, key decisions

1. **Progressive enhancement**: Build on top of basic collapse/expand from Stage 3
2. **On-demand generation**: Only generate summaries when user collapses (not pre-generated)
3. **Memory-only caching**: Cache summaries in React state, lost on reload (per user requirement)
4. **Graceful degradation**: Show loading state during generation, handle API failures
5. **Block-level granularity**: Apply to all block elements above character threshold
6. **Single sentence constraint**: Summaries must be exactly one sentence
7. **Visual consistency**: Collapsed state clearly differentiated from expanded

## Actions

### Stage 0: Discuss unresolved questions with user

- [ ] Review unresolved questions section below
- [ ] Get user input on:
  - Character threshold for collapsible elements
  - Which block elements to include/exclude
  - Summary length flexibility (strict 1-sentence vs adaptive)
  - Visual design for collapsed state
  - Batch vs individual API calls for "Collapse All"
  - Approach for multiple mutations

### Stage 1: Design summary generation API

- [ ] Create new API endpoint `/api/summarise-block` based on existing `/api/summarise`
  - Accept single block of content
  - Return 1-sentence summary
  - Use adapted prompt template for single sentences

- [ ] Design prompt template for block summarisation:
  ```njk
  Summarise the following content in exactly one concise sentence:
  
  {{ content }}
  
  Summary (one sentence only):
  ```

- [ ] Add response validation to ensure single sentence

- [ ] Write tests for API endpoint

- [ ] Commit: "feat: add block summarisation API endpoint"

### Stage 2: Extend component state management

- [ ] Add collapse/summary state to `DocumentViewer`:
  ```typescript
  interface CollapsedState {
    [elementId: string]: {
      isCollapsed: boolean
      summary?: string
      isLoading?: boolean
      error?: string
    }
  }
  ```

- [ ] Create hooks for managing collapsed state:
  - `useCollapsedState` - track which elements are collapsed
  - `useSummaryCache` - cache generated summaries

- [ ] Implement state reset on unmount

- [ ] Write tests for state management

- [ ] Commit: "feat: add collapsed state management for document viewer"

### Stage 3: Implement UI controls

- [ ] Add collapse/expand button to each block element:
  - Use Phosphor `CaretDown`/`CaretRight` icons
  - Show on hover for cleaner appearance
  - Position consistently (e.g., left margin)

- [ ] Add visual indicators for collapsed state:
  - Different background colour (e.g., `bg-gray-50`)
  - Italic text for summary
  - Icon showing collapsed state

- [ ] Add "Collapse All" / "Expand All" buttons:
  - Position at top of Document pane
  - Use consistent button styling from codebase
  - Show progress when processing multiple blocks

- [ ] Implement smooth transitions:
  - CSS transitions for height changes
  - Maintain scroll position during collapse/expand

- [ ] Write tests for UI interactions

- [ ] Commit: "feat: add collapse/expand UI controls to document blocks"

### Stage 4: Integrate AI summarisation

- [ ] Implement summary generation on collapse:
  ```typescript
  const handleCollapse = async (elementId: string) => {
    // Set loading state
    // Call /api/summarise-block
    // Cache result
    // Update UI
  }
  ```

- [ ] Add loading states:
  - Show spinner during API call
  - Disable button during loading
  - Show placeholder text

- [ ] Handle API errors gracefully:
  - Show error message in collapsed state
  - Allow retry
  - Fall back to truncation if needed

- [ ] Implement character threshold check:
  - Only show collapse button for elements > threshold
  - Make threshold configurable

- [ ] Write integration tests

- [ ] Commit: "feat: integrate AI summarisation with collapse functionality"

### Stage 5: Implement batch operations

- [ ] Design approach for "Collapse All":
  - Option A: Sequential API calls with progress
  - Option B: Batch API endpoint
  - Option C: Concurrent requests with rate limiting

- [ ] Implement chosen approach

- [ ] Add progress indicator for batch operations

- [ ] Handle partial failures in batch mode

- [ ] Optimise performance for large documents

- [ ] Write tests for batch operations

- [ ] Commit: "feat: add batch collapse/expand functionality"

### Stage 6: Mutation system integration

- [ ] Create mutation generator for collapse/expand:
  ```typescript
  function generateCollapseMutation(element: DocumentElement, summary: string): Mutation {
    return {
      type: 'collapse-block',
      forward: [{
        action: 'replace',
        targetId: element.id,
        content: { content: summary }
      }],
      reverse: [{
        action: 'replace',
        targetId: element.id,
        content: { content: element.content }
      }]
    }
  }
  ```

- [ ] Handle mutation conflicts with existing mutations

- [ ] Ensure collapsed state persists through other mutations

- [ ] Write tests for mutation integration

- [ ] Commit: "feat: integrate collapse/expand with mutation system"

### Stage 7: Polish and optimisation

- [ ] Add tooltips showing full content preview on hover

- [ ] Implement keyboard shortcuts (e.g., Ctrl+Shift+C for collapse all)

- [ ] Add user preferences:
  - Remember collapse preferences (localStorage)
  - Configurable summary length
  - Disable animations option

- [ ] Performance optimisation:
  - Debounce hover states
  - Virtual scrolling for large documents
  - Request deduplication

- [ ] Write comprehensive test suite

- [ ] Commit: "feat: polish collapse/expand functionality"

### Stage 8: Documentation and review

- [ ] Update `docs/UI_INTERFACE.md` with collapse/expand features

- [ ] Document API endpoints in appropriate location

- [ ] Add examples to `docs/MUTATIONS.md`

- [ ] Create user guide for collapse/expand feature

- [ ] Review with user

- [ ] Commit: "docs: document AI-powered collapse/expand feature"

## Unresolved questions

### 1. Character threshold
- **Question**: What character count threshold should trigger showing collapse button?
- **Options**: 
  - 100 characters (very granular)
  - 250 characters (medium, ~2-3 sentences)
  - 500 characters (larger blocks only)
- **Suggestion**: Start with 250 characters as reasonable default, make configurable

### 2. Block element inclusion
- **Question**: Which block elements should be collapsible?
- **Current thinking**: All block elements (p, li, blockquote, pre, etc.)
- **Potential exclusions**:
  - Headings (already concise)
  - Empty elements
  - Very short lists (< 3 items)
- **Suggestion**: Exclude headings and pre/code blocks initially

### 3. Summary flexibility
- **Question**: Strict 1-sentence limit or allow flexibility?
- **Trade-offs**:
  - Strict: Consistent UI, may lose nuance
  - Flexible: Better summaries, inconsistent lengths
- **Suggestion**: Start strict, add "brief" mode later if needed

### 4. Visual design for collapsed state
- **Question**: How to visually distinguish collapsed content?
- **Options**:
  - Italic text + gray background
  - Special border/outline
  - Prefix with "Summary:" label
  - Different font size
- **Suggestion**: Italic text on light gray background with collapse icon

### 5. Batch API approach
- **Question**: How to handle "Collapse All" efficiently?
- **Options**:
  - Sequential calls (simple, slow)
  - Batch endpoint (efficient, complex)
  - Concurrent with rate limit (balanced)
- **Suggestion**: Start sequential, optimise if too slow

### 6. Multiple mutations handling
- **Question**: How to handle multiple collapsed elements with single mutation limit?
- **Options**: See appendix for detailed analysis
- **Suggestion**: Start with local state approach, migrate later if needed

## Appendix

### Multiple Mutation Handling Analysis

Currently, the mutation system only supports one active mutation at a time. For collapse/expand, users want to collapse multiple paragraphs independently. Here are the options:

#### Option 1: Local State Only (Recommended for v1)
**Implementation:**
- Track collapsed state in component state
- Don't use mutations system for collapse/expand
- Generate mutations only for other features

**Pros:**
- Simple to implement
- No conflicts with mutation system
- Independent paragraph control
- Fast toggling

**Cons:**
- Inconsistent with other features
- Can't leverage mutation infrastructure
- State lost on component unmount

**Code sketch:**
```typescript
const [collapsedElements, setCollapsedElements] = useState<CollapsedState>({})

const toggleCollapse = (id: string) => {
  setCollapsedElements(prev => ({
    ...prev,
    [id]: { 
      ...prev[id], 
      isCollapsed: !prev[id]?.isCollapsed 
    }
  }))
}
```

#### Option 2: Composite Mutations
**Implementation:**
- Batch all collapsed elements into single mutation
- Update mutation when any element toggles

**Pros:**
- Works with current system
- Maintains mutation benefits
- Single source of truth

**Cons:**
- Complex state synchronisation
- Performance overhead
- All-or-nothing reversal

**Code sketch:**
```typescript
const updateCompositeMutation = (collapsedIds: string[]) => {
  const transforms = collapsedIds.flatMap(id => [{
    action: 'replace',
    targetId: id,
    content: { content: summaries[id] }
  }])
  
  applyMutation({
    type: 'collapse-multiple',
    forward: transforms,
    reverse: reverseTransforms
  })
}
```

#### Option 3: Extend Mutation System
**Implementation:**
- Modify system to support multiple concurrent mutations
- Add mutation composition logic

**Pros:**
- Most flexible solution
- Enables future features
- Consistent architecture

**Cons:**
- Significant refactoring
- Complex conflict resolution
- Longer implementation time

#### Option 4: Hybrid Approach
**Implementation:**
- Use local state for UI
- Generate mutation on "save" or significant action
- Best of both worlds

**Pros:**
- Responsive UI
- Mutation benefits when needed
- Gradual migration path

**Cons:**
- Two state systems
- Synchronisation complexity

### Recommendation
Start with **Option 1 (Local State)** for rapid development and user testing. Plan migration to **Option 4 (Hybrid)** in future iteration if mutation benefits prove valuable for this feature.

### API Response Examples

**Successful response:**
```json
{
  "summary": "This paragraph explains how quantum entanglement enables instantaneous correlation between particles regardless of distance."
}
```

**Error response:**
```json
{
  "error": "Summary generation failed",
  "details": "Content too short for meaningful summary"
}
```

### Performance Considerations

For a document with 100 collapsible paragraphs:
- Sequential "Collapse All": ~30-50 seconds (300-500ms per API call)
- Concurrent (10 at a time): ~3-5 seconds
- Batch endpoint: ~2-3 seconds

Recommendation: Implement concurrent requests with rate limiting (10 concurrent max) as balanced approach.