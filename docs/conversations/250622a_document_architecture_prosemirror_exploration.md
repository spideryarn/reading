---
Date: 22 June 2025
Duration: ~45 minutes
Type: Decision-making
Status: Active
Claude URL: [Current conversation URL]
Related Docs: 
  - docs/reference/VISION_PRODUCT_STRATEGY.md - Product vision and target users
  - docs/reference/PROJECT_STATUS.md - Current implementation state
  - docs/reference/CROSS_PANE_COMMUNICATION_MESSAGING_ARCHITECTURE.md - Current cross-pane patterns
  - docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md - Reversible mutations system
  - docs/reference/UI_COMPONENTS.md - Component architecture
  - docs/conversations/250620a_spideryarn_prosemirror_suitability_questions.md - Initial ProseMirror exploration
  - docs/conversations/250620b_spideryarn_prosemirror_deep_research.md - Detailed requirements analysis
  - docs/instructions/SOUNDING_BOARD_MODE.md - Discussion mode guidelines
External Research:
  - ProseMirror read-only use cases and performance (2023-2025)
  - LLM code generation with ProseMirror (June 2025)
  - ProseMirror + React integration patterns (2024-2025)
  - TipTap, Remirror, Lexical alternatives
---

# Document Architecture for Spideryarn - ProseMirror vs Current Approach - 22 June 2025

## Context & Goals

The user is exploring whether to adopt ProseMirror or another framework for Spideryarn's document architecture. The current system works but "doesn't 100% seem to do the right thing" and lacks a clear mental model. The core challenge is implementing interactive overlapping annotations while maintaining a read-mostly document viewer.

## Key Background

From the user: "It's not so much that the current thing is breaking, and it's not about performance at all. It's more about just that sometimes it doesn't 100% seem to do the right thing, or that some things seem much harder than I expected them to be, or that I don't feel like I have a good mental model of how the current thing works (that's a big part of my concerns, actually)."

**Core Requirements:**
- "Yes, we want the overlapping overlays to be interactive. We want to be able to hover over glossary entries to see explanations, we want to be able to click on comments to reveal them, etc."
- Documents are <100 pages (usually <30), primarily scientific papers
- Read-only from user perspective, but with AI-powered transformations
- Need LLM-friendly edit representation for parallel processing and stitching

**Current System:**
- React-based with Cheerio HTML parsing
- Reversible mutations system
- Mark.js for text search
- Custom element IDs (UUID v5)
- DocumentCommunicationContext for cross-pane coordination

## Main Discussion

### The Mental Model Problem

