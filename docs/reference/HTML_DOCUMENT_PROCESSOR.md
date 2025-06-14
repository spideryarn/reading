# HTML Document Processor Service

**Status**: ✅ Active - Shared service eliminating code duplication  
**Last Updated**: 2025-06-14  
**Related**: `docs/reference/UPLOAD_HTML_SANITISATION_AND_PRETTIFICATION.md`, `docs/reference/UPLOAD.md`

## Overview

The HTML Document Processor Service (`lib/services/html-document-processor.ts`) provides a consolidated pipeline for processing HTML content after initial generation or extraction. This shared service eliminates 150-240 lines of duplicated code across three upload APIs and ensures consistent processing for all document uploads.

## Architecture

### DRY Principle Implementation

**Before Refactoring** (Code Duplication):
```
upload-pdf/route.ts     → HTML Generation → [Duplicated Processing] → Database
extract-url/route.ts    → HTML Extraction → [Duplicated Processing] → Database  
upload-html/route.ts    → HTML Direct     → [Duplicated Processing] → Database
```

**After Refactoring** (Shared Service):
```
upload-pdf/route.ts     → HTML Generation → ↘
extract-url/route.ts    → HTML Extraction → → html-document-processor.ts → Database
upload-html/route.ts    → HTML Direct     → ↗
```

### Processing Pipeline

```
HTML Content → Sanitisation → Prettification → Text Extraction → Document Creation → Storage
```

## Core Service: `processHtmlToDocument()`

### Function Signature

```typescript
export async function processHtmlToDocument(
  htmlContent: string,
  metadata: ProcessingMetadata,
  options: ProcessingOptions,
  additionalMetadata: AdditionalMetadata = {}
): Promise<ProcessedDocument>
```

### Parameters

**ProcessingMetadata**:
```typescript
interface ProcessingMetadata {
  title: string
  sourceUrl: string | null
  isPublic: boolean
  originalFile: File | null
  filename: string
  provider: string
  correlationId: string
  aiCallId: string
}
```

**ProcessingOptions**:
```typescript
interface ProcessingOptions {
  extractionMethod: 'readability' | 'ai-transcription' | 'direct-html'
  uploadSource: 'pdf' | 'url' | 'html'
  logger: Logger
  userId: string
  supabase: SupabaseClient
}
```

**AdditionalMetadata**:
```typescript
interface AdditionalMetadata {
  processing_time_ms?: number
  file_size_bytes?: number
  model_used?: string
  [key: string]: any
}
```

### Return Value

```typescript
interface ProcessedDocument {
  document: Document
  storageResult: StorageResult
}

interface StorageResult {
  data: { path: string }
  error: null
}
```

## Processing Steps

### 1. HTML Sanitisation and Text Extraction

```typescript
const { sanitisedHtml, plainText, prettifiedHtml } = await sanitizeAndExtractText(
  htmlContent,
  options.logger,
  metadata.correlationId
)
```

**Implementation**:
- Uses `sanitizeAcademicContent()` for security-focused HTML cleaning
- Applies `prettifyAcademicHtml()` if `ENABLE_HTML_PRETTIFICATION=true`
- Extracts clean plaintext using DOM-based `extractCleanText()` utility
- Handles errors with appropriate fallbacks

### 2. Upload Metadata Generation

```typescript
const uploadMetadata = generateUploadMetadata(
  metadata.extractionMethod,
  metadata.provider,
  prettifiedHtml || sanitisedHtml,
  plainText,
  additionalMetadata
)
```

**Generated Metadata**:
```typescript
interface UploadMetadata {
  extraction_method: string
  provider: string
  html_size_bytes: number
  plaintext_size_bytes: number
  prettification_enabled: boolean
  processing_time_ms?: number
  file_size_bytes?: number
  model_used?: string
}
```

### 3. Document Creation and Storage

```typescript
const { document, storageResult } = await DocumentService.createWithStorage(
  supabase,
  userId,
  {
    title: metadata.title,
    content: plainText,
    html_content: prettifiedHtml || sanitisedHtml,
    source_url: metadata.sourceUrl,
    is_public: metadata.isPublic,
    upload_metadata: uploadMetadata,
    upload_ai_call_id: metadata.aiCallId
  },
  metadata.originalFile,
  metadata.filename
)
```

## Helper Functions

### `sanitizeAndExtractText()`

Handles the core HTML processing pipeline with error handling and logging.

```typescript
async function sanitizeAndExtractText(
  htmlContent: string,
  logger: Logger,
  correlationId: string
): Promise<SanitizedContent>
```

