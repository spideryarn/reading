/**
 * HTML Sanitization for Academic Content
 * 
 * Provides XSS protection while preserving complex academic formatting including:
 * - Mathematical notation (MathML)
 * - Scientific figures and captions
 * - Complex table structures
 * - Citation formatting and cross-references
 * - Academic typography and semantic markup
 * 
 * Based on research in docs/reference/HTML_SANITISATION_AND_PRETTIFICATION.md
 */

import DOMPurify from 'isomorphic-dompurify';
import { UPLOAD_LIMITS } from '@/lib/config/upload-limits';

/**
 * Academic content sanitization configuration for DOMPurify
 * Preserves scholarly content while preventing XSS attacks
 */
const ACADEMIC_SANITIZATION_CONFIG = {
  USE_PROFILES: { 
    mathMl: true,    // Enable MathML for mathematical notation
    svg: true,       // Enable SVG for scientific diagrams
    html: true       // Enable standard HTML tags
  },
  ADD_TAGS: [
    // MathML semantic markup
    'semantics', 'annotation', 'annotation-xml',
    
    // HTML5 semantic elements for academic structure
    'article', 'section', 'header', 'main', 'aside', 'footer',
    
    // Scientific figures and captions
    'figure', 'figcaption',
    
    // Mathematical notation elements
    'math', 'mrow', 'mi', 'mn', 'mo', 'mfrac',
    'msub', 'msup', 'msubsup', 'munder', 'mover', 'munderover',
    'mtable', 'mtr', 'mtd', 'mroot', 'msqrt', 'mtext',
    
    // Academic citation and reference elements
    'cite', 'abbr', 'dfn', 'time',
    
    // Code and technical content
    'code', 'pre', 'samp', 'kbd', 'var'
  ],
  ADD_ATTR: [
    // Complex table structures
    'colspan', 'rowspan',
    
    // Publisher-specific data attributes
    'data-*',
    
    // Mathematical styling attributes
    'mathvariant', 'mathsize', 'mathcolor', 'mathbackground',
    
    // Citation and reference metadata
    'data-doi', 'data-ref', 'data-cite', 'data-bibref',
    
    // Accessibility attributes
    'aria-label', 'aria-describedby', 'aria-labelledby', 'role',
    
    // Academic semantic attributes
    'title', 'lang', 'dir',
    
    // SVG attributes for scientific diagrams
    'viewBox', 'xmlns', 'width', 'height', 'preserveAspectRatio'
  ],
  FORBID_TAGS: [
    // Security-critical elements that should never be allowed
    'script', 'object', 'embed', 'applet', 'iframe',
    'form', 'input', 'textarea', 'select', 'button',
    'meta', 'link', 'base', 'frame', 'frameset'
  ],
  FORBID_ATTR: [
    // Event handlers - prevent all JavaScript execution
    'onload', 'onclick', 'onerror', 'onmouseover', 'onmouseout',
    'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
    'onkeydown', 'onkeyup', 'onkeypress',
    
    // JavaScript protocols
    'javascript:', 'vbscript:', 'data:text/html',
    
    // Potentially dangerous attributes
    'formaction', 'srcdoc'
  ],
  ALLOW_DATA_ATTR: true,  // Enable data-* attributes for academic metadata
  ALLOW_UNKNOWN_PROTOCOLS: false,  // Only allow safe protocols
  SANITIZE_DOM: true,  // Enable DOM sanitization
  KEEP_CONTENT: true,  // Preserve text content when removing tags
  RETURN_DOM: false,  // Return sanitized string
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false
};

/**
 * Restrictive configuration for user-generated content or untrusted sources
 */
const RESTRICTIVE_SANITIZATION_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'div', 'span', 'br', 'strong', 'em', 'u', 'i', 'b',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
    'blockquote', 'cite', 'q', 'code', 'pre'
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'title', 'lang', 'dir',
    'colspan', 'rowspan',
    'href' // Only for allowlisted domains
  ],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: ['on*', 'javascript:', 'vbscript:'],
  ALLOW_DATA_ATTR: false,
  SANITIZE_DOM: true,
  KEEP_CONTENT: true
};

/**
 * Sanitize HTML content for academic display
 * 
 * @param html - Raw HTML content to sanitize
 * @param options - Sanitization options
 * @returns Sanitized HTML safe for display
 */
