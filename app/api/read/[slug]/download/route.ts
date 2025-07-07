// Original Document File Download API endpoint
// Serves original PDF files from Supabase Storage with proper access control

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { requireAuth } from '@/lib/auth/server-auth'
import { getCurrentUserAdminStatus } from '@/lib/auth/admin-utils'
import { createRequestLogger, generateCorrelationId, createTimer } from '@/lib/services/logger'
import { createProblemDetail } from '@/lib/api/error-utils'

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/read/[slug]/download', correlationId)
  
  try {
    // Validate authentication first
    const user = await requireAuth({ allowBearer: true, request })
    
    const { slug } = await context.params

    if (!slug) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/invalid-input',
        title: 'Document slug required',
        status: 400,
        detail: 'Document slug is required.',
        correlationId
      })
    }

    console.log(`Downloading original file for document: ${slug}`)
    
    requestLogger.info({
      method: 'GET',
      documentSlug: slug,
      userId: user.id,
      userEmail: user.email,
      correlationId
    }, 'Document download request initiated')

    // Initialize Supabase client and document service
    const supabase = await getSupabaseServerClient(request, { allowBearer: true })
    const documentService = new DocumentService(supabase)

    // Get document by slug
    const document = await documentService.getBySlug(slug)
    
    if (!document) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/document-not-found',
        title: 'Document not found',
        status: 404,
        detail: 'Document not found.',
        correlationId
      })
    }

    // Check if user owns the document or has admin access
    const isOwned = await documentService.isOwnedByUser(document.id, user.id)
    const adminStatus = await getCurrentUserAdminStatus()
    
    requestLogger.info({
      correlationId,
      documentId: document.id,
      isOwned,
      isAdmin: adminStatus.isAdmin
    }, 'Checking document access permissions')
    
    if (!isOwned && !adminStatus.isAdmin) {
      requestLogger.warn({
        correlationId,
        documentId: document.id,
        userId: user.id
      }, 'Access denied - user does not own document and is not admin')
      
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/permission-denied',
        title: 'Access denied',
        status: 403,
        detail: 'Access denied.',
        correlationId
      })
    }

    // Check if document has an original file
    if (!document.storage_path) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/file-not-found',
        title: 'Original file unavailable',
        status: 404,
        detail: 'Original file not available for this document.',
        correlationId
      })
    }

    console.log(`Retrieving original file from storage: ${document.storage_path}`)
    
    requestLogger.info({
      correlationId,
      documentId: document.id,
      storagePath: document.storage_path
    }, 'Starting file retrieval from storage')
    
    const downloadTimer = createTimer(requestLogger, 'file-download')

    // Get the original file from storage
    const originalFile = await documentService.getOriginalFile(document.id)
    
    if (!originalFile) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/file-not-found',
        title: 'File retrieval failed',
        status: 500,
        detail: 'Original file could not be retrieved from storage.',
        correlationId
      })
    }

    // Determine filename for download
    const originalFilename = document.storage_path.split('/').pop() || `${document.title}.pdf`
    const downloadFilename = originalFilename.includes('.') ? originalFilename : `${originalFilename}.pdf`

    // Convert blob to array buffer for response
    const fileBuffer = await originalFile.arrayBuffer()

    console.log(`Serving original file: ${downloadFilename} (${Math.round(fileBuffer.byteLength / 1024)} KB)`)
    
    const downloadTime = downloadTimer.end({
      documentId: document.id,
      fileSizeKB: Math.round(fileBuffer.byteLength / 1024),
      filename: downloadFilename
    })
    
    requestLogger.info({
      correlationId,
      documentId: document.id,
      filename: downloadFilename,
      fileSizeKB: Math.round(fileBuffer.byteLength / 1024),
      downloadTimeMs: downloadTime
    }, 'File download completed successfully')

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': document.original_file_type || 'application/pdf',
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        'X-Document-ID': document.id,
        'X-Document-Title': document.title
      }
    })

  } catch (error) {
    console.error('Download original file API error:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Download original file API error occurred')
    
    if (error instanceof Error) {
      // Handle authentication errors first
      if (error.message.includes('Authentication failed') || error.message.includes('User not authenticated')) {
        return createProblemDetail({
          type: 'https://www.spideryarn.com/probs/auth-required',
          title: 'Authentication required',
          status: 401,
          detail: 'Authentication required.',
          correlationId
        })
      }
      
      if (error.message.includes('not found') || error.message.includes('PGRST116')) {
        return createProblemDetail({
          type: 'https://www.spideryarn.com/probs/document-not-found',
          title: 'Document or file not found',
          status: 404,
          detail: 'Document or file not found.',
          correlationId
        })
      }
      
      if (error.message.includes('storage') || error.message.includes('bucket')) {
        return createProblemDetail({
          type: 'https://www.spideryarn.com/probs/storage-service-error',
          title: 'Storage service error',
          status: 503,
          detail: 'Storage service error. Please try again later.',
          correlationId,
          retryable: true
        })
      }

      if (error.message.includes('permission') || error.message.includes('access')) {
        return createProblemDetail({
          type: 'https://www.spideryarn.com/probs/permission-denied',
          title: 'Access denied',
          status: 403,
          detail: 'Access denied.',
          correlationId
        })
      }
      
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/internal-server-error',
        title: 'Download error',
        status: 500,
        detail: `Download error: ${error.message}`,
        correlationId
      })
    }
    
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/internal-server-error',
      title: 'Unknown download error',
      status: 500,
      detail: 'Unknown download error occurred',
      correlationId
    })
  }
}

// Alternative endpoint for direct file access via signed URL
export async function HEAD(request: NextRequest, context: RouteContext) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/read/[slug]/download', correlationId)
  
  try {
    // Validate authentication first
    const user = await requireAuth({ allowBearer: true, request })
    
    const { slug } = await context.params

    if (!slug) {
      return new NextResponse(null, { status: 400 })
    }
    
    requestLogger.info({
      method: 'HEAD',
      documentSlug: slug,
      userId: user.id,
      correlationId
    }, 'Document HEAD request for signed URL initiated')

    // Initialize services
    const supabase = await getSupabaseServerClient(request, { allowBearer: true })
    const documentService = new DocumentService(supabase)

    // Get document by slug
    const document = await documentService.getBySlug(slug)
    
    if (!document || !document.storage_path) {
      return new NextResponse(null, { status: 404 })
    }
    
    // Check if user owns the document or has admin access
    const isOwned = await documentService.isOwnedByUser(document.id, user.id)
    const adminStatus = await getCurrentUserAdminStatus()
    
    if (!isOwned && !adminStatus.isAdmin) {
      return new NextResponse(null, { status: 404 }) // Use 404 to prevent information leakage
    }

    // Get file metadata without downloading the full file
    const signedUrl = await documentService.getOriginalFileUrl(document.id, 3600) // 1 hour expiry
    
    if (!signedUrl) {
      return new NextResponse(null, { status: 404 })
    }

    // Return headers with signed URL for client-side redirect
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Signed-URL': signedUrl,
        'X-Expires-In': '3600',
        'Content-Type': document.original_file_type || 'application/pdf',
        'Cache-Control': 'private, max-age=60' // Short cache for signed URLs
      }
    })

  } catch (error) {
    console.error('Head original file API error:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'HEAD original file API error occurred')
    
    return new NextResponse(null, { status: 500 })
  }
}

// Add CORS headers if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}