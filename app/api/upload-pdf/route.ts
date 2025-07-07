// PDF Upload and Processing API endpoint
// Accepts PDF file uploads, stores original in Supabase Storage, converts to HTML using Claude or Gemini APIs,
// and stores the complete document record in the database
// Uses direct PDF processing via Anthropic/Google APIs (no image conversion)

import { NextRequest, NextResponse } from 'next/server'
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { createPdfToHtmlPrompt } from '@/lib/prompts/templates/pdf-to-html-direct'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { createAIResponseLogger } from '@/lib/services/ai-response-logger'
import { getModelForAICall, UPLOAD_LIMITS } from '@/lib/config'
import { requireAuth } from '@/lib/auth/server-auth'
import { processHtmlToDocument, handleSanitizationError } from '@/lib/services/html-document-processor'
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'
import { validatePdfPageCountFromBuffer } from '@/lib/utils/pdf-validation'
import { processWithGeminiNative, canProcessWithGeminiNative } from '@/lib/services/gemini-native-pdf-processor'
import { processWithMistralOcr, canProcessWithMistralOcr } from '@/lib/services/mistral-ocr-pdf-processor'
import type { VercelAIResponse } from '@/lib/services/ai-response-logger'
import { randomUUID } from 'crypto'
import { createProblemDetail } from '@/lib/api/error-utils'

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/upload-pdf', correlationId)
  const requestTimer = createTimer(requestLogger, 'upload-pdf-request')

  // Helper to build RFC 9457 Problem Details consistently throughout this route
  const problem = (
    status: number,
    code: string,
    title: string,
    detail?: string,
    retryable?: boolean
  ) =>
    createProblemDetail({
      type: `https://spideryarn.com/problems/${code}`,
      title,
      status,
      detail,
      correlationId,
      retryable,
    })

  try {
    // Validate authentication first
    const user = await requireAuth({ allowBearer: true, request })
    
    // Parse multipart form data
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File
    const provider = (formData.get('provider') as string) || 'mistral' // Default to Mistral OCR
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
      return problem(400, 'NO_PDF_PROVIDED', 'No PDF file provided',
        'Please include a PDF file in the "pdf" form field.')
    }

    // Validate provider selection
    if (!['claude', 'gemini', 'mistral'].includes(provider)) {
      return problem(
        400,
        'INVALID_PROVIDER',
        'Invalid provider',
        'Provider must be one of "claude", "gemini", or "mistral".'
      )
    }

    // Convert file to buffer
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
    
    // Basic PDF validation
    if (pdfBuffer.length === 0) {
      return problem(400, 'EMPTY_PDF', 'PDF file is empty')
    }

    // Check file size using centralized limits
    if (pdfBuffer.length > UPLOAD_LIMITS.PDF_MAX_SIZE_BYTES) {
      return problem(
        400,
        'PDF_TOO_LARGE',
        'PDF file too large',
        `Maximum allowed size is ${Math.round(
          UPLOAD_LIMITS.PDF_MAX_SIZE_BYTES / 1024 / 1024
        )} MB.`
      )
    }

    if (pdfBuffer.length > UPLOAD_LIMITS.PDF_CLAUDE_API_PROCESSING_LIMIT) {
      return problem(
        400,
        'PDF_TOO_LARGE_FOR_AI',
        'PDF file exceeds AI processing limit',
        `Maximum size for direct processing is ${Math.round(
          UPLOAD_LIMITS.PDF_CLAUDE_API_PROCESSING_LIMIT / 1024 / 1024
        )} MB.`
      )
    }

    // Check if it's actually a PDF by looking at the header
    const pdfHeader = pdfBuffer.subarray(0, 4).toString()
    if (pdfHeader !== '%PDF') {
      return problem(400, 'INVALID_PDF', 'File is not a valid PDF')
    }

    // Validate PDF page count
    const pageValidationResult = await validatePdfPageCountFromBuffer(pdfBuffer)
    if (!pageValidationResult.isValid) {
      requestLogger.warn({
        correlationId,
        fileName: pdfFile.name,
        pageCount: pageValidationResult.pageCount,
        maxAllowed: UPLOAD_LIMITS.PDF_MAX_PAGES,
        userId: user.id
      }, 'PDF page count validation failed')
      
      return problem(400, 'PDF_PAGE_LIMIT', 'PDF exceeds page limit', pageValidationResult.error)
    }

    requestLogger.info({
      correlationId,
      fileName: pdfFile.name,
      pageCount: pageValidationResult.pageCount,
      userId: user.id
    }, `PDF page count validation passed: ${pageValidationResult.pageCount} pages`)

    const draftDocumentId = randomUUID()

    const imageExtractionEnabled = process.env.IMAGE_EXTRACTION_ENABLED !== 'false'

    requestLogger.info({
      correlationId,
      fileName: pdfFile.name,
      fileSizeKB: Math.round(pdfBuffer.length / 1024),
      pageCount: pageValidationResult.pageCount,
      provider,
      userId: user.id
    }, 'Starting PDF processing with storage integration')

    // Initialize Supabase client and services
    const supabase = await getSupabaseServerClient(request, { allowBearer: true })
    const aiCallService = new AiCallService(supabase)
    const aiResponseLogger = createAIResponseLogger(aiCallService)

    // Determine which processing path to use
    const canGeminiResult = canProcessWithGeminiNative(pdfBuffer)
    const canMistralResult = canProcessWithMistralOcr(pdfBuffer)
    const useGeminiNative = provider === 'gemini' && canGeminiResult.canProcess
    const useMistralOcr = provider === 'mistral' && canMistralResult.canProcess

    // Fail fast if user explicitly requested Gemini but the PDF cannot be handled natively
    if (provider === 'gemini' && !canGeminiResult.canProcess) {
      return problem(
        413,
        'GEMINI_LIMIT',
        'PDF cannot be processed with Gemini Native',
        canGeminiResult.reason || 'Provider limits exceeded.'
      )
    }
    
    // Fail fast if user explicitly requested Mistral but the PDF cannot be processed
    if (provider === 'mistral' && !canMistralResult.canProcess) {
      return problem(
        413,
        'MISTRAL_LIMIT',
        'PDF cannot be processed with Mistral OCR',
        canMistralResult.reason || 'Provider limits exceeded.'
      )
    }
    
    let htmlResult: {
      text: string
      usage: { promptTokens: number; completionTokens: number; totalTokens: number }
      finishReason: string
      rawResponse?: VercelAIResponse
    }
    let processingTime: number
    let providerDisplayName: string
    let modelString: string
    let extractedImagesMetadata: any[] = []
    let aiCallId: string
    
    // Create AI call record for tracking (before LLM processing)
    const startTime = Date.now()
    
    if (useGeminiNative) {
      // Use v3 Gemini Native processor with bounding box extraction
      providerDisplayName = 'Gemini 2.5 Flash (Native PDF)'
      modelString = 'google:gemini-2.5-flash:latest'
      
      const aiCall = await aiCallService.startCallWithModelString({
        userId: user.id,
        modelString: modelString,
        prompt_type: 'pdf-to-html',
        input_data: {
          file_name: pdfFile.name,
          file_size_bytes: pdfBuffer.length,
          page_count: pageValidationResult.pageCount,
          provider_requested: provider,
          model_used: modelString,
          pipeline_version: 'v3-gemini-native'
        }
      })
      
      aiCallId = aiCall.id
      
      requestLogger.info({
        correlationId,
        step: 'pdf-to-html-conversion',
        provider: providerDisplayName,
        modelString: modelString,
        aiCallId: aiCall.id,
        pipelineVersion: 'v3-gemini-native'
      }, 'Starting PDF to HTML conversion using Gemini Native with bounding box extraction')
      
      try {
        const geminiResult = await processWithGeminiNative({
          pdfBuffer,
          fileName: pdfFile.name,
          correlationId,
          singlePageOnly: false,
          documentId: draftDocumentId,
          imageExtractionEnabled
        })
        
        processingTime = geminiResult.processingTimeMs
        htmlResult = {
          text: geminiResult.html,
          usage: geminiResult.usage,
          finishReason: geminiResult.finishReason
        }
        if (geminiResult.rawResponse) {
          htmlResult.rawResponse = geminiResult.rawResponse as VercelAIResponse
        }
        
        // Store extracted images metadata for later use
        extractedImagesMetadata = geminiResult.extractedImages
        
        if (geminiResult.warnings.length > 0) {
          requestLogger.warn({
            correlationId,
            warnings: geminiResult.warnings
          }, 'Gemini Native processing completed with warnings')
        }
        
        // Complete the AI call record with comprehensive response logging
        await aiResponseLogger.completeAICall({
          aiCallId: aiCall.id,
          response: (geminiResult.rawResponse as VercelAIResponse | undefined) || {
            text: htmlResult.text,
            usage: htmlResult.usage,
            finishReason: htmlResult.finishReason
          },
          outputData: {
            html_length: htmlResult.text.length,
            processing_time_ms: processingTime,
            provider_used: providerDisplayName,
            extracted_images_count: extractedImagesMetadata.length,
            warnings: geminiResult.warnings
          },
          correlationId
        })
        
      } catch (error) {
        // Complete the AI call with failure metadata
        await aiCallService.failCall(
          aiCall.id,
          error instanceof Error ? error.message : 'Unknown error',
          'GEMINI_NATIVE_PROCESSING_ERROR',
          {
            processing_time_ms: Date.now() - startTime,
            provider_used: providerDisplayName
          }
        )
        throw error
      }
      
    } else if (useMistralOcr) {
      // Use v3 Mistral OCR processor with image bounding box extraction
      providerDisplayName = 'Mistral OCR (Latest)'
      modelString = 'mistral:ocr:latest'
      
      const aiCall = await aiCallService.startCallWithModelString({
        userId: user.id,
        modelString: modelString,
        prompt_type: 'pdf-to-html',
        input_data: {
          file_name: pdfFile.name,
          file_size_bytes: pdfBuffer.length,
          page_count: pageValidationResult.pageCount,
          provider_requested: provider,
          model_used: modelString,
          pipeline_version: 'v3-mistral-ocr'
        }
      })
      
      aiCallId = aiCall.id
      
      requestLogger.info({
        correlationId,
        step: 'pdf-to-html-conversion',
        provider: providerDisplayName,
        modelString: modelString,
        aiCallId: aiCall.id,
        pipelineVersion: 'v3-mistral-ocr'
      }, 'Starting PDF to HTML conversion using Mistral OCR')
      
      try {
        const mistralResult = await processWithMistralOcr({
          pdfBuffer,
          fileName: pdfFile.name,
          correlationId,
          singlePageOnly: false,
          documentId: draftDocumentId,
          imageExtractionEnabled
        })
        
        processingTime = mistralResult.processingTimeMs
        htmlResult = {
          text: mistralResult.html,
          usage: mistralResult.usage,
          finishReason: mistralResult.finishReason
        }
        if (mistralResult.rawResponse) {
          htmlResult.rawResponse = mistralResult.rawResponse as VercelAIResponse
        }
        
        // Store extracted images metadata for later use
        extractedImagesMetadata = mistralResult.extractedImages
        
        if (mistralResult.warnings.length > 0) {
          requestLogger.warn({
            correlationId,
            warnings: mistralResult.warnings
          }, 'Mistral OCR processing completed with warnings')
        }
        
        // Complete the AI call record with comprehensive response logging
        await aiResponseLogger.completeAICall({
          aiCallId: aiCall.id,
          response: (mistralResult.rawResponse as VercelAIResponse | undefined) || {
            text: htmlResult.text,
            usage: htmlResult.usage,
            finishReason: htmlResult.finishReason
          },
          outputData: {
            html_length: htmlResult.text.length,
            processing_time_ms: processingTime,
            provider_used: providerDisplayName,
            extracted_images_count: extractedImagesMetadata.length,
            warnings: mistralResult.warnings
          },
          correlationId
        })
        
      } catch (error) {
        // Complete the AI call with failure metadata
        await aiCallService.failCall(
          aiCall.id,
          error instanceof Error ? error.message : 'Unknown error',
          'MISTRAL_OCR_PROCESSING_ERROR',
          {
            processing_time_ms: Date.now() - startTime,
            provider_used: providerDisplayName
          }
        )
        throw error
      }
      
    } else {
      // Use existing direct PDF processor (v3 for both Claude and non-native Gemini)
      const promptTemplate = createPdfToHtmlPrompt(provider as 'claude' | 'gemini' | undefined)
      providerDisplayName = provider === 'gemini' ? 'Gemini 1.5 Pro' : 'Claude 4 Sonnet'
      
      // Get model configuration for AI call tracking
      const modelConfig = getModelForAICall()
      modelString = modelConfig.modelString
      
      const aiCall = await aiCallService.startCallWithModelString({
        userId: user.id,
        modelString: modelString,
        prompt_type: 'pdf-to-html',
        input_data: {
          file_name: pdfFile.name,
          file_size_bytes: pdfBuffer.length,
          page_count: pageValidationResult.pageCount,
          provider_requested: provider,
          model_used: modelString,
          pipeline_version: 'v3-direct'
        }
      })
      
      aiCallId = aiCall.id
      
      requestLogger.info({
        correlationId,
        step: 'pdf-to-html-conversion',
        provider: providerDisplayName,
        modelString: modelString,
        aiCallId: aiCall.id
      }, `Starting PDF to HTML conversion using ${providerDisplayName}`)
      
      requestLogger.info({
        correlationId,
        step: 'pdf-to-html-conversion',
        provider: providerDisplayName,
        modelString: modelString,
        aiCallId: aiCall.id,
        pipelineVersion: 'v3-direct'
      }, 'Starting PDF to HTML conversion using AI')

      // Execute the direct PDF prompt (multi-page support enabled)
      htmlResult = await executeMultimodalPromptWithUsage(promptTemplate, {
        pdfBuffer,
        fileName: pdfFile.name,
        singlePageOnly: false // Multi-page processing enabled
      })
      
      processingTime = Date.now() - startTime
      
      // Check for output truncation due to token limits
      if (htmlResult.finishReason === 'length') {
        // Log the failure before throwing
        requestLogger.error({
          correlationId,
          finishReason: htmlResult.finishReason,
          tokensUsed: htmlResult.usage.totalTokens,
          pageCount: pageValidationResult.pageCount,
          provider: provider,
          aiCallId: aiCall.id
        }, 'PDF processing failed due to token limit exhaustion')
        
        // Complete the AI call with comprehensive response logging (even on failure)
        await aiResponseLogger.completeAICall({
          aiCallId: aiCall.id,
          response: (htmlResult.rawResponse as VercelAIResponse | undefined) || {
            text: htmlResult.text,
            usage: htmlResult.usage,
            finishReason: htmlResult.finishReason
          },
          outputData: {
            html_length: htmlResult.text.length,
            processing_time_ms: processingTime,
            provider_used: providerDisplayName,
            error: 'Token limit exhausted'
          },
          correlationId
        })
        
        throw new Error(
          `Document too large for processing. The AI model reached its token limit while processing your ${pageValidationResult.pageCount}-page PDF. ` +
          `Please try with a shorter document or use the vision pipeline for page-by-page processing.`
        )
      }
      
      // Log AI operation completion
      logAIOperation('pdf-to-html-conversion', {
        modelProvider: modelConfig.config.provider,
        tokensUsed: htmlResult.usage.totalTokens,
        userId: user.id,
        correlationId
      }, 'success')
      
      // Complete the AI call record with comprehensive response logging
      await aiResponseLogger.completeAICall({
        aiCallId: aiCall.id,
        response: (htmlResult.rawResponse as VercelAIResponse | undefined) || {
          text: htmlResult.text,
          usage: htmlResult.usage,
          finishReason: htmlResult.finishReason
        },
        outputData: {
          html_length: htmlResult.text.length,
          processing_time_ms: processingTime,
          provider_used: providerDisplayName
        },
        correlationId
      })
    }

    requestLogger.info({
      correlationId,
      step: 'html-processing',
      htmlLength: htmlResult.text.length,
      extractedImagesCount: extractedImagesMetadata.length
    }, 'HTML conversion completed, processing through shared pipeline')
    
    requestLogger.info({
      correlationId,
      step: 'html-conversion-complete',
      processingTimeMs: processingTime,
      htmlLength: htmlResult.text.length,
      tokensUsed: htmlResult.usage.totalTokens,
      extractedImagesCount: extractedImagesMetadata.length
    }, 'PDF to HTML conversion completed successfully')

    // Build additional metadata including image info
    const imageCount = extractedImagesMetadata.length
    const totalImageBytes = extractedImagesMetadata.reduce((sum: number, img: any) => sum + (img.fileSize || 0), 0)

    const { document, storageResult } = await processHtmlToDocument(
      htmlResult.text,
      {
        title,
        // sourceUrl is omitted for PDF uploads
        isPublic,
        originalFile: pdfFile,
        filename: pdfFile.name,
        provider,
        correlationId,
        aiCallId: aiCallId, // Pass AI call ID for tracking
        documentId: draftDocumentId
      },
      {
        extractionMethod: 'ai-transcription',
        uploadSource: 'pdf',
        logger: requestLogger,
        userId: user.id,
        supabase
      },
      {
        // PDF-specific metadata fields
        processing_time_ms: processingTime,
        file_size_bytes: pdfBuffer.length,
        page_count: pageValidationResult.pageCount,
        model_used: modelString,

        // Image extraction metadata
        extracted_images: extractedImagesMetadata,
        assets_uploaded: imageCount,
        image_assets: imageCount,
        total_storage_bytes: totalImageBytes
      }
    )

    requestLogger.info({
      correlationId,
      step: 'document-creation-complete',
      documentId: document.id,
      storageSuccessful: !!storageResult,
      userId: user.id
    }, 'Document created successfully')
    
    if (storageResult) {
      requestLogger.info({
        correlationId,
        step: 'storage-complete',
        storagePath: storageResult.path,
        documentId: document.id
      }, 'Original PDF stored successfully')
    } else {
      requestLogger.warn({
        correlationId,
        step: 'storage-warning',
        documentId: document.id
      }, 'Storage upload failed, but document was created without original file')
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
        file_size_kb: Math.round(pdfBuffer.length / 1024),
        page_count: pageValidationResult.pageCount
      }
    }, {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    // Single consolidated error log
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'PDF upload API error')
    
    // Handle authentication errors first
    if (error instanceof Error) {
      if (error.message.includes('Authentication failed') || error.message.includes('User not authenticated')) {
        return problem(401, 'AUTH_REQUIRED', 'Authentication required')
      }
      
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return problem(429, 'AI_RATE_LIMIT', 'AI service rate limit exceeded', 'Please try again later.', true)
      }
      
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return problem(503, 'AI_CONFIG', 'AI service configuration error', 'Please check API keys.')
      }
      
      if (error.message.includes('timeout')) {
        return problem(504, 'TIMEOUT', 'Request timeout', 'The PDF may be too complex or the service is busy.', true)
      }

      if (error.message.includes('storage') || error.message.includes('bucket')) {
        return problem(503, 'STORAGE_ERROR', 'Storage service error', 'Please try again later.', true)
      }

      // Handle token limit exhaustion error explicitly
      if (error.message.includes('Document too large for processing')) {
        return problem(413, 'DOCUMENT_TOO_LARGE', 'Document too large for processing', error.message)
      }

      // Handle specific database constraint violations with user-friendly messages
      if (error.message.includes('duplicate key value violates unique constraint "documents_slug_unique"')) {
        return problem(409, 'DUPLICATE_SLUG', 'Document slug already exists', 'Please choose a different name.')
      }
      
      if (error.message.includes('database') || error.message.includes('Failed to create document')) {
        return problem(503, 'DATABASE_ERROR', 'Database error', 'Please try again later.')
      }

      if (error.message.includes('Content sanitization failed') || error.message.includes('sanitization')) {
        // Use shared error handling for sanitization failures
        const sanitizationError = handleSanitizationError(error, 'pdf')
        return problem(
          sanitizationError.status,
          'SANITIZATION_ERROR',
          'Content sanitization failed',
          sanitizationError.message
        )
      }
      
      return problem(500, 'PROCESSING_ERROR', 'Processing error', error.message)
    }
    
    return problem(500, 'UNKNOWN_PROCESSING_ERROR', 'Unknown processing error occurred')
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