# Document Upload and Import System

## Introduction

This document provides a comprehensive reference for the document upload and import system in Spideryarn Reading. It covers all methods of ingesting content including URL extraction, PDF upload, and the proposed HTML file upload functionality.

## See also

- `docs/reference/PDF_TO_HTML_CONVERSION_OVERVIEW.md` - Comprehensive guide for PDF to HTML conversion approaches
- `docs/reference/PDF_TO_HTML_LLM_APPROACHES.md` - LLM-based PDF processing methods currently implemented
- `docs/reference/HTML_CONTENT_PROCESSING_OVERVIEW.md` - Comprehensive HTML processing guide including URL extraction, content processing, and fidelity testing
- `docs/reference/HTML_SANITISATION_AND_PRETTIFICATION.md` - Comprehensive sanitisation and prettification guide with security and academic content preservation
- `docs/reference/HTML_CONTENT_PROCESSING_OVERVIEW.md` - Comprehensive HTML processing guide including shared processing service documentation
- `docs/reference/ENVIRONMENT_DETECTION_RUNTIME_PATTERNS.md` - Environment-aware error handling for storage RLS limitations
- `planning/finished/250606a_url_based_document_addition.md` - URL extraction feature implementation decisions
- `planning/finished/250613c_html_document_storage_and_security_implementation.md` - HTML storage and security improvements
- `app/api/upload-pdf/route.ts` - PDF upload API implementation
- `app/api/extract-url/route.ts` - URL extraction API implementation
- `lib/utils/html-sanitizer.ts` - HTML sanitization implementation for security

## Principles and Key Decisions

### Core Upload Principles

- **Store originals first**: Always preserve the original source (PDF, raw HTML) before any processing
- **Sanitization at display time**: Store raw content, sanitize only when rendering to users
- **Fail fast on errors**: No automatic fallbacks - let users choose alternative approaches
- **Academic content focus**: Prioritise preservation of complex academic formatting
- **Consistent architecture**: All upload types follow same storage and processing patterns

### Upload Approach: Option A (Smart Auto-Detection)

The system implements **Option A: Smart auto-detection with "use as-is" override**, providing:
- Automatic detection of source type and optimal processing method
- User override option to "use as-is" when auto-detection fails
- Clear error messages guiding users to alternative methods
- No forced conversions or automatic fallbacks

### Security Requirements

- **HTML sanitization is ALWAYS applied**: All HTML content is sanitized before display
- **Defense in depth**: Multiple security layers (DOMPurify + CSP headers)
- **Academic content compatibility**: Sanitization preserves equations, tables, citations
- **XSS prevention**: Comprehensive protection against script injection attacks

## Current Upload Capabilities

### 1. URL → HTML Extraction ✓ Implemented

**Input**: Web page URL  
**Output**: Extracted and sanitized HTML content  
**Methods**:
- Mozilla Readability (fast, reliable for articles)
- AI Transcription (high quality, handles complex layouts)
- AI DOM Manipulation (planned, not implemented)

**Storage**: 
- Raw HTML stored in Supabase Storage
- Processed content stored in database
- Original URL preserved for reference

### 2. PDF Upload → HTML Conversion ✓ Implemented  

**Input**: PDF file upload  
**Output**: AI-converted HTML content  
**Methods**:
- Claude 4 Sonnet (recommended for most PDFs)
- Gemini 1.5 Pro (better for longer documents)

**Storage**:
- Original PDF stored in Supabase Storage
- Converted HTML stored in database
- File metadata tracked for re-processing

## Proposed Upload Matrix (2x2)

The system should support four ingestion scenarios:

|                | **URL Input**           | **File Upload**              |
|----------------|-------------------------|------------------------------|
| **Need HTML**  | URL → HTML (current)    | HTML file → HTML (proposed)  |
| **Need PDF**   | URL → PDF (proposed)    | PDF file → HTML (current)    |

### 3. URL → PDF Download (Proposed)

**Use Case**: User provides URL to a PDF file  
**Process**:
1. Detect that URL points to PDF (Content-Type or .pdf extension)
2. Download PDF file directly
3. Process as if user uploaded the PDF
4. Store original PDF and convert to HTML

**Implementation Notes**:
- Reuse existing PDF processing pipeline
- Add PDF detection to URL extraction endpoint
- Handle large file downloads with progress tracking

### 4. HTML File Upload (Proposed)

**Use Case**: User has local HTML file to import  
**Process**:
1. Accept HTML file upload (similar to PDF interface)
2. Store original HTML file
3. Apply sanitization for display
4. No conversion needed - use as-is

