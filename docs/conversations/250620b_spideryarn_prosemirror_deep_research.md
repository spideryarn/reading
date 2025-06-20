---
Date: 18 June 2025
Duration: ~57 minutes
Type: Research Review
Status: Active
Claude URL: https://claude.ai/chat/8ba32a53-2f6f-4233-afa9-c7f19e2bad35
Related Docs: []
---

# Spideryarn & ProseMirror deep research - 18 June 2025

> **Original Claude.ai conversation:** [https://claude.ai/chat/8ba32a53-2f6f-4233-afa9-c7f19e2bad35](https://claude.ai/chat/8ba32a53-2f6f-4233-afa9-c7f19e2bad35)

## Context & Goals

[Auto-extracted from Claude.ai export - manual curation recommended]

I have a rich app for reading documents. The user won't be able to edit the contents very much (it'll be in read-only mode for much of the time), but we will offer features such as:
* exact text... I am working on a rich app for helping people to read difficult documents (<100 pages) called Spideryarn. The user won't be able to edit the contents very much (it'll be in read-only mode for much of...

## Main Discussion


### I Have A Rich App

**User:** "I have a rich app for reading documents. The user won't be able to edit the contents very much (it'll be in read-only mode for much of the time), but we will offer features such as: * exact text match in response to user query * highlight sentences that match particular themes, colouring them according to theme * comments (which could overlap) * in-line glossary for complicated terminology (they display in the document as special hyperlinks, when you hover they show a tooltip, and when you click them they open the Glossary tab for that item) * separate Table of Contents tab, and when you click a heading it scrolls the document to that section * ask an AI to update the * etc"


### I Am Working On A

**User:** "I am working on a rich app for helping people to read difficult documents (<100 pages) called Spideryarn. The user won't be able to edit the contents very much (it'll be in read-only mode for much of the time), but we will offer features such as: - Exact text match in response to user query - Highlight sentences that match particular themes, colouring them according to theme - User comments (which could overlap) - In-line glossary for complicated terminology (they display in the document as special hyperlinks, when you hover they show a tooltip, and when you click them they open the Glossary tab for that item) - Separate Table of Contents tab, and when you click a heading it scrolls the document to that section, and vice versa - Ask an AI to update the headings to be more granular (and a nice-to-have would be that you can undo this) - It would be great if you could switch to 'compact-summary' mode where it replaced all the paragraphs with a 1-sentence summary, and you could click or or hover on a summary to tooltip or reveal the full paragraph (I'm still figuring out how this should work) - etc We also need some kind of DSL or data structure for representing edits, especially in an LLM-friendly way. For example, when we import a PDF to turn it into HTML, we'll use an LLM to transcribe images of each page individually in parallel, and then a follow-up LLM call to stitch the pieces together and do final edits. So we need a way for that follow-up LLM call to specify edits to the document in a data-efficient way (i.e. not just re-outputting the whole edited document), e.g. - If a paragraph (or table, etc) spans two pages, we'll want to unify the two elements from those pages - Fix cross-page hyperlinks - etc etc We're focusing on scientific papers, so it'll need some kind of support for all the usual stuff, e.g. tables, figures (which we can just treat as images with captions for now), footnotes, mathematics, etc. I have a working v1 in Next.js, with custom 'reversible mutation edits', with Mark.js for exact text search, but it's starting to feel a bit complicated/shaky. I'm contemplating using ProseMirror for representing the document (probably in read-only mode for the user). I'm also open to other ideas, including Custom CSS Highlights API, some kind of custom data structure, some kind of React.js library, or anything else you can suggest that I haven't thought of that could work within a Next.js/TypeScript ecosystem. I care mostly about supporting modern Chrome, with Safari, mobile, Edge as nice-to-haves. ---- Ask questions to clarify requirements if you need to, raise concerns if you have them, consider the desiderata/criteria for success, suggest alternatives, weigh up options and trade-offs, consider edge cases, point out if you think I'm wrong or see a better way. Do everything you can to help the user to think this through, and make the best decision. Ultrathink, do a deep dive."

**Claude:** The user is asking about architectural decisions for a rich reading app called Spideryarn. They've outlined many features and are considering whether to use ProseMirror or other solutions. This is a complex technical question that would benefit from research about: 1. ProseMirror's capabilities for...... [Response condensed - see full context in original conversation]


### 1 Assume Under 100 Pages

**User:** "1) Assume under 100 pages, usually under 30. Probably this will be mostly desktop/iPad, though we will support mobile. Focus on single-user. 2) Yes, I think we'll want to persist edits in the database somehow. Right now, we store the original version, and then edits of different kinds (e.g. AI-generated headings), and apply them on load. But I'm open to better ways. 3) I don't 100% trust extracting text from digital PDFs, so I'm planning to turn the PDFs into a series of images, one per page, and OCR them. This also means we only have one flow, no matter what internal structure the PDF has. But if it will help, we could also feed in the whole original PDF in non-image form (ideally only to the final-edit LLM, to avoid having to send up tooooo many tokens per page). I think part of what I'm not sure about is how to think about ephemeral vs permanent and/or overlays vs structural changes, e.g. * searching for exact-match text is ephemeral/superficial, and maybe we don't want to store that on the document itself. * a user comment or glossary match is permanent, but maybe we only want to display them some of the time (e.g. when in Comments, or Glossary mode)."

**Claude:** The user has given me a complex technical problem about building a rich document reader app called Spideryarn. They've already answered my initial clarifying questions, so I have enough context to proceed. Let me analyze what they need: 1. A document viewer for scientific papers (under 100 pages,...... [Response condensed - see full context in original conversation]

## Sources & References

- Original conversation: [Claude.ai](https://claude.ai/chat/8ba32a53-2f6f-4233-afa9-c7f19e2bad35)
- Export date: 20/06/2025
- Total messages: 6


## Related Work

[To be filled manually based on any resulting documentation or implementation]

