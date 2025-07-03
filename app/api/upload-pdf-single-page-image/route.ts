// Single Page Vision-Based PDF Processing API endpoint
// Accepts a single page image (< 4MB), processes through Gemini Flash 2.5,
// returns HTML fragment and bounding box metadata for client-side cropping
// Part of Phase 2 architecture to handle Vercel's 4.5MB limit

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { requireAuth } from '@/lib/auth/server-auth'
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'
import { processPageToHtml } from '@/lib/services/page-processor'
import { processHtmlFragment } from '@/lib/services/html-fragment-processor'
import { z } from 'zod'
import { DocumentService } from '@/lib/services/database/documents'
import { generateSlug } from '@/lib/utils/slug'
import { JSDOM } from 'jsdom'

// Request schema for single page upload
const SinglePageUploadSchema = z.object({
  pageImage: z.string().describe('Base64-encoded page image'),
  pageNumber: z.number().int().positive().describe('1-based page number'),
  totalPages: z.number().int().positive().describe('Total number of pages in document'),
  documentId: z.string().uuid().describe('Document UUID for asset organization'),
  documentTitle: z.string().describe('Document title for context'),
  fileName: z.string().describe('Original PDF filename')
})

// Response schema for single page processing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SinglePageVisionResponse = z.object({
  pageNumber: z.number().describe('Page number processed'),
  pageHtml: z.string().describe('HTML fragment with rewritten image URLs'),
  extractedImages: z.array(z.object({
    elementId: z.string().describe('HTML element ID'),
    filename: z.string().describe('Generated filename for storage'),
    storagePath: z.string().describe('Full storage path for upload'),
    boundingBox: z.object({
      x: z.number().describe('Normalized X coordinate (0-1)'),
      y: z.number().describe('Normalized Y coordinate (0-1)'),
      width: z.number().describe('Normalized width (0-1)'),
      height: z.number().describe('Normalized height (0-1)')
    }).describe('Bounding box for client-side cropping'),
    caption: z.string().optional().describe('AI-generated caption if available'),
    altText: z.string().optional().describe('Alt text for accessibility')
  })).describe('Images to extract and upload'),
  success: z.boolean(),
  error: z.string().optional()
})

