# Styling Text Highlights in Spideryarn Reading

## Introduction

This document explains **how we style text highlights** inside the document‐viewer pane.  
The focus is on Mark.js highlights (used for search, glossary, and semantic cues) and the quirks that come with the browser's default styling of the `<mark>` element.  
It captures the patterns we have converged on so future features can reuse the same approach without rediscovering the pitfalls.

## See also

- `docs/reference/TOOL_SEARCH_TEXT.md` – explains the search feature and how it applies Mark.js highlights.
- `docs/reference/TOOL_GLOSSARY.md` – glossary extraction & navigation, now extended with inline entity highlights.
- `docs/reference/DESIGN_OVERLAPPING_TEXT_HIGHLIGHTS.md` – strategies for handling multiple highlight layers.
- `components/simple-document-viewer.tsx` – the main implementation of Mark.js calls and CSS overrides.
- `planning/250613f_glossary_hyperlinks_implementation.md` – decision log for glossary link styling (historical context).

## Principles & key decisions

1. **Avoid the default yellow** – The browser's default `<mark>` background clashes with our design and other highlight layers. We always reset it.
2. **Use semantic wrapper when convenient** – We keep Mark.js's default `<mark>` wrapper for readability unless it causes problems.
3. **Scope safely, override globally** – Inside styled-jsx blocks we prefix highlight classes with `:global()` so overrides are not scoped away.
4. **Consistent class naming** – Each feature gets its own class (`search-highlight`, `highlight-glossary`, `semantic-highlight-*`) so CSS can target them precisely.
5. **Light-touch changes first** – Prefer CSS overrides; fall back to changing the wrapper element only if necessary.
6. **Accessibility** – Underlines and icons are combined with colour changes to avoid relying solely on colour for meaning.

## Implementation guidance

### 1. Resetting the `<mark>` style

```css
:global(.search-highlight),
:global(.highlight-glossary) {
  background-color: transparent; /* kill the yellow */
  color: inherit;               /* preserve surrounding colour */
}
```

Add this inside the relevant component's `<style jsx>` _or_ create a global stylesheet entry in `app/globals.css`.

### 2. Alternative: use a different wrapper element

Mark.js allows custom wrappers:

```ts
markInstance.mark(terms, {
  element: 'span',
  className: 'search-highlight',
});
```

Pros: No yellow to begin with.  
Cons: Slightly less semantic; may require updates to existing CSS/tests.

### 3. Styled-jsx scoping pitfalls

Remember that `<style jsx>` is component-scoped.  To override classes added to _child_ elements, prefix with `:global()`:

```css
<style jsx>{`
  :global(.highlight-glossary) { … }
`}</style>
```

If you forget `:global`, the rule will compile but won't match – leading to "why is it still yellow?" confusion.

### 4. Multiple highlight layers

We apply highlight types in priority order:

1. Glossary (`highlight-glossary`)
2. Semantic (`semantic-highlight-*`)
3. Search (`search-highlight`)

Use z-index or opacity tweaks in each rule, and always add `exclude: ['mark']` to Mark.js options so highlights don't nest recursively.

## Gotchas

- The `<mark>` element has **user-agent styles** that vary slightly between browsers. Always reset both `background-color` **and** `color`.
- Hover styles need padding when using an underline; else the hover background may misalign.
- If you rely on inline SVG icons via `::after`, remember that emojis render differently across platforms. We currently use 📖 until we settle on an SVG inline approach.

## Planned future work

- Evaluate CSS Custom Highlight API once browser support improves – it avoids extra DOM nodes and simplifies overlap handling.
- Move common highlight CSS into a dedicated global stylesheet to reduce duplication.
- Add automated visual regression tests for highlight rendering.

## Appendix – Glossary underline example (Summer 2025)

After adding inline glossary links, readers complained about the bright-yellow default background.  The fix:

```tsx
/* components/simple-document-viewer.tsx – inside <style jsx> */
:global(.highlight-glossary) {
  background-color: transparent;
  color: inherit;
  border-bottom: 1px dotted #6B7280; /* subtle underline */
  cursor: help;
  transition: all 0.2s ease;
}

:global(.highlight-glossary)::after {
  content: '📖';
  font-size: 0.75em;
  vertical-align: super;
  margin-left: 2px;
}
```

This preserved the dotted-underline + icon design while eliminating the unwanted yellow background, without changing Mark.js configuration. 