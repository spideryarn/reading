// URL Extraction and Processing API endpoint
// Accepts URLs, fetches webpage content, extracts main content using Claude or Gemini APIs,
// and stores the complete document record in the database
// Uses fetch-then-LLM approach since LLMs cannot fetch URLs directly

import { NextRequest, NextResponse } from 'next/server'
import { executeMultimodalPrompt } from '@/lib/prompts/types'
import { urlToHtmlPrompt } from '@/lib/prompts/templates/url-to-html'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { generateSlug } from '@/lib/utils/slug'
import { URL_EXTRACTION_CONFIG } from '@/lib/config'

// Mock user ID for development (matches database mock user)
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001'

// URL validation function
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Fetch webpage content with timeout and error handling
async function fetchWebpageContent(url: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), URL_EXTRACTION_CONFIG.FETCH_TIMEOUT_MS)
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': URL_EXTRACTION_CONFIG.DEFAULT_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    // Check content type
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      throw new Error(`Invalid content type: ${contentType}. Expected HTML content.`)
    }
    
    // Get content length and check size limit
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > URL_EXTRACTION_CONFIG.MAX_HTML_SIZE_BYTES) {
      throw new Error(URL_EXTRACTION_CONFIG.ERROR_MESSAGES.SIZE_LIMIT)
    }
    
    const htmlContent = await response.text()
    
    // Check actual content size
    if (new Blob([htmlContent]).size > URL_EXTRACTION_CONFIG.MAX_HTML_SIZE_BYTES) {
      throw new Error(URL_EXTRACTION_CONFIG.ERROR_MESSAGES.SIZE_LIMIT)
    }
    
    return htmlContent
    
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(URL_EXTRACTION_CONFIG.ERROR_MESSAGES.TIMEOUT)
      }
      throw error
    }
    
    throw new Error(URL_EXTRACTION_CONFIG.ERROR_MESSAGES.NETWORK_ERROR)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse JSON request body
    const body = await request.json()
    const { url, title: providedTitle, provider = 'claude' } = body
    
    if (!url) {
      return new NextResponse(URL_EXTRACTION_CONFIG.ERROR_MESSAGES.INVALID_URL, { status: 400 })
    }
    
    // Validate URL format
    if (!isValidUrl(url)) {
      return new NextResponse(URL_EXTRACTION_CONFIG.ERROR_MESSAGES.INVALID_URL, { status: 400 })
    }
    
    // Validate provider selection
    if (!['claude', 'gemini'].includes(provider)) {
      return new NextResponse('Invalid provider. Must be "claude" or "gemini"', { status: 400 })
    }
    
    console.log(`Processing URL with extraction: ${url} using ${provider}`)
    
    // Step 1: Fetch webpage content
    console.log('Step 1: Fetching webpage content...')
    let htmlContent: string
    
    try {
      htmlContent = await fetchWebpageContent(url)
    } catch (error) {
      console.error('Failed to fetch webpage:', error)
      if (error instanceof Error) {
        return new NextResponse(error.message, { status: 400 })
      }
      return new NextResponse(URL_EXTRACTION_CONFIG.ERROR_MESSAGES.FETCH_FAILED, { status: 400 })
    }
    
    console.log(`Step 2: Fetched ${(htmlContent.length / 1024).toFixed(1)} KB of HTML content`)
    
    // Initialize Supabase client and document service
    const supabase = await createClient()
    const documentService = new DocumentService(supabase)
    
    // Extract title from URL or use provided title
    const urlObject = new URL(url)
    const defaultTitle = providedTitle || `Document from ${urlObject.hostname}`
    
    // Generate slug for the document
    const slug = generateSlug(defaultTitle)
    
    const providerDisplayName = provider === 'gemini' ? 'Gemini 1.5 Pro' : 'Claude 4 Sonnet'
    
    console.log(`Step 3: Extracting content using ${providerDisplayName}...`)
    
    // Execute the URL extraction prompt
    let extractedHtml: string
    
    try {
      extractedHtml = await executeMultimodalPrompt(urlToHtmlPrompt, {
        htmlContent,
        sourceUrl: url
      })
    } catch (error) {
      console.error('LLM extraction error:', error)
      
      // Check for JavaScript detection error
      if (error instanceof Error && error.message.includes('JavaScript')) {
        return new NextResponse(URL_EXTRACTION_CONFIG.ERROR_MESSAGES.JAVASCRIPT_REQUIRED, { status: 400 })
      }
      
      throw error
    }
    
    // Check if LLM detected JavaScript requirement
    if (extractedHtml.includes('This webpage requires JavaScript for content rendering')) {
      return new NextResponse(URL_EXTRACTION_CONFIG.ERROR_MESSAGES.JAVASCRIPT_REQUIRED, { status: 400 })
    }
    
    console.log('Step 4: Content extraction completed, processing plaintext...')
    
    // Extract plaintext from HTML for search and word count
    const plaintext = extractedHtml
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
    
    // Extract title from extracted HTML if not provided
    const titleMatch = extractedHtml.match(/<title>(.*?)<\/title>/i) || extractedHtml.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const extractedTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : null
    const finalTitle = providedTitle || extractedTitle || defaultTitle
    
    console.log('Step 5: Creating document with database integration...')
    
    // Create document in database (no file storage for URLs)
    const { document } = await documentService.createWithStorage(
      MOCK_USER_ID,
      {
        title: finalTitle,
        html_content: extractedHtml,
        plaintext_content: plaintext,
        slug,
        source_url: url,
        is_public: false,
        word_count: plaintext.split(/\s+/).length
      },
      null, // No file for URL-based documents
      null  // No filename
    )
    
    console.log(`Step 6: Document created successfully with ID: ${document.id}`)
    
    // Return comprehensive response with document details
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        slug: document.slug,
        source_url: document.source_url,
        html_content: document.html_content,
        plaintext_content: document.plaintext_content,
        word_count: document.word_count,
        has_original_file: false,
        original_file_type: null,
        created_at: document.created_at
      },
      processing: {
        provider: providerDisplayName,
        source_url: url,
        content_size_kb: Math.round(htmlContent.length / 1024),
        extracted_size_kb: Math.round(extractedHtml.length / 1024)
      }
    }, {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
  } catch (error) {
    console.error('URL extraction API error:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return new NextResponse('AI service rate limit exceeded. Please try again later.', { status: 429 })
      }
      
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return new NextResponse('AI service configuration error. Please check API keys.', { status: 503 })
      }
      
      if (error.message.includes('timeout')) {
        return new NextResponse('Request timeout. The webpage may be too complex or the service is busy.', { status: 504 })
      }
      
      if (error.message.includes('database') || error.message.includes('Failed to create document')) {
        return new NextResponse('Database error. Please try again later.', { status: 503 })
      }
      
      return new NextResponse(`Processing error: ${error.message}`, { status: 500 })
    }
    
    return new NextResponse('Unknown processing error occurred', { status: 500 })
  }
}

// Add CORS headers if needed for development
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}