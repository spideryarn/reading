// Content Type Detection Utilities
// Functions for detecting content types from URLs to enable smart auto-detection
// in the unified upload system

import { URL_EXTRACTION_CONFIG } from '@/lib/config'

/**
 * Fetch only the content type of a URL using a HEAD request
 * This is faster than fetching the full content for content-type detection
 */
export async function fetchContentType(url: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), URL_EXTRACTION_CONFIG.FETCH_TIMEOUT_MS)
  
  try {
    const response = await fetch(url, {
      method: 'HEAD', // Only fetch headers, not the full content
      signal: controller.signal,
      headers: {
        'User-Agent': URL_EXTRACTION_CONFIG.DEFAULT_USER_AGENT,
        'Accept': '*/*', // Accept any content type for detection
        'Accept-Language': 'en-US,en;q=0.5',
        'DNT': '1',
        'Connection': 'keep-alive',
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    // Get content type from response headers
    const contentType = response.headers.get('content-type')
    if (!contentType) {
      return 'application/octet-stream'
    }
    return contentType.toLowerCase().split(';')[0]?.trim() ?? contentType.toLowerCase() // Remove charset and parameters
    
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout while detecting content type')
      }
      throw error
    }
    
    throw new Error('Failed to detect content type')
  }
}

/**
 * Check if a content type indicates a PDF document
 */
export function isPdfContentType(contentType: string): boolean {
  const normalizedType = contentType.toLowerCase().trim()
  return normalizedType === 'application/pdf' || 
         normalizedType.startsWith('application/pdf;')
}

/**
 * Check if a content type indicates HTML content
 */
export function isHtmlContentType(contentType: string): boolean {
  const normalizedType = contentType.toLowerCase().trim()
  return normalizedType === 'text/html' ||
         normalizedType.startsWith('text/html;') ||
         normalizedType === 'application/xhtml+xml' ||
         normalizedType.startsWith('application/xhtml+xml;')
}

/**
 * Generate helpful error messages for unsupported content types
 */
export function getContentTypeErrorMessage(contentType: string, url: string): string {
  const normalizedType = contentType.toLowerCase().trim()
  const urlObj = new URL(url)
  
  if (normalizedType === 'application/octet-stream') {
    return `This appears to be a binary file from ${urlObj.hostname}. If it's a PDF, try uploading it directly using the 'Upload PDF' tab instead.`
  }
  
  if (normalizedType.includes('application/msword') || normalizedType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
    return `Word documents aren't supported yet. Try converting to PDF first, then use the 'Upload PDF' tab.`
  }
  
  if (normalizedType.includes('image/')) {
    return `Image files aren't supported directly. If this is a scanned document, try converting to PDF first.`
  }
  
  if (normalizedType.includes('application/zip') || normalizedType.includes('application/x-zip-compressed')) {
    return `ZIP archives aren't supported. Please extract the archive and upload individual PDF or HTML files.`
  }
  
  return `Content type '${contentType}' from ${urlObj.hostname} is not supported. Supported types: PDF documents and HTML web pages.`
}

/**
 * Check if a URL looks like a file path (for cross-tab suggestions)
 */
export function isFilePathUrl(url: string): boolean {
  return url.startsWith('file://') || url.startsWith('blob:')
}

/**
 * Type definition for content detection result
 */
export interface ContentDetectionResult {
  contentType: string
  isPdf: boolean
  isHtml: boolean
  isSupported: boolean
  suggestedAction?: 'use-pdf-tab' | 'use-url-tab' | 'convert-file'
  errorMessage?: string
}

/**
 * Comprehensive content type detection and analysis
 */
export async function detectAndAnalyzeContent(url: string): Promise<ContentDetectionResult> {
  // Check for file path URLs first
  if (isFilePathUrl(url)) {
    return {
      contentType: 'file-path',
      isPdf: false,
      isHtml: false,
      isSupported: false,
      suggestedAction: 'use-pdf-tab',
      errorMessage: "Local file paths aren't supported. Use the 'Upload PDF' or 'Upload HTML' tab to upload files directly."
    }
  }
  
  try {
    const contentType = await fetchContentType(url)
    const isPdf = isPdfContentType(contentType)
    const isHtml = isHtmlContentType(contentType)
    const isSupported = isPdf || isHtml
    
    let suggestedAction: ContentDetectionResult['suggestedAction'] = undefined
    let errorMessage: string | undefined
    
    if (!isSupported) {
      errorMessage = getContentTypeErrorMessage(contentType, url)
      
      // Suggest appropriate action based on content type
      if (contentType.includes('application/') || contentType.includes('image/')) {
        suggestedAction = 'use-pdf-tab'
      } else {
        suggestedAction = 'convert-file'
      }
    }
    
    const result: ContentDetectionResult = {
      contentType,
      isPdf,
      isHtml,
      isSupported
    }
    
    if (suggestedAction !== undefined) {
      result.suggestedAction = suggestedAction
    }
    
    if (errorMessage !== undefined) {
      result.errorMessage = errorMessage
    }
    
    return result
  } catch (error) {
    // Fallback: infer content type from file extension when HEAD request fails (e.g. some
    // servers block HEAD or require authentication). This allows common cases like
    // direct links to .pdf files to continue through the PDF processing pipeline even
    // when the explicit header lookup fails.

    // `url` is provided as function argument, but TS may think it's undefined in catch scope
    // @ts-expect-error – url is defined but TS control flow is confused in catch
    const urlWithoutQuery = url.split('?')[0].toLowerCase()
    const hasPdfExtension = urlWithoutQuery.endsWith('.pdf')
    const hasHtmlExtension = urlWithoutQuery.endsWith('.html') || urlWithoutQuery.endsWith('.htm')

    const inferredContentType = hasPdfExtension
      ? 'application/pdf'
      : hasHtmlExtension
        ? 'text/html'
        : 'unknown'

    return {
      contentType: inferredContentType,
      isPdf: hasPdfExtension,
      isHtml: hasHtmlExtension,
      isSupported: hasPdfExtension || hasHtmlExtension,
      errorMessage: error instanceof Error ? error.message : 'Failed to detect content type'
    }
  }
}