# Document Expand/Collapse Functionality

## Goal, context

Now that the Document Structure and Element Details panes have been successfully merged into a single Document pane with proper formatting, the next enhancement is to add expand/collapse functionality for better navigation and readability.

The goal is to allow users to collapse sections of the document to see an overview, then expand specific sections they want to read in detail. This will make long documents more manageable and improve the reading experience.

In later stages, we plan to replace simple collapsed text with AI-generated summaries, providing meaningful context even when sections are collapsed.

## References

- Original merge planning: `planning/finished/250528b_merge_document_panes.md`
- Current implementation: `components/document-viewer.tsx`
- Architecture docs: `docs/ARCHITECTURE.md`, `docs/UI_INTERFACE.md`
- Related features:
  - `docs/MUTATIONS.md` - Document transformation system
  - `planning/250529a_ai_collapse_expand_summaries.md` - AI summaries for collapsed blocks
- Styling: `docs/STYLING_OVERVIEW.md`, Phosphor icons

## Principles, key decisions

1. **Progressive enhancement**: Start with simple collapse/expand, then add AI summaries
2. **User control**: Provide both individual and bulk expand/collapse controls
3. **Smooth UX**: Use transitions and maintain scroll position during state changes
4. **Extensibility**: Design state management to support future AI summary integration
5. **Performance**: Efficient state updates for documents with many elements

## Actions

### Stage 1: Basic expand/collapse functionality

**Objective**: Add the ability to expand/collapse document sections for better navigation.

In 'collapsed mode', only show the first line (or the first N characters/words), or something similar. In 'expanded mode', show the full block.

- [ ] Add expand/collapse state management:
  - Track expanded/collapsed state per element
  - Default to all expanded
  - Consider using React context for state

- [ ] Add expand/collapse UI:
  - Use Phosphor `CaretDown`/`CaretRight` icons
  - Place next to headings and container elements
  - Show on hover for cleaner look

- [ ] Add expand/collapse controls:
  - "Expand All" button at top of pane
  - "Collapse All" button at top of pane
  - Use consistent button styling from codebase

- [ ] Implement smooth transitions:
  - Use CSS transitions for height changes
  - Maintain scroll position during collapse/expand

- [ ] Document in `docs/STYLING_OVERVIEW.md`:
  - Expand/collapse arrow patterns
  - Button styling conventions

- [ ] Write comprehensive tests

- [ ] Commit: "feat: add expand/collapse functionality to Document pane"

### Stage 2: Mutations integration

**Objective**: Ensure the new Document pane works seamlessly with the mutations system.

- [ ] Review `docs/MUTATIONS.md` implementation

- [ ] Test with existing mutations:
  - AI-generated headings display correctly
  - Content filtering works as expected
  - Mutations can be applied/reverted

- [ ] Update any mutation-related UI if needed

- [ ] Ensure mutations respect expand/collapse state

- [ ] Commit: "fix: ensure Document pane compatibility with mutations system"

### Stage 3: Documentation and cleanup

- [ ] Update `docs/UI_INTERFACE.md`:
  - Document the new 3-pane layout
  - Update component hierarchy
  - Include expand/collapse features

- [ ] Update `docs/ARCHITECTURE.md` if needed

- [ ] Remove any dead code from Element Details implementation

- [ ] Update any integration tests

- [ ] Commit: "docs: update documentation for merged Document pane"

### Stage 4: AI-generated summaries for collapsed blocks

**Objective**: Replace simple collapsed/expanded blocks with AI-generated 1-sentence summaries.

- [ ] See detailed planning doc: `planning/250529a_ai_collapse_expand_summaries.md`

### Stage 5: HTML formatting preservation

**Objective**: Implement a robust solution for preserving inline HTML formatting (em, strong, code, etc.) based on the analysis in the original planning doc.

- [ ] Review the detailed analysis of HTML formatting options from the appendix

- [ ] Implement Option 2 (dual storage):
  - Add `rich_content` field to store sanitised HTML
  - Add `plain_content` field for AI/search use
  - Update parser to populate both fields

- [ ] Add HTML sanitization using DOMPurify:
  - Install and configure DOMPurify
  - Set up strict allow-list for scientific documents
  - Add CSP headers for security

- [ ] Update renderer to use sanitized HTML:
  - Modify `renderElement` to use `rich_content`
  - Ensure proper rendering of inline formatting

- [ ] Add comprehensive security tests

- [ ] Consider future migration path to HAST if needed

- [ ] Commit: "feat: preserve HTML inline formatting with dual storage approach"

## Appendix

### Example of proposed Document pane structure with expand/collapse

```typescript
// Simplified example of the new renderElement function
const renderElement = (element: DocumentElement, depth: number = 0) => {
  const truncatedId = element.id.replace('syr-', '').substring(0, 8);
  const isExpanded = expandedElements[element.id] ?? true;
  
  return (
    <div key={element.id} className="relative">
      <div 
        className={`
          flex items-start gap-2 p-2 
          hover:bg-gray-50 cursor-pointer
          ${selectedElement?.id === element.id ? 'bg-blue-50' : ''}
        `}
        data-element-id={element.id}
      >
        {/* Expand/collapse arrow for containers */}
        {element.children.length > 0 && (
          <button onClick={() => toggleExpand(element.id)}>
            {isExpanded ? <CaretDown /> : <CaretRight />}
          </button>
        )}
        
        {/* Element content with proper formatting */}
        <div className="flex-1">
          {renderFormattedContent(element)}
        </div>
        
        {/* ID tooltip trigger */}
        <span 
          className="text-xs text-gray-500"
          title={`${element.id} (${element.tag})`}
        >
          {truncatedId}
        </span>
      </div>
      
      {/* Nested children */}
      {isExpanded && element.children.length > 0 && (
        <div className="ml-4 border-l-2 border-gray-200">
          {element.children.map(child => renderElement(child, depth + 1))}
        </div>
      )}
    </div>
  );
};
```

### Typography scale for headings

```css
/* Tailwind classes for heading hierarchy */
h1: text-3xl font-bold
h2: text-2xl font-semibold  
h3: text-xl font-semibold
h4: text-lg font-medium
h5: text-base font-medium
h6: text-sm font-medium
```

### HTML Formatting Preservation: Detailed Analysis

The appendix from the original planning doc contains extensive analysis of HTML formatting preservation options, including:

1. **The Problem**: Inline HTML elements (em, strong, code) being extracted as separate elements
2. **Initial Solution**: HTML → Markdown → HTML conversion (suboptimal)
3. **Better Options**:
   - Option 1: Store sanitized HTML only
   - Option 2: Dual storage (plain + rich) - **Recommended**
   - Option 3: Structured AST storage
   - Option 4: Virtual DOM approach

4. **Security Considerations**: DOMPurify configuration for scientific documents
5. **Implementation Notes**: Specific sanitization configuration and migration steps

See the full analysis in `planning/finished/250528b_merge_document_panes.md` for complete details.

### Reflections from o3 AI

The original planning doc includes valuable reflections from o3 AI on the HTML formatting preservation options, strongly recommending Option 2 (dual storage) as providing full visual fidelity with minimal implementation effort and no impact on the existing mutation engine.