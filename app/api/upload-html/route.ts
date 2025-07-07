// HTML Upload and Processing API endpoint
// Accepts HTML file uploads, stores original in Supabase Storage, processes according to selected method,
// and stores the complete document record in the database
// Supports multiple processing methods: as-is, readability, and AI transcription

import { NextRequest, NextResponse } from 'next/server'
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { createUrlToHtmlPrompt } from '@/lib/prompts/templates/url-to-html'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { createAIResponseLogger } from '@/lib/services/ai-response-logger'
import { getModelForAICall, UPLOAD_LIMITS } from '@/lib/config'
import { extractWithReadability, formatReadabilityHtml } from '@/lib/utils/readability-extractor'
import { requireAuth } from '@/lib/auth/server-auth'
import { processHtmlToDocument, handleSanitizationError } from '@/lib/services/html-document-processor'
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/upload-html', correlationId)
  const requestTimer = createTimer(requestLogger, 'upload-html-request')
  
  try {
    // Validate authentication first
    const user = await requireAuth({ allowBearer: true, request })
    
    // Parse multipart form data
    const formData = await request.formData()
    const htmlFile = formData.get('html') as File
    const processingMethod = (formData.get('processingMethod') as string) || 'as-is'
    const provider = (formData.get('provider') as string) || 'claude' // Only used for AI transcription
    const title = (formData.get('title') as string) || htmlFile?.name?.replace(/\.(html?|htm)$/i, '') || 'Untitled Document'
    const isPublic = formData.get('isPublic') === 'true' // Default to false (private)

    requestLogger.info({
      method: 'POST',
      userId: user.id,
      userEmail: user.email,
      fileName: htmlFile?.name,
      fileSize: htmlFile?.size,
      processingMethod,
      provider: processingMethod === 'ai-transcription' ? provider : 'none',
      title,
      isPublic
    }, 'HTML upload request initiated')

    if (!htmlFile) {
      return new NextResponse('No HTML file provided', { status: 400 })
    }

    // Validate processing method
    if (!['as-is', 'readability', 'ai-transcription'].includes(processingMethod)) {
      return new NextResponse('Invalid processing method. Must be "as-is", "readability", or "ai-transcription"', { status: 400 })
    }

    // Validate provider selection (only for AI transcription)
    if (processingMethod === 'ai-transcription' && !['claude', 'gemini'].includes(provider)) {
      return new NextResponse('Invalid provider. Must be "claude" or "gemini"', { status: 400 })
    }

    // Convert file to text content
    const htmlContent = await htmlFile.text()
    
    // Basic HTML file validation
    if (htmlContent.length === 0) {
      return new NextResponse('HTML file is empty', { status: 400 })
    }

    // Check file size using centralized limits
    if (htmlContent.length > UPLOAD_LIMITS.HTML_FILE_UPLOAD_MAX_SIZE_BYTES) {
      return new NextResponse(`HTML file too large (max ${Math.round(UPLOAD_LIMITS.HTML_FILE_UPLOAD_MAX_SIZE_BYTES / 1024 / 1024)}MB)`, { status: 400 })
    }

    // Basic HTML validation - check if it contains HTML tags
    if (!htmlContent.includes('<') || !htmlContent.includes('>')) {
      return new NextResponse('File does not appear to contain valid HTML content', { status: 400 })
    }

    console.log(`Processing HTML file with ${processingMethod} method: ${htmlFile.name} (${(htmlContent.length / 1024).toFixed(1)} KB)`)
    
    requestLogger.info({
      correlationId,
      fileName: htmlFile.name,
      fileSizeKB: Math.round(htmlContent.length / 1024),
      processingMethod,
      provider: processingMethod === 'ai-transcription' ? provider : 'none',
      userId: user.id
    }, 'Starting HTML processing with selected method')

    // Initialize Supabase client and services
    const supabase = await getSupabaseServerClient(request, { allowBearer: true })
    const aiCallService = new AiCallService(supabase)
    const aiResponseLogger = createAIResponseLogger(aiCallService)
    
    console.log(`Step 1: Processing HTML content using ${processingMethod} method...`)
    requestLogger.info({
      correlationId,
      step: 'html-processing',
      processingMethod,
      provider: processingMethod === 'ai-transcription' ? provider : 'none'
    }, 'Starting HTML content processing')

    // Process HTML based on selected method
    let processedHtml: string
    let processingMethodUsed: string
    let aiCall: { id: string } | null = null // Track AI call for AI transcription method
    
    if (processingMethod === 'as-is') {
      // Minimal processing - just use the HTML as-is (sanitization will be applied later)
      console.log('Using as-is processing (minimal processing with sanitization)')
      requestLogger.info({ processingMethod: 'as-is' }, 'Starting as-is processing')
      processingMethodUsed = 'as-is'
      processedHtml = htmlContent
      
    } else if (processingMethod === 'readability') {
      // Mozilla Readability extraction
      console.log('Using Mozilla Readability for content extraction')
      requestLogger.info({ processingMethod: 'readability' }, 'Starting Mozilla Readability extraction')
      processingMethodUsed = 'readability'
      
      const startTime = Date.now()
      const article = extractWithReadability(htmlContent, htmlFile.name)
      
      if (!article) {
        // Readability failed - return error for user to decide next action
        console.log('Readability extraction failed on uploaded HTML file')
        requestLogger.warn({
          processingMethod: 'readability',
          fileName: htmlFile.name,
          contentSizeKb: Math.round(htmlContent.length / 1024)
        }, 'Readability extraction failed on HTML file')
        
        return NextResponse.json({
          success: false,
          error: 'readability_failed',
          message: 'Mozilla Readability could not extract content from this HTML file. Try using "AI Content Extraction" instead.',
          suggested_method: 'ai-transcription',
          details: {
            file_name: htmlFile.name,
            processing_method: 'readability',
            content_size_kb: Math.round(htmlContent.length / 1024)
          }
        }, { status: 422 }) // 422 Unprocessable Entity - method failed but input was valid
      } else {
        // Readability succeeded
        const extractionTime = Date.now() - startTime
        console.log(`Readability extraction completed in ${extractionTime}ms`)
        requestLogger.info({
          processingMethod: 'readability',
          extractionTimeMs: extractionTime,
          titleExtracted: article.title,
          contentLength: article.content.length,
          siteName: article.siteName,
          author: article.byline
        }, 'Readability extraction completed successfully')
        
        // Format the extracted content as clean HTML
        processedHtml = formatReadabilityHtml(article)
        
        console.log(`Extracted title: ${article.title}`)
        console.log(`Extracted content length: ${article.content.length} characters`)
      }
      
    } else {
      // AI Transcription method
      processingMethodUsed = 'ai-transcription'
      
      // Get model configuration for AI call tracking
      const { modelString } = getModelForAICall()
      
      // Create AI call record for tracking (before LLM processing)
      const startTime = Date.now()
      aiCall = await aiCallService.startCallWithModelString({
        userId: user.id,
        modelString: modelString,
        prompt_type: 'url-to-html', // Reuse URL-to-HTML prompt template for HTML content extraction
        input_data: {
          file_name: htmlFile.name,
          content_size_bytes: htmlContent.length,
          provider_requested: provider,
          model_used: modelString
        }
      })
      
      // Create provider-specific prompt template with appropriate model configuration
      const promptTemplate = createUrlToHtmlPrompt(provider as 'claude' | 'gemini' | undefined)
      const providerDisplayName = provider === 'gemini' ? 'Gemini 1.5 Pro' : 'Claude 4 Sonnet'
      
      try {
        const extractResult = await executeMultimodalPromptWithUsage(promptTemplate, {
          htmlContent,
          sourceUrl: `file://uploaded/${htmlFile.name}` // Use file:// URL scheme for uploaded file
        })
        processedHtml = extractResult.text
        
        const processingTime = Date.now() - startTime
        
        // Complete the AI call record with comprehensive response logging
        await aiResponseLogger.completeAICall({
          aiCallId: aiCall!.id,
          response: extractResult.rawResponse || {
            text: extractResult.text,
            usage: extractResult.usage,
            finishReason: extractResult.finishReason
          },
          outputData: {
            html_length: extractResult.text.length,
            processing_time_ms: processingTime,
            provider_used: providerDisplayName,
            source_file: htmlFile.name
          },
          correlationId
        })
        
        // Log successful AI operation
        requestLogger.info({
          processingMethod: 'ai-transcription',
          provider,
          processingTimeMs: processingTime,
          outputSizeKb: Math.round(extractResult.text.length / 1024),
          tokensUsed: extractResult.usage?.totalTokens,
          aiCallId: aiCall!.id
        }, 'AI transcription completed successfully')
        
        // Clean up any markdown wrapping from LLM response
        processedHtml = processedHtml
          .replace(/^```html\s*\n?/, '')
          .replace(/\n?```\s*$/, '')
          .trim()
          
      } catch (error) {
        console.error('LLM extraction error:', error)
        requestLogger.error({
          processingMethod: 'ai-transcription',
          provider,
          error: error instanceof Error ? error.message : 'Unknown error',
          aiCallId: aiCall?.id
        }, 'LLM extraction failed')
        
        // Log AI operation failure
        logAIOperation(
          'html-extraction',
          {
            modelProvider: provider,
            correlationId,
            userId: user.id
          },
          'error',
          error instanceof Error ? error : new Error('Unknown error')
        )
        
        // Mark AI call as failed using the dedicated method so the row status
        // is correctly set to "failed" and the monitoring dashboard reflects
        // the error.  We store structured extra data for debugging.
        await aiCallService.failCall(
          aiCall!.id,
          error instanceof Error ? error.message : 'Unknown error',
          'llm_extraction_failed',
          {
            provider,
            processing_method: 'ai-transcription',
            correlation_id: correlationId
          }
        )
        
        throw error
      }
    }

    console.log('Step 2: HTML processing completed, processing through shared pipeline...')
    requestLogger.info({
      correlationId,
      step: 'html-processing-complete',
      processingMethod: processingMethodUsed,
      processedSizeKb: Math.round(processedHtml.length / 1024)
    }, 'HTML processing completed, starting shared pipeline')

    // Prepare HTML-specific metadata fields
    const htmlMetadata = {
      content_size_kb: Math.round(htmlContent.length / 1024),
      processed_size_kb: Math.round(processedHtml.length / 1024),
      processing_method: processingMethod
    }
    
    // Add AI-specific metadata if AI transcription was used
    if (processingMethodUsed === 'ai-transcription') {
      const { modelString } = getModelForAICall()
      ;(htmlMetadata as typeof htmlMetadata & { model_used?: string }).model_used = modelString
    }

    // Process HTML through shared pipeline (sanitization, text extraction, document creation)
    const { document, storageResult } = await processHtmlToDocument(
      processedHtml,
      {
        title,
        // sourceUrl is omitted for HTML uploads
        isPublic,
        originalFile: htmlFile,
        filename: htmlFile.name,
        provider: processingMethodUsed === 'ai-transcription' ? provider : undefined,
        correlationId,
        aiCallId: processingMethodUsed === 'ai-transcription' ? aiCall?.id : undefined
      },
      {
        extractionMethod: processingMethodUsed,
        uploadSource: 'html-upload',
        logger: requestLogger,
        userId: user.id,
        supabase
      },
      htmlMetadata
    )

    console.log(`Step 5: Document created successfully with ID: ${document.id}`)
    requestLogger.info({
      correlationId,
      step: 'document-created',
      documentId: document.id,
      documentSlug: document.slug,
      hasOriginalFile: !!storageResult
    }, 'Document created successfully')
    
    if (storageResult) {
      console.log(`Step 5: Original HTML stored at: ${storageResult.path}`)
      requestLogger.info({
        correlationId,
        step: 'storage-complete',
        storagePath: storageResult.path,
        storageSize: storageResult.size
      }, 'Original HTML file stored successfully')
    } else {
      console.warn('Step 5: Storage upload failed, but document was created without original file')
      requestLogger.warn({
        correlationId,
        step: 'storage-failed',
        documentId: document.id
      }, 'Storage upload failed, document created without original file')
    }

    // Log successful operation
    if (processingMethodUsed === 'ai-transcription') {
      logAIOperation(
        'html-upload-processing',
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
      processingMethod: processingMethodUsed,
      provider: processingMethodUsed === 'ai-transcription' ? provider : 'none',
      fileSize: htmlFile.size,
      correlationId
    })

    // Return comprehensive response with document details
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        slug: document.slug,
        html_content: document.html_content,
        plaintext_content: document.plaintext_content,
        word_count: document.word_count,
        has_original_file: !!document.storage_path,
        original_file_type: document.original_file_type,
        created_at: document.created_at
      },
      storage: storageResult ? {
        path: storageResult.path,
        size: storageResult.size,
        mime_type: storageResult.mimeType
      } : null,
      processing: {
        method: processingMethodUsed,
        provider: processingMethodUsed === 'ai-transcription' ? provider : null,
        file_size_kb: Math.round(htmlContent.length / 1024),
        processed_size_kb: Math.round(processedHtml.length / 1024)
      }
    }, {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('HTML upload API error:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'HTML upload API error occurred')
    
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
        return new NextResponse('Request timeout. The file may be too complex or the service is busy.', { status: 504 })
      }

      if (error.message.includes('storage') || error.message.includes('bucket')) {
        return new NextResponse('Storage service error. Please try again later.', { status: 503 })
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
        const sanitizationError = handleSanitizationError(error, 'html-upload')
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