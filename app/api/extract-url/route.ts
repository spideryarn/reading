// URL Extraction and Processing API endpoint
// Accepts URLs, fetches webpage content, extracts main content using Claude or Gemini APIs,
// and stores the complete document record in the database
// Uses fetch-then-LLM approach since LLMs cannot fetch URLs directly

import { NextRequest, NextResponse } from 'next/server'
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { createUrlToHtmlPrompt } from '@/lib/prompts/templates/url-to-html'
import { createPdfToHtmlPrompt } from '@/lib/prompts/templates/pdf-to-html-direct'
import { createClient } from '@/lib/supabase/server'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelForAICall } from '@/lib/config'
import { generateHtmlFilename } from '@/lib/utils/slug'
import { URL_EXTRACTION_CONFIG } from '@/lib/config'
import { extractWithReadability, formatReadabilityHtml } from '@/lib/utils/readability-extractor'
import { validateAuth } from '@/lib/auth/server-auth'
import { processHtmlToDocument, handleSanitizationError } from '@/lib/services/html-document-processor'
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'
import { detectAndAnalyzeContent, isPdfContentType } from '@/lib/utils/content-type-detection'

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

// Fetch PDF content from URL for processing
async function fetchPdfContent(url: string): Promise<Buffer> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), URL_EXTRACTION_CONFIG.FETCH_TIMEOUT_MS)
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': URL_EXTRACTION_CONFIG.DEFAULT_USER_AGENT,
        'Accept': 'application/pdf,*/*;q=0.9',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    // Verify content type is PDF
    const contentType = response.headers.get('content-type') || ''
    if (!isPdfContentType(contentType)) {
      throw new Error(`Expected PDF content, but received: ${contentType}`)
    }
    
    // Check content length for PDF size limits
    const contentLength = response.headers.get('content-length')
    const maxPdfSize = 32 * 1024 * 1024 // 32MB limit for Claude API
    if (contentLength && parseInt(contentLength) > maxPdfSize) {
      throw new Error('PDF file too large for processing (max 32MB for Claude direct processing)')
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)
    
    // Check actual PDF size
    if (pdfBuffer.length > maxPdfSize) {
      throw new Error('PDF file too large for processing (max 32MB for Claude direct processing)')
    }
    
    // Basic PDF validation - check header
    const pdfHeader = pdfBuffer.subarray(0, 4).toString()
    if (pdfHeader !== '%PDF') {
      throw new Error('Downloaded content is not a valid PDF file')
    }
    
    return pdfBuffer
    
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout while downloading PDF')
      }
      throw error
    }
    
    throw new Error('Failed to download PDF content')
  }
}