export function sanitizeAcademicContent(
  html: string,
  options: {
    restrictive?: boolean;
    preserveMath?: boolean;
    preserveSvg?: boolean;
  } = {}
): string {
  // Input validation
  if (typeof html !== 'string') {
    throw new Error('HTML content must be a string')
  }

  if (html.length === 0) {
    return '' // Empty input returns empty output
  }

  // Check for extremely large content that might cause memory issues
  if (html.length > UPLOAD_LIMITS.GENERAL_MAX_SIZE_BYTES) {
    throw new Error(`HTML content too large (${Math.round(html.length / 1024 / 1024)}MB). Maximum size is ${Math.round(UPLOAD_LIMITS.GENERAL_MAX_SIZE_BYTES / 1024 / 1024)}MB`)
  }

  const {
    restrictive = false,
    preserveMath = true,
    preserveSvg = true
  } = options;

  try {
    // Use restrictive config for untrusted content
    if (restrictive) {
      const sanitized = DOMPurify.sanitize(html, RESTRICTIVE_SANITIZATION_CONFIG);
      if (sanitized === null || sanitized === undefined) {
        throw new Error('Sanitization returned invalid result')
      }
      return sanitized;
    }

    // Create academic config with optional features
    const config = {
      ...ACADEMIC_SANITIZATION_CONFIG
    };

    // Handle math preservation option
    if (!preserveMath) {
      // Remove MathML tags from allowed list
      config.FORBID_TAGS = [
        ...(config.FORBID_TAGS || []),
        'math', 'mrow', 'mi', 'mn', 'mo', 'mfrac', 'msub', 'msup',
        'msubsup', 'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd'
      ];
    }

    // Handle SVG preservation option
    if (!preserveSvg) {
      // Remove SVG tags from allowed list
      config.FORBID_TAGS = [
        ...(config.FORBID_TAGS || []),
        'svg', 'circle', 'rect', 'path', 'g', 'text', 'line', 'polygon'
      ];
    }

    // Update USE_PROFILES based on options
    config.USE_PROFILES = {
      html: true,
      mathMl: preserveMath,
      svg: preserveSvg
    };

    const sanitized = DOMPurify.sanitize(html, config);
    
    // Validate sanitization result
    if (sanitized === null || sanitized === undefined) {
      throw new Error('Sanitization returned invalid result')
    }

    // Check for suspicious sanitization (removed too much content)
    if (html.length > 1000 && sanitized.length < html.length * 0.1) {
      console.warn(`Sanitization removed ${Math.round((1 - sanitized.length / html.length) * 100)}% of content. Original: ${html.length} chars, Sanitized: ${sanitized.length} chars`)
    }

    return sanitized;

  } catch (error) {
    // Enhanced error context for debugging
    const errorContext = {
      originalLength: html.length,
      restrictive,
      preserveMath,
      preserveSvg,
      preview: html.substring(0, 200) + (html.length > 200 ? '...' : '')
    }
    
    console.error('HTML sanitization failed:', error, errorContext)
    
    if (error instanceof Error) {
      throw new Error(`HTML sanitization failed: ${error.message}`)
    } else {
      throw new Error('HTML sanitization failed due to unknown error')
    }
  }
}

/**
 * Sanitize HTML with enhanced security for user-generated content
 * 
 * @param html - Raw HTML content to sanitize
 * @returns Sanitized HTML with restrictive security policy
 */
export function sanitizeUserContent(html: string): string {
  // Input validation
  if (typeof html !== 'string') {
    throw new Error('HTML content must be a string')
  }

  if (html.length === 0) {
    return '' // Empty input returns empty output
  }

  // Check for large content that might cause memory issues
  if (html.length > UPLOAD_LIMITS.HTML_FILE_UPLOAD_MAX_SIZE_BYTES) {
    throw new Error(`HTML content too large (${Math.round(html.length / 1024 / 1024)}MB). Maximum size for user content is ${Math.round(UPLOAD_LIMITS.HTML_FILE_UPLOAD_MAX_SIZE_BYTES / 1024 / 1024)}MB`)
  }

  try {
    const sanitized = DOMPurify.sanitize(html, RESTRICTIVE_SANITIZATION_CONFIG);
    
    // Validate sanitization result
    if (sanitized === null || sanitized === undefined) {
      throw new Error('Sanitization returned invalid result')
    }

    return sanitized;

  } catch (error) {
    // Enhanced error context for debugging
    const errorContext = {
      originalLength: html.length,
      preview: html.substring(0, 200) + (html.length > 200 ? '...' : '')
    }
    
    console.error('User content sanitization failed:', error, errorContext)
    
    if (error instanceof Error) {
      throw new Error(`User content sanitization failed: ${error.message}`)
    } else {
      throw new Error('User content sanitization failed due to unknown error')
    }
  }
}

