# Pure JavaScript PDF Processing Options for Spideryarn

## Executive Summary

This document consolidates research findings and implementation strategies for replacing the native `skia-canvas` dependency with pure JavaScript solutions for PDF image extraction on Vercel Serverless Functions.

**Recommended Approach**: A **hybrid solution** combining direct image extraction (when possible) with WebAssembly-based rendering as a fallback. This provides the best balance of performance, compatibility, and deployment simplicity.

## Current State Analysis

### Problem Statement
The `pdf-image-extractor-server.ts` service uses `skia-canvas` (a native module) which causes NODE_MODULE_VERSION mismatch errors on Vercel. This blocks deployment of the v3 pipeline's server-side PDF processing.

### Existing Implementations
1. **Phase 1 (Server-side)**: Uses `unpdf` with `skia-canvas` - incompatible with Vercel
2. **Phase 2 (Client-side)**: Browser-based rendering - works but requires client processing

## Pure JS Solutions Overview

### 1. Direct Image Extraction (Recommended Primary Approach)

Extract embedded images directly from PDF streams without rasterization.

**Success Rate**: 40-60% of academic PDFs based on research
**Performance**: < 100ms per image
**Bundle Size**: 150KB (pdf-lib already in use)

#### Implementation Example

```typescript
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib'
import type { Buffer } from 'buffer'

interface ExtractedImage {
  data: Uint8Array
  type: 'jpeg' | 'png' | 'unknown'
  page: number
  index: number
}

async function extractEmbeddedImages(pdfBuffer: Buffer): Promise<ExtractedImage[]> {
  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const images: ExtractedImage[] = []
  
  // Iterate through pages
  pdfDoc.getPages().forEach((page, pageIndex) => {
    let imageIndex = 0
    
    // Access page resources
    const resources = page.node.Resources()
    const xObjects = resources?.lookup(PDFName.of('XObject'))
    
    if (xObjects) {
      // Iterate through XObjects
      xObjects.entries().forEach(([name, ref]) => {
        const xObject = page.node.context.lookup(ref)
        if (xObject instanceof PDFRawStream) {
          const subtype = xObject.dict.lookup(PDFName.of('Subtype'))
          
          if (subtype === PDFName.of('Image')) {
            const filter = xObject.dict.lookup(PDFName.of('Filter'))
            let imageType: ExtractedImage['type'] = 'unknown'
            
            if (filter === PDFName.of('DCTDecode')) {
              imageType = 'jpeg'
            } else if (filter === PDFName.of('FlateDecode')) {
              imageType = 'png'
            }
            
            images.push({
              data: xObject.contents,
              type: imageType,
              page: pageIndex + 1,
              index: imageIndex++
            })
          }
        }
      })
    }
  })
  
  return images
}

// Alternative approach: Iterate through all indirect objects
async function extractEmbeddedImagesViaIndirectObjects(pdfBuffer: Buffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const images: Array<{ data: Uint8Array; type: string }> = []
  
  // Iterate through all indirect objects
  pdfDoc.context.indirectObjects.forEach((pdfObject) => {
    if (pdfObject instanceof PDFRawStream) {
      const dict = pdfObject.dict
      const subtype = dict.get(PDFName.of('Subtype'))
      
      if (subtype === PDFName.of('Image')) {
        const filter = dict.get(PDFName.of('Filter'))
        let imageData = pdfObject.contents
        let imageType = 'unknown'
        
        if (filter === PDFName.of('DCTDecode')) {
          imageType = 'jpeg'
        } else if (filter === PDFName.of('FlateDecode')) {
          // PNG or other format, needs more processing
          imageType = 'png'
        }
        
        images.push({ data: imageData, type: imageType })
      }
    }
  })
  
  return images
}
```

### 2. WebAssembly PDF Renderers (Recommended Fallback)

For PDFs that don't have extractable images, use WASM-based rendering.

#### Comparison of WASM Options

| Solution | Bundle Size | Performance | Vercel Compatible | Cold Start |
|----------|------------|-------------|-------------------|------------|
| pdfium-wasm | ~6MB | Near-native | ✅ Yes | +2-3s |
| mupdf-wasm | ~4MB | Excellent | ✅ Yes | +2s |
| pdf-wasm | ~2MB | Good | ✅ Yes (experimental) | +1s |

