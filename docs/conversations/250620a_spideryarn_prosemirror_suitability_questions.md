---
Date: 18 June 2025 at 10:05 BST
Duration: ~1h 7m
Type: Research Review
Status: Active
Claude URL: https://claude.ai/chat/33bbbd21-a6bd-485b-8056-ece64b476480
Extracted by: scripts/extract-claude-conversation.ts --uuid 33bbbd21-a6bd-485b-8056-ece64b476480 --input backup/conversations_from_claude_ai/250620/conversations.json
Source file: backup/conversations_from_claude_ai/250620/conversations.json
Related Docs: []
---

# Spideryarn & ProseMirror suitability questions - 18 June 2025

> **Original Claude.ai conversation:** [https://claude.ai/chat/33bbbd21-a6bd-485b-8056-ece64b476480](https://claude.ai/chat/33bbbd21-a6bd-485b-8056-ece64b476480)  
> **Extracted from:** `backup/conversations_from_claude_ai/250620/conversations.json` using `scripts/extract-claude-conversation.ts --uuid 33bbbd21-a6bd-485b-8056-ece64b476480 --input backup/conversations_from_claude_ai/250620/conversations.json`

## Context & Goals

[Auto-extracted from Claude.ai export - manual curation recommended]

Hello? Can you hear me?  Okay. So, I'm interested to know I'm building an app for, helping people read long documents. And I was actually thinking about representing the document using PROSEMIRROR as the underlying kind of...

## Main Discussion


### Hello Can You Hear Me

**User:** "Hello? Can you hear me?"

**Claude:** The user is asking if I can hear them in what appears to be a voice chat. This is a simple greeting/confirmation question. According to the voice output guidelines, I should:

1. Keep responses extremely concise and under two sentences
2. Keep responses punchy and conversational
3. Never use preambles like "I'd be happy to..." or "Great" or "Sure!"
4. Get to the point immediately
5. End most responses with a question to keep conversation going
6. For small talk responses like this, I should NOT use a voice note

This is clearly small talk/greeting, so no voice note is needed here.Yes, I can hear you perfectly! What can I help you with today?


###  Okay So Im Interested

**User:** "Okay. So, I'm interested to know I'm building an app for, helping people read long documents. And I was actually thinking about representing the document using PROSEMIRROR as the underlying kind of data structure. It's all TypeScript and, NextJS. And, and I guess I would put prosumer in to sort of edit off so it's read only. One of the things I'm interested in is the idea of sort of well, in HTML, is hierarchical. So if, let's say, I've got 2 comments, on the same sentence that overlap, I've never been exactly clear about how one can or should represent that. And I know that there's some fancy new, custom CSS highlights mode that I think Chrome supports, that maybe allows for this. I guess my question is, does ProseMirror allow for overlapping in line span style"

**Claude:** The user is asking about a technical question related to ProseMirror and overlapping inline spans. This is a very technical question about software development and document editing libraries.

Given the voice mode guidelines, I need to consider:
1. This is asking about code


###  And Ideally I Want

**User:** "and ideally, I want it to be clickable."


### Search The Web Tell Me

**User:** "Search the web. Tell me whether you reckon this is feasible or whether prosumer would be a good fit."


### Search The Web Tell Me

**User:** "Search the web. Tell me whether you reckon this is feasible or whether prosemirror would be a good fit."

**Claude:** The user is asking about building a document reading app using ProseMirror with TypeScript and NextJS. They want to know specifically about:

1. Whether ProseMirror can handle overlapping inline spans (like for overlapping comments on the same sentence)
2. Whether these overlapping spans can be clickable
3. Whether ProseMirror would be a good fit for this use case

They mentioned HTML being hierarchical and the challenge of representing overlapping content, and also referenced CSS Custom Highlight API that Chrome supports.

This is a technical question about ProseMirror's capabilities that would benefit from current information, so I should search for information about ProseMirror's handling of overlapping marks/spans and its suitability for read-only document applications with interactive features.

Let me search for information about ProseMirror overlapping marks and spans.

I'll search for information about ProseMirror's capabilities with overlapping spans and marks to help answer your question.

Good, I found some relevant information. Let me search for more specific information about ProseMirror decorations and their clickability, since that's another key part of the user's question.

Let me search for more specific info about CSS Custom Highlight API that the user mentioned, and also about alternatives to ProseMirror for read-only document viewing with overlapping highlights.

Now I have a good amount of information to provide a comprehensive answer. Let me search for one more thing - alternatives to ProseMirror for read-only document viewing applications, just to give a complete picture.

Now I have comprehensive information to answer the user's question about whether ProseMirror is a good fit for their document reading app with overlapping clickable spans. Let me summarize what I've learned:

1. **ProseMirror and overlapping marks/spans:**
- ProseMirror CAN handle overlapping marks, but it requires special configuration
- You need to set `excludes: ""` in the mark spec to allow overlapping marks of the same type
- Each overlapping mark needs a unique ID attribute
- This is demonstrated in the GitHub issues and forum discussions I found

2. **Clickable elements in ProseMirror:**
- ProseMirror can handle clickable elements through decorations and event handling
- There are examples of handling click events inside decorations
- For read-only mode, you can disable editing while keeping interactivity

3. **CSS Custom Highlight API:**
- This is a newer browser API that's specifically designed for overlapping highlights
- It's much more performant than DOM-based highlighting (5x faster according to the sources)
- It handles overlapping highlights natively with priority systems
- Browser support is limited (Chrome/Edge with flags, Safari with flags, no Firefox yet)
- It's specifically designed for the use case the user described

4. **ProseMirror for read-only apps:**
- There's been discussion about read-only mode in ProseMirror community
- It's possible but not straightforward - ProseMirror is primarily designed for editing
- There are ways to make it read-only while keeping interactivity

5. **Alternatives:**
- CSS Custom Highlight API might be better suited for this specific use case
- Other options like Slate, TipTap, etc. but they have similar challenges
- For a pure document reading app, ProseMirror might be overkill

Let me provide a comprehensive answer.

Based on my research, here's my assessment of whether ProseMirror would be a good fit for your document reading app with overlapping clickable comments:

## ProseMirror CAN Handle Overlapping Spans, But...

ProseMirror does support overlapping marks by setting `excludes: ""` in the mark spec and assigning each highlight a unique id attribute. Here's how it works:

```typescript
const highlightMarkSpec = {
attrs: { id: {default: null} },
excludes: "",
toDOM: mark => ["highlight", {id: mark.attrs.id}],
parseDOM: [{
tag: "highlight[id]",
getAttrs: dom => ({id: dom.getAttribute("id")})
}]
}
```

For clickable functionality, you can handle events inside decorations through event listeners, and read-only mode can be implemented by toggling the contenteditable attribute.

## However, There's a Better Alternative: CSS Custom Highlight API

For your specific use case, the **CSS Custom Highlight API** is likely a much better fit:

### Why CSS Custom Highlight API is Superior:

1. **Designed for Overlapping Highlights**: The CSS Custom Highlight API provides a mechanism for styling arbitrary text ranges on a document by using JavaScript to create the ranges, and CSS to style them, and ranges can arbitrarily cross element boundaries without honoring the nesting structure.

2. **Built-in Overlap Handling**: When multiple highlights overlap, the browser uses priority to decide how to style the overlapping parts, with a priority property that determines which highlight's styles should be used to resolve style conflicts.

3. **Performance**: Browser engines can style these ranges very, very fast - the CSS Custom Highlight API performs on average 5✕ as fast as DOM-based highlighting.

4. **Clean Implementation**: Highlights are tied to ranges, which can span multiple HTML elements and do not add any markup or elements to the document.

### Basic Implementation:
```typescript
// Create overlapping ranges
const range1 = new Range();
const range2 = new Range();
// ... set ranges

// Create highlights with priorities
const highlight1 = new Highlight(range1);
const highlight2 = new Highlight(range2);
highlight1.priority = 1;
highlight2.priority = 2;

// Register highlights
CSS.highlights.set("comment-1", highlight1);
CSS.highlights.set("comment-2", highlight2);
```

```css
::highlight(comment-1) {
background-color: yellow;
cursor: pointer;
}

::highlight(comment-2) {
background-color: lightblue;
cursor: pointer;
}
```

## Browser Support Considerations

The CSS Custom Highlight API is supported in Chrome/Edge with experimental flags enabled, Safari 99+ with experimental flags, but Firefox does not support it yet. This feature does not currently work on Firefox, so you shouldn't use it for production right now if Firefox is necessary for your project.

## My Recommendation

For your NextJS/TypeScript document reading app:

1. **If you need broad browser support now**: Use ProseMirror with the overlapping marks approach I described above. It works but requires more setup and isn't as performant.

2. **If you can target modern browsers**: Use the CSS Custom Highlight API. It's specifically designed for your use case and will provide better performance and cleaner code.

3. **Hybrid approach**: Consider detecting browser support and falling back to a ProseMirror-based solution for unsupported browsers.

For a read-only document viewer with interactive highlights, ProseMirror might be overkill since you're not actually editing the document. The CSS Custom Highlight API + standard DOM manipulation might be simpler and more performant for your specific needs.


### Can You Combine The Custom

**User:** "Can you combine the custom highlight API with ProseMirror?"

**Claude:** The user is asking if the CSS Custom Highlight API can be combined with ProseMirror. This is an interesting question that would require me to search for information about using these two technologies together. Let me search for information about this specific combination.

Great! I found some very relevant information. There's actually a discussion thread on the ProseMirror forums specifically about combining CSS Custom Highlight API with ProseMirror. Let me fetch that specific discussion to get more details.

This is really interesting! The discussion shows that Marijn (the creator of ProseMirror) has actually considered this combination, but he has some reservations about it. Let me search for more specific information about combining these two technologies.

Now I have a comprehensive understanding of the situation. Based on the research, I can provide a detailed answer about combining CSS Custom Highlight API with ProseMirror.

Absolutely! You can combine the CSS Custom Highlight API with ProseMirror, and it's actually a very interesting approach. Here's what I found:

## The Discussion is Already Happening

There's actually an active discussion in the ProseMirror community about this exact combination. A developer posted about using the CSS Highlight API to render ProseMirror decorations as CSS Highlights, noting that "it'd mean the potential to style text ranges without creating additional DOM structure for features like spell check errors."

## Marijn's Perspective (ProseMirror Creator)

Marijn Haverbeke (ProseMirror's creator) responded with some interesting points: "I'm not sure it really offers much advantages for a system like ProseMirror, which already controls the DOM inside of it. I doubt these are much more lightweight than wrapping elements, as far as the work the browser needs to do."

However, he also acknowledged a key use case: "its intended use case is more in the direction of code that shouldn't mess with the DOM (it seems something like Grammarly could use it to highlight in-editor content without being rude about it and disrupting the actual content)"

## How to Combine Them

Here's a practical approach for your document reading app:

### 1. Use ProseMirror for Document Structure + CSS Highlights for Comments

```typescript
// In your ProseMirror plugin
const commentHighlightPlugin = new Plugin({
key: new PluginKey('commentHighlights'),

view(editorView) {
return {
update: (view, prevState) => {
// Clear existing highlights
CSS.highlights.clear();

// Create highlights from your comment data
this.updateHighlights(view, commentData);
}
};
},

updateHighlights(view, comments) {
comments.forEach((comment, index) => {
// Convert ProseMirror positions to DOM ranges
const range = this.prosemirrorToDOMRange(view, comment.from, comment.to);

// Create highlight with priority for overlapping
const highlight = new Highlight(range);
highlight.priority = comment.priority || index;

// Register the highlight
CSS.highlights.set(`comment-${comment.id}`, highlight);
});
},

prosemirrorToDOMRange(view, from, to) {
const range = new Range();
const startDOM = view.domAtPos(from);
const endDOM = view.domAtPos(to);

range.setStart(startDOM.node, startDOM.offset);
range.setEnd(endDOM.node, endDOM.offset);

return range;
}
});
```

### 2. Handle Overlapping Comments with Priorities

```css
::highlight(comment-1) {
background-color: rgba(255, 255, 0, 0.3);
cursor: pointer;
}

::highlight(comment-2) {
background-color: rgba(0, 255, 255, 0.3);
cursor: pointer;
}

/* Higher priority comments will show on top */
::highlight(comment-priority-high) {
background-color: rgba(255, 0, 0, 0.4);
border-bottom: 2px solid red;
}
```

### 3. Add Click Handling

```typescript
// Add event listener to the editor DOM
editorView.dom.addEventListener('click', (event) => {
const position = editorView.posAtCoords({
left: event.clientX,
top: event.clientY
});

if (position) {
// Find which comments are at this position
const commentsAtPosition = findCommentsAtPosition(position.pos);
if (commentsAtPosition.length > 0) {
handleCommentClick(commentsAtPosition, event);
}
}
});
```

## Key Advantages of This Approach

1. **Clean DOM**: No additional DOM structure needed for highlights
2. **Native Overlap Handling**: The CSS Custom Highlight API handles overlapping ranges automatically with priorities
3. **Performance**: Superior performance compared to DOM-based highlighting approaches
4. **ProseMirror Integration**: You keep all of ProseMirror's document management while using CSS highlights for presentation

## Challenges to Consider

1. **Position Mapping**: The main challenge is "keeping a set of highlights up to date for a given DOM structure, after the DOM has been rendered by ProseMirror but with some awareness of the relationship between document positions and corresponding DOM structures"

2. **Browser Support**: Still limited browser support compared to ProseMirror's broad compatibility

3. **State Synchronization**: You need to keep the highlight state in sync with ProseMirror's document state

## Alternative: Hybrid Approach

For production use, consider a hybrid approach:

```typescript
// Feature detection
const supportsCustomHighlights = 'highlights' in CSS;

if (supportsCustomHighlights) {
// Use CSS Custom Highlight API
this.setupCSSHighlights();
} else {
// Fall back to ProseMirror decorations
this.setupProseMirrorDecorations();
}
```

This gives you the best of both worlds: cutting-edge performance for modern browsers and reliable fallbacks for older ones.

For your read-only document viewer with overlapping clickable comments, this combination could be ideal – you get ProseMirror's robust document handling with the CSS Custom Highlight API's superior highlighting capabilities.


### Can Pros Mirror Handle Long

**User:** "Can pros mirror handle long ish documents, say, a 100 pages? And also, if I wanted to make"


### Can Prosemirror Handle Long Ish

**User:** "Can prosemirror handle long ish documents, say, a 100 pages?"

**Claude:** The user is asking about ProseMirror's performance with large documents, specifically around 100 pages. This is an important question for their document reading app. I should search for information about ProseMirror's performance with large documents, any known limitations, and best practices for handling long documents.

The search results show that there are indeed performance issues with ProseMirror when dealing with large documents. Let me search for more specific information about document size limits and performance optimization strategies.

Based on the search results, I'm getting a clearer picture of ProseMirror's performance with large documents. Let me search for more specific information about alternatives and best practices.

Now I have a good overview of ProseMirror's performance with large documents. Let me synthesize this information to give the user a comprehensive answer about handling 100-page documents.

Based on my research, here's what you need to know about ProseMirror handling long documents like 100 pages:

## The Reality: ProseMirror Struggles with Very Large Documents

Performance issues with ProseMirror become noticeable when dealing with large amounts of content, particularly in Chrome. At 7k+ words, editors can become unusable - though this is noted as "not an issue for draftjs or prosemirror" in comparison to Slate, so ProseMirror performs better than some alternatives, but still has limits.

## Specific Performance Issues

### Browser-Specific Problems
There's a documented Chrome bug that affects ProseMirror performance with very large documents, causing "super slow typing performance on Chrome under Mac OS X with very large documents loaded". Based on profiling, "the vast majority of the time seems to be spent in browser code outside of the javascript runtime".

### Computational Complexity
ProseMirror shows non-linear performance degradation, particularly when pasting large amounts of content. Pasting 300 lines with complex content can take ~10 seconds.

## Solutions and Workarounds

### 1. Pagination Approach
Several developers have successfully implemented pagination solutions:

A developer created "Badon Writer" with "a completely new way of approaching the pagination problem, and thus it can even handle long documents (~300+ pages), with headers and footers".

### 2. Lazy Loading/Virtualization
Teams are exploring "not loading the full dom on document load and lazy-loading content on scroll" to improve performance with larger documents.

### 3. Document Splitting
Implementing paging by calculating page height and using `tr.split()` to create multiple pages and spread content across them.

## Performance Comparison with Alternatives

In stress tests comparing ProseMirror vs Lexical (Meta's editor), ProseMirror is "designed for long-term use, offering a little bit slower responses but more predictable and stable performance over time" while "Lexical performs better for short-term use, responding faster initially, but its performance degrades under very heavy use due to inefficient memory management".

## Recommendations for Your Use Case

For a **read-only document viewer** with 100-page documents, here are your best options:

### Option 1: Alternative to ProseMirror
Since you're building a **read-only** app, ProseMirror might be overkill. Consider:
- **Pure HTML/CSS with CSS Custom Highlight API** for overlapping comments
- **React-based document viewer** with virtualization
- **PDF.js** if your documents can be converted to PDF

### Option 2: ProseMirror with Optimization
If you want to stick with ProseMirror:

1. **Implement Pagination**: Split documents into manageable chunks
2. **Use Virtualization**: Only render visible pages
3. **Optimize for Read-Only**: Set contenteditable to false for read-only mode
4. **Consider Browser Targets**: Performance varies significantly between browsers

### Option 3: Hybrid Approach
```typescript
// Detect document size and choose strategy
if (documentSize > LARGE_DOCUMENT_THRESHOLD) {
// Use pagination or virtualization
renderPaginatedDocument();
} else {
// Use standard ProseMirror approach
renderFullDocument();
}
```

## Bottom Line

**100 pages is challenging for ProseMirror** without significant optimization. Marijn (ProseMirror's creator) acknowledges that "nothing scales forever, so it does make sense to think about the maximum document sizes you want to support and test whether your implementation can handle them".

For a read-only document viewer specifically, you might get better performance and simpler implementation using:
- CSS Custom Highlight API for overlapping comments
- Virtual scrolling for large content
- A lighter-weight solution than a full rich-text editor

The key is testing with your actual content and use cases to determine what works best for your specific requirements.


### If I Wanted To Be

**User:** "if I wanted to be able to do exact match text search with prosemirror i.e. find me a particular phrase that appears somewhere in the document and that phrase might have pieces within it that have spans like an italic that should be ignored, can prosemirror handle that?"

**Claude:** The user is asking about text search capabilities in ProseMirror, specifically:
1. Exact match text search for phrases
2. The search should ignore formatting/marks like italics, bold, etc. (spans)
3. They want to find text that might be split across different formatted sections

This is a common requirement for document editors - you want to search for "hello world" and find it even if it appears as "<em>hello</em> world" or "hel<strong>lo wor</strong>ld" etc.

Let me search for information about ProseMirror's text search capabilities and how it handles searching across marks/formatting.

The search results don't directly address text search functionality in ProseMirror. Let me search more specifically for text search and the textBetween method, which is likely what would be used for searching text while ignoring formatting.

Based on the search results, I can see that ProseMirror has a `textBetween` method that can extract text from a range while ignoring formatting. Let me search for more specific information about search functionality and how to implement text search that ignores marks.

Great! I found that there's an official ProseMirror search module `prosemirror-search` that handles text search functionality. Let me get more details about how it works with the `textBetween` method and how it handles searching across marks/formatting.

Great! This gives me a good understanding of ProseMirror's search capabilities. Now let me search for more specific information about how the search actually works with marks and formatting, particularly looking at the implementation details.

Based on my research, I can now provide a comprehensive answer about ProseMirror's text search capabilities and how it handles searching across marks/formatting.

**Yes, ProseMirror can absolutely handle exact match text search that ignores formatting/marks like italics, bold, etc.** Here's how:

## Built-in Search Capabilities

ProseMirror has an official `prosemirror-search` module that provides exactly this functionality:

The module "defines an API for searching through ProseMirror documents, search/replace commands, and a plugin that highlights the matches of a given search query"

## How It Works

### The Key Method: `textBetween`

The search functionality relies on ProseMirror's `textBetween` method, which is used by the editor to get text for the current selection when copying text to the clipboard, and by default, the editor will use textBetween on the selected range.

### Document Structure Advantage

ProseMirror's inline content is modeled as a flat sequence, with the markup attached as metadata to the nodes. This more closely matches the way we tend to think about and work with such text. It allows us to represent positions in a paragraph using a character offset rather than a path in a tree.

This means that when you have text like:
```html
<p>Hello <strong>wor</strong>ld</p>
```

ProseMirror internally represents it as a flat sequence: `"Hello world"` with bold formatting attached as metadata to positions 6-8. This makes searching across formatting boundaries straightforward.

## Implementation Example

Here's how you would implement text search that ignores formatting:

```typescript
import { Plugin } from 'prosemirror-state'
import { SearchQuery, search } from 'prosemirror-search'

// Create a search plugin
const searchPlugin = search({
initialQuery: new SearchQuery({
search: "your search phrase",
caseSensitive: false,
wholeWord: false
})
})

// The search will find "your search phrase" even if it spans multiple marks
// For example, it will find "your search phrase" in:
// "your <em>search</em> phrase" or "your <strong>sea</strong>rch phrase"

// Get text from document ignoring formatting
const plainText = doc.textBetween(0, doc.content.size, ' ', ' ')
```

## Search Features

The SearchQuery supports multiple options including case-sensitive search, regular expressions, whole-word matching, and replace functionality:

```typescript
new SearchQuery({
search: "hello world",
caseSensitive: false,
literal: true, // Don't replace \n, \r, \t
regexp: false, // Use as string, not regex
wholeWord: false, // Match partial words
replace: "hi there" // Optional replacement text
})
```

## Handling Your Example

For your specific example where you want to find "hello world" but it appears as:
```html
<p>hel<em>lo wor</em>ld</p>
```

ProseMirror's search will:
1. Use `textBetween` to extract the plain text: `"hello world"`
2. Find the match at the correct position
3. Map that position back to the document structure
4. Highlight or select the text across the formatting boundaries

## Advanced Usage

Since ProseMirror doc has its own mechanism to compute text position, you can't use a common string search algorithm to index the target substring. However, the built-in search handles this mapping automatically.

The search plugin also provides:
- `findNext()` and `findPrev()` commands
- `replaceNext()` and `replaceAll()` for find/replace
- Automatic highlighting of matches with decorations
- Range-based searching within specific document sections

## Bottom Line

ProseMirror is **excellent** for text search that ignores formatting. Its flat inline content model makes this much easier than DOM-based approaches. The official `prosemirror-search` module provides a robust, production-ready implementation that handles all the edge cases of searching across marks and formatting boundaries.

This is actually one of ProseMirror's strengths - its document model is designed to make operations like search, replace, and text manipulation much more predictable than working with raw HTML.


### Is Prosemirror Still Under Active

**User:** "Is ProseMirror still under active development?"

**Claude:** The user is asking about the current status of ProseMirror development. This is a good question to ask when evaluating whether to use a library - you want to know if it's being actively maintained, if bugs are being fixed, if new features are being added, etc.

Let me search for recent information about ProseMirror's development status, recent releases, GitHub activity, and any statements from the maintainers about the project's future.

I need to get more specific information about ProseMirror's recent development activity. Let me search for recent GitHub commits, releases, and any statements from Marijn Haverbeke about the project's status.

Now I need to look at more recent GitHub activity to see the actual development status. Let me check the recent commits and releases directly from GitHub repositories.

I need to get more specific information about recent activity. Let me look at the recent commits and issues on the main ProseMirror repository.

Based on all the information I've gathered, I can now provide a comprehensive answer about ProseMirror's development status. Let me summarize the key findings:

1. From the recent discussions, there was a question about roadmap from February 2025, showing active community engagement
2. Marijn Haverbeke is still actively maintaining the project - there are recent references to him in 2024
3. The Emergence Engineering performance comparison from 2024 notes "The editor was released by Marijn Haverbeke about 6 years ago and is maintained regularly"
4. There was active development on TypeScript conversion mentioned in 2022
5. Recent React integrations like the @handlewithcare/react-prosemirror fork from January 2025 show continued community development
6. The view component changelog shows recent fixes and updates
7. NPM statistics show prosemirror-state gets 914,032 weekly downloads, indicating continued popularity
8. The project is described as having "sustainable" maintenance
9. Recent projects like Badon Writer (September 2024) are being built on ProseMirror
10. Companies like Linear, Atlassian, NYT continue to use it in production

I should present this information clearly to answer the user's question about active development status.

**Yes, ProseMirror is still under active development and maintenance**, though the pace is more focused on stability and refinement rather than major new features. Here's the current status:

## Active Maintenance & Development

**Marijn Haverbeke** (the creator) is still actively maintaining the project. As of 2024, "The editor was released by Marijn Haverbeke about 6 years ago and is maintained regularly".

**Recent Activity Evidence:**
- As recent as February 2025, there was community discussion about an "Official Roadmap or future plans"
- The changelog shows regular bug fixes and improvements, including recent fixes for Safari, Chrome, and Firefox compatibility issues
- Recent collaboration with the Automerge team in 2024, with "Thanks also to Marijn Haverbeke for his input on the project"

## Strong Ecosystem & Usage

**Popularity Metrics:**
- The npm package prosemirror-state receives 914,032 downloads per week and is classified as "Popular"
- Analysis shows "prosemirror-state maintenance is sustainable demonstrating some project activity"

**Production Usage:**
- Used by major companies: "ProseMirror is used everywhere from work management platforms like Asana and widely read newspapers like The New York Times to the input box of ChatGPT"
- Atlassian continues using ProseMirror in Confluence, with Marijn noting "Every time I am in touch with them, I asked like, if it's still not major project problems and they keep saying no, no it's works"

## Community Development

**Active Ecosystem:**
- Recent React integration development: "On Jan. 17, 2025, the maintainers of the @nytimes/react-prosemirror library decided fork the v2 release into its own project"
- New projects built on ProseMirror in 2024, like "Badon Writer" which "can even handle long documents (~300+ pages)"

## Development Philosophy

**Stability Focus:**
The project appears to be in a **mature, stable phase** rather than rapid feature development. ProseMirror was converted to TypeScript in 2022, showing continued modernization efforts.

**Single Maintainer Model:**
Marijn operates as "a one person company" which allows him to maintain the project "without lots of stress and lawyers", but he's proven capable of sustaining this model long-term.

## What This Means for You

**Pros:**
- The project is stable and well-maintained
- Large production usage proves its reliability
- Active community and ecosystem
- Regular bug fixes and compatibility updates

**Considerations:**
- Development pace is slower than newer, VC-backed alternatives
- Major new features are less frequent
- Single maintainer dependency (though Marijn has proven reliable)

**Bottom Line:** ProseMirror is actively maintained and widely used in production. While it's not seeing rapid feature development, it's receiving consistent maintenance, bug fixes, and community support. For a mature project, this is actually a positive sign - it indicates the core architecture is solid and the focus is on stability rather than constant churn.

If you're evaluating it for a project, the combination of proven production usage, active maintenance, and strong ecosystem makes it a safe choice for 2025.


### Lets Say I Apply A

**User:** "Let's say I apply a bunch of various kinds of edits with ProseMirror.

I want to be able to cluster some of them together that are related, and then revert/reapply/revert/reapply them, interwoven with other edits.

Does that sound feasible?"

**Claude:** The user is asking about a sophisticated undo/redo system in ProseMirror where they want to:

1. Apply various edits
2. Cluster some edits together as related groups
3. Selectively revert/reapply these clustered edits
4. Do this while interwoven with other edits (so not just linear undo/redo)

This sounds like they want:
- Selective undo (being able to undo specific changes without undoing everything after them)
- Grouping of related changes
- Non-linear undo/redo

Let me search for information about ProseMirror's undo/redo capabilities, selective undo, and transaction grouping.

Let me search for more specific information about selective undo and transaction grouping in ProseMirror, and also look for examples or documentation about how to implement such functionality.

Now let me search for information about transaction metadata and grouping to see how to implement custom clustering of related edits.

Perfect! Now I have a lot of information about ProseMirror's undo/redo system, selective undo capabilities, and transaction metadata. Let me search for one more piece about how to implement custom grouping or clustering of related edits.

Excellent! Now I have all the information I need to answer the user's question about clustering edits together and selectively reverting/reapplying them. Let me analyze what they're asking for and how ProseMirror can handle it:

1. They want to cluster related edits together
2. They want to revert/reapply these clusters selectively
3. They want to do this interwoven with other edits (non-linear undo)

From my research, I can see that:

1. ProseMirror has built-in selective undo - it doesn't just roll back to previous state but selectively rolls back specific transactions
2. The tracking changes example shows exactly how to implement selective revert of specific commits
3. Transaction metadata can be used to group related changes
4. The "addToHistory" metadata can control what gets added to undo history
5. Custom plugins can track their own history and implement custom undo/redo logic

So yes, this is definitely feasible. Let me structure a comprehensive answer.

**Yes, this is absolutely feasible with ProseMirror!** In fact, you're describing functionality that ProseMirror is specifically designed to support. Here's how to approach it:

## ProseMirror's Built-in Selective Undo

First, it's important to know that ProseMirror's history implementation "doesn't implement history by simply resetting back to some previous state. In order to support collaborative editing, it selectively rolls back some transactions, but not other". This means non-linear undo is already part of the architecture.

## Implementation Strategy

### 1. Use Transaction Metadata for Clustering

You can cluster related edits using transaction metadata:

```typescript
// Group related edits with custom metadata
const EDIT_GROUP_KEY = 'editGroup';

// When starting a related series of edits
let tr = state.tr;
tr.setMeta(EDIT_GROUP_KEY, {
groupId: 'feature-x-implementation',
type: 'code-refactor',
description: 'Extract utility function'
});

// Apply your changes to tr...
dispatch(tr);
```

### 2. Custom History Tracking Plugin

The tracking changes example shows exactly how to implement selective revert functionality. You can create a custom plugin that tracks grouped edits:

```typescript
class EditGroupTracker {
constructor(groups, uncommittedSteps) {
this.groups = groups; // Array of edit groups
this.uncommittedSteps = uncommittedSteps;
}

applyTransform(transform) {
const groupMeta = transform.getMeta(EDIT_GROUP_KEY);

if (groupMeta) {
// This is part of a grouped edit
const inverted = transform.steps.map((step, i) =>
step.invert(transform.docs[i]));

const existingGroup = this.groups.find(g => g.id === groupMeta.groupId);
if (existingGroup) {
// Add to existing group
existingGroup.steps = existingGroup.steps.concat(inverted);
existingGroup.maps = existingGroup.maps.concat(transform.mapping.maps);
} else {
// Create new group
const newGroup = {
id: groupMeta.groupId,
type: groupMeta.type,
description: groupMeta.description,
steps: inverted,
maps: transform.mapping.maps,
timestamp: transform.time
};
return new EditGroupTracker([...this.groups, newGroup], this.uncommittedSteps);
}
}

return new EditGroupTracker(this.groups, this.uncommittedSteps);
}
}

const editGroupPlugin = new Plugin({
state: {
init() { return new EditGroupTracker([], []); },
apply(tr, tracker) {
return tracker.applyTransform(tr);
}
}
});
```

### 3. Selective Revert/Reapply

You can revert individual commits by "rebasing the inverted form of those steps over all intermediate steps":

```typescript
function revertEditGroup(groupId) {
const tracker = editGroupPlugin.getState(state);
const group = tracker.groups.find(g => g.id === groupId);

if (!group) return;

// Create mapping for all changes after this group
const laterGroups = tracker.groups.slice(tracker.groups.indexOf(group) + 1);
const remap = new Mapping(
laterGroups.reduce((maps, g) => maps.concat(g.maps), [])
);

let tr = state.tr;

// Apply inverted steps in reverse order
for (let i = group.steps.length - 1; i >= 0; i--) {
const remapped = group.steps[i].map(remap.slice(i + 1));
if (!remapped) continue;

const result = tr.maybeStep(remapped);
if (result.doc) remap.appendMap(remapped.getMap(), i);
}

if (tr.docChanged) {
tr.setMeta('addToHistory', false); // Don't add revert to normal history
tr.setMeta(editGroupPlugin, { action: 'revert', groupId });
dispatch(tr);
}
}

function reapplyEditGroup(groupId) {
// Similar logic but applying the original steps instead of inverted ones
}
```

### 4. Integration with Standard History

You can control how your grouped edits interact with ProseMirror's standard undo/redo:

```typescript
// Prevent grouped edits from being individually undoable
tr.setMeta('addToHistory', false);

// Or create custom undo commands that understand groups
const customUndo = () => {
const tracker = editGroupPlugin.getState(state);
const lastGroup = tracker.groups[tracker.groups.length - 1];

if (lastGroup && shouldUndoAsGroup(lastGroup)) {
revertEditGroup(lastGroup.id);
return true;
}

// Fall back to standard undo
return undo(state, dispatch);
};
```

## Advanced Features

### Smart Conflict Detection

The example notes that "outcomes of complicated reverts, where later changes touch the same content, can sometimes be unintuitive. In a production application, it may be desirable to detect such conflicts and provide the user with an interface to resolve them".

### UI Integration

You can build a UI that shows:
- List of edit groups with descriptions
- Status (applied/reverted)
- Conflict indicators
- One-click revert/reapply buttons

### Multiple Grouping Strategies

```typescript
// You can have multiple overlapping grouping strategies
tr.setMeta('featureGroup', 'user-authentication');
tr.setMeta('fileGroup', 'auth.ts');
tr.setMeta('authorGroup', 'user123');
```

## Bottom Line

This is not only feasible but represents one of ProseMirror's core strengths. The selective undo system, transaction metadata, and transform/rebase capabilities give you all the tools needed to implement sophisticated edit clustering and selective revert/reapply functionality. The tracking changes example provides a solid foundation that you can extend for your specific needs.

## Sources & References

- **Original conversation:** [Claude.ai](https://claude.ai/chat/33bbbd21-a6bd-485b-8056-ece64b476480)
- **Source file:** `backup/conversations_from_claude_ai/250620/conversations.json`
- **Extraction script:** `scripts/extract-claude-conversation.ts --uuid 33bbbd21-a6bd-485b-8056-ece64b476480 --input backup/conversations_from_claude_ai/250620/conversations.json`
- **Extraction date:** 20/06/2025, 14:59:29
- **Conversation created:** 18 June 2025 at 10:05 BST
- **Total messages:** 22


## Related Work

[To be filled manually based on any resulting documentation or implementation]