**Implementation Notes**:
- Extend upload interface to accept .html/.htm files
- Store in same pattern as PDF uploads
- Apply same sanitization as URL-extracted HTML

## Upload Processing Pipeline

### General Flow

```
1. Input Validation
   - Check file size limits
   - Validate file type/URL format
   - Authenticate user

2. Original Storage
   - Store raw input (PDF/HTML)
   - Generate storage path
   - Track upload metadata

3. Content Processing
   - Extract/convert content
   - Apply appropriate method
   - Handle errors gracefully

4. Shared HTML Processing Pipeline
   - HTML Sanitization (DOMPurify with academic config)
   - HTML Prettification (js-beautify, feature flag controlled)
   - Text Extraction (DOM-based clean extraction)
   - Upload Metadata Generation

5. Database Storage
   - Create document record
   - Link to storage path
   - Save processed content

6. Response
   - Return document details
   - Redirect to viewer
   - Show clear errors
```

### Shared Processing Service

All upload APIs (upload-pdf, extract-url, upload-html) use the shared HTML processing pipeline provided by `lib/services/html-document-processor.ts`. This eliminates code duplication and ensures consistent processing:

- **DRY Architecture**: Single implementation for post-HTML processing
- **Consistent Security**: Uniform sanitisation across all upload methods
- **Feature Parity**: All uploads get prettification, logging, and error handling
- **Maintainability**: Changes to processing logic apply to all upload types

### File Size Limits

Current limits are centralized in `lib/config.ts` under `UPLOAD_LIMITS`:

