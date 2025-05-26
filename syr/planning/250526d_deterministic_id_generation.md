# Deterministic HTML Element ID Generation

## Goal

Generate unique, deterministic IDs for every element in an HTML document's body. These IDs should be:
- Consistent across reloads of the same HTML content
- Unique within the document
- 8 characters long (first 8 chars of UUID)
- Prefixed with "syr-" to avoid conflicts

## Context

The Spideryarn Reading app needs to assign IDs to HTML elements so we can:
- Create connections between elements
- Add new headings and annotations
- Track elements across document modifications

We'll generate IDs once on initial document load, then store the document with these IDs. Future modifications will be applied as actions on top of this base document.

## Key Decisions

- **HTML Parser**: Use jsdom for robust handling of malformed HTML
- **ID Generation**: Hybrid approach using element position + content fingerprinting
- **Simplicity First**: Keep implementation minimal, add complexity only if needed
- **Tidy First**: Parse HTML through jsdom to normalize before ID generation

## Implementation Approach

1. Load HTML into jsdom (automatically tidies malformed HTML)
2. Traverse all elements in body
3. Generate ID using:
   - Element's position in DOM tree (path)
   - Tag name
   - Key semantic attributes (class, data-*, role)
   - First 100 chars of text content
4. Use UUID v5 with fixed namespace for deterministic generation
5. Take first 8 characters of UUID

Changes that should NOT affect IDs:
- Whitespace/formatting in text
- Style attributes
- Head content changes
- HTML comments
- Attribute order

Changes that SHOULD affect IDs:
- Adding/removing/reordering elements
- Changing tag names
- Changing class names or data-* attributes
- Significant text content changes
- Element hierarchy changes

## Actions

- [x] Write planning doc for deterministic HTML element ID generation
- [ ] Implement HTML parsing with jsdom for tidying/normalization
- [ ] Implement hybrid ID generation function
- [ ] Write test for ID generation stability
  - Load Chalmers example HTML
  - Generate IDs
  - Make non-body changes (meta tags, whitespace)
  - Verify IDs remain the same
  - Make body changes (add element, change class)
  - Verify relevant IDs change
- [ ] Run test and verify ID stability behaviour