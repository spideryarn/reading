# PDF.js Integration Guide

**Purpose**: Comprehensive guide for implementing PDF.js in Next.js applications for browser-based PDF-to-image conversion.

**Status**: ✅ Active | Last Updated: June 2025 | Version: 1.0

**Related Documentation**:
- [Vision-Based PDF Processing Pipeline](../../planning/250627c_vision_based_pdf_processing_pipeline.md) - **PRIMARY**: Active development project using this PDF.js integration
- [LLM Prompt Templates](./LLM_PROMPT_TEMPLATES.md) - For vision-based AI processing
- [Upload Pipeline](./UPLOAD_DOCUMENT_PROCESSING_PIPELINE.md) - Document processing architecture
- [Testing Browser Automation](./TESTING_BROWSER_AUTOMATION_OVERVIEW.md) - E2E testing patterns

---

## Overview

PDF.js is Mozilla's open-source JavaScript library for rendering PDF files in web browsers using HTML5 Canvas API and Web Workers. This guide covers production implementation patterns for Next.js applications, particularly for academic PDF processing.

### Key Benefits

- **No external dependencies**: Pure JavaScript solution without plugins
- **Proven reliability**: Used by Firefox and millions of web applications
- **Academic PDF support**: Handles complex layouts, fonts, and mathematical notation
- **Memory efficient**: Better than wrapper libraries for production use
- **TypeScript support**: Full type definitions available

### Architecture Overview

PDF.js uses a three-layer architecture:

1. **Core Layer**: Binary PDF parsing using Web Workers
2. **Display Layer**: Canvas rendering API for pages
3. **Viewer Layer**: Optional UI components (not used in our implementation)

## Next.js Integration

### 1. Installation

```bash
npm install pdfjs-dist
npm install --save-dev @types/pdfjs-dist
```

### 2. Worker Configuration

**Critical**: PDF.js requires a separate worker file for PDF parsing to prevent main thread blocking.

```javascript
// lib/pdf-config.ts
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - use CDN for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Alternative: Local worker (requires additional setup)
// pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/build/pdf.worker.min.mjs',
//   import.meta.url,
// ).toString();

export { pdfjsLib };
```

### 3. Next.js Configuration

```javascript
// next.config.ts
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side fallbacks for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};
```

### 4. SSR Considerations

**Critical**: PDF.js must run client-side only due to Canvas API and Worker requirements.

```typescript
// components/pdf-converter.tsx
'use client'; // Required for App Router

import dynamic from 'next/dynamic';

// For Pages Router - disable SSR
const PDFConverter = dynamic(() => import('./pdf-converter-impl'), {
  ssr: false,
  loading: () => <div>Loading PDF converter...</div>
});

export default PDFConverter;
```

## Core Implementation Patterns

### 1. PDF Loading and Validation

```typescript
// lib/utils/pdf-loader.ts
import { pdfjsLib } from '@/lib/pdf-config';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface PDFLoadResult {
  pdf: PDFDocumentProxy;
  pageCount: number;
  metadata?: any;
}

export async function loadPDF(
  source: string | ArrayBuffer | Uint8Array
): Promise<PDFLoadResult> {
  try {
    const loadingTask = pdfjsLib.getDocument(source);
    
    // Optional: Progress tracking
    loadingTask.onProgress = (progress) => {
      console.log(`Loading: ${progress.loaded}/${progress.total}`);
    };
    
    const pdf = await loadingTask.promise;
    const metadata = await pdf.getMetadata().catch(() => null);
    
    return {
      pdf,
      pageCount: pdf.numPages,
      metadata: metadata?.info
    };
  } catch (error) {
    if (error.name === 'InvalidPDFException') {
      throw new Error('Invalid PDF file format');
    } else if (error.name === 'MissingPDFException') {
      throw new Error('PDF file not found');
    } else if (error.name === 'UnexpectedResponseException') {
      throw new Error('Network error loading PDF');
    }
    throw new Error(`PDF loading failed: ${error.message}`);
  }
}
```

### 2. Page Rendering to Canvas

