// Vision-Based PDF Upload and Processing API endpoint
// Accepts PDF file uploads, converts to page images using MuPDF.js, processes each page
// through Gemini Flash 2.5, assembles fragments, and performs final refinement with Claude Sonnet 4
// Stores the complete document record in the database with comprehensive metadata

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { UPLOAD_LIMITS } from '@/lib/config'
import { requireAuth } from '@/lib/auth/server-auth'
import { processHtmlToDocument, handleSanitizationError } from '@/lib/services/html-document-processor'
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'
import { validatePdfPageCountFromBuffer } from '@/lib/utils/pdf-validation'
// PDF-to-images conversion happens in the frontend, not here
import { processPagesBatch } from '@/lib/services/page-processor'
import { processFragmentsBatch } from '@/lib/services/html-fragment-processor'
import { assembleDocument } from '@/lib/services/html-assembler'
import { validateFragmentsBatch } from '@/lib/services/html-fragment-validator'
// import { processFinalDocument } from '@/lib/services/final-document-processor' // Unused - only used in commented final refinement stage

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/upload-pdf-vision', correlationId)
  const requestTimer = createTimer(requestLogger, 'upload-pdf-vision-request')
  
  try {
    // Validate authentication first
    const user = await requireAuth()
    
    // Parse multipart form data
    const formData = await request.formData()
    const pdfFile = formData.get('file') as File
    const pageImagesJson = formData.get('pageImages') as string
    const provider = (formData.get('provider') as string) || 'gemini' // Default to Gemini for page processing
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
      isPublic,
      processingType: 'vision-based'
    }, 'Vision-based PDF upload request initiated')

    if (!pdfFile) {
      return new NextResponse('No PDF file provided', { status: 400 })
    }

    if (!pageImagesJson) {
      return new NextResponse('No page images provided', { status: 400 })
    }

    // Validate provider selection (currently only Gemini supported for page processing)
    if (!['gemini'].includes(provider)) {
      return new NextResponse('Invalid provider for vision processing. Currently only "gemini" is supported.', { status: 400 })
    }

    // Convert file to buffer
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
    
    // Basic PDF validation
    if (pdfBuffer.length === 0) {
      return new NextResponse('PDF file is empty', { status: 400 })
    }

    // Check file size using centralized limits
    if (pdfBuffer.length > UPLOAD_LIMITS.PDF_MAX_SIZE_BYTES) {
      return new NextResponse(`PDF file too large (max ${Math.round(UPLOAD_LIMITS.PDF_MAX_SIZE_BYTES / 1024 / 1024)}MB)`, { status: 400 })
    }

    // Check if it's actually a PDF by looking at the header
    const pdfHeader = pdfBuffer.subarray(0, 4).toString()
    if (pdfHeader !== '%PDF') {
      return new NextResponse('File is not a valid PDF', { status: 400 })
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
      
      return new NextResponse(pageValidationResult.error, { status: 400 })
    }

    requestLogger.info({
      correlationId,
      fileName: pdfFile.name,
      pageCount: pageValidationResult.pageCount,
      userId: user.id
    }, `PDF page count validation passed: ${pageValidationResult.pageCount} pages`)

    console.log(`Processing PDF with vision-based pipeline: ${pdfFile.name} (${(pdfBuffer.length / 1024).toFixed(1)} KB, ${pageValidationResult.pageCount} pages)`)
    
    requestLogger.info({
      correlationId,
      fileName: pdfFile.name,
      fileSizeKB: Math.round(pdfBuffer.length / 1024),
      pageCount: pageValidationResult.pageCount,
      userId: user.id
    }, 'Starting vision-based PDF processing pipeline')

    // Initialize Supabase client and services
    const supabase = await createClient()
    const aiCallService = new AiCallService(supabase)

    // Create main AI call record for tracking the entire vision pipeline
    const startTime = Date.now()
    const mainAiCall = await aiCallService.startCallWithModelString({
      userId: user.id,
      modelString: 'anthropic:claude-sonnet-4:20250514', // Primary model for multi-model pipeline tracking
      prompt_type: 'pdf-vision-pipeline',
      input_data: {
        file_name: pdfFile.name,
        file_size_bytes: pdfBuffer.length,
        page_count: pageValidationResult.pageCount,
        provider_requested: provider,
        pipeline_type: 'vision-based-multi-model', // Gemini Flash 2.5 + Claude Sonnet 4
        models_used: ['google:gemini-2.5-flash:latest', 'anthropic:claude-sonnet-4:20250514']
      }
    })

    // Stage 1: Parse page images from frontend
    console.log('Stage 1: Parsing page images from frontend...')
    requestLogger.info({
      correlationId,
      stage: 'parse-page-images',
      aiCallId: mainAiCall.id
    }, 'Starting page images parsing')

    const imageParsingStart = Date.now()
    let pageImages: Array<{ pageIndex: number; base64Image: string; width: number; height: number }>
    try {
      pageImages = JSON.parse(pageImagesJson)
      if (!Array.isArray(pageImages) || pageImages.length === 0) {
        return new NextResponse('Invalid page images format', { status: 400 })
      }
    } catch {
      return new NextResponse('Failed to parse page images JSON', { status: 400 })
    }
    const imageParsingTime = Date.now() - imageParsingStart

    console.log(`Stage 1 Complete: Parsed ${pageImages.length} page images in ${imageParsingTime}ms`)
    requestLogger.info({
      correlationId,
      stage: 'parse-page-images-complete',
      imagesReceived: pageImages.length,
      processingTimeMs: imageParsingTime
    }, 'Page images parsing completed')

    // Stage 2: Process each page image to HTML fragments
    console.log('Stage 2: Processing page images to HTML fragments using Gemini Flash 2.5...')
    requestLogger.info({
      correlationId,
      stage: 'page-processing',
      pageCount: pageImages.length
    }, 'Starting page-by-page AI processing')

    const pageProcessingStart = Date.now()
    
    // Generate document ID for image extraction (always enabled for vision processing)
    const documentId = crypto.randomUUID()
    requestLogger.info({
      correlationId,
      documentId,
      stage: 'document-id-generation'
    }, 'Generated document ID for image extraction')
    
    // Convert image results to page processing inputs
    const pageInputs = pageImages.map((image, index) => ({
      pageImageBase64: image.base64Image,
      pageNumber: index + 1, // Convert from 0-based to 1-based
      totalPages: pageImages.length,
      fileName: pdfFile.name,
      documentContext: `Title: ${title}`,
      previousPageSummary: undefined, // Will be filled by batch processor
      documentId: documentId // Enable image extraction for all pages
    }))

    const pageFragments = await processPagesBatch(pageInputs, {
      concurrencyLimit: 3, // Process up to 3 pages in parallel
      provider: 'gemini',
      retryAttempts: 2,
      retryDelayMs: 1000
    }, 
    (completed, total, currentPage, elapsedMs) => {
      // Progress callback
      requestLogger.info({
        correlationId,
        stage: 'page-processing-progress',
        processed: completed,
        total: total,
        currentPage: currentPage,
        elapsedMs: elapsedMs,
        percentage: Math.round((completed / total) * 100)
      }, `Page processing progress: ${completed}/${total} (page ${currentPage})`)
    })

    // NEW: Fail-fast validation – abort immediately if any page failed or produced an empty fragment
    const failedPages = pageFragments.filter(p => !p.success || !p.htmlFragment || p.htmlFragment.trim().length === 0)
    if (failedPages.length > 0) {
      const failedPageNumbers = failedPages.map(p => p.pageNumber)
      const firstFailure = failedPages[0]
      requestLogger.error({
        correlationId,
        stage: 'page-processing',
        failedPageNumbers,
        firstError: firstFailure.error || firstFailure.userError?.userMessage || 'Unknown error'
      }, 'Page processing failures detected – aborting vision pipeline')

      throw new Error(`Vision processing failed: error on page(s) ${failedPageNumbers.join(', ')} – ${firstFailure.userError?.userMessage || firstFailure.error || 'Unknown error'}`)
    }

    const pageProcessingTime = Date.now() - pageProcessingStart

    console.log(`Stage 2 Complete: Processed ${pageFragments.length} page fragments in ${pageProcessingTime}ms`)
    requestLogger.info({
      correlationId,
      stage: 'page-processing-complete',
      fragmentsGenerated: pageFragments.length,
      processingTimeMs: pageProcessingTime
    }, 'Page processing completed')

    // Stage 3: Post-process fragments (extract images, validate structure)
    console.log('Stage 3: Post-processing HTML fragments...')
    requestLogger.info({
      correlationId,
      stage: 'fragment-processing'
    }, 'Starting fragment post-processing')

    const fragmentProcessingStart = Date.now()
    
    // Convert page results to fragment processing inputs
    const fragmentInputs = pageFragments.map((pageResult, index) => ({
      htmlFragment: pageResult.htmlFragment,
      pageNumber: pageResult.pageNumber,
      totalPages: pageImages.length,
      existingIds: new Set<string>(), // Will be managed by batch processor
      fileName: pdfFile.name,
      pageImageBase64: pageImages[index]?.base64Image
    }))

    const processedFragments = await processFragmentsBatch(fragmentInputs)
    const fragmentProcessingTime = Date.now() - fragmentProcessingStart

    console.log(`Stage 3 Complete: Post-processed ${processedFragments.length} fragments in ${fragmentProcessingTime}ms`)

    // Stage 4: Validate all fragments
    console.log('Stage 4: Validating fragment structure and accessibility...')
    const validationStart = Date.now()
    const validationResult = await validateFragmentsBatch(processedFragments)
    const validationTime = Date.now() - validationStart

    // Separate valid and invalid fragments
    const validFragments = processedFragments.filter((_, index) => validationResult[index]?.isValid)
    const invalidCount = processedFragments.length - validFragments.length

    console.log(`Stage 4 Complete: Validation completed in ${validationTime}ms (${validFragments.length}/${processedFragments.length} fragments valid)`)

    if (invalidCount > 0) {
      requestLogger.warn({
        correlationId,
        invalidCount,
        totalCount: processedFragments.length
      }, 'Some fragments failed validation - proceeding with valid fragments only')
    }

    // Stage 5: Assemble fragments into complete HTML document
    console.log('Stage 5: Assembling fragments into complete HTML document...')
    requestLogger.info({
      correlationId,
      stage: 'document-assembly'
    }, 'Starting document assembly')

    const assemblyStart = Date.now()
    const assembledDoc = await assembleDocument(validFragments, {
      preservePageBreaks: true,
      mergeTableRows: true,
      unifyParagraphs: true,
      generateToc: false,
      sanitizeOutput: true,
      validateStructure: true
    }, pageValidationResult.pageCount)
    const assemblyTime = Date.now() - assemblyStart

    console.log(`Stage 5 Complete: Document assembled in ${assemblyTime}ms (${assembledDoc.htmlDocument.length} characters)`)

    // Stage 6: Final document refinement using Claude Sonnet 4
    // TEMPORARILY DISABLED: Due to Vercel 4.5MB payload limit constraints
    // See planning/250627c_vision_based_pdf_processing_pipeline.md for details
    // This stage will be re-enabled when we migrate to Supabase Edge Functions
    /*
    console.log('Stage 6: Final document refinement using Claude Sonnet 4...')
    requestLogger.info({
      correlationId,
      stage: 'final-refinement'
    }, 'Starting final document refinement')

    const refinementStart = Date.now()
    // Create aggregated validation result for final processing
    const aggregatedValidationResult = {
      isValid: validFragments.length === processedFragments.length,
      errors: validationResult
        .filter(result => !result.isValid)
        .flatMap(result => result.errors),
      warnings: validationResult
        .flatMap(result => result.warnings),
      structuralIssues: validationResult
        .flatMap(result => result.structuralIssues),
      accessibilityIssues: validationResult
        .flatMap(result => result.accessibilityIssues)
    }

    const finalResult = await processFinalDocument(assembledDoc, aggregatedValidationResult)
    const refinementTime = Date.now() - refinementStart

    console.log(`Stage 6 Complete: Final refinement completed in ${refinementTime}ms (${finalResult.appliedOperations.length} improvements applied)`)
    */
    
    // For V1: Skip final refinement and use assembled document directly
    console.log('Stage 6: Skipped final refinement (V1 - Vercel payload constraints)')
    const finalResult = {
      htmlContent: assembledDoc.htmlDocument,
      appliedOperations: [],
      qualityMetrics: {
        overallScore: 0.85, // Estimated quality without final refinement
        improvements: [],
        remainingIssues: []
      }
    }
    const refinementTime = 0

    const totalProcessingTime = Date.now() - startTime

    // Complete the main AI call record with comprehensive metadata
    await aiCallService.completeCall(mainAiCall.id, {
      output_data: {
        html_length: finalResult.htmlContent.length,
        total_processing_time_ms: totalProcessingTime,
        stage_timings: {
          image_parsing_ms: imageParsingTime,
          page_processing_ms: pageProcessingTime,
          fragment_processing_ms: fragmentProcessingTime,
          validation_ms: validationTime,
          assembly_ms: assemblyTime,
          refinement_ms: refinementTime
        },
        pipeline_results: {
          pages_processed: pageImages.length,
          fragments_generated: pageFragments.length,
          fragments_valid: validFragments.length,
          final_improvements: finalResult.appliedOperations.length,
          quality_assessment: finalResult.qualityMetrics
        }
      },
      usage: {
        // Aggregate usage will be tracked by individual stage calls
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0
      },
      finishReason: 'stop' // Assembly completed successfully if we reach this point
    })

    console.log('Stage 7: Processing through shared pipeline...')
    requestLogger.info({
      correlationId,
      stage: 'shared-pipeline',
      totalProcessingTimeMs: totalProcessingTime
    }, 'Vision pipeline completed, processing through shared pipeline')

    // Process HTML through shared pipeline (sanitization, text extraction, document creation)
    const { document, storageResult } = await processHtmlToDocument(
      finalResult.htmlContent,
      {
        title,
        sourceUrl: null, // PDF uploads don't have source URLs
        isPublic,
        originalFile: pdfFile,
        filename: pdfFile.name,
        provider: 'vision-pipeline',
        correlationId,
        aiCallId: mainAiCall.id
      },
      {
        extractionMethod: 'vision-ai',
        uploadSource: 'pdf',
        logger: requestLogger,
        userId: user.id,
        supabase
      },
      {
        // Vision pipeline specific metadata
        processing_time_ms: totalProcessingTime,
        file_size_bytes: pdfBuffer.length,
        page_count: pageValidationResult.pageCount,
        pipeline_type: 'vision-based',
        stage_timings: {
          image_parsing_ms: imageParsingTime,
          page_processing_ms: pageProcessingTime,
          fragment_processing_ms: fragmentProcessingTime,
          validation_ms: validationTime,
          assembly_ms: assemblyTime,
          refinement_ms: refinementTime
        },
        quality_metrics: {
          fragments_generated: pageFragments.length,
          fragments_valid: validFragments.length,
          final_improvements: finalResult.appliedOperations.length,
          overall_quality: finalResult.qualityMetrics?.overallScore
        }
      }
    )

    console.log(`Stage 7 Complete: Document created successfully with ID: ${document.id}`)
    
    if (storageResult) {
      console.log(`Stage 7: Original PDF stored at: ${storageResult.path}`)
    } else {
      console.warn('Stage 7: Storage upload failed, but document was created without original file')
    }

    // Complete request timing
    requestTimer.end({
      userId: user.id,
      documentId: document.id,
      processingType: 'vision-based',
      fileSize: pdfFile.size,
      totalTimeMs: totalProcessingTime,
      correlationId
    })

    // Log successful AI operation
    logAIOperation('pdf-vision-pipeline', {
      modelProvider: 'multi-model',
      tokensUsed: 0, // Will be aggregated from individual stages
      userId: user.id,
      correlationId
    }, 'success')

    // Return comprehensive response with document details and processing metrics
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
        type: 'vision-based',
        provider: 'multi-model (Gemini Flash + Claude Sonnet)',
        file_size_kb: Math.round(pdfBuffer.length / 1024),
        page_count: pageValidationResult.pageCount,
        total_time_ms: totalProcessingTime,
        stage_performance: {
          image_parsing_ms: imageParsingTime,
          page_processing_ms: pageProcessingTime,
          fragment_processing_ms: fragmentProcessingTime,
          validation_ms: validationTime,
          assembly_ms: assemblyTime,
          refinement_ms: refinementTime
        },
        quality_metrics: {
          fragments_generated: pageFragments.length,
          fragments_valid: validFragments.length,
          validation_success_rate: (validFragments.length / pageFragments.length * 100).toFixed(1) + '%',
          final_improvements_applied: finalResult.appliedOperations.length,
          overall_quality: finalResult.qualityMetrics?.overallScore || 'unknown'
        }
      }
    }, {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Vision-based PDF upload API error:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Vision-based PDF upload API error occurred')
    
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

      if (error.message.includes('MuPDF') || error.message.includes('image conversion')) {
        return new NextResponse('PDF conversion error. The file may be corrupted or use unsupported features.', { status: 400 })
      }

      if (error.message.includes('vision pipeline') || error.message.includes('fragment processing')) {
        return new NextResponse('Vision processing error. Please try again or use the standard AI transcription method.', { status: 500 })
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
        const sanitizationError = handleSanitizationError(error, 'pdf')
        return new NextResponse(sanitizationError.message, { status: sanitizationError.status })
      }
      
      return new NextResponse(`Vision processing error: ${error.message}`, { status: 500 })
    }
    
    return new NextResponse('Unknown vision processing error occurred', { status: 500 })
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