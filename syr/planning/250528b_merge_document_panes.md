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

- [x] DONE: Commit: "refactor: merge Document Structure and Element Details into single Document pane"

- [x] DONE: Make the merged middle pane wider.


### Stage 2: Proper formatting (DONE)

**Objective**: Apply appropriate visual formatting to different element types.

- [x] DONE: Style heading elements (`h1`-`h6`):
  - Use Tailwind's typography scale
  - Apply appropriate font weights
  - Maintain visual hierarchy

- [x] DONE: Style list elements (`ul`, `ol`, `li`):
  - Proper indentation and bullets/numbers
  - Nested list support

- [x] DONE: Style paragraph elements:
  - Appropriate line height and spacing
  - Distinguish from other element types

- [x] DONE: Update ID display:
  - Smaller, grey text (`text-xs text-gray-500`)
  - Right-aligned or inline with content
  - Only show suffix after `syr-` prefix

- [x] DONE: Test visual hierarchy and readability

- [x] DONE: Commit: "feat: add proper typography and formatting to Document pane"

- [ ] 

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

### HTML Formatting Preservation: Analysis and Options

#### The Problem

During implementation, we discovered that inline HTML elements (like `<em>`, `<strong>`, `<code>`) were being extracted as separate document elements instead of being kept within their parent text. This caused formatting to be lost when displaying documents.

**Example:** 
- Original HTML: `<p>Text with <em>emphasis</em> and <strong>bold</strong>.</p>`
- Problem: Created 3 separate elements (p, em, strong) instead of 1 paragraph with formatted text
- Result: Lost italics/bold formatting in display

#### Initial Solution (Implemented but Suboptimal)

We implemented a solution that:
1. Converts HTML to Markdown during parsing (using TurndownService)
2. Stores Markdown in the `content` field
3. Renders Markdown back to HTML with a MarkdownRenderer component

**Problems with this approach:**
- Double conversion (HTML → Markdown → HTML) is inefficient and potentially lossy
- Markdown can't represent all HTML inline elements accurately
- Adds unnecessary complexity

#### Why We Need Structure Beyond Plain HTML

The mutations system requires structured data to:
- Insert new elements at specific positions
- Replace content while preserving structure  
- Apply AI transformations to text
- Track element IDs and relationships

With raw HTML strings, every mutation would require: Parse HTML → Apply mutation → Serialize back

#### Better Options to Consider

**Option 1: Store Sanitized HTML**
```typescript
interface DocumentElement {
  content: string;  // Sanitized HTML
}
```
- Pro: Simple, preserves all formatting perfectly
- Con: Security concerns, harder to process for mutations
- Mitigation: Use DOMPurify for sanitization

**Option 2: Dual Storage (Plain + Rich)**
```typescript
interface DocumentElement {
  plain_content: string;     // For AI, search
  rich_content: string;      // Sanitized HTML for display
}
```
- Pro: Optimized for different use cases
- Con: Data duplication, sync issues

**Option 3: Structured AST Storage**
```typescript
interface DocumentElement {
  content: string;          // Plain text
  rich_content: HAST;       // HTML AST from Unified/Rehype
}
```
- Pro: Best of both worlds, type-safe, mutation-friendly
- Con: More complex, larger storage

**Option 4: Virtual DOM Approach**
```typescript
interface RichContent {
  type: 'text' | 'element';
  value?: string;
  tag?: string;
  children?: RichContent[];
}
```
- Pro: Full control, React-native
- Con: Complex implementation, verbose

#### Library Recommendations

**For HTML parsing and AST manipulation:**
- **Unified/Rehype ecosystem** (Recommended)
  - `rehype-parse`: HTML → HAST
  - `hast-util-to-jsx-runtime`: HAST → React elements
  - Battle-tested, extensible, handles complex scientific HTML

**For simpler use cases:**
- **html-react-parser**: Direct HTML to React with AST access
- **DOMPurify**: Industry standard for HTML sanitization

#### Security Considerations

Per security research:
- DOMPurify + dangerouslySetInnerHTML is considered safe when properly configured
- Must use latest version and configure allowed tags/attributes
- Implement Content Security Policy as defense-in-depth
- The Unified/HAST approach eliminates need for dangerouslySetInnerHTML entirely

#### Recommended Approach

**Short term (Stage 3):** Store sanitized HTML
- Quick to implement
- Use DOMPurify with strict configuration
- Add `rich_content` field to complement existing `content`

**Long term (Stage 4+):** Migrate to HAST
- When mutations need more structure
- Better for complex transformations
- Type-safe and framework-aligned

#### Implementation Notes

**Sanitization configuration for scientific documents:**
```javascript
DOMPurify.sanitize(html, {
  ALLOWED_TAGS: [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'em', 'strong', 'code', 'pre', 'blockquote',
    'ul', 'ol', 'li', 'a', 'sub', 'sup',
    'table', 'tr', 'td', 'th', 'caption'
  ],
  ALLOWED_ATTR: ['href', 'title', 'id', 'class']
})
```

#### Stage 3 Addition: HTML Sanitization

- [ ] TODO: Add HTML sanitization using DOMPurify
  - Install and configure DOMPurify
  - Update parser to store both plain and rich content
  - Update renderer to use sanitized HTML
  - Add tests for security edge cases