```typescript
// lib/utils/pdf-renderer.ts
import type { PDFPageProxy } from 'pdfjs-dist';

interface RenderOptions {
  scale: number;
  rotation?: number;
  outputScale?: number;
}

interface PageRenderResult {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  viewport: any;
}

export async function renderPageToCanvas(
  page: PDFPageProxy,
  options: RenderOptions = { scale: 1.5 }
): Promise<PageRenderResult> {
  // Calculate viewport with scale
  const viewport = page.getViewport({ 
    scale: options.scale,
    rotation: options.rotation || 0
  });
  
  // Create canvas with proper sizing
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  // Handle high-DPI displays
  const outputScale = options.outputScale || window.devicePixelRatio || 1;
  
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = Math.floor(viewport.width) + 'px';
  canvas.style.height = Math.floor(viewport.height) + 'px';
  
  // Render page to canvas
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
  };
  
  await page.render(renderContext).promise;
  
  return { canvas, context, viewport };
}
```

### 3. Image Extraction with Memory Management

```typescript
// lib/utils/pdf-to-images.ts
import { loadPDF } from './pdf-loader';
import { renderPageToCanvas } from './pdf-renderer';

interface PDFToImagesOptions {
  scale?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
  pages?: number[] | 'all';
  onProgress?: (pageIndex: number, totalPages: number) => void;
}

interface PageImageResult {
  pageIndex: number;
  base64Image: string;
  width: number;
  height: number;
}

interface PDFToImagesResult {
  pages: PageImageResult[];
  totalPages: number;
  processingTime: number;
}

export async function convertPDFToImages(
  file: File,
  options: PDFToImagesOptions = {}
): Promise<PDFToImagesResult> {
  const startTime = Date.now();
  
  // Validate browser environment
  if (typeof window === 'undefined') {
    throw new Error('PDF conversion must happen in browser environment');
  }
  
  const {
    scale = 1.5,
    format = 'png',
    quality = 0.95,
    pages = 'all',
    onProgress
  } = options;
  
  try {
    // Load PDF
    const arrayBuffer = await file.arrayBuffer();
    const { pdf, pageCount } = await loadPDF(arrayBuffer);
    
    // Determine pages to process
    const pageIndices = pages === 'all' 
      ? Array.from({ length: pageCount }, (_, i) => i + 1)
      : pages;
    
    const results: PageImageResult[] = [];
    
    // Process pages sequentially to manage memory
    for (let i = 0; i < pageIndices.length; i++) {
      const pageNumber = pageIndices[i];
      
      try {
        // Load page
        const page = await pdf.getPage(pageNumber);
        
        // Render to canvas
        const { canvas, viewport } = await renderPageToCanvas(page, { scale });
        
        // Extract image with proper cleanup
        const imageData = await extractImageFromCanvas(canvas, format, quality);
        
        results.push({
          pageIndex: pageNumber - 1, // Zero-indexed for consistency
          base64Image: imageData,
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height)
        });
        
        // Cleanup canvas immediately
        cleanupCanvas(canvas);
        
        // Report progress
        onProgress?.(i, pageIndices.length);
        
      } catch (error) {
        console.error(`Failed to process page ${pageNumber}:`, error);
        throw new Error(`Page ${pageNumber} processing failed: ${error.message}`);
      }
    }
    
    // Cleanup PDF document
    pdf.cleanup();
    pdf.destroy();
    
    return {
      pages: results,
      totalPages: pageCount,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    throw new Error(`PDF conversion failed: ${error.message}`);
  }
}

// Helper functions
async function extractImageFromCanvas(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg',
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, quality);
      resolve(dataUrl);
    } catch (error) {
      reject(new Error(`Image extraction failed: ${error.message}`));
    }
  });
}

function cleanupCanvas(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }
  canvas.width = 0;
  canvas.height = 0;
}
```

### 4. Production Component Example