// Process PDF content downloaded from URL using the same pipeline as upload-pdf
async function processPdfFromUrl(
  sourceUrl: string,
  pdfBuffer: Buffer,
  provider: string,
  providedTitle: string | undefined,
  isPublic: boolean,
  user: { id: string; email?: string },
  supabase: ReturnType<typeof createClient>,
  aiCallService: AiCallService,
  requestLogger: ReturnType<typeof createRequestLogger>,
  correlationId: string
): Promise<NextResponse> {
  const urlObject = new URL(sourceUrl)
  const defaultTitle = providedTitle || `Document from ${urlObject.hostname}`
  
  // Create provider-specific prompt template with appropriate model configuration
  const promptTemplate = createPdfToHtmlPrompt(provider)
  const providerDisplayName = provider === 'gemini' ? 'Gemini 1.5 Pro' : 'Claude 4 Sonnet'
  
  // Get model configuration for AI call tracking
  const { modelString, config: modelConfig } = getModelForAICall()
  
  // Create AI call record for tracking (before LLM processing)
  const startTime = Date.now()
  const aiCall = await aiCallService.startCallWithModelString({
    userId: user.id,  // Pass user ID for RLS
    modelString: modelString,
    prompt_type: 'pdf-to-html',
    input_data: {
      source_url: sourceUrl,
      file_size_bytes: pdfBuffer.length,
      provider_requested: provider,
      model_used: modelString
    }
  })
  
  console.log(`Step 3: Converting PDF to HTML using ${providerDisplayName}...`)
  requestLogger.info({
    correlationId,
    step: 'pdf-to-html-conversion',
    provider: providerDisplayName,
    modelString: modelString,
    aiCallId: aiCall.id
  }, 'Starting PDF to HTML conversion using AI')

  // Execute the direct PDF prompt (multi-page support enabled)
  const htmlResult = await executeMultimodalPromptWithUsage(promptTemplate, {
    pdfBuffer,
    fileName: `document-from-${urlObject.hostname}.pdf`,
    singlePageOnly: false // Multi-page processing enabled
  })
  
  const processingTime = Date.now() - startTime
  
  // Log AI operation completion
  logAIOperation('pdf-to-html-conversion', {
    modelProvider: modelConfig.provider,
    tokensUsed: htmlResult.usage.totalTokens,
    userId: user.id,
    correlationId
  }, 'success')
  
  // Complete the AI call record with usage metadata
  await aiCallService.completeCall(aiCall.id, {
    output_data: {
      html_length: htmlResult.text.length,
      processing_time_ms: processingTime,
      provider_used: providerDisplayName,
      source_url: sourceUrl
    },
    usage: htmlResult.usage,
    finishReason: htmlResult.finishReason
  })

  console.log('Step 4: HTML conversion completed, sanitizing content...')
  requestLogger.info({
    correlationId,
    step: 'html-conversion-complete',
    processingTimeMs: processingTime,
    htmlLength: htmlResult.text.length,
    tokensUsed: htmlResult.usage.totalTokens
  }, 'PDF to HTML conversion completed successfully')

  // Process HTML through shared pipeline (sanitization, text extraction, document creation)
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })
  const pdfFilename = generateHtmlFilename(sourceUrl).replace('.html', '.pdf')
  
  const { document, storageResult } = await processHtmlToDocument(
    htmlResult.text,
    {
      title: defaultTitle,
      sourceUrl: sourceUrl,
      isPublic,
      originalFile: pdfBlob,
      filename: pdfFilename,
      provider,
      correlationId,
      aiCallId: aiCall.id
    },
    {
      extractionMethod: 'ai-transcription',
      uploadSource: 'url-pdf',
      logger: requestLogger,
      userId: user.id,
      supabase
    },
    {
      // URL→PDF-specific metadata fields
      processing_time_ms: processingTime,
      file_size_bytes: pdfBuffer.length,
      model_used: modelString,
      original_url: sourceUrl,
      content_type_detected: 'application/pdf',
      auto_detected: true
    }
  )

  console.log(`Step 7: Document created successfully with ID: ${document.id}`)
  requestLogger.info({
    correlationId,
    step: 'document-created',
    documentId: document.id,
    documentSlug: document.slug,
    hasOriginalFile: !!storageResult
  }, 'Document created successfully from PDF URL')
  
  // Log successful AI operation
  logAIOperation(
    'url-pdf-processing',
    {
      modelProvider: provider,
      correlationId,
      userId: user.id,
      documentId: document.id
    },
    'success'
  )

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
      has_original_file: !!storageResult,
      original_file_type: document.original_file_type,
      created_at: document.created_at
    },
    processing: {
      provider: providerDisplayName,
      source_url: sourceUrl,
      content_size_kb: Math.round(pdfBuffer.length / 1024),
      extracted_size_kb: Math.round(htmlResult.text.length / 1024),
      extraction_method: 'ai-transcription',
      content_type_detected: 'application/pdf'
    }
  }, {
    status: 201,
    headers: {
      'Content-Type': 'application/json'
    }
  })
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
    if (!['as-is', 'readability', 'ai-transcription', 'ai-dom'].includes(extractionMethod)) {
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
    
    // Step 1: Detect content type to determine processing path
    console.log('Step 1: Detecting content type...')
    requestLogger.info({ step: 1, hostname: new URL(url).hostname }, 'Starting content type detection')
    
    let contentDetection
    try {
      contentDetection = await detectAndAnalyzeContent(url)
      console.log(`Content type detected: ${contentDetection.contentType} (PDF: ${contentDetection.isPdf}, HTML: ${contentDetection.isHtml})`)
      requestLogger.info({
        step: 1,
        hostname: new URL(url).hostname,
        contentType: contentDetection.contentType,
        isPdf: contentDetection.isPdf,
        isHtml: contentDetection.isHtml,
        isSupported: contentDetection.isSupported
      }, 'Content type detection completed')
    } catch (error) {
      console.error('Failed to detect content type:', error)
      requestLogger.error({
        step: 1,
        hostname: new URL(url).hostname,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to detect content type')
      if (error instanceof Error) {
        return new NextResponse(error.message, { status: 400 })
      }
      return new NextResponse('Failed to detect content type', { status: 400 })
    }
    
    // Check if content type is supported
    if (!contentDetection.isSupported) {
      console.log(`Unsupported content type: ${contentDetection.contentType}`)
      requestLogger.warn({
        step: 1,
        hostname: new URL(url).hostname,
        contentType: contentDetection.contentType,
        suggestedAction: contentDetection.suggestedAction
      }, 'Unsupported content type detected')
      return new NextResponse(contentDetection.errorMessage || 'Unsupported content type', { status: 400 })
    }
    
    // Initialize Supabase client and services (needed for both PDF and HTML paths)
    const supabase = await createClient()
    const aiCallService = new AiCallService(supabase)
    
    // Route based on detected content type
    if (contentDetection.isPdf) {
      // Handle PDF content - download and process via PDF pipeline
      console.log('Step 2: PDF detected, downloading PDF content...')
      requestLogger.info({ step: 2, hostname: new URL(url).hostname }, 'PDF detected, switching to PDF processing pipeline')
      
      let pdfBuffer: Buffer
      try {
        pdfBuffer = await fetchPdfContent(url)
        console.log(`Downloaded PDF: ${(pdfBuffer.length / 1024).toFixed(1)} KB`)
        requestLogger.info({
          step: 2,
          hostname: new URL(url).hostname,
          pdfSizeKb: Math.round(pdfBuffer.length / 1024),
          pdfSizeBytes: pdfBuffer.length
        }, 'PDF content downloaded successfully')
      } catch (error) {
        console.error('Failed to download PDF:', error)
        requestLogger.error({
          step: 2,
          hostname: new URL(url).hostname,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Failed to download PDF content')
        if (error instanceof Error) {
          return new NextResponse(error.message, { status: 400 })
        }
        return new NextResponse('Failed to download PDF content', { status: 400 })
      }
      
      // Process PDF using the same logic as upload-pdf route
      return await processPdfFromUrl(url, pdfBuffer, provider, providedTitle, isPublic, user, supabase, aiCallService, requestLogger, correlationId)
    } else {
      // Handle HTML content - existing webpage extraction logic
      console.log('Step 2: HTML detected, fetching webpage content...')
      requestLogger.info({ step: 2, hostname: new URL(url).hostname }, 'HTML detected, proceeding with webpage extraction')
      
      let htmlContent: string
      try {
        htmlContent = await fetchWebpageContent(url)
      } catch (error) {
        console.error('Failed to fetch webpage:', error)
        requestLogger.error({
          step: 2,
          hostname: new URL(url).hostname,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Failed to fetch webpage content')
        if (error instanceof Error) {
          return new NextResponse(error.message, { status: 400 })
        }
        return new NextResponse(URL_EXTRACTION_CONFIG.ERROR_MESSAGES.FETCH_FAILED, { status: 400 })
      }
    
    console.log(`Step 3: Fetched ${(htmlContent.length / 1024).toFixed(1)} KB of HTML content`)
    requestLogger.info({
      step: 3,
      hostname: new URL(url).hostname,
      contentSizeKb: Math.round(htmlContent.length / 1024),
      contentSizeBytes: htmlContent.length
    }, 'Webpage content fetched successfully')
    
    // Extract title from URL or use provided title
    const urlObject = new URL(url)
    const defaultTitle = providedTitle || `Document from ${urlObject.hostname}`
    
    const providerDisplayName = provider === 'gemini' ? 'Gemini 1.5 Pro' : 'Claude 4 Sonnet'
    
    console.log(`Step 4: Extracting content using ${extractionMethod} method...`)
    requestLogger.info({
      step: 4,
      extractionMethod,
      provider: extractionMethod === 'ai-transcription' ? provider : null
    }, 'Starting content extraction')
    
    // Execute extraction based on selected method
    let extractedHtml: string
    let extractionMethodUsed: string
    let aiCall: { id: string } | null = null // Track AI call for AI transcription method
    
    if (extractionMethod === 'as-is') {
      // As-is extraction - preserve complete webpage with security sanitization
      console.log('Using as-is extraction (minimal processing)')
      requestLogger.info({ extractionMethod: 'as-is' }, 'Starting as-is extraction')
      extractionMethodUsed = 'as-is'
      
      const startTime = Date.now()
      // Use the raw HTML content directly, sanitization will be applied later
      extractedHtml = htmlContent
      
      const extractionTime = Date.now() - startTime
      console.log(`As-is extraction completed in ${extractionTime}ms`)
      requestLogger.info({
        extractionMethod: 'as-is',
        extractionTimeMs: extractionTime,
        contentLength: extractedHtml.length
      }, 'As-is extraction completed successfully')
      
    } else if (extractionMethod === 'readability') {
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
      const { modelString } = getModelForAICall()
      
      // Create AI call record for tracking (before LLM processing)
      const startTime = Date.now()
      aiCall = await aiCallService.startCallWithModelString({
        userId: user.id,  // Pass user ID for RLS
        modelString: modelString,
        prompt_type: 'url-to-html',
        input_data: {
          source_url: url,
          content_size_bytes: htmlContent.length,
          provider_requested: provider,
          model_used: modelString
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
    
    console.log('Step 5: Content extraction completed, sanitizing content...')
    requestLogger.info({
      step: 5,
      extractionMethod: extractionMethodUsed,
      extractedSizeKb: Math.round(extractedHtml.length / 1024)
    }, 'Content extraction completed, starting sanitization')

    // Extract title from extracted HTML if not provided
    const titleMatch = extractedHtml.match(/<title>(.*?)<\/title>/i) || extractedHtml.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const extractedTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : null
    const finalTitle = providedTitle || extractedTitle || defaultTitle
    
    console.log('Step 6: Processing HTML through shared pipeline...')
    
    // Process HTML through shared pipeline (sanitization, text extraction, document creation)
    const htmlBlob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' })
    const htmlFilename = generateHtmlFilename(url)
    
    // Prepare URL-specific metadata fields
    const urlMetadata = {
      content_size_kb: Math.round(htmlContent.length / 1024),
      extracted_size_kb: Math.round(extractedHtml.length / 1024),
      content_type_detected: contentDetection.contentType,
      auto_detected: true,
      // Storage-related metadata for debugging
      storage_mime_type: 'text/html; charset=utf-8',
      storage_base_mime_type: 'text/html',
      storage_mime_parameters: 'charset=utf-8'
    }
    
    // Add AI-specific metadata if AI transcription was used
    if (extractionMethodUsed === 'ai-transcription') {
      const { modelString } = getModelForAICall()
      ;(urlMetadata as typeof urlMetadata & { model_used?: string }).model_used = modelString
    }
    
    const { document } = await processHtmlToDocument(
      extractedHtml,
      {
        title: finalTitle,
        sourceUrl: url,
        isPublic,
        originalFile: htmlBlob,
        filename: htmlFilename,
        provider: extractionMethodUsed === 'ai-transcription' ? provider : undefined,
        correlationId,
        aiCallId: extractionMethodUsed === 'ai-transcription' ? aiCall?.id : undefined
      },
      {
        extractionMethod: extractionMethodUsed,
        uploadSource: 'url',
        logger: requestLogger,
        userId: user.id,
        supabase
      },
      urlMetadata
    )
    
    console.log(`Step 8: Document created successfully with ID: ${document.id}`)
    requestLogger.info({
      step: 8,
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
        extraction_method: extractionMethodUsed,
        content_type_detected: contentDetection.contentType
      }
    }, {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    } // Close the else block for HTML processing
    
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
      
      // Handle specific database constraint violations with user-friendly messages
      if (error.message.includes('duplicate key value violates unique constraint "documents_slug_unique"')) {
        return new NextResponse('A document with that name already exists. Please choose a different name.', { status: 409 })
      }
      
      if (error.message.includes('database') || error.message.includes('Failed to create document')) {
        return new NextResponse('Database error. Please try again later.', { status: 503 })
      }

      if (error.message.includes('Content sanitization failed') || error.message.includes('sanitization')) {
        // Use shared error handling for sanitization failures
        const sanitizationError = handleSanitizationError(error, 'url')
        return new NextResponse(sanitizationError.message, { status: sanitizationError.status })
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