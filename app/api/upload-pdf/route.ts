// PDF Upload and Processing API endpoint
// Accepts PDF file uploads, stores original in Supabase Storage, converts to HTML using Claude or Gemini APIs,
// and stores the complete document record in the database
// Uses direct PDF processing via Anthropic/Google APIs (no image conversion)

import { NextRequest, NextResponse } from 'next/server'
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { createPdfToHtmlPrompt } from '@/lib/prompts/templates/pdf-to-html-direct'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelConfig, AI_CONFIG } from '@/lib/config'
import { generateSlug } from '@/lib/utils/slug'
import { validateAuth } from '@/lib/auth/server-auth'
import { sanitizeAcademicContent } from '@/lib/utils/html-sanitizer'
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/upload-pdf', correlationId)
  const requestTimer = createTimer(requestLogger, 'upload-pdf-request')
  
  try {
    // Validate authentication first
    const user = await validateAuth()
    
    // Parse multipart form data
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File
    const provider = (formData.get('provider') as string) || 'claude' // Default to Claude
    const title = (formData.get('title') as string) || pdfFile?.name?.replace('.pdf', '') || 'Untitled Document'
    const isPublic = formData.get('isPublic') === 'true' // Default to false (private)

    requestLogger.info({
      method: 'POST',
      userId: user.id,
      userEmail: user.email,
      fileName: pdfFile?.name,
      fileSize: pdfFile?.size,
      provider,
      title,
      isPublic
    }, 'PDF upload request initiated')

    if (!pdfFile) {
      return new NextResponse('No PDF file provided', { status: 400 })
    }

    // Validate provider selection
    if (!['claude', 'gemini'].includes(provider)) {
      return new NextResponse('Invalid provider. Must be "claude" or "gemini"', { status: 400 })
    }

    // Convert file to buffer
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
    
    // Basic PDF validation
    if (pdfBuffer.length === 0) {
      return new NextResponse('PDF file is empty', { status: 400 })
    }

    // Check file size (32MB limit for Claude API, 50MB for storage)
    const maxApiSize = 32 * 1024 * 1024 // 32MB for API
    const maxStorageSize = 50 * 1024 * 1024 // 50MB for storage
    
    if (pdfBuffer.length > maxStorageSize) {
      return new NextResponse('PDF file too large (max 50MB)', { status: 400 })
    }
    
    if (pdfBuffer.length > maxApiSize) {
      return new NextResponse('PDF file too large for AI processing (max 32MB for Claude direct processing)', { status: 400 })
    }

    // Check if it's actually a PDF by looking at the header
    const pdfHeader = pdfBuffer.subarray(0, 4).toString()
    if (pdfHeader !== '%PDF') {
      return new NextResponse('File is not a valid PDF', { status: 400 })
    }

    console.log(`Processing PDF with storage integration: ${pdfFile.name} (${(pdfBuffer.length / 1024).toFixed(1)} KB) using ${provider}`)
    
    requestLogger.info({
      correlationId,
      fileName: pdfFile.name,
      fileSizeKB: Math.round(pdfBuffer.length / 1024),
      provider,
      userId: user.id
    }, 'Starting PDF processing with storage integration')

    // Initialize Supabase client and services
    const supabase = await createClient()
    const documentService = new DocumentService(supabase)
    const aiCallService = new AiCallService(supabase)

    // Generate slug for the document
    const slug = generateSlug(title)

    // Create provider-specific prompt template with appropriate model configuration
    const promptTemplate = createPdfToHtmlPrompt(provider)
    const providerDisplayName = provider === 'gemini' ? 'Gemini 1.5 Pro' : 'Claude 4 Sonnet'
    
    // Get model configuration for AI call tracking
    const tierKey = (process.env.LLM_MODEL || AI_CONFIG.DEFAULT_MODEL) as keyof typeof AI_CONFIG.MODELS
    const modelConfig = getModelConfig(tierKey)
    
    // Create AI call record for tracking (before LLM processing)
    const startTime = Date.now()
    const aiCall = await aiCallService.startCall({
      provider: modelConfig.provider,
      modelId: modelConfig.modelId,
      prompt_type: 'pdf-to-html',
      input_data: {
        file_name: pdfFile.name,
        file_size_bytes: pdfBuffer.length,
        provider_requested: provider,
        tier_used: tierKey
      }
    })
    
    console.log(`Step 1: Converting PDF to HTML using ${providerDisplayName}...`)
    
    requestLogger.info({
      correlationId,
      step: 'pdf-to-html-conversion',
      provider: providerDisplayName,
      modelId: modelConfig.modelId,
      aiCallId: aiCall.id
    }, 'Starting PDF to HTML conversion using AI')

    // Execute the direct PDF prompt (multi-page support enabled)
    const htmlResult = await executeMultimodalPromptWithUsage(promptTemplate, {
      pdfBuffer,
      fileName: pdfFile.name,
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
        provider_used: providerDisplayName
      },
      usage: htmlResult.usage,
      finishReason: htmlResult.finishReason
    })

    console.log('Step 2: HTML conversion completed, sanitizing content...')
    
    requestLogger.info({
      correlationId,
      step: 'html-conversion-complete',
      processingTimeMs: processingTime,
      htmlLength: htmlResult.text.length,
      tokensUsed: htmlResult.usage.totalTokens
    }, 'PDF to HTML conversion completed successfully')

    // Sanitize HTML content before storage
    let sanitizedHtml: string
    try {
      sanitizedHtml = sanitizeAcademicContent(htmlResult.text)
      console.log(`Sanitized HTML content (${sanitizedHtml.length} chars from ${htmlResult.text.length} chars)`)
      requestLogger.info({
        correlationId,
        step: 'sanitization-complete',
        sanitizedLength: sanitizedHtml.length,
        originalLength: htmlResult.text.length
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
      extraction_method: 'ai-transcription',
      provider_used: provider,
      upload_source: 'pdf',
      processing_time_ms: processingTime,
      file_size_bytes: pdfBuffer.length,
      model_used: modelConfig.modelId
    }

    // Create document with storage integration using authenticated user
    const { document, storageResult } = await documentService.createWithStorage(
      user.id,
      {
        title,
        html_content: sanitizedHtml, // Use sanitized HTML instead of raw AI output
        plaintext_content: plaintext,
        slug,
        source_url: null,
        is_public: isPublic,
        word_count: plaintext.split(/\s+/).length
      },
      pdfFile, // Original file for storage
      pdfFile.name, // Original filename
      uploadMetadata, // Upload metadata
      aiCall.id // Link to AI call
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
      console.log(`Step 5: Original PDF stored at: ${storageResult.path}`)
      
      requestLogger.info({
        correlationId,
        step: 'storage-complete',
        storagePath: storageResult.path,
        storageSize: storageResult.size
      }, 'Original PDF stored successfully')
    } else {
      console.warn('Step 5: Storage upload failed, but document was created without original file')
      
      requestLogger.warn({
        correlationId,
        step: 'storage-failed',
        documentId: document.id
      }, 'Storage upload failed, document created without original file')
    }

    // Complete request timing
    requestTimer.end({
      userId: user.id,
      documentId: document.id,
      provider: provider,
      fileSize: pdfFile.size,
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
        provider: providerDisplayName,
        file_size_kb: Math.round(pdfBuffer.length / 1024)
      }
    }, {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('PDF upload API error:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'PDF upload API error occurred')
    
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
        return new NextResponse('Request timeout. The PDF may be too complex or the service is busy.', { status: 504 })
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
          return new NextResponse('PDF processing failed: Generated content is too large to process safely', { status: 413 })
        }
        if (error.message.includes('invalid result')) {
          return new NextResponse('PDF processing failed: Content sanitization produced invalid results', { status: 422 })
        }
        return new NextResponse('PDF processing failed: Content could not be safely processed for security reasons', { status: 422 })
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