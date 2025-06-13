# HTML Sanitization for Academic Content: Security and Preservation Guide

This document provides comprehensive guidance on HTML sanitization approaches for academic content, balancing strong XSS protection with preservation of complex scholarly material including mathematical notation, scientific figures, and publisher-specific formatting.

## See also

- `docs/reference/CODING_PRINCIPLES.md` - Development principles emphasizing security and early error detection
- `docs/reference/ARCHITECTURE_DECISIONS.md` - Key architectural decisions including security considerations
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Template system for AI-generated content that may require sanitization
- `docs/reference/AUTHENTICATION_SECURITY.md` - Broader security practices and troubleshooting
- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) - Industry standard XSS prevention guidance
- [DOMPurify GitHub Repository](https://github.com/cure53/DOMPurify) - Leading HTML sanitization library documentation
- [NISO JATS Standard](https://jats.niso.org/) - XML standard used by academic publishers like PMC

## Key Security Principles

### Defense in Depth Approach
HTML sanitization should be part of a layered security strategy combining:
- **Input validation and sanitization** (primary defense)
- **Content Security Policy (CSP)** (secondary protection)
- **Trusted Types API** (emerging standard, where supported)
- **Server-side validation** (critical security boundary)

### Academic Content Considerations
Academic content presents unique challenges requiring specialized sanitization approaches:
- **Mathematical notation** (MathML, LaTeX-rendered HTML)
- **Complex table structures** (data tables with colspan/rowspan)
- **Scientific figures and captions** with publisher-specific markup
- **Citation formatting and cross-references**
- **Multi-column layouts** and academic typography

## Library Comparison and Recommendations

### Primary Recommendation: DOMPurify

**Current Status**: ✓ **Industry Leader** (2024-2025)
- **Market adoption**: 9.9M weekly downloads, 15.2K GitHub stars
- **Performance**: Optimized for speed with minimal computational overhead
- **Security**: Actively maintained by security experts, regularly updated for new vulnerabilities
- **Academic content support**: Native MathML and SVG support
- **Browser compatibility**: Modern browsers (Firefox 17+, IE10+, Chrome)

**Configuration for Academic Content**:
```typescript
import DOMPurify from 'dompurify';

const academicConfig = {
  USE_PROFILES: { 
    mathMl: true,    // Enable MathML for mathematical notation
    svg: true,       // Enable SVG for scientific diagrams
    html: true       // Enable standard HTML tags
  },
  ADD_TAGS: [
    'semantics',     // For MathML semantic markup
    'annotation',    // Mathematical annotations
    'annotation-xml' // XML-based mathematical annotations
  ],
  ADD_ATTR: [
    'colspan',       // Table column spanning
    'rowspan',       // Table row spanning
    'data-*'         // Publisher-specific data attributes
  ]
};

const sanitized = DOMPurify.sanitize(content, academicConfig);
```

### Alternative Options

**sanitize-html**:
- **Use case**: Maximum customization requirements
- **Performance**: Slightly slower due to extensive customization options
- **Downloads**: 2.9M weekly, mature but less actively developed
- **Recommendation**: Consider for projects requiring fine-grained control over allowed elements

**js-xss**:
- **Use case**: Lightweight, simple implementation
- **Performance**: Fast but less comprehensive security coverage
- **Downloads**: 2.9M weekly
- **Recommendation**: Avoid for academic content due to limited customization

## Academic Content Preservation Strategies

### Mathematical Notation Security

**MathJax/LaTeX Vulnerabilities** (Historical Context):
- **CVE-2018-1999024**: XSS in MathJax \unicode{} macro (fixed in v2.7.4+)
- **CSS Injection**: GitHub MathJax rendering allows arbitrary CSS injection
- **Best Practice**: Always use latest MathJax versions and sanitize LaTeX input

**Secure Mathematical Content Configuration**:
```typescript
// For MathML preservation
const mathMLConfig = {
  USE_PROFILES: { mathMl: true },
  ALLOWED_TAGS: [
    'math', 'mrow', 'mi', 'mn', 'mo', 'mfrac', 'msub', 'msup',
    'msubsup', 'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd'
  ]
};
```

### Publisher-Specific HTML Patterns

**arXiv HTML Papers**:
- Uses LaTeXML conversion to HTML5 with MathML
- Common patterns: nested `<div>` structures for sections, figure captions
- Error handling: Graceful degradation when LaTeX packages unsupported

**IEEE/ACM Content**:
- Structured with semantic HTML5 elements
- Complex table formatting for data presentation
- Citation linking through specific class names

**Configuration Example**:
```typescript
const publisherConfig = {
  ALLOWED_TAGS: [
    'article', 'section', 'header', 'nav', 'main', 'aside', 'footer',
    'figure', 'figcaption', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th'
  ],
  ALLOWED_ATTR: [
    'class',      // Semantic styling
    'id',         // Section linking
    'data-doi',   // Citation metadata
    'data-ref'    // Cross-references
  ]
};
```

## Performance Considerations

### Benchmark Data (2024)

**DOMPurify Performance Characteristics**:
- **Small content** (chat messages, comments): Excellent performance
- **Medium content** (document sections): Efficient processing
- **Large documents** (full academic papers): Synchronous blocking can be problematic

**Performance Optimization Strategies**:

1. **Web Worker Implementation**:
```typescript
// main-thread.ts
const worker = new Worker('/sanitization-worker.js');
worker.postMessage({ html: largeDocument });
worker.onmessage = (e) => {
  const sanitizedContent = e.data.result;
  // Use sanitized content
};

// sanitization-worker.js
importScripts('/node_modules/dompurify/dist/purify.min.js');
self.onmessage = (e) => {
  const result = DOMPurify.sanitize(e.data.html, academicConfig);
  self.postMessage({ result });
};
```

2. **Chunked Processing**:
```typescript
async function sanitizeLargeDocument(html: string): Promise<string> {
  const chunks = splitIntoChunks(html, 50000); // 50KB chunks
  const sanitizedChunks = [];
  
  for (const chunk of chunks) {
    sanitizedChunks.push(DOMPurify.sanitize(chunk, academicConfig));
    await new Promise(resolve => setTimeout(resolve, 0)); // Yield control
  }
  
  return sanitizedChunks.join('');
}
```

## Alternative Security Approaches

### Content Security Policy (CSP)

**Academic Content CSP Configuration**:
```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' https://cdnjs.cloudflare.com/ajax/libs/mathjax/;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  object-src 'none'
```

**SVG and MathML Considerations**:
- SVG in `<img>` tags cannot execute JavaScript (inherently safer)
- MathML requires `data:` URLs for inline content (security trade-off)
- **Best Practice**: Serve academic media from trusted origins when possible

### iframe Sandboxing

**Sandboxed Academic Content**:
```html
<iframe 
  src="/academic-content.html" 
  sandbox="allow-same-origin"
  style="width: 100%; height: 600px;">
</iframe>
```

**Security Benefits**:
- Complete isolation from parent page
- JavaScript execution disabled by default
- Same-origin policy restrictions
- **Limitation**: Reduced functionality, poor user experience for interactive content

### Trusted Types API

**Implementation** (🚧 **Emerging Standard**):
```typescript
// Create policy for academic content
const academicPolicy = trustedTypes.createPolicy('academic-content', {
  createHTML: (input: string) => {
    return DOMPurify.sanitize(input, academicConfig);
  }
});

// Use trusted types
element.innerHTML = academicPolicy.createHTML(untrustedHTML);
```

**Browser Support**: Limited (Chromium-based browsers), use as progressive enhancement

## Server-Side vs Client-Side Considerations

### Server-Side Sanitization

**Advantages**:
- Security boundary that cannot be bypassed
- Consistent parsing environment
- Better for SEO and accessibility

**Challenges for Academic Content**:
- **Parser discrepancies**: Server and browser HTML parsing differences
- **Performance**: Processing large academic documents server-side
- **Maintenance**: Must keep sanitization libraries updated across environments

### Client-Side Sanitization

**Advantages**:
- Consistent with browser rendering engine
- Better performance for interactive features
- Real-time feedback for content editors

**Security Limitations**:
- Can be bypassed by disabling JavaScript
- Should never be the only security measure
- **Academic Use Case**: Suitable for user-generated content preview

### Recommended Hybrid Approach

```typescript
// Server-side (primary security boundary)
async function processAcademicDocument(html: string): Promise<string> {
  // Strict server-side sanitization
  const serverSanitized = await sanitizeServerSide(html);
  return serverSanitized;
}

// Client-side (user experience enhancement)
function enhanceAcademicContent(html: string): string {
  // Additional client-side processing for interactivity
  return DOMPurify.sanitize(html, {
    ...academicConfig,
    ADD_ATTR: ['onclick', 'onload'] // More permissive for UX
  });
}
```

## Real-World Case Studies

### arXiv HTML Initiative (2023-2024)

**Challenge**: Converting 90% TeX submissions to accessible HTML
**Solution**: LaTeXML conversion with MathML for mathematical content
**Security Approach**: XML-based storage (JATS) with structured validation
**Outcome**: Improved accessibility for screen readers and mobile devices

**Lessons Learned**:
- Graceful degradation essential when conversion fails
- Mathematical content requires specialized handling
- Publisher-specific packages need individual support

### PubMed Central (PMC)

**Challenge**: Biomedical content with complex figures and data tables
**Solution**: NISO JATS XML standardization with validation pipelines
**Security Approach**: XML schema validation + content sanitization
**Scale**: 10+ million full-text articles

**Implementation Pattern**:
- Convert all content to standardized JATS XML
- Validate against schema before storage
- Generate HTML views from trusted XML source

### Academic Platform Vulnerabilities (2024)

**RedCAP Research Platform**: XSS vulnerabilities (CVE-2024-37394, CVE-2024-37395, CVE-2024-37396)
- **Impact**: Exposed research data across universities
- **Root Cause**: Insufficient input sanitization in research forms
- **Mitigation**: Updated sanitization + CSP implementation

## Implementation Recommendations

### For Spideryarn Reading

**Immediate Implementation**:
```typescript
// lib/security/html-sanitizer.ts
import DOMPurify from 'dompurify';

export const sanitizeAcademicContent = (html: string): string => {
  const config = {
    USE_PROFILES: { mathMl: true, svg: true, html: true },
    ADD_TAGS: ['semantics', 'annotation', 'annotation-xml'],
    ADD_ATTR: ['colspan', 'rowspan', 'data-*'],
    FORBID_TAGS: ['script', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick']
  };
  
  return DOMPurify.sanitize(html, config);
};
```

**CSP Header**:
```http
Content-Security-Policy: 
  default-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  script-src 'self';
  object-src 'none'
```

**Performance Optimization**:
- Use Web Workers for documents > 100KB
- Implement sanitization caching for repeated content
- Monitor performance metrics in production

### Security Monitoring

**Recommended Metrics**:
- Sanitization processing time per document size
- Number of elements removed per document type
- CSP violation reports
- Failed sanitization attempts

**Alerting Thresholds**:
- Sanitization time > 5 seconds (investigate performance)
- > 50% content removed (possible attack or misconfiguration)
- CSP violations > 10/day (investigate policy effectiveness)

## Common Vulnerabilities and Mitigations

### Academic Content Attack Vectors

**Mathematical Injection**:
- **Attack**: Malicious LaTeX macros in mathematical expressions
- **Mitigation**: Whitelist-only MathML tags, validate LaTeX input

**Data Table Manipulation**:
- **Attack**: Excessive colspan/rowspan causing layout disruption
- **Mitigation**: Validate table structure, limit span attributes

**Citation Poisoning**:
- **Attack**: Malicious URLs in citation links
- **Mitigation**: Validate DOI format, whitelist trusted domains

### Configuration Best Practices

**Principle of Least Privilege**:
```typescript
const restrictiveConfig = {
  ALLOWED_TAGS: ['p', 'div', 'span', 'strong', 'em', 'table', 'tr', 'td'],
  ALLOWED_ATTR: ['class'],
  FORBID_TAGS: ['script', 'iframe', 'object'],
  FORBID_ATTR: ['on*', 'javascript:']
};
```

**Progressive Enhancement**:
```typescript
// Start restrictive, add capabilities as needed
const baseConfig = getRestrictiveConfig();
const enhancedConfig = {
  ...baseConfig,
  ADD_TAGS: ['math', 'svg'], // Add only when MathML needed
  ADD_ATTR: ['data-ref']     // Add only for citations
};
```

## Troubleshooting Common Issues

### Content Removal Problems

**Issue**: Important academic content being stripped
**Diagnosis**: Check DOMPurify console warnings
**Solution**: Add required tags/attributes to allowlist

```typescript
// Debug sanitization
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  console.log('Processing:', data.tagName, node);
});
```

### Performance Issues

**Issue**: Slow sanitization on large documents
**Diagnosis**: Monitor processing time per KB
**Solution**: Implement chunked processing or Web Workers

### CSP Violations

**Issue**: Content Security Policy blocking legitimate content
**Diagnosis**: Review browser console CSP reports
**Solution**: Adjust policy directives or use nonce-based allowlisting

## Future Considerations

### Emerging Standards

**HTML Sanitizer API** (📋 **Planned Standard**):
- Browser-native sanitization (inspired by DOMPurify)
- Potentially better performance than JavaScript libraries
- **Timeline**: Early specification stage, limited browser support

**Trusted Types API** (🚧 **In Progress**):
- Stronger type checking for DOM manipulation
- **Browser Support**: Chromium-based browsers only
- **Academic Relevance**: Useful for content management systems

### Research Directions

**AI-Generated Content Security**:
- Sanitization for LLM-generated HTML
- Academic content authenticity verification
- Dynamic content validation

**Academic Platform Standards**:
- Standardized security profiles for scholarly content
- Cross-publisher sanitization specifications
- Accessibility-first security approaches

## Status Summary

- **DOMPurify Integration**: ✓ **Recommended** for immediate implementation
- **CSP Configuration**: ✓ **Essential** for defense in depth
- **Web Worker Optimization**: 📋 **Planned** for large document handling
- **Trusted Types API**: 🚧 **Experimental** - monitor browser adoption
- **Academic Content Profiles**: 📋 **Planned** - publisher-specific configurations

---

*Last Updated: June 2025*  
*Reviewed for: Academic content security, XSS prevention, performance optimization*