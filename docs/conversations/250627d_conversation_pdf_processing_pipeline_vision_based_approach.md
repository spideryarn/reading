# PDF Processing Pipeline: Vision-Based Approach Discussion

**Date**: 2025-06-27  
**Participants**: User (Greg), Claude Code Assistant  
**Topic**: Improving PDF to HTML conversion using vision-based LLM processing

---

## User Request

Read @docs/reference/UPLOAD_DOCUMENT_PROCESSING_PIPELINE.md @docs/reference/LLM_PROMPT_TEMPLATES.md and relevant code & docs.

We want to improve the way we are importing PDFs into HTML in various ways. The pipeline I want to try is:
- Use MuPDF js in the browser to turn the PDFs into images, one per page
- Send each page-image up to Gemini Flash 2.5 as a separate LLM call, in parallel, asking it to transcribe that page into an HTML fragment (i.e. without the outer `<html>`, `<body>` etc), and to respond with bounding boxes and `alt`-style text-descriptions for images/figures/graphs/etc. We'll need to give it very clear instructions/examples what we want the HTML to look like, e.g. which kind of styling/formatting to preserve, what classes it should use, etc. We should also give it a way to respond with comments, that we can either feed into the later-stage stitching-together model, or display to the user, as appropriate.
- Run some programmatic processing on the HTML we receive back: add our deterministic `id` to each HTML element, pull out the image-bounding-boxes and turn them into base64 to include in the HTML, add classes to each element annotating which page/column/figure/table/etc it relates to, and then stitch together all the per-page HTML-fragments together into a single valid HTML doc
- Add a follow-up call, feeding in all the page-images and/or the original PDF at once, plus the stitched-together HTML doc, probably to Claude Sonnet 4, with instructions to make any final corrections as needed (including cross-page changes, such as unifying paragraphs that span page boundaries). Here I'm not 100% certain how best to do this.
  - I'm wondering whether we could ask Claude to reply with a data structure representing its search-replace targeted-editing tool (which we would then apply programmatically afterwards, to avoid asking Claude to output the entire document afresh). This would have the advantage of allowing it to easily make character-level changes, rather than having to operate at the level of HTML elements.
  - Or we could tell Claude to use something like JSON Patch to update at the level of elements.
- Then we'll run the output through our standard HTML validation & sanitisation pipeline as normal.

Future considerations:
- How best to handle mathematical notation (probably MathJax?), PDF links, and probably lots of other things I haven't thought of.
- Allow the user to provide natural-language guidance that should be fed into the models somehow to guide their behaviour, e.g. "Ignore the References section". Though we'll need to be careful of placing boundaries on what control the user can exert, and avoid prompt injection, etc.

We'll need great evals for this.

The goal is to get the best of:
- LLM flexibility, judgment, richness, and instructability, and seeing the PDF the way a person sees it
- High accuracy (hopefully having Sonnet as a different-model check, with access to both page-images and original-PDF)
- Parallelisation for speed
- Cost-efficiency (though at the moment this is a lower priority than the above criteria)

Be in @docs/instructions/SOUNDING_BOARD_MODE.md

## Claude Assistant Response

This is a fascinating and well-thought-out approach! Let me break down the key insights and raise some important considerations for this multi-stage PDF processing pipeline.

### Core Architecture Assessment

**Strengths of your approach:**
- **Visual-first processing**: MuPDF page images capture exactly what humans see (fonts, formatting, figures)
- **Parallelization**: Per-page processing should dramatically improve speed vs sequential approaches
- **Multi-model validation**: Gemini Flash for speed/cost + Claude Sonnet for quality control is smart
- **Structured output**: Bounding boxes + alt text for figures addresses a major gap in current PDF processing

### Critical Technical Questions

