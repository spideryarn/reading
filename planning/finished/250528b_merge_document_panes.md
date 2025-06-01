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


## Appendix

### Example of implemented Document pane structure

```typescript
// Simplified example of the implemented renderElement function
const renderElement = (element: DocumentElement, depth: number = 0) => {
  const truncatedId = element.id.replace('syr-', '').substring(0, 8);
  
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
      {element.children.length > 0 && (
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


#### Reflections on "HTML Formatting Preservation" from o3 AI

Below is a short-to-long evaluation of the four alternatives in “HTML Formatting Preservation: Analysis and Options”, measured against the code that is running today:

1. Where we are right now  
• The DB keeps one long HTML string per document (`documents.html`).  
• On the client we immediately parse that string into an array/tree of `DocumentElement` objects.  
• `DocumentElement.content` currently holds **plain text** only, so we lose `<em>`, `<strong>` … in the viewer.  
• All mutation logic (insert, replace, remove…) works on that `DocumentElement[]` in memory. No mutation ever dives inside inline markup.

1. What the different storage options would actually mean

OPTION 1  “Store sanitised HTML only”  
  – We would have to re-parse the entire document every time we want to:  
    • run a mutation, or  
    • feed the LLM with plain text.  
  – Undo/redo becomes slower and harder to reason about because we lose the tidy element-level diff we have now.  
  ➜ This cancels much of the value the mutation engine already gives us.

OPTION 2  “Dual storage (plain + rich)”  ⭐ Recommended, minimal change  
  Schema sketch (per element):  
  ```ts
  interface DocumentElement {
    …existing fields…
    plain_content : string   // <p>Text with emphasis and bold.</p> → "Text with emphasis and bold."
    rich_content  : string   // the same fragment, sanitised HTML
  }
  ```  
  Pipeline:  
  1. Ingestion (server or Supabase edge-function)  
      • Sanitise with `isomorphic-dompurify` → `rich_content`  
      • Strip tags with a cheap regex / unified pipeline → `plain_content`  
  2. Runtime  
      • `DocumentViewer` renders `rich_content`.  
      • Mutation engine keeps using the same array of elements; no code change needed except reading `rich_content` instead of `content` when printing.  
  3. LLM / search / embeddings use `plain_content`.  

  Pros  
  • Keeps 100 % of inline markup for the reader.  
  • Zero impact on existing mutation code.  
  • Plain text stays trivial to consume for AI and Postgres full-text.  
  • Implementation is “add two columns + adjust parser/renderer”, done in a day.  

  Cons  
  • ≈ 1.8 × space per element. Typically acceptable; if a 5 MB article grows to 9 MB it still fits comfortably in Postgres and in memory.  

OPTION 3  “Persist HAST / JSON AST”  
  • Great if we ever need **inline-level** mutation or collaborative editing.  
  • In v1 it adds ~3-5 × size and a lot of query complexity we do not yet need.  

OPTION 4  “Store a virtual-DOM-style object graph”  
  • Same size explosion as option 3, plus the risk of the server copy and React copy diverging.  
  • Hard passes YAGNI for now.  

3. Concrete next steps if we agree on Option 2

A. DB / Supabase  
  • `ALTER TABLE document_elements ADD COLUMN rich_content TEXT;`  
  • `ALTER TABLE document_elements ADD COLUMN plain_content TEXT;`  
  • Write a migration/edge-function that back-fills both columns from the existing HTML blob.

B. Ingestion script (where we already parse HTML → `DocumentElement[]`)  
  • Drop-in `DOMPurify.sanitize(innerHTML, cfg)` to create `rich_content`.  
  • `plain_content` = `cheerio(text()).trim()` or unified’s `rehype-raw` → `strip`.  

C. Frontend  
  • Change `renderElement()` to output `dangerouslySetInnerHTML={{__html: el.rich_content}}`.  
  • Keep `el.content` around for legacy until everything compiles, then delete/rename.

D. Security  
  • Strict allow-list already described in the doc (p, em, strong, code … + id/class/href/title).  
  • Ship CSP header (`script-src 'none'`) from API routes that hand out HTML.

E. Tests  
  • Add Jest unit covering sanitisation (XSS payload in → safe HTML out).  
  • Happy-path render test to ensure `<em>` etc. appear.

4. Open questions / input needed

1. Per-element vs per-document dual fields  
   – I assumed per-element because the mutation engine operates there.  
   – If we would rather keep DB simple and only store `documents.rich_html`, we can still break it into elements at runtime – but then every paragraph render still needs to slice that big string. Per-element feels cleaner.

2. Search granularity  
   If we foresee section-level embeddings, having `plain_content` per-element will pay dividends.

3. Long term  
   Do we expect inline-level editing (e.g. “bold these words”)? If yes, we can promote a subset of elements to HAST on-the-fly as suggested (“ephemeral HAST” path) without persisting the whole AST.

5. Bottom line  
Option 2 (dual storage) gives us full visual fidelity tomorrow, keeps the mutation engine exactly as is, and leaves room to grow into richer models later. The extra storage is minor; the implementation effort is low; the security story is clear. Unless we know we will need inline-level mutations in the next couple of sprints, I’d adopt Option 2 and revisit later.

Let me know what you think or if any of the open questions need deeper exploration.
