# Server-Side PDF Bounding Box Extraction for Vercel Deployment

---
Research Date: 2025-01-07
Documentation Date: 2025-01-07
Research Method: Web research on PDF processing libraries compatible with Vercel serverless constraints
Review Date: 2025-07-07
Status: Current
Related Documents: docs/planning/250706a_mistral_gemini_native_pdf_v3_pipeline.md, docs/reference/VERCEL_SERVERLESS_CONSTRAINTS.md
---

## Overview

This guide documents approaches for extracting image content from specific bounding box coordinates in PDFs using server-side processing compatible with Vercel's serverless constraints (50MB bundle limit, no native dependencies).

## Key Principles

### 1. **Pure JavaScript Solutions Only**
Native dependencies like Canvas (164MB) or Sharp (16MB) are incompatible with Vercel's serverless environment. All solutions must use pure JavaScript or WebAssembly.

### 2. **Bundle Size Consciousness**
With current deployment at ~10.5MB and Vercel's 50MB limit, libraries must be evaluated for total impact including dependencies.

### 3. **Memory and Timeout Constraints**
Solutions must work within Vercel's memory limits (1024MB Hobby, 1769MB Pro) and execution timeouts (10s Hobby, 15s Pro).

## Recommended Approach: unpdf + ImageScript

### Why This Combination

1. **unpdf** - Serverless-optimized PDF rendering
   - Zero native dependencies
   - Built specifically for edge/serverless environments
   - Uses optimized PDF.js build with inlined worker
   - ~10-15MB bundle impact

2. **ImageScript** - Pure JavaScript image manipulation
   - No Canvas or Sharp dependencies
   - WebAssembly optimized for performance
   - Simple cropping API
   - <1MB bundle impact

### Implementation Guide

#### 1. Installation
```bash
npm install unpdf imagescript
```

#### 2. Basic Implementation
```javascript
import { renderPageAsImage } from 'unpdf';
import { Image } from 'imagescript';

async function extractBoundingBoxFromPDF(pdfBuffer, pageNumber, bbox) {
  // bbox format: { x1: 0.125, y1: 0.2, x2: 0.875, y2: 0.6 } (normalized 0-1)
  
  // Render PDF page as image
  const pageImage = await renderPageAsImage(
    new Uint8Array(pdfBuffer), 
    pageNumber,
    { scale: 2 } // Higher resolution for better quality
  );
  
  // Decode image with ImageScript
  const image = await Image.decode(new Uint8Array(pageImage));
  
  // Convert normalized coordinates to pixels
  const x = Math.floor(bbox.x1 * image.width);
  const y = Math.floor(bbox.y1 * image.height);
  const width = Math.floor((bbox.x2 - bbox.x1) * image.width);
  const height = Math.floor((bbox.y2 - bbox.y1) * image.height);
  
  // Crop the bounding box region
  const cropped = image.crop(x, y, width, height);
  
  // Encode as PNG
  const outputBuffer = await cropped.encode('png');
  
  return outputBuffer;
}
```

#### 3. Advanced Implementation with Multiple Extractions
```javascript
async function extractMultipleBoundingBoxes(pdfBuffer, extractions) {
  // extractions: [{ page: 1, bbox: {...}, id: 'figure-1' }, ...]
  
  const results = [];
  
  // Group by page for efficiency
  const pageGroups = extractions.reduce((acc, item) => {
    if (!acc[item.page]) acc[item.page] = [];
    acc[item.page].push(item);
    return acc;
  }, {});
  
  for (const [pageNum, items] of Object.entries(pageGroups)) {
    // Render page once
    const pageImage = await renderPageAsImage(
      new Uint8Array(pdfBuffer), 
      parseInt(pageNum),
      { scale: 2 }
    );
    
    const image = await Image.decode(new Uint8Array(pageImage));
    
    // Extract all bboxes from this page
    for (const item of items) {
      const x = Math.floor(item.bbox.x1 * image.width);
      const y = Math.floor(item.bbox.y1 * image.height);
      const width = Math.floor((item.bbox.x2 - item.bbox.x1) * image.width);
      const height = Math.floor((item.bbox.y2 - item.bbox.y1) * image.height);
      
      const cropped = image.crop(x, y, width, height);
      const buffer = await cropped.encode('png');
      
      results.push({
        id: item.id,
        buffer,
        dimensions: { width: cropped.width, height: cropped.height }
      });
    }
  }
  
  return results;
}
```