#### 1. **MuPDF.js Bundle Size & Performance**
Your current pipeline uses `pdf-lib` (371KB gzipped) just for page counting. MuPDF.js will be significantly larger - have you investigated the bundle impact? Consider:
- Dynamic imports for upload pages only
- WebWorker processing to avoid blocking main thread
- Progressive rendering (process pages as they're converted)

#### 2. **Image Quality vs Token Cost Trade-offs**
Page images for Gemini will consume significant vision tokens. Key decisions:
- **Resolution**: What DPI balances text readability vs token cost?
- **Format**: PNG vs JPEG for different content types (text-heavy vs figure-heavy pages)?
- **Optimization**: Can you detect text-only pages and use lighter processing?

#### 3. **Cross-Page Context Problem**
Your biggest challenge will be elements that span pages:
- **Tables** that continue across pages
- **Paragraphs** split mid-sentence
- **Figures** with captions on different pages
- **Section headers** and their relationship to following content

How will you handle the context window for the final Claude pass? Full PDF + all page images + stitched HTML could easily exceed even Claude's large context window.

### Alternative Architecture Considerations

#### Option A: Hierarchical Processing
```
1. Gemini Flash: Page images → Raw HTML fragments
2. GPT-4V: Adjacent page pairs → Cross-page corrections  
3. Claude Sonnet: Full document → Final polish
```

#### Option B: Streaming Context Window
Process in overlapping chunks rather than full document at once, maintaining cross-page context through a sliding window approach.

#### Option C: Hybrid Text+Vision
- Use existing text extraction (PDF.js/MuPDF) for text-heavy pages
- Reserve vision models for pages with complex figures/tables
- Could dramatically reduce token costs while maintaining quality

### Implementation Concerns

#### 1. **Error Propagation**
If one page fails processing, how do you handle partial results? The parallel processing makes this more complex than sequential approaches.

#### 2. **Deterministic IDs**
You mention adding deterministic IDs - how will you ensure consistency when pages are processed in parallel and then stitched together?

#### 3. **Base64 Image Extraction**
Extracting image bounding boxes and converting to base64 - this could create massive HTML files. Consider:
- External image storage (Supabase) with references
- Lazy loading for large documents
- Compression strategies

### Cost & Performance Questions

Have you modeled the token costs? A 20-page academic paper could be:
- 20 Gemini Flash vision calls (parallel)
- 1 Claude Sonnet call with full context
- Potentially 5-10x more expensive than current text-based approaches

### Security & Validation Implications

Your final sanitization step is crucial, but the multi-stage pipeline introduces new attack vectors:
- **Prompt injection** via malicious PDF content
- **Image-based attacks** in extracted figures
- **HTML injection** from LLM responses

Consider sandbox environments for the processing pipeline.

### Strategic Questions

1. **Is this replacing the current PDF pipeline entirely, or running alongside?**
2. **What's your success criteria?** Better accuracy than current LLM approaches? Specific formatting preservation?
3. **How will you handle mathematical notation?** MathJax integration is complex and may conflict with your image-extraction approach.

### Recommendation

This pipeline has excellent potential, but I'd suggest starting with a focused prototype:

1. **Test single-page processing first** - validate image quality, token costs, and output quality
2. **Focus on one document type** - academic papers vs textbooks vs technical manuals have very different requirements  
3. **Build comprehensive evals early** - you'll need automated quality assessment to tune the pipeline

The multi-model validation approach is particularly smart - using Gemini's speed for initial processing and Claude's quality for final review could give you the best of both worlds.

What specific document types are you targeting first? And have you considered the user experience - will this be a premium processing option given the likely higher costs?

## User Follow-up

- Yes, let's consider WebWorkers and progressively processing the pages as they get rendered.

- Good point re format & optimisation. Add these as later-stage discussion points.

- Yes, let's consider adjacent page-pairs as an intermediate step between individual-pages and the all-pages stages. Add this as a later stage action. Probably Claude for this. And maybe it can do most of the corrections in this stage (which can still be parallelised). So that there's as little left to do in the very final all-pages stage as possible (since that will otherwise be slow).

- Yes, let's consider adjacent page-pairs as an intermediate step between individual-pages and the all-pages stages. Add as a later stage action. 

- For the first version, treat anything unforeseen (e.g. an individual page failure) as fatal for the whole pipeline, with clear, user-visible error messages. We'll make it more robust later.

- Let's consider Supabase Storage for images as a later-stage action. Base64 for the early stages.

- The intent is for this to replace the current PDF -> HTML pipeline, if we get it working well enough.

Transcribe this whole conversation 100% and unaltered in docs/conversations/ , using scripts/generate-sequential-datetime-prefix.ts (in a subagent) as the filename prefix.

Then write up a very rich & detailed planning doc with many stages, as per docs/instructions/WRITE_PLANNING_DOC.md