The user's primary concern: "I don't feel like I have a good mental model of how the current thing works (that's a big part of my concerns, actually)."

This led to exploring how different architectures provide mental models:
- **Current Architecture**: HTML → Parsed Elements → React State → Mutations → Rendered View
- **ProseMirror**: Schema → Document Model → Transactions → View (with Decorations)
- **Slate.js**: JSON Document → React Components → Operations → Decorations

### Interactive Overlapping Annotations

The critical requirement is interactive overlapping annotations:
- Hoverable glossary entries with explanations
- Clickable comments
- Semantic highlights by theme
- All potentially overlapping on the same text

Research revealed:
- CSS Custom Highlight API only handles visual overlaps, not interactivity
- ProseMirror Decorations can handle overlaps but with framework overhead
- Custom React layer gives full control but requires building everything

### ProseMirror Research Findings

**Read-Only Friction:**
- Conceptual mismatch - ProseMirror is fundamentally an editor
- Performance overhead, especially in Chrome with large documents
- API methods like `setSelection`, `dispatch`, `transaction` don't make sense for viewing
- Bundle includes editing code that won't be used
- Requires thinking in "editor" terms even for read-only features

**LLM Compatibility:**
- ProseMirror code is harder for LLMs to generate than simpler frameworks
- Requires deep understanding of schemas, positions, and transactions
- Claude performs best but still struggles with complex ProseMirror patterns
- "Its architectural complexity makes it one of the more difficult frameworks for LLMs"

### Edit Representation Comparison

**Simple JSON Patches (Current/Proposed):**
```json
{
  "action": "addHeading",
  "afterElement": "paragraph-123",
  "text": "New Section"
}
```

**ProseMirror Equivalent:**
```javascript
// First, you need the schema definition
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { 
      content: "inline*", 
      attrs: { id: { default: null } } 
    },
    heading: { 
      content: "inline*", 
      attrs: { level: { default: 1 }, id: { default: null } } 
    },
    text: { inline: true }
  }
});

// Then find the position after paragraph-123
let targetPos = null;
doc.descendants((node, pos) => {
  if (node.attrs.id === 'paragraph-123') {
    targetPos = pos + node.nodeSize;
    return false;
  }
});

// Create the transaction
const tr = view.state.tr;
tr.insert(targetPos, schema.nodes.heading.create(
  { level: 2, id: 'heading-456' },
  schema.text('New Section')
));

// Or for LLM generation, you might need to express it as:
{
  "type": "insert",
  "pos": 247,  // LLM has to calculate the position!
  "node": {
    "type": "heading",
    "attrs": { "level": 2, "id": "heading-456" },
    "content": [{
      "type": "text",
      "text": "New Section"
    }]
  }
}
```

**Slate.js Operations:**
```javascript
// Slate uses operations similar to JSON patches
const operation = {
  type: 'insert_node',
  path: [1, 0], // Path in the tree
  node: {
    type: 'heading',
    id: 'heading-456',
    children: [{ text: 'New Section' }]
  }
}

// Or more commonly, using Transforms API:
Transforms.insertNodes(editor, {
  type: 'heading',
  id: 'heading-456',
  children: [{ text: 'New Section' }]
}, {
  at: [1, 0] // or use a location query
});
```

### ProseMirror's Syntax Tree Capabilities

The user asked: "Does ProseMirror have some notion of the internal syntax tree? In other words, can it say 'find me the thing after a heading with a particular id'?"

Yes, ProseMirror has a robust internal syntax tree:

```javascript
// Document structure example
doc
├── heading (attrs: {id: "intro", level: 1})
│   └── text "Introduction"
├── paragraph (attrs: {id: "p1"})
│   └── text "Some content"
└── heading (attrs: {id: "methods", level: 2})
    └── text "Methods"
```

**Finding nodes by ID:**
```javascript
// Find a node with specific ID
function findNodeById(doc, id) {
  let found = null;
  doc.descendants((node, pos) => {
    if (node.attrs.id === id) {
      found = { node, pos };
      return false; // stop traversing
    }
  });
  return found;
}

// Find position after a specific node
function findPositionAfterId(doc, id) {
  const result = findNodeById(doc, id);
  if (result) {
    return result.pos + result.node.nodeSize;
  }
  return null;
}

// Using ResolvedPos for rich context
const $pos = doc.resolve(position);
const parent = $pos.parent;
const depth = $pos.depth;
const after = $pos.after();
```

### The Hybrid Approach: Custom Layer on ProseMirror

A key insight from the conversation was building a higher-level API on top of ProseMirror:

```javascript
// What you expose to LLMs:
class DocumentOps {
  insertAfterElement(elementId, content) {
    const pos = findPositionAfterId(this.doc, elementId);
    if (!pos) throw new Error(`Element ${elementId} not found`);
    
    return this.tr.insert(pos, this.createNode(content));
  }
  
  replaceElement(elementId, newContent) {
    const found = findNodeById(this.doc, elementId);
    if (!found) throw new Error(`Element ${elementId} not found`);
    
    return this.tr.replaceWith(
      found.pos, 
      found.pos + found.node.nodeSize,
      this.createNode(newContent)
    );
  }
}

// LLM generates simple commands:
{ "action": "insertAfterElement", "id": "intro", "content": {...} }

// Your operation format
const op = { action: "addHeading", afterElement: "p123", text: "New" }

// Custom converter to ProseMirror transaction
function applyOperation(op, state) {
  const pos = findPositionAfterId(state.doc, op.afterElement);
  return state.tr.insert(pos, createHeading(op.text));
}
```

This hybrid gives you:
- Proven document model (ProseMirror)
- Simple operations (your JSON patches)
- Stable foundation
- LLM-friendly interface

### Custom Overlay System Discussion

When asked "What would the 'custom overlay system' involve?", the conversation explored:

```typescript
// 1. Annotation data structure
interface Annotation {
  id: string
  type: 'comment' | 'glossary' | 'highlight'
  startOffset: number
  endOffset: number
  elementId: string
  data: any
}

// 2. Rendering layer that handles overlaps
class AnnotationRenderer {
  // Sort and split overlapping annotations
  // Create nested DOM structure for overlaps
  // Attach event handlers for interactions
}

// 3. Positioning system
// Absolute positioned tooltips/popovers
// Click handlers that resolve which annotation was clicked
// Z-index management for overlapping interactive elements
```

## Alternatives Considered

### 1. Enhanced Current Architecture
- Keep HTML + mutations foundation
- Add CSS Custom Highlight API for visual overlaps
- Build custom overlay system for interactivity
- **Pros**: Incremental change, preserves work
- **Cons**: May hit complexity ceiling

### 2. Full ProseMirror Adoption
- Use for document model and transformations
- Leverage decorations for annotations
- **Pros**: Battle-tested, powerful
- **Cons**: Read-only friction, LLM complexity, conceptual mismatch

### 3. Hybrid ProseMirror
- Use ProseMirror document model
- Custom rendering and operations
- **Pros**: Proven foundation with simpler interface
- **Cons**: Additional abstraction layer

### 4. Slate.js
- More React-native approach
- Better for read-heavy use cases
- **Pros**: Simpler mental model, LLM-friendly
- **Cons**: Less mature, buggy reputation, weaker collaborative editing

## Key Insights

1. **The Real Problem**: Not performance or breaking, but lack of confidence in the mental model and feeling like building from scratch is risky.

2. **Framework Mismatch**: "You're not building an editor, you're building an augmented reader" - this insight suggests editor-first frameworks may be overengineered for the use case.

3. **LLM Integration Matters**: The simpler the edit representation, the better for LLM integration. ProseMirror's complexity works against this.

4. **Overlapping Interactivity**: This is the make-or-break requirement that will drive the architecture decision.

## Open Questions

1. What specific operations are "much harder than expected" in the current system?
2. How important is future collaborative editing capability?
3. Would a custom overlay system be sufficient for interactive overlapping annotations?
4. Is the mental model clarity worth a significant migration effort?
5. Can the ProseMirror + React friction be mitigated with proper patterns?

### ProseMirror + React Integration Research (June 2025)

The user's concern: "I think one of my biggest concerns is the mismatch between ProseMirror's model and React."

**Key Friction Points:**
- **Architecture mismatch**: ProseMirror updates DOM synchronously, React uses virtual DOM with two-phase updates
- **State conflicts**: ProseMirror allows direct DOM modification, React expects unidirectional flow
- **Performance issues**: Virtual DOM reconciliation interferes with ProseMirror's internal state
- **The "seam" problem**: Adapter layers between ProseMirror and React are often subtly incorrect

**Successful Solutions in 2025:**
1. **TipTap** (Most Popular):
   - v3.0 Beta includes SSR support, TypeScript improvements, JSX support
   - Used by Novel, BlockNote, many production apps
   - "TipTap is the best open source editor out there" - developer testimonial
   - Teams report standing up feature-rich editors in less than a week

2. **@handlewithcare/react-prosemirror** (formerly @nytimes/react-prosemirror):
   - Battle-tested by The New York Times
   - Updated and actively maintained as of January 2025
   - Handles state lifting into React/Redux properly

3. **Remirror**:
   - React-first ProseMirror toolkit
   - 30+ extensions, TypeScript-first, mobile support

**The Key Pattern That Works:**
```javascript
// BAD: Trying to control ProseMirror through props
<ProseMirrorEditor 
  content={content}
  onChange={setContent}
  highlights={highlights} // Re-render on every highlight change
/>

// GOOD: ProseMirror as uncontrolled component
<ProseMirrorEditor 
  initialContent={content}
  onTransaction={(tr) => {
    // Handle updates through transactions
  }}
/>
```

**Developer Consensus (2025):**
- "How the heck do I use this with React?" - common frustration with direct integration
- Use established wrappers (TipTap) rather than building your own integration
- Treat editor as uncontrolled component when possible
- Keep ProseMirror state separate from React state
- The ecosystem has matured significantly - production-ready solutions exist

**For Read-Only Use Cases:**
The friction actually works in Spideryarn's favor:
- Less state synchronization needed (document doesn't change often)
- Annotations as decorations (don't touch document structure)
- Clear boundaries (React handles UI chrome, ProseMirror handles document)

**Emerging Alternative - Lexical (Meta):**
- Designed with React in mind from the start
- More performant for viewing
- Growing ecosystem
- Better for read-heavy use cases

## Next Steps

The conversation is ongoing. Key decisions to make:
1. Whether to enhance current system vs adopt a framework
2. If adopting a framework, which one fits the "augmented reader" use case best
3. How to implement interactive overlapping annotations regardless of approach

## Related Work

[To be updated when implementation decisions are made]