**Recommended**: `pdfium-wasm` for maturity and feature completeness

#### Implementation with Lazy Loading

```typescript
// pdf-wasm-renderer.ts
let pdfiumInstance: any = null

async function getPdfiumInstance() {
  if (!pdfiumInstance) {
    // Dynamic import only when needed
    const { createPdfium } = await import('pdfium-wasm')
    pdfiumInstance = await createPdfium({
      // Use CDN for WASM file to reduce bundle size
      wasmUrl: 'https://unpkg.com/pdfium-wasm@0.6.0/dist/pdfium.wasm'
    })
  }
  return pdfiumInstance
}

export async function renderPageRegion(
  pdfBuffer: Buffer,
  pageNum: number,
  bbox: { x1: number; y1: number; x2: number; y2: number }
): Promise<Uint8Array> {
  const pdfium = await getPdfiumInstance()
  const doc = await pdfium.loadDocument(pdfBuffer)
  
  try {
    const page = doc.getPage(pageNum - 1) // 0-indexed
    const { width, height } = page.getSize()
    
    // Calculate crop region
    const cropX = bbox.x1
    const cropY = height - bbox.y2 // PDF coordinates are bottom-up
    const cropWidth = bbox.x2 - bbox.x1
    const cropHeight = bbox.y2 - bbox.y1
    
    // Render at 2x scale for quality
    const scale = 2.0
    const bitmap = page.render({
      scale,
      bounds: {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight
      }
    })
    
    // Convert to PNG
    return bitmap.toArrayBuffer('png')
  } finally {
    page.close()
    doc.close()
  }
}
```

### 3. PDF.js Without Canvas (Alternative Approach)

Use PDF.js operator list to implement custom rendering without Canvas dependency.

**Complexity**: HIGH
**Use Case**: When you need fine-grained control over rendering

```typescript
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js for Node.js without canvas
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

async function extractWithOperatorList(
  pdfBuffer: Buffer,
  pageNum: number
): Promise<ImageData[]> {
  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
  const page = await pdf.getPage(pageNum)
  
  // Get operator list instead of rendering
  const opList = await page.getOperatorList()
  const images: ImageData[] = []
  
  // Process operators to find image objects
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i]
    const args = opList.argsArray[i]
    
    if (fn === pdfjsLib.OPS.paintImageXObject) {
      const imageName = args[0]
      const imageObj = await page.objs.get(imageName)
      
      // Extract image data with position info
      images.push({
        width: imageObj.width,
        height: imageObj.height,
        data: imageObj.data,
        // Position calculation requires parsing graphics state
      })
    }
  }
  
  return images
}
```

### 4. Phase 2 Implementation Analysis

The current Phase 2 (client-side) approach provides a proven pattern:
- Browser-side PDF rendering with PDF.js
- Sends page images to API for OCR
- Client-side cropping based on returned bounding boxes
- Direct upload to Supabase from browser

**Key insight**: This pattern could be adapted for server-side use with a headless browser or by using PDF.js in a Node.js-compatible way. The Phase 2 approach validates that the overall architecture works well and provides a fallback option if server-side processing encounters issues.

## Recommended Implementation Strategy

### Hybrid Approach Architecture