// Payload size validation helper
// Note: Content-Length can be spoofed or missing, so we also validate actual content size
function validatePayloadSize(contentLength: string | null, maxSizeBytes: number = 4 * 1024 * 1024): { valid: boolean; error?: string } {
  // Content-Length is optional but if provided, use it for early rejection
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (!isNaN(size) && size > maxSizeBytes) {
      return { 
        valid: false, 
        error: `Payload too large: ${Math.round(size / 1024 / 1024 * 10) / 10}MB (max ${Math.round(maxSizeBytes / 1024 / 1024)}MB)` 
      }
    }
  }
  
  // Will perform actual content validation after parsing
  return { valid: true }
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/upload-pdf-single-page-image', correlationId)
  const requestTimer = createTimer(requestLogger, 'single-page-vision-request')
  
  try {
    // Validate authentication first
    const user = await requireAuth()
    
    // Validate payload size before parsing
    const contentLength = request.headers.get('content-length')
    const sizeValidation = validatePayloadSize(contentLength)
    if (!sizeValidation.valid) {
      requestLogger.warn({
        correlationId,
        userId: user.id,
        error: sizeValidation.error,
        contentLength
      }, 'Payload size validation failed')
      return new NextResponse(sizeValidation.error, { status: 400 })
    }

    // Parse JSON body
    const body = await request.json()
    
    // Validate request body
    const validationResult = SinglePageUploadSchema.safeParse(body)
    if (!validationResult.success) {
      requestLogger.warn({
        correlationId,
        userId: user.id,
        errors: validationResult.error.errors
      }, 'Request validation failed')
      return new NextResponse(`Invalid request: ${validationResult.error.errors.map(e => e.message).join(', ')}`, { status: 400 })
    }

    const { pageImage, pageNumber, totalPages, documentId, documentTitle, fileName } = validationResult.data

    requestLogger.info({
      method: 'POST',
      userId: user.id,
      userEmail: user.email,
      documentId,
      pageNumber,
      totalPages,
      fileName,
      documentTitle,
      imageDataLength: pageImage.length,
      processingType: 'single-page-vision'
    }, 'Single page vision processing request initiated')

    // Additional validation: check actual base64 size
    // Base64 encoding uses 4 characters to represent 3 bytes
    // So the actual decoded size is (base64Length * 3/4)
    // We also need to account for padding characters
    const base64WithoutPrefix = pageImage.replace(/^data:image\/[a-z]+;base64,/, '')
    const paddingCount = (base64WithoutPrefix.match(/=+$/) || [''])[0].length
    const actualDecodedSize = (base64WithoutPrefix.length * 3 / 4) - paddingCount
    
    if (actualDecodedSize > 4 * 1024 * 1024) {
      requestLogger.warn({
        correlationId,
        userId: user.id,
        base64Length: pageImage.length,
        actualDecodedSize,
        maxSize: 4 * 1024 * 1024
      }, 'Page image too large after decoding')
      return new NextResponse(`Page image too large: ${Math.round(actualDecodedSize / 1024 / 1024 * 10) / 10}MB (max 4MB)`, { status: 400 })
    }

    // Initialize Supabase client and services
    const supabase = await createClient()
    const aiCallService = new AiCallService(supabase)

    // ---------------------------------------------------------------------------
    // Ensure a draft document row exists BEFORE the client begins cropping &
    // uploading image assets.  The document_assets RLS policy requires that a
    // parent document row exists and is owned by the current user.  Without
    // this, client-side inserts will silently fail and the finaliser will error
    // with "Images were detected but none were uploaded".
    // ---------------------------------------------------------------------------
    try {
      const docSvc = new DocumentService(supabase)
      const existing = await docSvc.getById(documentId)

      if (!existing) {
        // Create a minimal draft row.  Required NOT NULL fields are populated
        // with placeholder values.  `is_draft` acts as the flag – any non-null
        // value indicates the row is still a draft.
        const draftSlug = generateSlug(documentTitle) || documentId

        await supabase.from('documents').insert({
          id: documentId,
          created_by: user.id,
          title: documentTitle,
          slug: draftSlug,
          html_content: '',
          plaintext_content: '',
          is_draft: 'draft',
          is_public: false
        })
        requestLogger.info({ correlationId, documentId }, 'Draft document row created for vision upload')
      }
    } catch (draftErr) {
      // If we get a duplicate-key or RLS violation here it means another request
      // already created the draft or the row exists – safe to continue.
      requestLogger.debug({ correlationId, error: draftErr instanceof Error ? draftErr.message : draftErr }, 'Draft creation skipped')
    }

    // Create AI call record for this page
    const startTime = Date.now()
    const aiCall = await aiCallService.startCallWithModelString({
      userId: user.id,
      modelString: 'google:gemini-2.5-flash:latest',
      prompt_type: 'page_to_html',
      input_data: {
        document_id: documentId,
        page_number: pageNumber,
        total_pages: totalPages,
        file_name: fileName,
        document_title: documentTitle
      }
    })

    requestLogger.info({
      correlationId,
      stage: 'page-processing',
      aiCallId: aiCall.id,
      pageNumber
    }, 'Starting single page AI processing')

    // Process the page through Gemini Flash 2.5
    const pageProcessingStart = Date.now()
    
    // Build page processing input
    // NOTE: We intentionally omit `documentId` so that server-side image extraction
    // is **disabled** (Phase 2 architecture). The client will perform cropping &
    // storage uploads. We still include all other context needed for accurate
    // bounding-box detection.
    const pageInput = {
      pageImageBase64: pageImage,
      pageNumber,
      totalPages,
      fileName,
      documentContext: `Title: ${documentTitle}`,
      previousPageSummary: undefined // Not available in single-page processing
      // documentId intentionally omitted to skip extraction
    }

    // Process the page
    const pageResult = await processPageToHtml(pageInput, 'gemini')
    
    if (!pageResult.success || !pageResult.htmlFragment) {
      throw new Error(pageResult.userError?.userMessage || pageResult.error || 'Page processing failed')
    }

    const pageProcessingTime = Date.now() - pageProcessingStart

    requestLogger.info({
      correlationId,
      stage: 'page-processing-complete',
      pageNumber,
      processingTimeMs: pageProcessingTime,
      fragmentLength: pageResult.htmlFragment.length
    }, 'Page processing completed')

    // Post-process the fragment to extract image metadata
    const fragmentProcessingStart = Date.now()
    
    const fragmentInput = {
      htmlFragment: pageResult.htmlFragment,
      pageNumber,
      totalPages,
      existingIds: new Set<string>(),
      fileName,
      pageImageBase64: pageImage
    }

    const processedFragment = await processHtmlFragment(fragmentInput)
    const fragmentProcessingTime = Date.now() - fragmentProcessingStart

    requestLogger.info({
      correlationId,
      stage: 'fragment-processing-complete',
      pageNumber,
      processingTimeMs: fragmentProcessingTime,
      imageCount: processedFragment.extractedImages.length
    }, 'Fragment processing completed')

    // Generate filenames for each image WITHOUT doing actual extraction
    const extractedImages: Array<{
      elementId: string
      filename: string
      storagePath: string
      boundingBox: { x: number; y: number; width: number; height: number }
      caption?: string
      altText?: string
    }> = []
    
    const existingFilenames = new Set<string>()
    
    for (const imageData of processedFragment.extractedImages) {
      // For Phase 2, we generate filenames but don't extract/store images
      // That will be done client-side
      
      // Generate filename using the same logic as Phase 1
      let baseFilename: string
      // let source: 'caption' | 'altText' | 'deterministic' // Currently unused but could be used for debugging
      
      if (imageData.caption) {
        // Use AI-generated caption
        baseFilename = imageData.caption.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 50)
      } else if (imageData.altText) {
        // Fallback to alt text
        baseFilename = imageData.altText.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 50)
      } else {
        // Final fallback: deterministic ID based on page + bbox
        const bboxString = `${imageData.bbox.x1}_${imageData.bbox.y1}_${imageData.bbox.x2}_${imageData.bbox.y2}`
        baseFilename = `img-page${pageNumber}-${bboxString.replace(/\./g, '')}`
      }
      
      // Ensure unique filename
      let filename = `${baseFilename}.png`
      let counter = 1
      while (existingFilenames.has(filename)) {
        filename = `${baseFilename}-${counter}.png`
        counter++
      }
      existingFilenames.add(filename)
      
      const storagePath = `documents/${documentId}/assets/${filename}`

      const imageEntry: {
        elementId: string
        filename: string
        storagePath: string
        boundingBox: { x: number; y: number; width: number; height: number }
        caption?: string
        altText?: string
      } = {
        elementId: imageData.elementId,
        filename,
        storagePath,
        boundingBox: {
          x: imageData.bbox.x1,
          y: imageData.bbox.y1,
          width: imageData.bbox.x2 - imageData.bbox.x1,
          height: imageData.bbox.y2 - imageData.bbox.y1
        }
      }
      
      // Only add optional fields if they exist
      if (imageData.caption) {
        imageEntry.caption = imageData.caption
      }
      if (imageData.altText) {
        imageEntry.altText = imageData.altText
      }
      
      extractedImages.push(imageEntry)
    }

    // Rewrite image URLs in HTML to point to storage paths using JSDOM
    const dom = new JSDOM(processedFragment.htmlFragment)
    const document = dom.window.document
    
    extractedImages.forEach(image => {
      // Find img element with the matching ID
      const img = document.getElementById(image.elementId)
      if (img && img.tagName === 'IMG') {
        img.setAttribute('src', image.storagePath)
        
        // Also update data-src if present (for lazy loading)
        if (img.hasAttribute('data-src')) {
          img.setAttribute('data-src', image.storagePath)
        }
      }
    })
    
    // Serialize back to HTML
    const updatedHtml = dom.serialize()

    const totalProcessingTime = Date.now() - startTime

    // Complete the AI call record
    await aiCallService.completeCall(aiCall.id, {
      output_data: {
        page_number: pageNumber,
        html_length: updatedHtml.length,
        images_extracted: extractedImages.length,
        processing_time_ms: totalProcessingTime
      },
      usage: pageResult.tokenUsage ? {
        totalTokens: pageResult.tokenUsage.totalTokens,
        promptTokens: pageResult.tokenUsage.promptTokens,
        completionTokens: pageResult.tokenUsage.completionTokens,
        ...(pageResult.tokenUsage.reasoningTokens !== undefined && {
          reasoningTokens: pageResult.tokenUsage.reasoningTokens
        })
      } : {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0
      },
      finishReason: 'stop'
    })

    // Complete request timing
    requestTimer.end({
      userId: user.id,
      documentId,
      pageNumber,
      processingType: 'single-page-vision',
      totalTimeMs: totalProcessingTime,
      correlationId
    })

    // Log successful AI operation
    logAIOperation('page-to-html-fragment', {
      modelProvider: 'gemini',
      tokensUsed: pageResult.tokenUsage?.totalTokens || 0,
      userId: user.id,
      correlationId
    }, 'success')

    // Return response conforming to schema
    const response: z.infer<typeof SinglePageVisionResponse> = {
      pageNumber,
      pageHtml: updatedHtml,
      extractedImages,
      success: true
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Single page vision processing error:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Single page vision processing error occurred')
    
    // Handle authentication errors
    if (error instanceof Error) {
      if (error.message.includes('Authentication failed') || error.message.includes('User not authenticated')) {
        return new NextResponse('Authentication required', { status: 401 })
      }
      
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return new NextResponse('AI service rate limit exceeded. Please try again later.', { status: 429 })
      }
      
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return new NextResponse('AI service configuration error', { status: 503 })
      }
      
      if (error.message.includes('timeout')) {
        return new NextResponse('Request timeout processing page', { status: 504 })
      }

      // Return error response conforming to schema
      const errorResponse: z.infer<typeof SinglePageVisionResponse> = {
        pageNumber: 0,
        pageHtml: '',
        extractedImages: [],
        success: false,
        error: error.message
      }
      
      return NextResponse.json(errorResponse, { status: 500 })
    }
    
    // Generic error response
    const errorResponse: z.infer<typeof SinglePageVisionResponse> = {
      pageNumber: 0,
      pageHtml: '',
      extractedImages: [],
      success: false,
      error: 'Unknown error occurred'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
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