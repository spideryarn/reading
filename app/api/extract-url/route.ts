// URL Extraction and Processing API endpoint
// Accepts URLs, fetches webpage content, extracts main content using Claude or Gemini APIs,
// and stores the complete document record in the database
// Uses fetch-then-LLM approach since LLMs cannot fetch URLs directly

import { NextRequest, NextResponse } from 'next/server'
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { createUrlToHtmlPrompt } from '@/lib/prompts/templates/url-to-html'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelConfig, AI_CONFIG } from '@/lib/config'
import { generateSlug, generateHtmlFilename } from '@/lib/utils/slug'
import { URL_EXTRACTION_CONFIG } from '@/lib/config'
import { extractWithReadability, formatReadabilityHtml } from '@/lib/utils/readability-extractor'
import { validateAuth } from '@/lib/auth/server-auth'
import { sanitizeAcademicContent } from '@/lib/utils/html-sanitizer'
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'

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
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/extract-url', correlationId)
  const requestTimer = createTimer(requestLogger, 'extract-url-request')
  
  try {
    // Validate authentication first
    const user = await validateAuth()
    
    // Parse JSON request body
    const body = await request.json()
    const { url, title: providedTitle, provider = 'claude', extractionMethod = 'ai-transcription', isPublic = false } = body
    
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
    
    // Validate extraction method
    if (!['readability', 'ai-transcription', 'ai-dom'].includes(extractionMethod)) {
      return new NextResponse('Invalid extraction method', { status: 400 })
    }
    
    // Check if AI DOM Manipulation is selected (not implemented)
    if (extractionMethod === 'ai-dom') {
      return new NextResponse('AI DOM Manipulation is an experimental feature that is not yet implemented.', { status: 501 })
    }
    
    console.log(`Processing URL with extraction: ${url} using ${extractionMethod} method`)
    requestLogger.info({
      userId: user.id,
      userEmail: user.email,
      url: new URL(url).hostname, // Log hostname only for privacy
      extractionMethod,
      provider,
      isPublic
    }, 'URL extraction request initiated')
    
    // Step 1: Fetch webpage content
    console.log('Step 1: Fetching webpage content...')
    requestLogger.info({ step: 1, hostname: new URL(url).hostname }, 'Starting webpage content fetch')
    let htmlContent: string
    
    try {
      htmlContent = await fetchWebpageContent(url)
    } catch (error) {
      console.error('Failed to fetch webpage:', error)
      requestLogger.error({
        step: 1,
        hostname: new URL(url).hostname,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to fetch webpage content')
      if (error instanceof Error) {
        return new NextResponse(error.message, { status: 400 })
      }
      return new NextResponse(URL_EXTRACTION_CONFIG.ERROR_MESSAGES.FETCH_FAILED, { status: 400 })
    }
    
    console.log(`Step 2: Fetched ${(htmlContent.length / 1024).toFixed(1)} KB of HTML content`)
    requestLogger.info({
      step: 2,
      hostname: new URL(url).hostname,
      contentSizeKb: Math.round(htmlContent.length / 1024),
      contentSizeBytes: htmlContent.length
    }, 'Webpage content fetched successfully')
    
    // Initialize Supabase client and services
    const supabase = await createClient()
    const documentService = new DocumentService(supabase)
    const aiCallService = new AiCallService(supabase)
    
    // Extract title from URL or use provided title
    const urlObject = new URL(url)
    const defaultTitle = providedTitle || `Document from ${urlObject.hostname}`
    
    const providerDisplayName = provider === 'gemini' ? 'Gemini 1.5 Pro' : 'Claude 4 Sonnet'
    
    console.log(`Step 3: Extracting content using ${extractionMethod} method...`)
    requestLogger.info({
      step: 3,
      extractionMethod,
      provider: extractionMethod === 'ai-transcription' ? provider : null
    }, 'Starting content extraction')
    
    // Execute extraction based on selected method
    let extractedHtml: string
    let extractionMethodUsed: string
    let aiCall: { id: string } | null = null // Track AI call for AI transcription method
    
    if (extractionMethod === 'readability') {
      // Mozilla Readability extraction - fast and reliable
      console.log('Using Mozilla Readability for extraction')
      requestLogger.info({ extractionMethod: 'readability' }, 'Starting Mozilla Readability extraction')
      extractionMethodUsed = 'readability'
      
      const startTime = Date.now()
      const article = extractWithReadability(htmlContent, url)
      
      if (!article) {
        // Readability failed - return error instead of falling back
        console.log('Readability extraction failed - returning error for user to decide next action')
        requestLogger.warn({
          extractionMethod: 'readability',
          hostname: new URL(url).hostname,
          contentSizeKb: Math.round(htmlContent.length / 1024)
        }, 'Readability extraction failed')
        
        return NextResponse.json({
          success: false,
          error: 'readability_failed',
          message: URL_EXTRACTION_CONFIG.ERROR_MESSAGES.READABILITY_FAILED,
          suggested_method: 'ai-transcription',
          details: {
            url: url,
            extraction_method: 'readability',
            content_size_kb: Math.round(htmlContent.length / 1024)
          }
        }, { status: 422 }) // 422 Unprocessable Entity - method failed but input was valid
      } else {
        // Readability succeeded
        const extractionTime = Date.now() - startTime
        console.log(`Readability extraction completed in ${extractionTime}ms`)
        requestLogger.info({
          extractionMethod: 'readability',
          extractionTimeMs: extractionTime,
          titleExtracted: article.title,
          contentLength: article.content.length,
          siteName: article.siteName,
          author: article.byline
        }, 'Readability extraction completed successfully')
        
        // Format the extracted content as clean HTML
        extractedHtml = formatReadabilityHtml(article)
        
        // Log extraction details
        console.log(`Extracted title: ${article.title}`)
        console.log(`Extracted content length: ${article.content.length} characters`)
        console.log(`Site name: ${article.siteName || 'Not detected'}`)
        console.log(`Author: ${article.byline || 'Not detected'}`)
        
        // Detailed extraction logging (already covered in success log above)
        requestLogger.debug({
          extractedTitle: article.title,
          contentLength: article.content.length,
          siteName: article.siteName || 'Not detected',
          author: article.byline || 'Not detected'
        }, 'Readability extraction details')
      }
    } else {
      // AI Transcription method
      extractionMethodUsed = 'ai-transcription'
      
      // Get model configuration for AI call tracking
      const tierKey = (process.env.LLM_MODEL || AI_CONFIG.DEFAULT_MODEL) as keyof typeof AI_CONFIG.MODELS
      const modelConfig = getModelConfig(tierKey)
      
      // Create AI call record for tracking (before LLM processing)
      const startTime = Date.now()
      aiCall = await aiCallService.startCall({
        provider: modelConfig.provider,
        modelId: modelConfig.modelId,
        prompt_type: 'url-to-html',
        input_data: {
          source_url: url,
          content_size_bytes: htmlContent.length,
          provider_requested: provider,
          tier_used: tierKey
        }
      })
      
      // Create provider-specific prompt template with appropriate model configuration
      const promptTemplate = createUrlToHtmlPrompt(provider)
      
      try {
        const extractResult = await executeMultimodalPromptWithUsage(promptTemplate, {
          htmlContent,
          sourceUrl: url
        })
        extractedHtml = extractResult.text
        
        const processingTime = Date.now() - startTime
        
        // Complete the AI call record with usage metadata
        await aiCallService.completeCall(aiCall!.id, {
          output_data: {
            html_length: extractResult.text.length,
            processing_time_ms: processingTime,
            provider_used: providerDisplayName
          },
          usage: extractResult.usage,
          finishReason: extractResult.finishReason
        })
        
        // Log successful AI operation
        requestLogger.info({
          extractionMethod: 'ai-transcription',
          provider,
          processingTimeMs: processingTime,
          outputSizeKb: Math.round(extractResult.text.length / 1024),
          tokensUsed: extractResult.usage?.totalTokens,
          aiCallId: aiCall!.id
        }, 'AI transcription completed successfully')
        
        // Clean up any markdown wrapping from LLM response
        extractedHtml = extractedHtml
          .replace(/^```html\s*\n?/, '')
          .replace(/\n?```\s*$/, '')
          .trim()
          
      } catch (error) {
        console.error('LLM extraction error:', error)
        requestLogger.error({
          extractionMethod: 'ai-transcription',
          provider,
          error: error instanceof Error ? error.message : 'Unknown error',
          aiCallId: aiCall?.id
        }, 'LLM extraction failed')
        
        // Log AI operation failure
        logAIOperation(
          'url-extraction',
          {
            modelProvider: provider,
            correlationId,
            userId: user.id
          },
          'error',
          error instanceof Error ? error : new Error('Unknown error')
        )
        
        // Mark AI call as failed
        await aiCallService.completeCall(aiCall!.id, {
          output_data: {
            error_type: 'llm_extraction_failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          }
        })
        
        // Check for JavaScript detection error
        if (error instanceof Error && error.message.includes('JavaScript')) {
          return new NextResponse(URL_EXTRACTION_CONFIG.ERROR_MESSAGES.JAVASCRIPT_REQUIRED, { status: 400 })
        }
        
        throw error
      }
    }
    
    // Check if LLM detected JavaScript requirement
    if (extractedHtml.includes('This webpage requires JavaScript for content rendering')) {
      return new NextResponse(URL_EXTRACTION_CONFIG.ERROR_MESSAGES.JAVASCRIPT_REQUIRED, { status: 400 })
    }
    
    console.log('Step 4: Content extraction completed, sanitizing content...')
    requestLogger.info({
      step: 4,
      extractionMethod: extractionMethodUsed,
      extractedSizeKb: Math.round(extractedHtml.length / 1024)
    }, 'Content extraction completed, starting sanitization')

    // Sanitize extracted HTML content before storage
    let sanitizedHtml: string
    try {
      sanitizedHtml = sanitizeAcademicContent(extractedHtml)
      console.log(`Sanitized HTML content (${sanitizedHtml.length} chars from ${extractedHtml.length} chars)`)
      requestLogger.info({
        step: 4,
        sanitizedSizeKb: Math.round(sanitizedHtml.length / 1024),
        originalSizeKb: Math.round(extractedHtml.length / 1024)
      }, 'Content sanitization completed successfully')
    } catch (sanitizationError) {
      console.error('HTML sanitization failed:', sanitizationError)
      requestLogger.error({
        step: 4,
        error: sanitizationError instanceof Error ? sanitizationError.message : 'Unknown sanitization error'
      }, 'HTML sanitization failed')
      throw new Error(`Content sanitization failed: ${sanitizationError instanceof Error ? sanitizationError.message : 'Unknown sanitization error'}`)
    }

    console.log('Step 5: Extracting plaintext from sanitized content...')
    requestLogger.info({
      step: 5,
      sanitizedSizeKb: Math.round(sanitizedHtml.length / 1024)
    }, 'Starting plaintext extraction from sanitized content')
    
    // Extract plaintext from sanitized HTML for search and word count
    const plaintext = sanitizedHtml
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
    
    // Extract title from extracted HTML if not provided
    const titleMatch = extractedHtml.match(/<title>(.*?)<\/title>/i) || extractedHtml.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const extractedTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : null
    const finalTitle = providedTitle || extractedTitle || defaultTitle
    
    // Generate final slug from the actual title (not the default title)
    const finalSlug = generateSlug(finalTitle)
    
    console.log('Step 6: Creating document with database integration...')
    requestLogger.info({
      step: 6,
      finalTitle,
      finalSlug,
      wordCount: plaintext.split(/\s+/).length,
      isPublic
    }, 'Creating document with database integration')
    
    // Prepare upload metadata based on extraction method
    const uploadMetadata = {
      extraction_method: extractionMethodUsed,
      provider_used: extractionMethodUsed === 'ai-transcription' ? provider : null,
      upload_source: 'url',
      content_size_kb: Math.round(htmlContent.length / 1024),
      extracted_size_kb: Math.round(extractedHtml.length / 1024)
    }
    
    // Add AI-specific metadata if AI transcription was used
    if (extractionMethodUsed === 'ai-transcription') {
      const tierKey = (process.env.LLM_MODEL || AI_CONFIG.DEFAULT_MODEL) as keyof typeof AI_CONFIG.MODELS
      const modelConfig = getModelConfig(tierKey)
      ;(uploadMetadata as typeof uploadMetadata & { model_used?: string }).model_used = modelConfig.modelId
    }
    
    // Create document in database with original HTML storage (following PDF storage pattern)
    // Store raw HTML content before any processing for re-processing capabilities
    const htmlBlob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' })
    const htmlFilename = generateHtmlFilename(url)
    
    console.log(`Storing original HTML as: ${htmlFilename} (${(htmlContent.length / 1024).toFixed(1)} KB)`)
    requestLogger.info({
      htmlFilename,
      originalSizeKb: Math.round(htmlContent.length / 1024),
      extractedSizeKb: Math.round(extractedHtml.length / 1024)
    }, 'Storing original HTML content for re-processing')
    
    const { document } = await documentService.createWithStorage(
      user.id,
      {
        title: finalTitle,
        html_content: sanitizedHtml, // Use sanitized HTML instead of raw extracted HTML
        plaintext_content: plaintext,
        slug: finalSlug,
        source_url: url,
        is_public: isPublic,
        word_count: plaintext.split(/\s+/).length
      },
      htmlBlob, // Store original HTML content for re-processing
      htmlFilename, // URL-based filename (domain-and-path-slugified.html)
      uploadMetadata, // Upload metadata
      extractionMethodUsed === 'ai-transcription' ? aiCall?.id : null // Link to AI call only for AI transcription
    )
    
    console.log(`Step 7: Document created successfully with ID: ${document.id}`)
    requestLogger.info({
      step: 7,
      documentId: document.id,
      title: document.title,
      slug: document.slug,
      wordCount: document.word_count,
      extractionMethod: extractionMethodUsed,
      aiCallId: extractionMethodUsed === 'ai-transcription' ? aiCall?.id : null
    }, 'Document created successfully')
    
    // Log successful AI operation if AI transcription was used
    if (extractionMethodUsed === 'ai-transcription') {
      logAIOperation(
        'url-extraction',
        {
          modelProvider: provider,
          correlationId,
          userId: user.id,
          documentId: document.id
        },
        'success'
      )
    }
    
    // Complete request timing
    requestTimer.end({
      userId: user.id,
      documentId: document.id,
      extractionMethod: extractionMethodUsed,
      provider: provider,
      correlationId
    })
    
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
        extracted_size_kb: Math.round(extractedHtml.length / 1024),
        extraction_method: extractionMethodUsed
      }
    }, {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
  } catch (error) {
    console.error('URL extraction API error:', error)
    requestLogger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'URL extraction API error')
    
    // Handle authentication errors first
    if (error instanceof Error) {
      if (error.message.includes('Authentication failed') || error.message.includes('User not authenticated')) {
        return new NextResponse('Authentication required', { status: 401 })
      }
      
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

      if (error.message.includes('Content sanitization failed') || error.message.includes('sanitization')) {
        // Provide specific error messages based on sanitization failure type
        if (error.message.includes('too large')) {
          return new NextResponse('Web page import failed: Extracted content is too large to process safely', { status: 413 })
        }
        if (error.message.includes('invalid result')) {
          return new NextResponse('Web page import failed: Content sanitization produced invalid results', { status: 422 })
        }
        return new NextResponse('Web page import failed: Content could not be safely processed for security reasons', { status: 422 })
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