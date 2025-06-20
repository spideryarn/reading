---
Date: 18 June 2025 at 11:15 BST
Duration: ~57 minutes
Type: Research Review
Status: Active
Claude URL: https://claude.ai/chat/8ba32a53-2f6f-4233-afa9-c7f19e2bad35
Extracted by: scripts/extract-claude-conversation.ts --uuid 8ba32a53-2f6f-4233-afa9-c7f19e2bad35 --input backup/conversations_from_claude_ai/250620/conversations.json
Source file: backup/conversations_from_claude_ai/250620/conversations.json
Related Docs: []
---

# Spideryarn & ProseMirror deep research - 18 June 2025

> **Original Claude.ai conversation:** [https://claude.ai/chat/8ba32a53-2f6f-4233-afa9-c7f19e2bad35](https://claude.ai/chat/8ba32a53-2f6f-4233-afa9-c7f19e2bad35)  
> **Extracted from:** `backup/conversations_from_claude_ai/250620/conversations.json` using `scripts/extract-claude-conversation.ts --uuid 8ba32a53-2f6f-4233-afa9-c7f19e2bad35 --input backup/conversations_from_claude_ai/250620/conversations.json`

## Context & Goals

[Auto-extracted from Claude.ai export - manual curation recommended]

I have a rich app for reading documents. The user won't be able to edit the contents very much (it'll be in read-only mode for much of the time), but we will offer features such as:
* exact text... I am working on a rich app for helping people to read difficult documents (<100 pages) called Spideryarn. The user won't be able to edit the contents very much (it'll be in read-only mode for much of...

## Main Discussion


### I Have A Rich App

**User:** "I have a rich app for reading documents. The user won't be able to edit the contents very much (it'll be in read-only mode for much of the time), but we will offer features such as:
* exact text match in response to user query
* highlight sentences that match particular themes, colouring them according to theme
* comments (which could overlap)
* in-line glossary for complicated terminology (they display in the document as special hyperlinks, when you hover they show a tooltip, and when you click them they open the Glossary tab for that item)
* separate Table of Contents tab, and when you click a heading it scrolls the document to that section
* ask an AI to update the
* etc"


### I Am Working On A

**User:** "I am working on a rich app for helping people to read difficult documents (<100 pages) called Spideryarn. The user won't be able to edit the contents very much (it'll be in read-only mode for much of the time), but we will offer features such as:
- Exact text match in response to user query
- Highlight sentences that match particular themes, colouring them according to theme
- User comments (which could overlap)
- In-line glossary for complicated terminology (they display in the document as special hyperlinks, when you hover they show a tooltip, and when you click them they open the Glossary tab for that item)
- Separate Table of Contents tab, and when you click a heading it scrolls the document to that section, and vice versa
- Ask an AI to update the headings to be more granular (and a nice-to-have would be that you can undo this)
- It would be great if you could switch to 'compact-summary' mode where it replaced all the paragraphs with a 1-sentence summary, and you could click or or hover on a summary to tooltip or reveal the full paragraph (I'm still figuring out how this should work)
- etc

We also need some kind of DSL or data structure for representing edits, especially in an LLM-friendly way. For example, when we import a PDF to turn it into HTML, we'll use an LLM to transcribe images of each page individually in parallel, and then a follow-up LLM call to stitch the pieces together and do final edits. So we need a way for that follow-up LLM call to specify edits to the document in a data-efficient way (i.e. not just re-outputting the whole edited document), e.g.
- If a paragraph (or table, etc) spans two pages, we'll want to unify the two elements from those pages
- Fix cross-page hyperlinks
- etc etc

We're focusing on scientific papers, so it'll need some kind of support for all the usual stuff, e.g. tables, figures (which we can just treat as images with captions for now), footnotes, mathematics, etc.

I have a working v1 in Next.js, with custom 'reversible mutation edits', with Mark.js for exact text search, but it's starting to feel a bit complicated/shaky.

I'm contemplating using ProseMirror for representing the document (probably in read-only mode for the user). I'm also open to other ideas, including Custom CSS Highlights API, some kind of custom data structure, some kind of React.js library, or anything else you can suggest that I haven't thought of that could work within a Next.js/TypeScript ecosystem.

I care mostly about supporting modern Chrome, with Safari, mobile, Edge as nice-to-haves.

----

Ask questions to clarify requirements if you need to, raise concerns if you have them, consider the desiderata/criteria for success, suggest alternatives, weigh up options and trade-offs, consider edge cases, point out if you think I'm wrong or see a better way. Do everything you can to help the user to think this through, and make the best decision.

Ultrathink, do a deep dive."

**Claude:** The user is asking about architectural decisions for a rich reading app called Spideryarn. They've outlined many features and are considering whether to use ProseMirror or other solutions. This is a complex technical question that would benefit from research about:

1. ProseMirror's capabilities for read-only documents with overlays
2. Alternative approaches for document annotation/highlighting
3. DSL patterns for document edits
4. Best practices for handling scientific papers with complex formatting

This is definitely not a simple conversational query, and it's asking for deep technical analysis. I should ask some clarifying questions before launching the research task to ensure I understand their specific needs better.

Key ambiguities I see:
- Performance requirements (document size, number of annotations)
- Whether they need collaborative features
- How important is the reversibility/undo functionality
- What format they're starting from (PDF → HTML conversion details)

Let me ask 2-3 focused clarifying questions.

This is a fascinating technical challenge! Before I dive deep into researching the best architectural approach for Spideryarn, I have a few clarifying questions to ensure I give you the most relevant recommendations:

1. **Performance constraints**: What's the typical document size you're targeting (page count, number of annotations/comments expected)? And do you need real-time collaboration features, or is this primarily single-user?

2. **Edit persistence**: For your DSL/edit representation, do you need to store edit history for undo/redo across sessions, or just within a session? And are these edits versioned (e.g., can users revert to how the document looked before AI reformatting)?

3. **PDF conversion pipeline**: When you mention LLMs transcribing pages in parallel - are you OCR-ing scanned PDFs, or extracting text from digital PDFs? This affects how much document structure you'll need to reconstruct.

Once I understand these constraints better, I'll do a comprehensive analysis of ProseMirror vs alternatives, design patterns for your edit DSL, and architectural recommendations for handling all those overlapping features elegantly.


### 1 Assume Under 100 Pages

**User:** "1) Assume under 100 pages, usually under 30. Probably this will be mostly desktop/iPad, though we will support mobile. Focus on single-user.

2) Yes, I think we'll want to persist edits in the database somehow. Right now, we store the original version, and then edits of different kinds (e.g. AI-generated headings), and apply them on load. But I'm open to better ways.