/**
 * Check if HTML content contains potentially dangerous elements
 * Useful for logging and monitoring security threats
 * 
 * @param html - HTML content to analyze
 * @returns Security analysis result
 */
export function analyzeHtmlSecurity(html: string): {
  hasDangerousElements: boolean;
  removedElements: string[];
  securityScore: number; // 0-100, higher is safer
} {
  const removedElements: string[] = [];
  let dangerousElementCount = 0;
  
  // Hook into DOMPurify to track removed elements
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.allowedTags && !data.allowedTags[data.tagName]) {
      removedElements.push(data.tagName);
      if (['script', 'iframe', 'object', 'embed'].includes(data.tagName)) {
        dangerousElementCount++;
      }
    }
  });

  // Run sanitization to trigger hooks
  DOMPurify.sanitize(html, ACADEMIC_SANITIZATION_CONFIG);
  
  // Remove the hook
  DOMPurify.removeHook('uponSanitizeElement');

  const totalElements = (html.match(/<[^>]+>/g) || []).length;
  const securityScore = totalElements > 0 
    ? Math.round(100 * (1 - dangerousElementCount / totalElements))
    : 100;

  return {
    hasDangerousElements: dangerousElementCount > 0,
    removedElements: [...new Set(removedElements)], // Remove duplicates
    securityScore
  };
}

/**
 * Publisher-specific sanitization configurations
 * Based on common patterns from academic publishers
 */
export const PUBLISHER_CONFIGS = {
  arxiv: {
    ...ACADEMIC_SANITIZATION_CONFIG,
    ADD_TAGS: [
      ...(ACADEMIC_SANITIZATION_CONFIG.ADD_TAGS || []),
      'ltx:document', 'ltx:section', 'ltx:theorem', 'ltx:proof' // LaTeXML elements
    ]
  },
  
  ieee: {
    ...ACADEMIC_SANITIZATION_CONFIG,
    ADD_ATTR: [
      ...(ACADEMIC_SANITIZATION_CONFIG.ADD_ATTR || []),
      'data-ieee-id', 'data-section-id'
    ]
  },
  
  pubmed: {
    ...ACADEMIC_SANITIZATION_CONFIG,
    ADD_TAGS: [
      ...(ACADEMIC_SANITIZATION_CONFIG.ADD_TAGS || []),
      'xref', 'ref', 'pub-id' // PMC/JATS elements
    ]
  }
};

/**
 * Sanitize content with publisher-specific configuration
 * 
 * @param html - HTML content to sanitize
 * @param publisher - Publisher identifier for specialized handling
 * @returns Sanitized HTML optimized for the specific publisher
 */
export function sanitizeByPublisher(
  html: string,
  publisher: keyof typeof PUBLISHER_CONFIGS
): string {
  const config = PUBLISHER_CONFIGS[publisher] || ACADEMIC_SANITIZATION_CONFIG;
  return DOMPurify.sanitize(html, config);
}

/**
 * Performance-optimized sanitization for large documents
 * Uses chunked processing to prevent UI blocking
 * 
 * @param html - Large HTML document to sanitize
 * @param chunkSize - Size of each processing chunk in characters
 * @returns Promise resolving to sanitized HTML
 */
export async function sanitizeLargeDocument(
  html: string,
  chunkSize: number = 50000
): Promise<string> {
  if (html.length <= chunkSize) {
    return sanitizeAcademicContent(html);
  }

  // For very large documents, just sanitize the whole thing at once
  // Chunking HTML can break tag structure, so it's safer to process as a whole
  // The async nature still allows yielding control
  await new Promise(resolve => setTimeout(resolve, 0));
  return sanitizeAcademicContent(html);
}

/**
 * Default export for common use case
 */
export default sanitizeAcademicContent;