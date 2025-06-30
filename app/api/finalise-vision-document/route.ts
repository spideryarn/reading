/**
 * Finalise Vision Document API endpoint
 * 
 * This is the final step in the Phase 2 vision-based PDF processing pipeline.
 * It receives the assembled HTML document and metadata from the browser after
 * all pages have been processed and images uploaded directly to Supabase Storage.
 * 
 * The endpoint:
 * 1. Validates that all expected assets are present
 * 2. Creates the document record with the assembled HTML
 * 3. Enqueues the document for shared processing (text extraction, enhancements, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { documentAssetsService } from '@/lib/services/database/document-assets'
import { requireAuth } from '@/lib/auth/server-auth'
import { processHtmlToDocument, handleSanitizationError } from '@/lib/services/html-document-processor'
import { createRequestLogger, generateCorrelationId } from '@/lib/services/logger'
import { z } from 'zod'

// Request body schema
const FinalisationRequestSchema = z.object({
  documentId: z.string().uuid('Invalid document ID format'),
  html: z.string().min(1, 'HTML content is required'),
  pageCount: z.number().int().positive('Page count must be a positive integer'),
  title: z.string().min(1, 'Document title is required'),
  filename: z.string().min(1, 'Filename is required'),
  isPublic: z.boolean().default(false)
})

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/finalise-vision-document', correlationId)
  
  try {
    // Validate authentication
    const user = await requireAuth()
    
    requestLogger.info({
      method: 'POST',
      userId: user.id,
      userEmail: user.email
    }, 'Vision document finalisation request initiated')

    // Parse and validate request body
    const body = await request.json()
    const validationResult = FinalisationRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      requestLogger.warn({
        correlationId,
        errors: validationResult.error.errors,
        userId: user.id
      }, 'Request validation failed')
      
      return NextResponse.json({
        error: 'Invalid request data',
        details: validationResult.error.errors
      }, { status: 400 })
    }
    
    const { documentId, html, pageCount, title, filename, isPublic } = validationResult.data
    
    requestLogger.info({
      correlationId,
      documentId,
      htmlLength: html.length,
      pageCount,
      title,
      filename,
      isPublic
    }, 'Processing document finalisation')
    
    // Initialize Supabase client
    const supabase = await createClient()
    
    // Step 1: Validate that the expected number of image assets exist
    requestLogger.info({
      correlationId,
      documentId,
      step: 'asset-validation'
    }, 'Validating document assets')
    
    const documentAssets = await documentAssetsService.getByDocumentIdAndType(documentId, 'image')
    const assetStats = await documentAssetsService.getDocumentAssetStats(documentId)
    
    requestLogger.info({
      correlationId,
      documentId,
      totalAssets: assetStats.totalAssets,
      imageAssets: documentAssets.length,
      expectedPages: pageCount,
      totalStorageSize: assetStats.totalStorageSize
    }, 'Asset validation results')
    
    // Fatal error: If HTML contains images, we must have corresponding assets
    if (assetStats.totalAssets === 0 && html.includes('<img')) {
      requestLogger.error({
        correlationId,
        documentId,
        htmlHasImages: true,
        storedAssets: 0
      }, 'FATAL: HTML contains images but no assets were uploaded to storage')
      
      return NextResponse.json({
        error: 'Document processing failed: Images were detected in the document but none were uploaded to storage',
        details: 'This indicates a failure in the image extraction and upload pipeline. All images must be successfully uploaded before document finalisation.',
        debugInfo: {
          documentId,
          expectedImages: 'detected in HTML',
          actualAssets: 0,
          correlationId
        }
      }, { status: 422 })
    }
    
    // Validate that all img tags have valid Supabase Storage URLs
    const imgTags = html.match(/<img[^>]+src="[^"]*"/g) || []
    if (imgTags.length > 0) {
      const invalidImages = imgTags.filter(tag => {
        const srcMatch = tag.match(/src="([^"]*)"/)
        if (!srcMatch) return true
        const src = srcMatch[1]
        // Check if it's a valid Supabase Storage URL for this document
        return !src.includes('/storage/v1/object/public/') || !src.includes(`/${documentId}/assets/`)
      })
      
      if (invalidImages.length > 0) {
        requestLogger.error({
          correlationId,
          documentId,
          totalImages: imgTags.length,
          invalidImages: invalidImages.length,
          sampleInvalidImage: invalidImages[0]
        }, 'FATAL: HTML contains images with invalid storage URLs')
        
        return NextResponse.json({
          error: 'Document processing failed: Images with invalid storage URLs detected',
          details: `Found ${invalidImages.length} images that don't reference valid Supabase Storage URLs for this document. All images must be uploaded to storage before finalisation.`,
          debugInfo: {
            documentId,
            totalImages: imgTags.length,
            invalidImages: invalidImages.length,
            expectedUrlPattern: `*/storage/v1/object/public/*/${documentId}/assets/*`,
            correlationId
          }
        }, { status: 422 })
      }
    }
    
    // Step 2: Check if document already exists (prevent duplicate finalisation)
    const documentService = new DocumentService(supabase)
    const existingDocument = await documentService.getById(documentId)
    
    if (existingDocument) {
      requestLogger.warn({
        correlationId,
        documentId,
        existingCreatedAt: existingDocument.created_at
      }, 'Document already exists - preventing duplicate finalisation')
      
      return NextResponse.json({
        error: 'Document has already been finalised',
        documentId: documentId
      }, { status: 409 })
    }
    
    // Step 3: Process HTML through shared pipeline with explicit document ID
    requestLogger.info({
      correlationId,
      documentId,
      step: 'shared-pipeline'
    }, 'Processing through shared document pipeline')
    
    const { document, storageResult } = await processHtmlToDocument(
      html,
      {
        title,
        isPublic,
        filename: filename || 'document',
        provider: 'vision-pipeline',
        correlationId,
        documentId // Pass the explicit document ID
      },
      {
        extractionMethod: 'vision-ai-phase2',
        uploadSource: 'pdf',
        logger: requestLogger,
        userId: user.id,
        supabase
      },
      {
        // Vision pipeline Phase 2 specific metadata
        page_count: pageCount,
        assets_uploaded: assetStats.totalAssets,
        image_assets: documentAssets.length,
        total_storage_bytes: assetStats.totalStorageSize,
        pipeline_phase: 2,
        processing_method: 'client-side-assembly'
      }
    )
    
    requestLogger.info({
      correlationId,
      documentId: document.id,
      step: 'finalisation-complete'
    }, 'Vision document finalisation completed successfully')
    
    // Return success response
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        slug: document.slug,
        word_count: document.word_count,
        created_at: document.created_at
      },
      assets: {
        total: assetStats.totalAssets,
        images: documentAssets.length,
        totalSizeBytes: assetStats.totalStorageSize
      },
      processing: {
        method: 'vision-phase2-finalisation',
        pageCount: pageCount,
        correlationId
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Vision document finalisation error:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Vision document finalisation error occurred')
    
    // Handle specific errors with clear, debuggable messages
    if (error instanceof Error) {
      if (error.message.includes('Authentication failed') || error.message.includes('User not authenticated')) {
        return NextResponse.json({ 
          error: 'Authentication required to finalise document',
          details: 'User session expired or invalid. Please log in again.',
          debugInfo: { correlationId }
        }, { status: 401 })
      }
      
      if (error.message.includes('Failed to get document assets')) {
        return NextResponse.json({ 
          error: 'FATAL: Asset validation failed',
          details: 'Unable to retrieve document assets from storage. This indicates a database or storage service issue.',
          debugInfo: { 
            correlationId,
            errorMessage: error.message,
            stack: error.stack 
          }
        }, { status: 500 })
      }
      
      if (error.message.includes('Content sanitization failed') || error.message.includes('sanitization')) {
        const sanitizationError = handleSanitizationError(error, 'pdf')
        return NextResponse.json({ 
          error: sanitizationError.message,
          debugInfo: { correlationId }
        }, { status: sanitizationError.status })
      }
      
      if (error.message.includes('Failed to create document')) {
        return NextResponse.json({ 
          error: 'FATAL: Document storage failed',
          details: 'Unable to store document in database. This indicates a database service issue.',
          debugInfo: { 
            correlationId,
            errorMessage: error.message,
            stack: error.stack 
          }
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: 'FATAL: Document finalisation failed',
        details: 'An unexpected error occurred during document processing. Check server logs for details.',
        debugInfo: { 
          correlationId,
          errorMessage: error.message,
          stack: error.stack 
        }
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: 'FATAL: Unknown error during document finalisation',
      details: 'An unknown error occurred. Check server logs for details.',
      debugInfo: { correlationId }
    }, { status: 500 })
  }
}

// CORS headers for development
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