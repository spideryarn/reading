# Web Workers Best Practices

This document outlines best practices for implementing and bundling web workers in modern JavaScript applications, with specific guidance for Next.js projects and third-party library integration like PDF.js.

## See also

- `lib/pdf-config.ts` - PDF.js worker configuration implementation for this project
- `lib/utils/pdf-to-images.ts` - PDF.js usage with web workers for document processing
- `next.config.ts` - webpack configuration for web worker support
- [Webpack 5 Web Workers Guide](https://webpack.js.org/guides/web-workers/) - official webpack documentation
- [MDN Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) - comprehensive API reference

## Principles and Key Decisions

### Core Security Principle
**Web workers must be served from the same origin** due to browser security restrictions. Cross-origin workers are not supported by browsers, and CORS headers will not resolve this limitation.

### Performance First
Use web workers to offload computationally expensive tasks (like PDF parsing, image processing, or data transformation) to background threads, preventing main thread blocking.

### Modern Bundler Integration
Leverage native webpack 5 support for web workers rather than deprecated loaders or manual workarounds.

## Worker Implementation Patterns

### Modern Webpack 5 Syntax (Recommended)

```javascript
// ✅ Recommended: Use import.meta.url for bundler optimization
const worker = new Worker(new URL('./worker.js', import.meta.url));
```

This approach allows bundlers to:
- Automatically create separate bundles for workers
- Perform safe optimizations like file renaming
- Resolve paths relative to the importing module

### Legacy Approach (Avoid)

```javascript
// ❌ Deprecated: String paths don't work with webpack 5
const worker = new Worker('/path/to/worker.js'); // Won't bundle correctly
```

## Third-Party Library Worker Configuration

### PDF.js Worker Setup

When integrating libraries like PDF.js that require web workers, you have two main approaches:

#### 1. Local Hosting (Recommended)

```javascript
// Copy worker file to public directory
// cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/

import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
```

**Benefits:**
- Same-origin compliance (required for security)
- Reliable loading without network dependencies
- Better performance (no DNS resolution, connection setup)
- Enhanced security (no third-party code injection risk)

**Considerations:**
- Requires copying worker files during build process
- Increases bundle size slightly
- Need to update worker files when library updates

#### 2. CDN Approach (Not Recommended)

```javascript
// ❌ Problematic for production
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
```

**Why to avoid:**
- Cross-origin restrictions may cause failures
- Security vulnerabilities (CDN compromise risk)
- Performance overhead (DNS, connection, SSL handshake)
- Browser cache partitioning reduces caching benefits

## Build Configuration Best Practices

### Next.js Configuration

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
      };
    }
    return config;
  },
};
```

### Automated Worker File Management

Consider adding build scripts to automatically copy worker files:

```json
{
  "scripts": {
    "copy-workers": "cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/",
    "prebuild": "npm run copy-workers",
    "predev": "npm run copy-workers"
  }
}
```

## Security Considerations

### Content Security Policy (CSP)

Ensure your CSP allows web worker execution:

```javascript
// CSP header configuration
"script-src 'self' 'unsafe-eval'" // unsafe-eval required for workers
"worker-src 'self'" // Explicitly allow same-origin workers
```

### Third-Party Code Injection

**Risk:** Compromised CDNs can inject malicious code with full client-side privileges.

**Mitigation:** Host all worker files on your own domain and verify integrity of copied files.

## Performance Optimization

### Worker Lifecycle Management

```javascript
class WorkerManager {
  constructor() {
    this.worker = null;
  }
  
  createWorker() {
    if (this.worker) return this.worker;
    this.worker = new Worker(new URL('./worker.js', import.meta.url));
    return this.worker;
  }
  
  destroyWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
```

### Thread Pool Considerations

- **Don't overuse workers:** Boot overhead exists for each worker instance
- **Limit concurrent workers:** Generally 2-4 workers for CPU-intensive tasks
- **Minimize data transfer:** Large object transfers between main and worker threads are expensive

## Common Pitfalls and Solutions

### Cross-Origin Worker Workaround

If you absolutely need cross-origin functionality (rare cases):

```javascript
// Fetch and create blob URL (limited browser support)
async function createCrossOriginWorker(url) {
  const response = await fetch(url);
  const blob = new Blob([await response.text()], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}
```

**Note:** This approach has limited browser support and security implications.

### Webpack Variable Limitation

```javascript
// ❌ Variables not supported in webpack 5
const workerPath = './worker.js';
const worker = new Worker(new URL(workerPath, import.meta.url)); // Fails

// ✅ Literal paths required
const worker = new Worker(new URL('./worker.js', import.meta.url)); // Works
```

## Status Indicators

- Web Worker API ✓ **Implemented** - Core functionality working
- Webpack 5 native support ✓ **Implemented** - Using modern syntax
- PDF.js worker integration ✓ **Implemented** - Local hosting approach
- CDN fallback ⚠️ **Deprecated** - Removed due to security/reliability concerns

## Troubleshooting

### Common Error: "Failed to fetch dynamically imported module"

**Symptoms:** Worker fails to load with network error
**Cause:** Incorrect worker path or cross-origin restrictions
**Solution:** Verify worker file exists in public directory and path is correct

### Build Errors with Worker Imports

**Symptoms:** Webpack compilation failures
**Cause:** Node.js-specific imports in worker context
**Solution:** Configure webpack fallbacks for browser environment

### Worker Not Terminating

**Symptoms:** Memory leaks or performance degradation
**Cause:** Workers not properly terminated
**Solution:** Implement proper cleanup in component unmount or application exit

## Future Considerations

### Service Workers vs Web Workers

- **Web Workers:** For computational tasks (PDF processing, data transformation)
- **Service Workers:** For network caching and offline functionality
- **Shared Workers:** For shared state between multiple tabs (rare use case)

### Module Workers (Experimental)

```javascript
// Future syntax (limited browser support as of 2024)
const worker = new Worker(new URL('./worker.js', import.meta.url), {
  type: 'module'
});
```

This allows ES modules in workers but requires careful browser compatibility testing.

## Appendix

### Example Worker Implementation

```javascript
// worker.js
self.onmessage = function(e) {
  const { data, taskId } = e.data;
  
  try {
    // Perform expensive computation
    const result = processLargeDataset(data);
    
    // Send result back to main thread
    self.postMessage({
      taskId,
      success: true,
      result
    });
  } catch (error) {
    self.postMessage({
      taskId,
      success: false,
      error: error.message
    });
  }
};
```

### Build Script for Worker Management

```bash
#!/bin/bash
# scripts/copy-workers.sh
set -e

echo "Copying web worker files..."

# PDF.js worker
if [ -f "node_modules/pdfjs-dist/build/pdf.worker.min.mjs" ]; then
  cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
  echo "✅ PDF.js worker copied"
else
  echo "❌ PDF.js worker not found - run npm install"
  exit 1
fi

echo "Worker files ready"
```