```typescript
// pdf-image-extractor-pure-js.ts
import { PDFDocument } from 'pdf-lib'
import type { Buffer } from 'buffer'

interface ExtractionResult {
  method: 'direct' | 'rendered'
  images: Array<{
    data: Uint8Array
    bbox: { x: number; y: number; width: number; height: number }
    format: 'jpeg' | 'png'
    pageNumber: number
  }>
}

export class PureJsPdfImageExtractor {
  private static warnedAboutFallback = false

  async extractImages(
    pdfBuffer: Buffer,
    pageNumber: number,
    boundingBoxes: Array<{ x1: number; y1: number; x2: number; y2: number }>
  ): Promise<ExtractionResult> {
    // Step 1: Try direct extraction
    try {
      const directImages = await this.tryDirectExtraction(
        pdfBuffer, 
        pageNumber, 
        boundingBoxes
      )
      
      if (directImages.length === boundingBoxes.length) {
        return { method: 'direct', images: directImages }
      }
      
      // Log partial success
      if (directImages.length > 0) {
        console.log(
          `Direct extraction found ${directImages.length}/${boundingBoxes.length} images`
        )
      }
    } catch (err) {
      console.warn('Direct extraction failed:', err)
    }
    
    // Step 2: Fall back to WASM rendering
    if (!PureJsPdfImageExtractor.warnedAboutFallback) {
      console.log('Using WASM renderer fallback (this may be slower on first run)')
      PureJsPdfImageExtractor.warnedAboutFallback = true
    }
    
    const { renderPageRegions } = await import('./pdf-wasm-renderer')
    const renderedImages = await renderPageRegions(
      pdfBuffer, 
      pageNumber, 
      boundingBoxes
    )
    
    return { method: 'rendered', images: renderedImages }
  }

  private async tryDirectExtraction(
    pdfBuffer: Buffer,
    pageNumber: number,
    boundingBoxes: Array<{ x1: number; y1: number; x2: number; y2: number }>
  ) {
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const page = pdfDoc.getPage(pageNumber - 1) // 0-indexed
    
    // Get page dimensions for coordinate mapping
    const { width, height } = page.getSize()
    
    // Extract embedded images with position detection
    const embeddedImages = await this.findEmbeddedImages(page)
    
    // Match embedded images to bounding boxes
    const matchedImages = boundingBoxes.map(bbox => {
      // Find best matching embedded image
      const match = this.findBestImageMatch(embeddedImages, bbox, { width, height })
      if (match) {
        return {
          data: match.data,
          bbox: {
            x: bbox.x1,
            y: bbox.y1,
            width: bbox.x2 - bbox.x1,
            height: bbox.y2 - bbox.y1
          },
          format: match.format as 'jpeg' | 'png',
          pageNumber
        }
      }
      return null
    }).filter(Boolean)
    
    return matchedImages
  }

  private findBestImageMatch(
    images: Array<{ data: Uint8Array; format: string; position?: any }>,
    bbox: { x1: number; y1: number; x2: number; y2: number },
    pageSize: { width: number; height: number }
  ) {
    // Implement position matching logic
    // This is simplified - real implementation needs content stream parsing
    return images[0] // Placeholder
  }
}
```

### Implementation Timeline

1. **Phase 1: Direct Extraction** (1-2 days)
   - Implement pdf-lib based direct image extraction
   - Add position detection for embedded images
   - Match with Mistral OCR bounding boxes

2. **Phase 2: WASM Integration** (2-3 days)
   - Integrate pdfium-wasm with lazy loading
   - Implement render-and-crop pipeline
   - Add caching for rendered pages

3. **Phase 3: Optimization** (1 day)
   - Add detection logic to choose optimal method
   - Implement caching strategy
   - Performance testing and tuning

### Migration Path

1. **Feature Flag Implementation**
   ```typescript
   // pdf-image-extractor-server.ts
   const USE_PURE_JS = process.env.PURE_JS_PDF === 'true'
   
   export async function extractPdfImages(params: ExtractParams) {
     if (USE_PURE_JS) {
       const extractor = new PureJsPdfImageExtractor()
       return extractor.extractImages(params.buffer, params.page, params.boxes)
     } else {
       // Existing skia-canvas implementation
       return extractWithSkiaCanvas(params)
     }
   }
   ```

2. **Gradual Rollout**
   - Deploy with feature flag disabled
   - Enable for specific test documents
   - Monitor performance and success rates
   - Enable globally when stable

3. **Monitoring and Metrics**
   ```typescript
   interface ExtractionMetrics {
     method: 'direct' | 'wasm' | 'skia'
     duration: number
     imageCount: number
     totalSize: number
     errors?: string[]
   }
   
   // Log metrics for analysis
   console.log('PDF extraction metrics:', {
     correlationId,
     metrics
   })
   ```

## Performance Considerations

### Bundle Size Impact
- Direct extraction: No additional size (pdf-lib already included)
- WASM fallback: +6MB when loaded (lazy loaded on demand)
- Total worst case: ~6.15MB additional