3) I don't 100% trust extracting text from digital PDFs, so I'm planning to turn the PDFs into a series of images, one per page, and OCR them. This also means we only have one flow, no matter what internal structure the PDF has. But if it will help, we could also feed in the whole original PDF in non-image form (ideally only to the final-edit LLM, to avoid having to send up tooooo many tokens per page).

I think part of what I'm not sure about is how to think about ephemeral vs permanent and/or overlays vs structural changes, e.g.
* searching for exact-match text is ephemeral/superficial, and maybe we don't want to store that on the document itself.
* a user comment or glossary match is permanent, but maybe we only want to display them some of the time (e.g. when in Comments, or Glossary mode)."

**Claude:** The user has given me a complex technical problem about building a rich document reader app called Spideryarn. They've already answered my initial clarifying questions, so I have enough context to proceed. Let me analyze what they need:

1. A document viewer for scientific papers (under 100 pages, usually under 30)
2. Multiple overlay features: text search, theme highlighting, comments, glossary, ToC
3. AI-powered features: heading generation, compact summaries
4. A DSL for representing edits efficiently, especially for LLM-based PDF processing
5. They're considering ProseMirror but are open to alternatives

The key architectural challenge seems to be managing multiple layers of annotations/modifications:
- Ephemeral (search highlights)
- Permanent but toggleable (comments, glossary)
- Structural changes (AI-generated headings)

They're currently using Next.js with Mark.js but finding it complicated.

This is definitely complex enough to warrant using the launch_extended_search_task. I should research:
- ProseMirror vs alternatives for this use case
- Best practices for document annotation systems
- DSLs for representing document edits
- Architecture patterns for layered document systems
- Specific solutions for scientific paper rendering (math, tables, etc.)

I don't need additional clarifying questions - they've provided enough detail about their requirements and constraints.

Perfect, I have a clear picture of your requirements. This is a complex architectural challenge that touches on document representation, annotation systems, edit tracking, and UI/UX patterns. Let me do a deep dive into the best approaches for Spideryarn.

I'll research:
- ProseMirror's suitability vs alternatives (Slate.js, Quill, custom solutions)
- Architecture patterns for layered document annotation systems
- DSL designs for efficient document edit representation
- Best practices for handling scientific paper features (math, tables, figures)
- Performance considerations for your document size range

Your Spideryarn architecture research is ready. It recommends ProseMirror with CSS Custom Highlights API for building a high-performance scientific document reader with layered annotations. The report includes framework comparisons, optimal architectural patterns, performance optimization strategies, annotation management techniques, and a phased implementation roadmap. Key findings show 5x performance improvements using modern web technologies while maintaining cross-browser compatibility.

## Sources & References

- **Original conversation:** [Claude.ai](https://claude.ai/chat/8ba32a53-2f6f-4233-afa9-c7f19e2bad35)
- **Source file:** `backup/conversations_from_claude_ai/250620/conversations.json`
- **Extraction script:** `scripts/extract-claude-conversation.ts --uuid 8ba32a53-2f6f-4233-afa9-c7f19e2bad35 --input backup/conversations_from_claude_ai/250620/conversations.json`
- **Extraction date:** 20/06/2025, 14:59:29
- **Conversation created:** 18 June 2025 at 11:15 BST
- **Total messages:** 6


## Related Work

[To be filled manually based on any resulting documentation or implementation]