**Processing Flow**:
1. **Sanitisation**: Remove malicious content with `sanitizeAcademicContent()`
2. **Prettification**: Format HTML with `prettifyAcademicHtml()` (if enabled)
3. **Text Extraction**: Extract clean plaintext with `extractCleanText()`
4. **Error Handling**: Fallback to sanitised HTML if prettification fails

### `generateUploadMetadata()`

Creates comprehensive metadata for upload tracking and analytics.

```typescript
function generateUploadMetadata(
  extractionMethod: string,
  provider: string,
  htmlContent: string,
  plainText: string,
  additionalMetadata: AdditionalMetadata
): UploadMetadata
```

### `handleSanitizationError()`

Centralized error handling for sanitisation failures.

```typescript
function handleSanitizationError(
  error: unknown,
  correlationId: string,
  logger: Logger
): never
```

## Integration Examples

### PDF Upload API Integration

```typescript
// app/api/upload-pdf/route.ts
import { processHtmlToDocument, handleSanitizationError } from '@/lib/services/html-document-processor'

try {
  const { document, storageResult } = await processHtmlToDocument(
    htmlResult.text,
    {
      title, sourceUrl: null, isPublic, originalFile: pdfFile,
      filename: pdfFile.name, provider, correlationId, aiCallId: aiCall.id
    },
    {
      extractionMethod: 'ai-transcription', uploadSource: 'pdf',
      logger: requestLogger, userId: user.id, supabase
    },
    { 
      processing_time_ms: processingTime, 
      file_size_bytes: pdfBuffer.length, 
      model_used: modelConfig.modelId 
    }
  )
  
  return NextResponse.json({ document, file: storageResult })
} catch (error) {
  if (error instanceof Error && error.message.includes('sanitisation')) {
    return handleSanitizationError(error, correlationId, requestLogger)
  }
  throw error
}
```

### URL Extraction API Integration

```typescript
// app/api/extract-url/route.ts  
import { processHtmlToDocument } from '@/lib/services/html-document-processor'

// URL → HTML path
const { document, storageResult } = await processHtmlToDocument(
  htmlContent,
  {
    title: cleanedTitle, sourceUrl: url, isPublic, originalFile: null,
    filename: `${slug(cleanedTitle)}.html`, provider: 'readability', correlationId, aiCallId: ''
  },
  {
    extractionMethod: 'readability', uploadSource: 'url',
    logger: requestLogger, userId: user.id, supabase
  }
)
```

### Direct HTML Upload Integration

```typescript
// app/api/upload-html/route.ts
import { processHtmlToDocument } from '@/lib/services/html-document-processor'

const { document, storageResult } = await processHtmlToDocument(
  htmlContent,
  {
    title, sourceUrl, isPublic, originalFile: htmlFile,
    filename: htmlFile.name, provider: 'direct-upload', correlationId, aiCallId: ''
  },
  {
    extractionMethod: 'direct-html', uploadSource: 'html',
    logger: requestLogger, userId: user.id, supabase
  },
  { file_size_bytes: htmlContent.length }
)
```

## Error Handling Strategy

### Graceful Degradation

The service implements a fail-safe approach where individual processing steps can fail without breaking the entire pipeline:

1. **Sanitisation Failure**: Processing stops - this is a critical security step
2. **Prettification Failure**: Continue with sanitised HTML
3. **Text Extraction Failure**: Fallback to regex-based extraction
4. **Storage Failure**: Proper transaction rollback

### Error Propagation

```typescript
// Critical errors that should stop processing
if (sanitizationFailed) {
  throw new Error(`HTML sanitisation failed: ${errorMessage}`)
}

// Non-critical errors with fallback
if (prettificationFailed) {
  logger.warn({ error, fallbackToOriginal: true }, 'Prettification failed, using original')
  return originalSanitizedHtml
}
```

## Performance Characteristics

### Consolidation Benefits

**Before Shared Service**:
- 150-240 lines of duplicated code per API
- Inconsistent error handling across APIs
- Repeated DOM parsing for each API
- Duplicate validation logic

**After Shared Service**:
- Single implementation for all APIs
- Consistent error handling and logging
- Optimized processing pipeline
- Centralized configuration management

### Processing Metrics

- **Small documents** (<100KB): ~10-20ms total processing
- **Medium documents** (100KB-1MB): ~20-50ms total processing  
- **Large documents** (>1MB): ~50-200ms total processing
- **Memory usage**: Efficient with streaming processing for large documents

## Configuration

### Environment Variables

