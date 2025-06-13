# Unified Upload System with Smart Auto-Detection

## Goal

Implement a unified upload system that supports the complete 2x2 matrix of upload possibilities:
- **URL → HTML**: Extract webpage content (already exists)
- **URL → PDF**: Detect PDF URLs and download them (new)
- **PDF Upload → HTML**: Convert PDF files (already exists)  
- **HTML Upload → HTML**: Direct HTML file upload with multiple processing options (new)

The system maintains the current simple 2-tab UI ("Paste URL" and "Upload File") while adding smart auto-detection behind the scenes. For HTML uploads, users can choose between AI extraction methods or use the content "as-is" with HTML sanitization.

## Context

Currently, the system supports URL → HTML extraction and PDF Upload → HTML conversion. Users need the flexibility to:
1. Process PDF URLs without manual download
2. Upload HTML files directly for analysis
3. Choose processing options for HTML content (extraction vs as-is)
4. Maintain source metadata for document provenance

The existing upload interface has a clean 2-tab design that should be preserved while adding new capabilities transparently through content-type detection.

## References

- `app/upload/page.tsx` - Current upload interface with 2-tab design
- `app/api/upload-pdf/route.ts` - PDF processing implementation
- `app/api/extract-url/route.ts` - URL extraction implementation
- `lib/services/database/documents.ts` - Document service with metadata tracking
- `lib/utils/html-sanitizer.ts` - HTML sanitization for security
- `docs/reference/CODING_PRINCIPLES.md` - Start simple, fail fast on issues
- `docs/reference/ARCHITECTURE_DECISIONS.md` - System architecture patterns

## Principles & Key Decisions

1. **Option A: Smart auto-detection** - Keep 2-tab UI, add content-type detection behind the scenes
2. **Fail fast with helpful errors** - If PDF uploaded to URL tab or HTML to PDF tab, show clear error message suggesting correct tab
3. **HTML sanitization always applied** - For security, even "use as-is" HTML gets sanitized
4. **Metadata tracking** - Track source type (URL vs upload) and processing method in upload_metadata
5. **Start simple** - Begin with basic file type detection, add sophisticated content analysis later
6. **"Use as-is" option for HTML** - Allow HTML files to be stored with minimal processing (just sanitization)
7. **Progressive enhancement** - Add new capabilities without breaking existing workflows

## Stages & Actions

### Stage: Preparation and analysis
- [ ] Run `./scripts/sync-worktrees.ts` to pull latest changes from main
- [ ] Analyze current upload metadata structure in database
- [ ] Review existing error handling patterns in both API routes
- [ ] Document current UI flow and identify extension points

### Stage: URL → PDF detection (URL tab enhancement)
- [ ] Create utility function to detect PDF URLs from response headers
  - [ ] Add `fetchContentType` function to check Content-Type before full download
  - [ ] Handle redirects and follow location headers appropriately
  - [ ] Add timeout handling consistent with existing URL extraction
- [ ] Enhance `/api/extract-url` route to detect PDF responses
  - [ ] Check Content-Type header for 'application/pdf'
  - [ ] If PDF detected, download and redirect to PDF processing pipeline
  - [ ] Update upload_metadata to track 'url-pdf' source type
  - [ ] Add correlation logging for URL-to-PDF path
- [ ] Update URL tab UI to show appropriate processing messages
  - [ ] "Checking content type..." state
  - [ ] "Downloading PDF..." state when PDF detected
  - [ ] Update provider selection help text to mention PDF auto-detection
- [ ] Write tests for PDF URL detection edge cases
  - [ ] Direct PDF URLs
  - [ ] Redirected PDF URLs
  - [ ] Mixed content types
- [ ] Test with real PDF URLs and verify metadata tracking

### Stage: HTML file upload support (Upload tab enhancement)
- [ ] Add HTML file support to file input acceptance
  - [ ] Update file input `accept` attribute to include `.html,.htm`
  - [ ] Add HTML file type validation in upload handler
  - [ ] Update drag-and-drop file type checking
- [ ] Create new `/api/upload-html` endpoint following existing patterns
  - [ ] Accept HTML file uploads
  - [ ] Provide processing options: 'readability', 'ai-transcription', 'as-is'
  - [ ] Apply HTML sanitization for all options (security requirement)
  - [ ] Store original HTML for reprocessing capabilities
  - [ ] Track 'html-upload' source type in metadata
- [ ] Update upload tab UI for file type detection
  - [ ] Show different UI based on selected file type (PDF vs HTML)
  - [ ] Add processing method selection for HTML files
  - [ ] Update help text and file size limits for HTML
- [ ] Implement HTML processing options
  - [ ] "As-is": Minimal processing with sanitization only
  - [ ] "Readability": Apply readability extraction to uploaded HTML
  - [ ] "AI Transcription": Use LLM to extract content from HTML
- [ ] Add client-side file type detection and UI switching
- [ ] Write comprehensive tests for HTML upload processing

