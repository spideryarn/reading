// Example usage of the page-to-HTML fragment prompt template
// This file demonstrates how to use the template for vision-based PDF processing

import { 
  pageToHtmlFragmentPrompt,
  createPageToHtmlFragmentPrompt 
} from './page-to-html-fragment'
import { executeMultimodalPrompt } from '../types'

// Example function showing how to process a single PDF page image
export async function processPageToHtmlFragment(
  pageImageBase64: string,
  pageNumber: number,
  totalPages: number,
  options?: {
    fileName?: string
    previousPageSummary?: string
    documentContext?: string
    provider?: 'claude' | 'gemini'
  }
): Promise<string> {
  // Create prompt template with desired provider (defaults to Gemini Flash)
  const prompt = options?.provider 
    ? createPageToHtmlFragmentPrompt(options.provider)
    : pageToHtmlFragmentPrompt
    
  // Execute the multimodal prompt with the page image and context
  const htmlFragment = await executeMultimodalPrompt(prompt, {
    pageImageBase64,
    pageNumber,
    totalPages,
    fileName: options?.fileName,
    previousPageSummary: options?.previousPageSummary,
    documentContext: options?.documentContext
  })
  
  return htmlFragment
}

// Example usage in a multi-page PDF processing pipeline
export async function processMultiPagePdf(
  pageImages: string[], // Array of base64-encoded page images
  fileName?: string,
  documentContext?: string
): Promise<string[]> {
  const htmlFragments: string[] = []
  let previousPageSummary: string | undefined
  
  for (let i = 0; i < pageImages.length; i++) {
    const pageNumber = i + 1
    const pageImageBase64 = pageImages[i]
    
    if (!pageImageBase64) {
      throw new Error(`Missing page image at index ${i}`)
    }
    
    // Process each page with context from previous page
    const contextOptions: { fileName?: string; previousPageSummary?: string; documentContext?: string } = {}
    if (fileName !== undefined) contextOptions.fileName = fileName
    if (previousPageSummary !== undefined) contextOptions.previousPageSummary = previousPageSummary
    if (documentContext !== undefined) contextOptions.documentContext = documentContext
    
    const htmlFragment = await processPageToHtmlFragment(
      pageImageBase64,
      pageNumber,
      pageImages.length,
      contextOptions
    )
    
    htmlFragments.push(htmlFragment)
    
    // Generate summary for next page (simplified - in real implementation
    // you might want a separate summarization step)
    if (pageNumber < pageImages.length) {
      previousPageSummary = `Page ${pageNumber} content processed`
    }
  }
  
  return htmlFragments
}

// Example of assembling fragments into complete HTML document
export function assembleHtmlFragments(
  fragments: string[],
  documentTitle?: string,
  documentMeta?: {
    authors?: string[]
    subject?: string
    keywords?: string[]
  }
): string {
  const head = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${documentTitle ? `<title>${documentTitle}</title>` : ''}
  ${documentMeta?.authors ? `<meta name="author" content="${documentMeta.authors.join(', ')}">` : ''}
  ${documentMeta?.subject ? `<meta name="description" content="${documentMeta.subject}">` : ''}
  ${documentMeta?.keywords ? `<meta name="keywords" content="${documentMeta.keywords.join(', ')}">` : ''}
  <style>
    /* Basic academic document styling */
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    .page-break { page-break-before: always; }
    figure { margin: 1rem 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; }
    .equation-number { float: right; }
    .citation { color: #0066cc; }
  </style>
</head>
<body>
`
  
  const body = fragments
    .map((fragment, index) => {
      const pageBreak = index > 0 ? '<div class="page-break"></div>' : ''
      return `${pageBreak}\n<!-- Page ${index + 1} -->\n${fragment}`
    })
    .join('\n\n')
  
  const footer = `
</body>
</html>`
  
  return head + body + footer
}

// Example configuration for different use cases
export const PAGE_PROCESSING_CONFIGS = {
  // Fast processing for previews or large documents
  fast: {
    provider: 'gemini' as const,
    includeContext: false,
    batchSize: 10
  },
  
  // High-quality processing for final output
  quality: {
    provider: 'claude' as const,
    includeContext: true,
    batchSize: 5
  },
  
  // Balanced processing for most use cases
  balanced: {
    provider: 'gemini' as const,
    includeContext: true,
    batchSize: 8
  }
}