## Common Pitfalls

### 1. **Using pdfjs-dist Directly**
**Issue**: Worker setup errors in Vercel ("Cannot find module './pdf.worker.js'")
**Solution**: Use unpdf which includes pre-configured serverless build

### 2. **Attempting Sharp for PDF Processing**
**Issue**: Sharp cannot process PDFs directly, requires poppler (licensing issues)
**Solution**: Use unpdf for PDF→image, then ImageScript for manipulation

### 3. **Canvas Dependencies**
**Issue**: Canvas adds 164MB to bundle, exceeds Vercel limits
**Solution**: Avoid libraries requiring Canvas, use pure JavaScript alternatives

### 4. **Not Handling Scale Factor**
**Issue**: Low quality extractions at default scale
**Solution**: Use scale: 2 or higher for better quality (monitor memory usage)

## Alternative Approaches Evaluated

### pdf-lib
- **Status**: ❌ Not suitable
- **Reason**: Designed for PDF creation/modification, not content extraction
- **Limitation**: Cannot extract images at specific coordinates

### pdfjs-dist + Canvas
- **Status**: ❌ Problematic on Vercel
- **Reason**: Canvas native dependencies (164MB), worker setup issues
- **Alternative**: Use unpdf which solves these issues

### Jimp
- **Status**: ✅ Viable alternative
- **Pros**: Pure JavaScript, well-maintained
- **Cons**: Slower than ImageScript, larger bundle size
- **Use case**: Fallback if ImageScript has issues

## Performance Considerations

### Memory Usage
```javascript
// Estimate memory usage
const estimateMemory = (width, height, scale) => {
  const pixels = width * height * scale * scale;
  const bytesPerPixel = 4; // RGBA
  return pixels * bytesPerPixel / (1024 * 1024); // MB
};

// Example: 2000x3000 PDF page at scale 2
// = 24MB per page image
```

### Processing Time
- PDF rendering: ~1-2s per page
- Image cropping: <100ms per operation
- Total for 20-page document: ~30s (within Vercel limits)

### Optimization Strategies
1. Process pages in parallel when extracting from multiple pages
2. Use appropriate scale factor (balance quality vs memory)
3. Cache rendered pages if extracting multiple regions
4. Stream results rather than accumulating in memory

## Implementation Checklist

- [ ] Install unpdf and imagescript dependencies
- [ ] Implement basic extraction function
- [ ] Add error handling for invalid coordinates
- [ ] Implement batch processing for multiple extractions
- [ ] Add memory usage monitoring
- [ ] Test with various PDF types and sizes
- [ ] Verify bundle size remains under 50MB
- [ ] Add appropriate logging and error messages

## Success Metrics

- Bundle size increase < 20MB
- Processing time < 30s for typical academic papers
- Memory usage < 1GB for standard operations
- Image quality suitable for reading/analysis
- Zero native dependency errors in Vercel

## Future Considerations

### When to Review This Approach
- If Vercel increases/decreases constraints
- When new pure JavaScript PDF libraries emerge
- If unpdf or ImageScript become unmaintained
- If performance requirements change significantly

### Potential Enhancements
- WebAssembly-based PDF rendering (when stable)
- Progressive rendering for large documents
- Client-side hybrid approach for very large files
- Integration with CDN for processed image caching

## Sources

**unpdf Documentation** ([UnJS](https://unjs.io/packages/unpdf/)) - Serverless PDF.js distribution optimized for edge environments

**ImageScript Repository** ([GitHub](https://github.com/matmen/ImageScript)) - Zero-dependency JavaScript image manipulation library

**Vercel Function Limits** ([Vercel Docs](https://vercel.com/docs/functions/limitations)) - Official constraints documentation

**PDF.js Serverless Issues** ([Stack Overflow](https://stackoverflow.com/questions/74282002/using-pdfjs-dist-on-vercel-serverless-function)) - Common problems and workarounds

**pdfjs-serverless** ([GitHub](https://github.com/johannschopplich/pdfjs-serverless)) - Alternative serverless PDF.js distribution

**Sharp vs Canvas vs Jimp vs ImageScript** ([npm-compare](https://npm-compare.com/canvas,imagescript,jimp,sharp)) - Performance and feature comparison

## Maintenance Notes

This guide should be reviewed when:
- Vercel updates serverless constraints (check quarterly)
- Major version updates to unpdf or ImageScript
- New PDF processing libraries enter the ecosystem
- Bundle size approaches 40MB threshold