```typescript
// components/pdf-image-converter.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { convertPDFToImages, type PDFToImagesOptions } from '@/lib/utils/pdf-to-images';

interface PDFImageConverterProps {
  file: File;
  options?: PDFToImagesOptions;
  onSuccess: (result: any) => void;
  onError: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export const PDFImageConverter: React.FC<PDFImageConverterProps> = ({
  file,
  options = {},
  onSuccess,
  onError,
  onProgress
}) => {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const handleConversion = useCallback(async () => {
    setIsConverting(true);
    setProgress(0);
    
    try {
      const result = await convertPDFToImages(file, {
        ...options,
        onProgress: (pageIndex, totalPages) => {
          const progressPercent = Math.round((pageIndex / totalPages) * 100);
          setProgress(progressPercent);
          onProgress?.(progressPercent);
        }
      });
      
      onSuccess(result);
    } catch (error) {
      onError(error as Error);
    } finally {
      setIsConverting(false);
      setProgress(0);
    }
  }, [file, options, onSuccess, onError, onProgress]);
  
  return (
    <div className="pdf-converter">
      {isConverting ? (
        <div className="conversion-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span>Converting PDF... {progress}%</span>
        </div>
      ) : (
        <button onClick={handleConversion} disabled={!file}>
          Convert PDF to Images
        </button>
      )}
    </div>
  );
};
```

## Performance & Memory Management

### Memory Considerations

PDF.js can consume significant memory when processing large PDFs:

- **Page Rendering**: Each page creates a full-size canvas in memory
- **Worker Memory**: PDF parsing creates additional memory overhead
- **Academic PDFs**: Complex documents with figures can use 500MB+ for 180 pages

### Best Practices

1. **Sequential Processing**: Process pages one at a time, not in parallel
2. **Immediate Cleanup**: Destroy canvases immediately after image extraction
3. **Memory Monitoring**: Monitor browser memory usage during development
4. **Progressive Enhancement**: Provide fallbacks for memory-constrained devices

```typescript
// Memory-efficient processing pattern
async function processLargePDF(file: File): Promise<void> {
  const BATCH_SIZE = 5; // Process 5 pages at a time
  
  for (let i = 0; i < totalPages; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE);
    
    // Process batch
    const batchResults = await Promise.all(
      batch.map(pageNum => processPage(pageNum))
    );
    
    // Immediate cleanup and storage
    await saveBatchResults(batchResults);
    
    // Force garbage collection opportunity
    if (window.gc) window.gc(); // Development only
  }
}
```

## Error Handling Patterns

### Common PDF.js Errors

```typescript
export class PDFProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'PDFProcessingError';
  }
}

export function handlePDFError(error: any): PDFProcessingError {
  switch (error.name) {
    case 'InvalidPDFException':
      return new PDFProcessingError(
        'The uploaded file is not a valid PDF document',
        'INVALID_PDF',
        error
      );
    
    case 'MissingPDFException':
      return new PDFProcessingError(
        'PDF file could not be found or loaded',
        'MISSING_PDF',
        error
      );
    
    case 'UnexpectedResponseException':
      return new PDFProcessingError(
        'Network error while loading PDF',
        'NETWORK_ERROR',
        error
      );
    
    case 'PasswordException':
      return new PDFProcessingError(
        'PDF is password protected',
        'PASSWORD_PROTECTED',
        error
      );
    
    default:
      return new PDFProcessingError(
        'Unknown PDF processing error',
        'UNKNOWN_ERROR',
        error
      );
  }
}
```

### Error Boundary Component

```typescript
// components/pdf-error-boundary.tsx
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class PDFErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PDF processing error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }
    
    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="pdf-error">
    <h3>PDF Processing Error</h3>
    <p>{error.message}</p>
    <button onClick={() => window.location.reload()}>
      Try Again
    </button>
  </div>
);
```

## Academic PDF Considerations

### Font Rendering

Academic PDFs often use specialized fonts that may not render correctly:

```typescript
// Enhanced rendering for academic content
const academicRenderOptions = {
  scale: 2.0, // Higher scale for better font clarity
  renderTextLayer: false, // Disable text layer for image extraction
  renderAnnotations: true, // Include annotations and markups
  intent: 'print' as const, // Use print-optimized rendering
};
```

### Mathematical Notation

PDF.js handles most mathematical notation well, but complex equations may need special handling:

- **Higher DPI**: Use scale 2.0+ for equation clarity
- **Print Intent**: Use 'print' render intent for better math rendering
- **Quality Settings**: Use PNG format for crisp mathematical symbols

### Large Academic Documents

```typescript
// Configuration for large academic PDFs
const academicPDFOptions: PDFToImagesOptions = {
  scale: 1.5, // Balance between quality and performance
  format: 'png', // Better for text and diagrams
  quality: 0.95,
  pages: 'all',
  // Custom progress handling for long documents
  onProgress: (pageIndex, totalPages) => {
    if (totalPages > 50) {
      // Show detailed progress for large documents
      updateProgressBar(pageIndex, totalPages);
    }
  }
};
```

