# Merge Document Structure and Element Details Panes

## Goal, context

Currently, the document viewing experience is split across two panes:
- **Document Structure** pane shows the hierarchical tree of elements with IDs and tag names
- **Element Details** pane shows the selected element's full content and attributes

This separation creates unnecessary cognitive load and wastes screen space. Users need to see the document as a unified whole, with the ability to expand/collapse sections as needed.

The goal is to merge these two panes into a single, double-wide **Document** pane that displays the full document with proper formatting while maintaining existing functionality (scroll-to, selection, mutations).

## References

- Current implementation: `components/document-viewer.tsx`
- Page layout: `app/documents/[slug]/page-client.tsx`
- Architecture docs: `docs/ARCHITECTURE.md`, `docs/UI_INTERFACE.md`
- Related features:
  - `docs/TABLE_OF_CONTENTS_PANE.md` - ToC scroll functionality
  - `docs/AI_GLOSSARY.md` - Glossary click-to-scroll
  - `docs/MUTATIONS.md` - Document transformation system
- Styling: `docs/STYLING.md`, Phosphor icons

## Principles, key decisions

1. **Progressive enhancement**: Implement in stages, maintaining functionality at each step
2. **Preserve existing features**: All scroll-to and selection behaviours must continue working
3. **Visual hierarchy**: Use proper heading sizes, list formatting, and typography
4. **Debugging support**: Keep element IDs visible but unobtrusive (tooltip with full details)
5. **User control**: Add expand/collapse functionality for better navigation

## Actions

### Stage 1: Basic merge (DONE)

**Objective**: Merge the two panes into one double-wide pane showing the document structure with inline content.

- [x] DONE: Modify `components/document-viewer.tsx`:
  - Remove the Element Details column
  - Expand Document Structure to span 2 columns (`col-span-2`)
  - Update the `renderElement` function to show full content inline
  - Keep existing ID display format (without `syr-` prefix)
  
- [x] DONE: Add ID tooltips:
  - Show full ID including `syr-` prefix
  - Include element type (e.g., "p", "h2")
  - Use Tailwind's tooltip utilities or a lightweight solution

- [x] DONE: Update selection behaviour:
  - Remove `selectedElement` state if no longer needed
  - Or adapt it for future expand/collapse functionality
  
- [x] DONE: Test existing functionality:
  - ToC heading clicks still scroll correctly
  - Glossary entity clicks still scroll correctly
  - Temporary highlight still appears

- [x] DONE: Write tests for the merged pane

- [ ] TODO: Commit: "refactor: merge Document Structure and Element Details into single Document pane"

- [ ] Make the merged middle pane wider.


### Stage 2: Proper formatting (TODO)

**Objective**: Apply appropriate visual formatting to different element types.

- [ ] TODO: Style heading elements (`h1`-`h6`):
  - Use Tailwind's typography scale
  - Apply appropriate font weights
  - Maintain visual hierarchy

- [ ] TODO: Style list elements (`ul`, `ol`, `li`):
  - Proper indentation and bullets/numbers
  - Nested list support

- [ ] TODO: Style paragraph elements:
  - Appropriate line height and spacing
  - Distinguish from other element types

- [ ] TODO: Update ID display:
  - Smaller, grey text (`text-xs text-gray-500`)
  - Right-aligned or inline with content
  - Only show suffix after `syr-` prefix

- [ ] TODO: Test visual hierarchy and readability

- [ ] TODO: Commit: "feat: add proper typography and formatting to Document pane"

### Stage 3: Expand/collapse functionality (TODO)

**Objective**: Add the ability to expand/collapse document sections for better navigation.

- [ ] TODO: Add expand/collapse state management:
  - Track expanded/collapsed state per element
  - Default to all expanded
  - Consider using React context for state

- [ ] TODO: Add expand/collapse UI:
  - Use Phosphor `CaretDown`/`CaretRight` icons
  - Place next to headings and container elements
  - Show on hover for cleaner look

- [ ] TODO: Add expand/collapse controls:
  - "Expand All" button at top of pane
  - "Collapse All" button at top of pane
  - Use consistent button styling from codebase

- [ ] TODO: Implement smooth transitions:
  - Use CSS transitions for height changes
  - Maintain scroll position during collapse/expand

- [ ] TODO: Document in `docs/STYLING.md`:
  - Expand/collapse arrow patterns
  - Button styling conventions

- [ ] TODO: Write comprehensive tests

- [ ] TODO: Commit: "feat: add expand/collapse functionality to Document pane"

### Stage 4: Mutations integration (TODO)

**Objective**: Ensure the new Document pane works seamlessly with the mutations system.

- [ ] TODO: Review `docs/MUTATIONS.md` implementation

- [ ] TODO: Test with existing mutations:
  - AI-generated headings display correctly
  - Content filtering works as expected
  - Mutations can be applied/reverted

- [ ] TODO: Update any mutation-related UI if needed

- [ ] TODO: Ensure mutations respect expand/collapse state

- [ ] TODO: Commit: "fix: ensure Document pane compatibility with mutations system"

### Stage 5: Documentation and cleanup (TODO)

- [ ] TODO: Update `docs/UI_INTERFACE.md`:
  - Document the new 3-pane layout
  - Update component hierarchy
  - Include expand/collapse features

- [ ] TODO: Update `docs/ARCHITECTURE.md` if needed

- [ ] TODO: Remove any dead code from Element Details implementation

- [ ] TODO: Update any integration tests

- [ ] TODO: Commit: "docs: update documentation for merged Document pane"

## Appendix

### Example of proposed Document pane structure

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