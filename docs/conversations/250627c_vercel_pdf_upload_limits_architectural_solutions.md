# Vercel PDF Upload Limits and Architectural Solutions - June 27, 2025

---
Date: June 27, 2025
Duration: Extended conversation (multiple research phases)
Type: Problem-solving, Research Review, Decision-making
Status: Active - awaiting implementation decision
Related Docs: `docs/reference/UPLOAD_DOCUMENT_PROCESSING_PIPELINE.md`, `docs/reference/VERCEL_SERVERLESS_CONSTRAINTS.md`
---

## Context & Goals

The conversation began with a critical architectural concern: **"When we add a new document (especially when uploading), we want to make sure we're uploading the original directly to Supabase Storage (which has no upload limit), rather than to our API running on the Vercel Serverless instance, because that has c. 5MB upload limit."**

The user expected scientific users would want to handle large PDFs and was worried about system robustness, stating: **"I expect scientific users will want to deal with large PDFs. I don't care soooo much about latency, just making sure we have a robust system."**


## Key Background

### Current Architecture Problem
- **Current flow**: Browser → Vercel API Route → Process File → Store to Supabase
- **Bottleneck**: Vercel's 4.5MB hard limit for request/response payloads
- **User impact**: Academic PDFs (typically 3-10MB, up to 25MB with figures) routinely exceed this limit
- **Error**: Returns `413: FUNCTION_PAYLOAD_TOO_LARGE` when exceeded

### User Requirements
- **Robustness over latency**: **"I don't care soooo much about latency, just making sure we have a robust system"**
- **Scientific user focus**: Expected to handle complex academic PDFs with equations, figures, tables
- **File size expectations**: 10-50MB academic papers need reliable processing
- **Current deployment**: Already using Vercel Serverless Functions as their only backend infrastructure
- **Upload limits awareness**: Referenced upload limits in lib/config.ts and wanted concrete research

## Main Discovery: The Real Constraints

### Initial Need for Research Validation
The user specifically asked: **"Have you searched the web with a sub-agent regarding Vercel serverless API upload limits?"** pointing to the documentation and wanting current information beyond what was already documented.

### Initial Misconception Corrected
The conversation revealed a critical misunderstanding in the proposed architecture:

**User's initial idea**: **"I was imagining that we'd upload from browser to Supabase Storage, trigger the backend processing API, which would pull from Supabase Storage, and then proceed from there."**

**User's key assumption to verify**: **"I am assuming there's no download limit on the Vercel Serverless instance... is that right?"**

**Critical finding**: Vercel's 4.5MB limit applies to **both uploads AND downloads**. A processing function cannot download a 10MB PDF from Supabase Storage due to the same response payload limit.

### Vercel Constraints Confirmed by Research
From comprehensive web research with subagents:
- **4.5MB payload limit**: Hard constraint for both request and response
- **No workaround within Vercel**: Even Fluid Compute has the same limits
- **Memory/time sufficient**: 2-4GB memory and 5-13 minute timeouts would be adequate for processing
- **Native dependencies blocked**: Libraries like pdf2pic, canvas, sharp cannot be installed

## Alternatives Considered

### Current Implementation Analysis
The user noted: **"At the moment, the only hosting service providing backend computation we're using is Vercel Serverless Functions."** Analysis of the current PDF processing code in `app/api/upload-pdf/route.ts` revealed:
- Direct PDF processing via AI (Claude/Gemini APIs) for PDF-to-HTML conversion
- File uploads via FormData to Vercel API routes
- Storage integration through `processHtmlToDocument()` function
- **Current bottleneck**: Files hit the 4.5MB limit before any processing can occur

### Option 1: Vercel Fluid Compute Investigation
The user asked: **"If we used the Vercel Fluid Compute, would that help at all?"** Research revealed:
- **Same 4.5MB payload limits** - Fluid Compute doesn't solve the file size problem
- **Better resource efficiency** but no increase in file size capabilities
- **Cost savings** but won't enable large PDF processing

### Option 2: Supabase Edge Functions
**Research findings**:
- ✅ **No 4.5MB payload limit** (major advantage)
- ✅ **Working PDF libraries exist**: `pdf-img-convert` and dedicated Deno modules
- ✅ **Better native dependency support** than Vercel
- ✅ **20MB bundle limit, 400-second execution time**
- ❌ **Significant code rewrite required**: Cannot share code with existing Next.js codebase due to Deno vs Node.js runtime differences

**User concern about code reuse**: The user specifically asked: **"If we went with Supabase Edge Functions, how easily could we import code from the rest of our codebase? Or would we have to treat it as a completely distinct codebase?"** Research revealed that Supabase Edge Functions require "a largely separate codebase" due to Deno vs Node.js runtime incompatibilities, with the fundamental issue being that "your bundler won't understand deno as its running in node" when attempting to share files directly.

### Option 3: Client-Side Processing with MuPDF WebAssembly
**Research findings**:
- ✅ **Pixel-perfect fidelity** for mathematical equations and scientific diagrams
- ✅ **2MB WebAssembly engine** - lightweight and fast
- ✅ **Handles 50MB PDFs** with 150-250MB memory usage
- ✅ **Universal browser support** and proven academic use cases
- ✅ **Zero server constraints** - bypasses all platform limitations
- ✅ **Reuse 100% of existing codebase** - just change input from PDF to processed content

### Option 4: External Processing Services
- Commercial PDF processing APIs (PDFShift, Nutrient)
- Additional costs and vendor dependencies
- Complex webhook integration required

## Key Technical Insights