## Testing Patterns

### Unit Testing PDF Conversion

```typescript
// __tests__/pdf-conversion.test.ts
import { convertPDFToImages } from '@/lib/utils/pdf-to-images';

// Mock PDF.js for testing
jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: jest.fn(() => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: jest.fn(() => Promise.resolve(mockPage)),
      cleanup: jest.fn(),
      destroy: jest.fn()
    })
  }))
}));

describe('PDF to Images Conversion', () => {
  it('should convert PDF pages to images', async () => {
    const mockFile = new File(['pdf content'], 'test.pdf', {
      type: 'application/pdf'
    });
    
    const result = await convertPDFToImages(mockFile, {
      scale: 1.0,
      format: 'png'
    });
    
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]).toMatchObject({
      pageIndex: 0,
      base64Image: expect.stringContaining('data:image/png'),
      width: expect.any(Number),
      height: expect.any(Number)
    });
  });
});
```

### E2E Testing with Playwright

```typescript
// e2e/pdf-conversion.spec.ts
import { test, expect } from '@playwright/test';

test('PDF conversion workflow', async ({ page }) => {
  await page.goto('/upload');
  
  // Upload PDF file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-fixtures/academic-paper.pdf');
  
  // Select vision-based processing
  await page.click('text=Vision-based AI Processing');
  
  // Submit and wait for conversion
  await page.click('button:text("Add Document")');
  
  // Verify conversion progress
  await expect(page.locator('text=Converting PDF')).toBeVisible();
  
  // Wait for completion
  await expect(page.locator('text=Processing images')).toBeVisible({
    timeout: 30000
  });
  
  // Verify successful navigation
  await expect(page).toHaveURL(/\/read\/.+/);
});
```

## Troubleshooting

### Common Issues

1. **Worker 404 Errors**
   ```
   Failed to load worker: 404 Not Found
   ```
   **Solution**: Verify worker URL configuration and ensure CDN access

2. **Memory Leaks**
   ```
   Browser becomes unresponsive with large PDFs
   ```
   **Solution**: Implement proper cleanup and sequential processing

3. **Canvas Size Limits**
   ```
   Canvas exceeded maximum size
   ```
   **Solution**: Check browser canvas limits and scale appropriately

4. **CORS Issues**
   ```
   Cross-origin request blocked
   ```
   **Solution**: Ensure PDF files are served with proper headers

### Debug Configuration

```typescript
// lib/pdf-debug.ts
export const debugConfig = {
  verbosity: 5, // Maximum PDF.js logging
  disableWorker: false, // Enable for debugging worker issues
  maxImageSize: 16777216, // 16MP canvas limit
  cMapUrl: '//unpkg.com/pdfjs-dist@4.0.379/cmaps/',
  cMapPacked: true
};

// Apply debug configuration
if (process.env.NODE_ENV === 'development') {
  pdfjsLib.GlobalWorkerOptions.verbosity = debugConfig.verbosity;
}
```

## Production Checklist

Before deploying PDF.js integration:

- [ ] **Worker configuration verified** - CDN or local worker accessible
- [ ] **Memory testing completed** - Large PDF processing validated
- [ ] **Error boundaries implemented** - Graceful failure handling
- [ ] **Progress indicators working** - User feedback during conversion
- [ ] **Academic PDF testing** - Complex documents render correctly
- [ ] **Performance monitoring** - Memory usage and processing times tracked
- [ ] **Fallback strategies** - Alternative processing methods available
- [ ] **Type safety confirmed** - All interfaces properly typed
- [ ] **E2E tests passing** - Complete workflow tested

## Related Resources

- **PDF.js Official Documentation**: https://mozilla.github.io/pdf.js/
- **NPM Package**: https://www.npmjs.com/package/pdfjs-dist
- **Canvas API Reference**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **Web Workers Guide**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API

---

**Maintenance Notes**:
- Update worker URLs when upgrading PDF.js versions
- Monitor browser compatibility for Canvas API changes
- Review memory usage patterns with new PDF.js releases
- Test academic PDF rendering quality after updates