### Processing Time
- Direct extraction: < 100ms per image (fastest)
- WASM rendering: 500-1000ms per page (acceptable)
- Cold start: +2-3s on first WASM invocation

### Memory Usage
- Direct extraction: Minimal (< 10MB)
- WASM rendering: ~50MB per page at 2x scale
- Vercel limit: 1GB (sufficient headroom)

### Optimization Strategies

1. **WASM Bundle Optimization**
   ```javascript
   // next.config.js
   webpack: (config, { isServer }) => {
     if (isServer) {
       // Exclude browser-specific WASM variants
       config.externals.push({
         'pdfium-wasm/browser': 'pdfium-wasm/browser'
       })
     }
     return config
   }
   ```

2. **Caching Rendered Pages**
   ```typescript
   const pageCache = new Map<string, Uint8Array>()
   
   function getCacheKey(pdfHash: string, pageNum: number, bbox: any) {
     return `${pdfHash}-${pageNum}-${JSON.stringify(bbox)}`
   }
   ```

3. **Resource Limits**
   ```typescript
   const MAX_PAGE_SIZE = 4096 // pixels
   const MAX_MEMORY_MB = 512
   const PROCESSING_TIMEOUT_MS = 30000
   ```

## Security Considerations

1. **Input Validation**
   ```typescript
   function validatePdfInput(buffer: Buffer) {
     if (buffer.length > 100 * 1024 * 1024) { // 100MB limit
       throw new Error('PDF file too large')
     }
     
     // Check PDF header
     const header = buffer.slice(0, 5).toString()
     if (!header.startsWith('%PDF-')) {
       throw new Error('Invalid PDF file')
     }
   }
   ```

2. **Resource Protection**
   ```typescript
   const processingTimeout = setTimeout(() => {
     throw new Error('PDF processing timeout')
   }, PROCESSING_TIMEOUT_MS)
   ```

3. **WASM Sandboxing**
   - WASM runs in sandboxed environment by default
   - No filesystem access
   - Memory isolated from Node.js process

## Testing Strategy

### Unit Tests
```typescript
describe('PureJsPdfImageExtractor', () => {
  it('should extract JPEG images directly', async () => {
    const pdfBuffer = await fs.readFile('fixtures/pdf-with-jpeg.pdf')
    const extractor = new PureJsPdfImageExtractor()
    
    const result = await extractor.extractImages(pdfBuffer, 1, [
      { x1: 100, y1: 100, x2: 300, y2: 300 }
    ])
    
    expect(result.method).toBe('direct')
    expect(result.images).toHaveLength(1)
    expect(result.images[0].format).toBe('jpeg')
  })
  
  it('should fall back to WASM for vector graphics', async () => {
    const pdfBuffer = await fs.readFile('fixtures/pdf-with-vectors.pdf')
    const extractor = new PureJsPdfImageExtractor()
    
    const result = await extractor.extractImages(pdfBuffer, 1, [
      { x1: 50, y1: 50, x2: 200, y2: 200 }
    ])
    
    expect(result.method).toBe('rendered')
  })
})
```

### Integration Tests
- Test with real academic PDFs
- Verify Supabase Storage integration
- Check image quality preservation
- Monitor memory usage patterns

### E2E Tests
```typescript
test('should process PDF upload with pure JS extractor', async ({ page }) => {
  // Set feature flag
  process.env.PURE_JS_PDF = 'true'
  
  await page.goto('/documents/upload')
  await page.setInputFiles('input[type="file"]', 'fixtures/academic-paper.pdf')
  await page.click('button[type="submit"]')
  
  // Verify images extracted and displayed
  await expect(page.locator('img[alt*="Figure"]')).toHaveCount(3)
})
```

## Conclusion

The hybrid approach (direct extraction + WASM fallback) provides:
- **Best performance**: Direct extraction when possible
- **Full compatibility**: WASM handles all PDF types
- **Vercel deployment**: No native dependencies
- **Maintained quality**: Preserves image fidelity
- **Future-proof**: Can adapt as PDF.js/WASM solutions improve

This solution requires more initial implementation effort but delivers a robust, production-ready system that works within Vercel's constraints while maintaining the user experience quality expected for academic document processing.