### Stage: Smart error handling for mismatched uploads
- [ ] Add file type detection to URL tab
  - [ ] Detect if user pastes file:// or blob: URLs
  - [ ] Show helpful error suggesting Upload tab instead
- [ ] Add URL detection to Upload tab
  - [ ] Detect if user selects .url or .webloc files
  - [ ] Show helpful error suggesting URL tab instead
- [ ] Implement cross-tab suggestion system
  - [ ] "Looks like you meant to use the other tab" messaging
  - [ ] Optional auto-switching with user confirmation
- [ ] Update error handling to be more helpful than strict
  - [ ] Follow coding principles: fail clearly with descriptive errors
  - [ ] Provide actionable next steps in error messages

### Stage: UI enhancements and polish
- [ ] Update upload page title and descriptions for new capabilities
- [ ] Add file type icons and better visual feedback
  - [ ] PDF icon for PDF files
  - [ ] HTML icon for HTML files
  - [ ] URL icon for detected PDF URLs
- [ ] Enhance loading states and progress indicators
  - [ ] Show different messages based on detected content type
  - [ ] Update spinner text for "Downloading PDF from URL..."
- [ ] Add help tooltips explaining auto-detection features
- [ ] Update accessibility labels and ARIA descriptions
- [ ] Test keyboard navigation with new features

### Stage: Metadata and tracking improvements
- [ ] **IMPORTANT: Fix inconsistent upload_source naming**
  - [ ] Rename values to be more consistent and clear:
    - 'url' → 'url_html_extraction' 
    - 'url-pdf' → 'url_pdf_download'
    - 'pdf' → 'file_pdf_upload'
    - 'html-upload' → 'file_html_upload'
  - [ ] Update all three API routes (extract-url, upload-pdf, upload-html)
  - [ ] Update type definitions and documentation
- [ ] Enhance upload_metadata schema documentation
  - [ ] Document new source types with clear naming
  - [ ] Document processing method tracking
  - [ ] Update type definitions in database.ts
- [ ] Update document service to handle new source types
  - [ ] Ensure metadata is consistently tracked across all upload paths
  - [ ] Add helper functions for source type detection
- [ ] Enhance logging and observability
  - [ ] Add correlation IDs across URL-to-PDF pipeline
  - [ ] Log content type detection and routing decisions
  - [ ] Track processing method success rates
- [ ] Add analytics events for new upload types
  - [ ] Track usage of different processing options
  - [ ] Monitor success rates for HTML "as-is" processing

### Stage: Testing and validation
- [ ] Create comprehensive test suite for unified upload system
  - [ ] Test all four upload combinations (URL→HTML, URL→PDF, PDF→HTML, HTML→HTML)
  - [ ] Test error cases and cross-tab suggestions
  - [ ] Test metadata tracking across all paths
- [ ] Use subagent to run full test suite
- [ ] Manual testing of user experience flows
  - [ ] Test drag-and-drop with different file types
  - [ ] Test URL paste with different content types
  - [ ] Verify error messages are helpful and actionable
- [ ] Test HTML sanitization security with malicious samples
- [ ] Performance testing with large HTML files

### Stage: Documentation and deployment
- [ ] Update API documentation for new endpoints
- [ ] Create user documentation for new upload capabilities
- [ ] Update help text and tooltips throughout the UI
- [ ] Add troubleshooting guide for upload issues
- [ ] Update architecture documentation with new flow diagrams

### Stage: Final review and merge
- [ ] Use subagent to follow instructions in `docs/instructions/DEBRIEF_PROGRESS.md`
- [ ] Git commit using subagent (follow `docs/instructions/DO_GIT_COMMITS.md`)
- [ ] Review with user and address any feedback
- [ ] Move planning doc to `planning/finished/`
- [ ] Final commit and merge

# Appendix A: Upload Matrix Implementation

## Complete 2x2 Upload Matrix

| Input Type | Processing Result | Implementation Status | Notes |
|------------|------------------|----------------------|-------|
| URL → HTML | Extract webpage content | ✅ Implemented | Existing extract-url API |
| URL → PDF | Download and convert PDF | 🔄 New | Auto-detect PDF URLs, download, process via PDF pipeline |
| PDF Upload → HTML | Convert PDF to HTML | ✅ Implemented | Existing upload-pdf API |
| HTML Upload → HTML | Process HTML file | 🔄 New | Multiple options: as-is, readability, AI transcription |

## Content Type Detection Flow

```typescript
// URL Tab Flow
async function handleUrlSubmit(url: string) {
  // 1. Quick HEAD request to check content type
  const contentType = await fetchContentType(url)
  
  if (contentType.includes('application/pdf')) {
    // Route to PDF processing pipeline
    return processPdfFromUrl(url)
  } else if (contentType.includes('text/html')) {
    // Route to HTML extraction pipeline
    return processHtmlFromUrl(url)
  } else {
    // Show helpful error with content type info
    throw new Error(`Unsupported content type: ${contentType}`)
  }
}

// Upload Tab Flow
function handleFileUpload(file: File) {
  if (file.type === 'application/pdf') {
    // Route to existing PDF processing
    return processPdfUpload(file)
  } else if (file.type === 'text/html') {
    // Route to new HTML processing
    return processHtmlUpload(file)
  } else {
    // Show helpful error suggesting correct tab
    throw new Error(`File type ${file.type} not supported in this tab`)
  }
}
```

