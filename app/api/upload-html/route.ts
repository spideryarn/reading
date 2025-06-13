// HTML Upload and Processing API endpoint
// Accepts HTML file uploads, stores original in Supabase Storage, processes according to selected method,
// and stores the complete document record in the database
// Supports multiple processing methods: as-is, readability, and AI transcription

import { NextRequest, NextResponse } from 'next/server'
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { createUrlToHtmlPrompt } from '@/lib/prompts/templates/url-to-html'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelConfig, AI_CONFIG, type ProviderTierKey } from '@/lib/config'
import { generateSlug } from '@/lib/utils/slug'
import { extractWithReadability, formatReadabilityHtml } from '@/lib/utils/readability-extractor'
import { validateAuth } from '@/lib/auth/server-auth'
import { sanitizeAcademicContent } from '@/lib/utils/html-sanitizer'
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/upload-html', correlationId)
  const requestTimer = createTimer(requestLogger, 'upload-html-request')
  
  try {
    // Validate authentication first
    const user = await validateAuth()
    
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

    // Check file size (10MB limit for HTML files)
    const maxHtmlSize = 10 * 1024 * 1024 // 10MB
    if (htmlContent.length > maxHtmlSize) {
      return new NextResponse('HTML file too large (max 10MB)', { status: 400 })
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
    const supabase = await createClient()
    const documentService = new DocumentService(supabase)
    const aiCallService = new AiCallService(supabase)

    // Generate slug for the document
    const slug = generateSlug(title)
    
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
      const tierKey = (process.env.LLM_MODEL || AI_CONFIG.DEFAULT_MODEL) as ProviderTierKey
      const modelConfig = getModelConfig(tierKey)
      
      // Create AI call record for tracking (before LLM processing)
      const startTime = Date.now()
      aiCall = await aiCallService.startCall({
        provider: modelConfig.provider,
        modelId: modelConfig.modelId,
        prompt_type: 'url-to-html', // Reuse URL-to-HTML prompt template for HTML content extraction
        input_data: {
          file_name: htmlFile.name,
          content_size_bytes: htmlContent.length,
          provider_requested: provider,
          tier_used: tierKey
        }
      })
      
      // Create provider-specific prompt template with appropriate model configuration
      const promptTemplate = createUrlToHtmlPrompt(provider)
      const providerDisplayName = provider === 'gemini' ? 'Gemini 1.5 Pro' : 'Claude 4 Sonnet'
      
      try {
        const extractResult = await executeMultimodalPromptWithUsage(promptTemplate, {
          htmlContent,
          sourceUrl: htmlFile.name // Use filename as source identifier
        })
        processedHtml = extractResult.text
        
        const processingTime = Date.now() - startTime
        
        // Complete the AI call record with usage metadata
        await aiCallService.completeCall(aiCall!.id, {
          output_data: {
            html_length: extractResult.text.length,
            processing_time_ms: processingTime,
            provider_used: providerDisplayName,
            source_file: htmlFile.name
          },
          usage: extractResult.usage,
          finishReason: extractResult.finishReason
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
        
        // Mark AI call as failed
        await aiCallService.completeCall(aiCall!.id, {
          output_data: {
            error_type: 'llm_extraction_failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          }
        })
        
        throw error
      }
    }

    console.log('Step 2: HTML processing completed, sanitizing content...')
    requestLogger.info({
      correlationId,
      step: 'html-sanitization',
      processingMethod: processingMethodUsed,
      processedSizeKb: Math.round(processedHtml.length / 1024)
    }, 'HTML processing completed, starting sanitization')

    // Sanitize processed HTML content before storage (always applied for security)
    let sanitizedHtml: string
    try {
      sanitizedHtml = sanitizeAcademicContent(processedHtml)
      console.log(`Sanitized HTML content (${sanitizedHtml.length} chars from ${processedHtml.length} chars)`)
      requestLogger.info({
        correlationId,
        step: 'sanitization-complete',
        sanitizedLength: sanitizedHtml.length,
        originalLength: processedHtml.length
      }, 'HTML sanitization completed successfully')
    } catch (sanitizationError) {
      console.error('HTML sanitization failed:', sanitizationError)
      requestLogger.error({
        correlationId,
        step: 'sanitization-failed',
        error: sanitizationError instanceof Error ? sanitizationError.message : 'Unknown sanitization error'
      }, 'HTML sanitization failed')
      throw new Error(`Content sanitization failed: ${sanitizationError instanceof Error ? sanitizationError.message : 'Unknown sanitization error'}`)
    }

    console.log('Step 3: Extracting plaintext from sanitized content...')
    requestLogger.info({
      correlationId,
      step: 'plaintext-extraction',
      sanitizedLength: sanitizedHtml.length
    }, 'Starting plaintext extraction from sanitized content')

    // Extract plaintext from sanitized HTML for search and word count
    const plaintext = sanitizedHtml
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    console.log('Step 4: Creating document with storage integration...')
    requestLogger.info({
      correlationId,
      step: 'document-creation',
      plaintextLength: plaintext.length,
      wordCount: plaintext.split(/\s+/).length,
      slug
    }, 'Starting document creation with storage integration')
    
    // Prepare upload metadata
    const uploadMetadata = {
      extraction_method: processingMethodUsed,
      provider_used: processingMethodUsed === 'ai-transcription' ? provider : null,
      upload_source: 'html-upload', // New source type for HTML file uploads
      content_size_kb: Math.round(htmlContent.length / 1024),
      processed_size_kb: Math.round(processedHtml.length / 1024),
      processing_method: processingMethod
    }
    
    // Add AI-specific metadata if AI transcription was used
    if (processingMethodUsed === 'ai-transcription') {
      const tierKey = (process.env.LLM_MODEL || AI_CONFIG.DEFAULT_MODEL) as ProviderTierKey
      const modelConfig = getModelConfig(tierKey)
      ;(uploadMetadata as typeof uploadMetadata & { model_used?: string }).model_used = modelConfig.modelId
    }

    // Create document with storage integration using authenticated user
    const { document, storageResult } = await documentService.createWithStorage(
      user.id,
      {
        title,
        html_content: sanitizedHtml, // Use sanitized HTML 
        plaintext_content: plaintext,
        slug,
        source_url: null, // No source URL for file uploads
        is_public: isPublic,
        word_count: plaintext.split(/\s+/).length
      },
      htmlFile, // Original HTML file for storage
      htmlFile.name, // Original filename
      uploadMetadata, // Upload metadata
      processingMethodUsed === 'ai-transcription' ? aiCall?.id : undefined // Link to AI call only for AI transcription
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

      if (error.message.includes('database') || error.message.includes('Failed to create document')) {
        return new NextResponse('Database error. Please try again later.', { status: 503 })
      }

      if (error.message.includes('Content sanitization failed') || error.message.includes('sanitization')) {
        // Provide specific error messages based on sanitization failure type
        if (error.message.includes('too large')) {
          return new NextResponse('HTML processing failed: Generated content is too large to process safely', { status: 413 })
        }
        if (error.message.includes('invalid result')) {
          return new NextResponse('HTML processing failed: Content sanitization produced invalid results', { status: 422 })
        }
        return new NextResponse('HTML processing failed: Content could not be safely processed for security reasons', { status: 422 })
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