#### PDF Upload Limits
- **Storage limit**: 50MB (Supabase free tier maximum)
- **Claude API processing**: 32MB (Anthropic's file upload limit)
- **Gemini API processing**: 20MB (Google's direct API limit, 37% smaller than Claude)
- **Gemini File API**: 2GB (temporary storage for 48 hours, requires additional API calls)
- **Page limit**: 100 pages maximum (business rule to prevent excessive processing)

**References**:
- [Supabase Storage Limits](https://supabase.com/docs/guides/storage/limits) - Free tier: 50MB per file
- [Anthropic Claude API Limits](https://docs.anthropic.com/en/docs/build-with-claude/vision#file-size-and-types) - 32MB for PDF processing
- [Google Gemini API Limits](https://ai.google.dev/gemini-api/docs/file-prompting) - 20MB direct, 2GB via File API

#### HTML Content Limits
- **URL extraction**: 500KB (optimized for LLM token limits and web performance)
- **HTML file uploads**: 10MB (generous for academic papers with embedded content)
- **Sanitizer memory protection**: 50MB academic content, 10MB user content (internal limits)

**Platform Constraints**:
- **Vercel API routes**: 4.5MB hard limit for request/response payloads (affects current implementation)
  - **Error**: Returns `413: FUNCTION_PAYLOAD_TOO_LARGE` when exceeded
  - **Source**: [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations)
  - **Impact**: Academic PDFs (3-10MB typical) routinely exceed this limit
  - **Memory limits**: 2GB (Hobby), 4GB max (Pro/Enterprise) - sufficient for processing
  - **Execution time**: 5min (Hobby), 13min (Pro/Enterprise) - sufficient for processing
  - **Download limits**: No bandwidth limits for outbound requests from functions
- **Critical constraint**: The 4.5MB response limit also prevents downloading large files within Vercel functions for processing
- **Solution**: Direct browser-to-Supabase uploads bypass Vercel's API route limits entirely
- **Supabase Storage**: 50MB file limit (free tier), resumable uploads >6MB using TUS protocol

#### Typical File Sizes
Based on research for 100-page PDF limit:
- **Text-only academic papers**: 3-10MB
- **Papers with figures/images**: 10-25MB  
- **Scanned documents**: 50MB+ (may hit limits)
- **Web pages (HTML)**: 100KB-2MB typical, 500KB+ for complex sites

### Error Handling

**No Automatic Fallbacks Policy**:
- When Readability fails → Return error with suggestion to try AI transcription
- When size limits exceeded → Clear error message with limits
- When JavaScript required → Hard error, no processing
- When PDF detected at URL → Suggest using PDF download (when implemented)

## Metadata Tracking

All uploads track comprehensive metadata:

```typescript
interface UploadMetadata {
  extraction_method: 'readability' | 'ai-transcription' | 'direct-upload'
  provider_used?: 'claude' | 'gemini' | null
  upload_source: 'url' | 'pdf' | 'html'
  processing_time_ms?: number
  file_size_bytes?: number
  model_used?: string
  // HTML processing metadata
  html_size_bytes: number
  plaintext_size_bytes: number
  prettification_enabled: boolean
  // URL-specific
  content_size_kb?: number
  extracted_size_kb?: number
  // Future fields
  original_format?: 'pdf' | 'html'
  conversion_quality?: 'high' | 'medium' | 'low'
}
```

## Security Implementation

### HTML Sanitization Configuration

```typescript
// Academic content-aware sanitization
const ACADEMIC_CONFIG = {
  USE_PROFILES: { 
    mathMl: true,    // Mathematical equations
    svg: true,       // Scientific diagrams
    html: true       // Standard HTML
  },
  ADD_TAGS: [
    'figure', 'figcaption',  // Academic figures
    'cite', 'blockquote',    // Citations
    'math', 'mi', 'mo',      // Math notation
    // ... comprehensive academic tags
  ],
  FORBID_TAGS: ['script', 'object', 'embed'],
  FORBID_ATTR: ['onclick', 'onerror', 'onload']
}
```

### Content Security Policy

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
```

## Implementation Patterns

### Storage Path Conventions

- **PDFs**: `{document-uuid}/{original-filename.pdf}`
- **HTML from URLs**: `{document-uuid}/{domain-and-path-slugified.html}`
- **Proposed HTML uploads**: `{document-uuid}/{original-filename.html}`

### API Endpoints

- `POST /api/upload-pdf` - PDF file upload
- `POST /api/extract-url` - URL content extraction
- `GET /api/documents/[slug]/original` - Download original file
- **Proposed**: `POST /api/upload-html` - HTML file upload

### Frontend Interface

Current unified "Add Document" page (`/upload`) supports:
- Radio selection between URL and PDF upload
- Extraction method selection (for URLs)
- Provider selection (Claude vs Gemini)
- Drag-and-drop for file uploads

Proposed additions:
- Accept .html/.htm in file picker
- Auto-detect PDF URLs and handle appropriately
- "Use as-is" option for HTML files

## Future Enhancements

### Near-term Improvements

1. **HTML File Upload**
   - Extend file picker to accept HTML
   - Apply same sanitization pipeline
   - Store original and processed versions

2. **URL → PDF Download**  
   - Detect PDF URLs automatically
   - Download and process as uploaded PDF
   - Handle large files with progress

3. **Re-processing Capability**
   - UI to re-process stored originals
   - Try different extraction methods
   - Update existing documents

### Long-term Possibilities

- Browser automation for JavaScript-heavy sites
- Batch upload for multiple documents
- Import from cloud storage services
- Automatic format detection and routing

## Troubleshooting

### Common Issues

**"Readability extraction failed"**
- Some websites have non-standard markup
- Try AI Transcription method instead
- Check if site requires JavaScript

**"Content too large"**
- HTML content exceeds 500KB limit
- Try finding a more specific URL
- Consider saving page as PDF first

**"Sanitization removed content"**
- Rare issue with unusual markup
- Report specific examples for tuning
- Original is preserved for debugging

**"Upload storage failed"**
- **Local Development**: Expected due to missing RLS policies (see Environment Detection below)
- **Cloud/Production**: Usually temporary Supabase issue or configuration problem  
- Document created without original in both cases
- Can be manually corrected once storage is available

### Environment-Aware Storage Handling ✓

**Local Development Limitations**:
- Storage RLS policies don't work in local Supabase (known limitation)
- File uploads fail gracefully with warning logs, document creation succeeds
- Original files not stored, but processing and content extraction work fully

**Cloud/Production Behavior**:
- Storage RLS policies active (requires migration `20250615140000_add_storage_rls_policies.sql`)
- Storage failures surface as user-facing errors (unexpected problems)
- Full original file storage and retrieval functionality

See `docs/reference/ENVIRONMENT_DETECTION.md` for complete environment detection patterns.

## Appendix

### Supported Academic Publishers

Tested extraction compatibility:
- arXiv (LaTeXML output)
- PubMed Central (JATS XML)
- IEEE Xplore
- ACM Digital Library
- JSTOR
- ScienceDirect
- Nature/Springer

### Security Test Cases

Sanitization handles:
- Script injection attempts
- Event handler attacks  
- Malicious iframes
- JavaScript protocol URLs
- SVG-based XSS
- Nested payload attempts

### Performance Benchmarks

Typical processing times:
- Readability extraction: 50-400ms
- AI transcription: 10-30 seconds
- PDF conversion: 15-45 seconds
- HTML sanitization: 5-15ms
- HTML prettification: 7-10ms
- Text extraction: 2-5ms
- Storage upload: 1-5 seconds

**Note**: HTML processing overhead (sanitisation + prettification + text extraction) averages <25ms total.