### Vercel Constraints Documentation Impact
The user specifically referenced: **"There are all kinds of constraints in @docs/reference/VERCEL_SERVERLESS_CONSTRAINTS.md that impact whether we can install libraries that will turn PDFs into images on Vercel Serverless."** This documentation revealed:
- **Native dependencies forbidden**: canvas (164MB), sharp (16MB), pdf2pic all fail deployment
- **50MB bundle limit** frequently exceeded by PDF processing libraries 
- **Bundle size analysis**: Current app at ~10.5MB, but PDF libraries would push over limits
- **Known problematic libraries**: Comprehensive list including canvas, sharp, pdfjs-dist, puppeteer, playwright

### Supabase Edge Functions vs Vercel Comparison
The user asked: **"Do those same limitations hold on Supabase Edge Functions?"** referring to the Vercel constraints. Research showed Supabase Edge Functions have:
- **More generous constraints**: 20MB bundle vs Vercel's complex size calculations
- **Working PDF ecosystem**: Actual libraries available in Deno runtime including `pdf-img-convert` and dedicated Deno modules
- **Better execution limits**: 400 seconds vs Vercel's 10-15 seconds
- **Runtime isolation challenge**: Cannot share TypeScript code between Next.js and Deno environments

### Client-Side Processing Viability
The user asked: **"Can we run pdf2pic clientside (i.e. in the browser)?"** and requested research on robust client-side PDF processing. MuPDF WebAssembly research demonstrated:
- **Academic-grade quality**: "Pixel-perfect fidelity" and "exceptional rendering quality"
- **Proven performance**: "MuPDF came out of this investigation as the clear winner"
- **Memory efficiency**: 150-250MB for 50MB PDFs on modern devices
- **Universal compatibility**: Works across all major browsers
- **Complex document handling**: Specifically tested for "complex academic PDFs with equations, figures, complex layouts"

## Decision Framework

### User's Stated Priorities
1. **System robustness** over performance optimization
2. **Scientific user support** with complex academic PDFs
3. **File size handling** up to 50MB reliably
4. **Development complexity** as a secondary concern

### Ranking by Implementation Risk
1. **Client-side processing (Lowest risk)**: Proven technology, no architectural changes
2. **Supabase Edge Functions (Medium risk)**: Requires significant code rewrite
3. **External services (Higher risk)**: Additional dependencies and costs

## Recommendations Made

### Primary Recommendation: Client-Side Processing
**Architecture**: Browser (MuPDF WASM) → Process PDF → Upload Results → Existing Server Logic

**Rationale**:
- **Zero server constraints**: Bypasses all Vercel/Supabase limitations
- **Minimal development risk**: Keep existing server architecture unchanged
- **Proven for academic content**: MuPDF designed for complex scientific documents
- **Better user experience**: Real-time progress, unlimited file sizes

### Implementation Strategy Proposed
**Phase 1**: Proof of concept with MuPDF WebAssembly on typical academic PDFs
**Phase 2**: Integration as progressive enhancement to existing upload flow
**Phase 3**: Optimization with memory management and user feedback

## Open Questions

### Technical Validation Needed
Based on the conversation, specific questions were raised that require validation:
1. **Device capability assessment**: **"What percentage of your users have devices capable of 250MB+ memory usage for PDF processing?"**
2. **Processing time acceptance**: **"Would you be comfortable with a 'this may take 30 seconds' warning for large PDFs?"**
3. **Quality validation**: **"Do you want to prototype MuPDF WASM with a few typical academic papers to validate quality?"**

### Architectural Decisions Pending
- **Fallback strategy**: How to handle older devices or processing failures?
- **Progress feedback**: Real-time progress indicators during client-side processing?
- **Memory management**: Chunked processing for extremely large files?

## Next Steps

The conversation concluded with the final question: **"What's your gut feeling about the development complexity vs. user need trade-off?"** and offering specific next steps:

Awaiting user decision on:
1. **Prototyping MuPDF WebAssembly** with representative academic PDFs
2. **Quality and performance validation** on target devices  
3. **Implementation planning** for integration with existing upload flow

The conversation ended with options to: **"1. Research the client-side processing approach in more detail? 2. Design a minimal hybrid system that reuses your existing code? 3. Map out exactly what would need to be rewritten for Edge Functions?"**

## Sources & References

### Research Sources
**Vercel Functions Limitations** ([Vercel Documentation](https://vercel.com/docs/functions/limitations)) - Official constraints documentation

**Supabase Edge Functions Constraints** - Web research via subagents revealed bundle size limits, execution times, and Deno ecosystem capabilities

**MuPDF WebAssembly Performance** - Research findings on academic PDF processing capabilities, memory requirements, and browser compatibility

**Client-Side PDF Processing Studies** - Comparative analysis of WebAssembly solutions for complex document rendering

### Internal Documentation
- `docs/reference/UPLOAD_DOCUMENT_PROCESSING_PIPELINE.md` - Updated with concrete Vercel limits and constraints
- `docs/reference/VERCEL_SERVERLESS_CONSTRAINTS.md` - Comprehensive platform limitations affecting library selection
- Current codebase analysis: `app/api/upload-pdf/route.ts`, `lib/services/html-document-processor.ts`

### Key Research Findings
- **Vercel 4.5MB limit confirmation**: Both upload and download constraints verified through official documentation
- **Deno/Node.js incompatibility**: Code sharing limitations between Supabase Edge Functions and Next.js apps
- **MuPDF academic suitability**: "Pixel-perfect fidelity" and "exceptional rendering quality" for scientific content
- **Memory requirements**: 150-250MB for 50MB PDF processing deemed "reasonable for modern devices"

## Related Work

This conversation directly informed updates to:
- Platform constraints documentation with concrete research citations
- Upload pipeline documentation with specific Vercel limitations
- Potential future implementation of client-side PDF processing component

The discussion represents a comprehensive architectural decision point affecting the core document upload functionality and platform scalability for academic users.