# PDF Image Extraction Architecture

## Overview

This document describes the hybrid PDF image extraction architecture implemented for the Spideryarn Reading platform. The system extracts images from PDFs based on bounding boxes provided by AI OCR services (Mistral OCR, Gemini Native) without requiring native dependencies, ensuring compatibility with Vercel serverless deployment.

## Problem Statement

The original implementation used `skia-canvas` (a native Node.js module) for PDF rendering and image extraction. This caused NODE_MODULE_VERSION mismatch errors on Vercel due to differences between compilation and runtime environments. The solution needed to:

- Extract images from PDFs based on AI-provided bounding boxes
- Work identically on local development (Mac) and Vercel production
- Maintain acceptable performance and quality
- Support all PDF types (embedded images, vector graphics, text)

## Architecture Overview

### Three-Tier Extraction Approach

The system implements a cascading fallback strategy with three extraction methods:

1. **Direct Extraction** (Fastest, ~100ms)
   - Extracts embedded JPEG/PNG images directly from PDF XObject streams
   - No rendering required, preserves original image quality
   - Works for 40-60% of academic PDFs with embedded raster images
   - Implementation: `lib/services/pdf-image-direct-extractor.ts`

2. **@napi-rs/canvas Rendering** (Fast, ~500ms)
   - WebAssembly-based canvas implementation that works on Vercel
   - Drop-in replacement for native canvas with good performance
   - Renders PDF pages and extracts regions as images
   - Implementation: `lib/services/pdf-image-extractor-vercel.ts`

3. **Pure WASM Rendering** (Slower, ~2s)
   - Uses unpdf (libmupdf WASM) for PDF rendering
   - ImageScript for image manipulation (pure JS)
   - Universal fallback that works everywhere
   - Implementation: `lib/services/pdf-renderer-wasm.ts`

### Hybrid Orchestrator

The `PdfImageExtractorHybrid` class (`lib/services/pdf-image-extractor-hybrid.ts`) orchestrates the extraction methods:

```typescript
export interface ExtractionConfig {
  useDirectExtraction?: boolean  // Default: true
  useNapiCanvas?: boolean        // Default: true
  useWasmFallback?: boolean      // Default: true
}
```

The orchestrator:
1. Attempts direct extraction first (if enabled)
2. Falls back to @napi-rs/canvas on failure
3. Falls back to pure WASM as last resort
4. Returns extraction method used for debugging
5. Provides detailed error messages if all methods fail

## Integration Points

### Mistral OCR Processor

The Mistral OCR processor (`lib/services/mistral-ocr-pdf-processor.ts`) integrates the hybrid extractor:

```typescript
// Configure extraction method
const extractionMethod = validatedOptions.extractionMethod // 'auto', 'direct', 'napi', 'wasm', 'legacy'

// Extract image region
const regionRes = await extractPdfRegionAndUpload({
  pdfBuffer,
  documentId,
  pageNumber,
  elementId,
  bbox,  // Normalized coordinates from Mistral
  outputFormat: 'png',
  quality: 0.95,
  scale: 2
})

// Track extraction statistics
extractionStats.methods.push({
  pageIndex,
  imageId,
  method: regionRes.method,
  fallbackReason: regionRes.fallbackReason
})
```

### Upload API Endpoint

The `/api/upload-pdf` endpoint stores extraction statistics in document metadata:

```typescript
upload_metadata: {
  extraction_stats: {
    totalImages: 10,
    imagesProcessed: 9,
    imagesSkipped: 1,
    extractionMethods: {
      direct: 5,
      napiCanvas: 4,
      wasm: 0,
      failed: 1
    }
  },
  extraction_method_configured: 'auto',
  extraction_methods_used: { ... }
}
```

## Configuration

### Environment Variables

- `PDF_DIRECT_EXTRACTION` - Enable/disable direct extraction (default: true)
- `PDF_USE_NAPI_CANVAS` - Enable/disable @napi-rs/canvas (default: true)  
- `PDF_USE_WASM_FALLBACK` - Enable/disable WASM fallback (default: true)

### Next.js Configuration

The `next.config.ts` includes critical settings:

```typescript
serverExternalPackages: ['@napi-rs/canvas', 'imagescript']
```

This prevents webpack from bundling these modules, allowing runtime loading.

## Storage Integration

All extracted images are uploaded to Supabase Storage using server-side operations that bypass RLS:

- Bucket: `documents`
- Path: `extracted-images/{documentId}/{elementId}.{format}`
- Service role authentication for server operations
- Signed URLs generated for client access

## Performance Characteristics

| Method | Speed | Memory | Quality | Coverage |
|--------|-------|---------|---------|----------|
| Direct | ~100ms | Minimal | Original | 40-60% |
| @napi-rs/canvas | ~500ms | ~100MB | Excellent | 100% |
| Pure WASM | ~2s | ~200MB | Good | 100% |

## Error Handling

The system provides detailed error messages for common failures:

1. **Storage Configuration**: "The system cannot store extracted images"
2. **Extraction Failure**: "Unable to extract images from the PDF"
3. **Module Loading**: "PDF processing module error"
4. **All Methods Failed**: Detailed message with methods tried

## Deployment Considerations

### Vercel Compatibility

- No native modules in production bundle
- All dependencies are pure JS or WASM
- Bundle size within Vercel's 50MB limit
- Memory usage within 1024MB limit
- Cold start time acceptable (~3s worst case)

### Development vs Production

The same code paths work identically in:
- Local development (Mac/Linux/Windows)
- Vercel serverless functions
- Docker containers
- Any Node.js 18+ environment

## Future Enhancements

1. **Performance Optimization**
   - Implement page-level caching
   - Optimize WASM bundle size
   - Add WebWorker support for parallel extraction

2. **Quality Improvements**
   - Confidence scoring for direct extraction
   - Smart fallback based on PDF characteristics
   - Resolution adaptation based on image content

3. **Monitoring**
   - Extraction method analytics
   - Performance metrics per method
   - Success rate tracking

## Related Documentation

- [Pure JS PDF Processing Options](./PURE_JS_PDF_PROCESSING_OPTIONS.md) - Research and evaluation
- [PDF Upload Pipeline V3](./PDF_UPLOAD_PIPELINE_V3_UPGRADE.md) - Overall pipeline architecture
- [Error Handling Patterns](./ERROR_HANDLING_PATTERNS.md) - Error handling guidelines
- Planning document: `docs/planning/250710a_pure_js_pdf_image_extraction_server_side.md`