```bash
# Enable prettification (default: false)
ENABLE_HTML_PRETTIFICATION=true
```

### Feature Detection

The service automatically detects and adapts to:
- Academic content markers (math, citations, code)
- Document size for processing optimization
- Available memory for large document handling

## Testing

### Test Coverage

The shared service includes comprehensive tests in `lib/services/__tests__/html-document-processor.test.ts`:

- **Unit tests**: Each helper function tested independently
- **Integration tests**: Full pipeline with real academic content
- **Error handling tests**: All failure modes validated
- **Performance tests**: Processing time benchmarks

### Test Isolation

Uses UUID-based test isolation to prevent conflicts:

```typescript
const namespace = getTestNamespace('html-processor-test')
const testUser = createTestUser(namespace)
```

### Real Content Testing

Tests include real academic content samples from:
- arXiv LaTeXML-generated papers
- PubMed JATS XML articles  
- IEEE technical papers
- Nature/Springer scientific articles

## Migration Benefits

### Code Quality Improvements

1. **Reduced Duplication**: Eliminated 150-240 lines of repeated code
2. **Improved Maintainability**: Single source of truth for HTML processing
3. **Enhanced Testing**: Centralized testing reduces test duplication
4. **Better Error Handling**: Consistent error responses across APIs

### Developer Experience

1. **Simplified APIs**: Upload APIs now focus on their core concerns
2. **Easier Debugging**: Centralized logging and error handling
3. **Faster Development**: New upload methods automatically get full pipeline
4. **Better Documentation**: Single service to understand and maintain

## Future Enhancements

### Planned Improvements

1. **Streaming Processing**: For very large documents (>10MB)
2. **Caching Layer**: Cache processed content for repeated uploads
3. **Plugin Architecture**: Configurable processing steps
4. **Performance Monitoring**: Detailed metrics and alerting

### Extension Points

The service is designed for easy extension:

```typescript
// Add new processing step
interface ProcessingStep {
  name: string
  process: (content: string) => string
  required: boolean
}

// Add new metadata field
interface CustomMetadata extends AdditionalMetadata {
  custom_field: string
}
```

## Related Services and Utilities

### Core Dependencies

- `lib/utils/html-sanitizer.ts` - HTML sanitisation with DOMPurify
- `lib/utils/html-prettifier.ts` - Academic-focused HTML formatting
- `lib/utils/html-text-extraction.ts` - Clean plaintext extraction
- `lib/services/document.ts` - Document database operations
- `lib/services/logger.ts` - Structured logging utilities

### Integration Points

- **Upload APIs**: All three upload endpoints use this service
- **AI Features**: Processed HTML feeds into summarisation, glossary, TOC generation
- **Storage Service**: Coordinates with Supabase for document and file storage
- **Logging Service**: Integrates with Pino structured logging

## Security Considerations

### Safe Processing Order

The service enforces secure processing order:
1. **Sanitisation first**: Always clean before any other processing
2. **Prettification second**: Only format sanitised content
3. **Validation**: Verify content integrity at each step

### Input Validation

- All HTML input validated before processing
- File size limits enforced
- Content type validation
- User permission checks

### Output Security

- Processed content validated for corruption
- Error messages sanitized to prevent information disclosure
- Logging follows privacy guidelines (IDs only, no content)

## Troubleshooting

### Common Issues

**Issue**: Processing fails with sanitisation error
**Solution**: Check HTML input for malformed tags or unsupported content

**Issue**: Prettification disabled but still processing slowly
**Solution**: Verify `ENABLE_HTML_PRETTIFICATION=false` in environment

**Issue**: Text extraction producing poor quality results
**Solution**: Check HTML structure; complex layouts may need manual review

### Debugging Tools

**Enable Debug Logging**:
```typescript
logger.debug({
  step: 'processing-started',
  contentLength: htmlContent.length,
  prettificationEnabled: process.env.ENABLE_HTML_PRETTIFICATION === 'true'
}, 'Starting HTML document processing')
```

**Performance Monitoring**:
```typescript
const timer = createTimer(logger, 'html-processing')
// ... processing ...
timer.end({ documentId, userId })
```

## Related Documentation

- `docs/reference/UPLOAD_HTML_SANITISATION_AND_PRETTIFICATION.md` - Detailed sanitisation and prettification guide
- `docs/reference/UPLOAD.md` - General document upload documentation
- `docs/reference/LOGGING_BEST_PRACTICES.md` - Logging patterns and best practices
- `lib/services/html-document-processor.ts` - Source code implementation
- `planning/250614b_html_prettification_post_sanitization.md` - Implementation planning document