# Appendix B: HTML Processing Options

## Three Processing Methods for HTML Files

### 1. Use As-Is (Minimal Processing)
- **Purpose**: Preserve original HTML structure with security sanitization
- **Process**: 
  1. Apply HTML sanitization only
  2. Extract plaintext for search indexing
  3. Store both original and sanitized versions
- **Use Case**: Pre-processed HTML files, exported documents, trusted content

### 2. Readability Extraction  
- **Purpose**: Extract main content using Mozilla Readability
- **Process**:
  1. Apply Readability algorithm to uploaded HTML
  2. Format as clean HTML
  3. Sanitize result
- **Use Case**: Complex web pages saved as HTML files

### 3. AI Transcription
- **Purpose**: Use LLM to intelligently extract and structure content
- **Process**:
  1. Send HTML to LLM for content extraction
  2. Apply provider-specific prompt templates
  3. Sanitize AI-generated result
- **Use Case**: Complex layouts, structured documents, academic papers

## HTML Upload API Design

```typescript
// New /api/upload-html endpoint
interface HtmlUploadRequest {
  file: File                    // HTML file
  processingMethod: 'as-is' | 'readability' | 'ai-transcription'
  provider?: 'claude' | 'gemini'  // For AI transcription only
  title?: string               // Optional title override
  isPublic?: boolean          // Privacy setting
}

interface HtmlUploadResponse {
  success: boolean
  document: {
    id: string
    title: string
    slug: string
    html_content: string      // Processed content
    original_content?: string // Original HTML if stored
    processing_method: string
    // ... standard document fields
  }
  processing: {
    method: string
    provider?: string
    content_size_kb: number
    processed_size_kb: number
  }
}
```

# Appendix C: Error Handling Strategy

## Smart Error Messages with Actionable Guidance

### URL Tab Errors
```typescript
// Content type detection errors
if (contentType === 'application/octet-stream') {
  return "This appears to be a binary file. If it's a PDF, try uploading it directly using the 'Upload PDF' tab instead."
}

if (contentType.includes('application/msword')) {
  return "Word documents aren't supported yet. Try converting to PDF first, then use the 'Upload PDF' tab."
}

// File path detection
if (url.startsWith('file://')) {
  return "Local file paths aren't supported. Use the 'Upload PDF' or 'Upload HTML' tab to upload files directly."
}
```

### Upload Tab Errors
```typescript
// Wrong file type with suggestions
if (file.type === 'text/plain' && file.name.endsWith('.txt')) {
  return "Text files aren't supported yet. Try the 'Paste URL' tab if this is a web address, or convert to HTML/PDF first."
}

if (file.type.includes('image/')) {
  return "Image files aren't supported directly. If this is a scanned document, try converting to PDF first."
}
```

## Validation Strategy

Following coding principles of "fail fast with helpful errors":

1. **Early Detection**: Check file types and content types as soon as possible
2. **Clear Messages**: Explain what was detected and suggest alternatives  
3. **Actionable Guidance**: Always tell users what they can do instead
4. **No Silent Failures**: Never modify or truncate user data without explicit consent

# Appendix D: Metadata Enhancement

## Extended Upload Metadata Schema

```typescript
interface UploadMetadata {
  // Existing fields
  extraction_method: string
  provider_used?: string
  upload_source: 'pdf' | 'url' | 'url-pdf' | 'html-upload'  // Extended
  processing_time_ms?: number
  file_size_bytes?: number
  model_used?: string
  
  // New fields for unified system
  content_type_detected?: string    // MIME type from detection
  original_url?: string            // For URL-to-PDF flow
  processing_method?: 'as-is' | 'readability' | 'ai-transcription'
  auto_detected?: boolean          // Whether content type was auto-detected
  cross_tab_suggestion?: boolean   // Whether user was suggested to switch tabs
}
```

## Source Type Mapping

| upload_source | Description | Detection Method |
|--------------|-------------|------------------|
| `url` | Direct HTML extraction from URL | Content-Type: text/html |
| `url-pdf` | PDF downloaded from URL | Content-Type: application/pdf |
| `pdf` | Direct PDF file upload | File.type check |
| `html-upload` | Direct HTML file upload | File.type check |

This metadata enables:
- Analytics on upload method preferences
- Debugging processing issues
- Future reprocessing with different methods
- Understanding user behavior patterns

---

This comprehensive planning document outlines the implementation of a unified upload system that maintains UI simplicity while adding powerful new capabilities through smart auto-detection and flexible processing options.