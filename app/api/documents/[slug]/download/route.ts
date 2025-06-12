// Original Document File Download API endpoint
// Serves original PDF files from Supabase Storage with proper access control

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { validateAuth } from '@/lib/auth/server-auth'
import { getCurrentUserAdminStatus } from '@/lib/auth/admin-utils'

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Validate authentication first
    const user = await validateAuth()
    
    const { slug } = await context.params

    if (!slug) {
      return new NextResponse('Document slug is required', { status: 400 })
    }

    console.log(`Downloading original file for document: ${slug}`)

    // Initialize Supabase client and document service
    const supabase = await createClient()
    const documentService = new DocumentService(supabase)

    // Get document by slug
    const document = await documentService.getBySlug(slug)
    
    if (!document) {
      return new NextResponse('Document not found', { status: 404 })
    }

    // Check if user owns the document or has admin access
    const isOwned = await documentService.isOwnedByUser(document.id, user.id)
    const adminStatus = await getCurrentUserAdminStatus()
    
    if (!isOwned && !adminStatus.isAdmin) {
      return new NextResponse('Document not found', { status: 404 }) // Use 404 to prevent information leakage
    }

    // Check if document has an original file
    if (!document.storage_path) {
      return new NextResponse('Original file not available for this document', { status: 404 })
    }

    console.log(`Retrieving original file from storage: ${document.storage_path}`)

    // Get the original file from storage
    const originalFile = await documentService.getOriginalFile(document.id)
    
    if (!originalFile) {
      return new NextResponse('Original file could not be retrieved from storage', { status: 500 })
    }

    // Determine filename for download
    const originalFilename = document.storage_path.split('/').pop() || `${document.title}.pdf`
    const downloadFilename = originalFilename.includes('.') ? originalFilename : `${originalFilename}.pdf`

    // Convert blob to array buffer for response
    const fileBuffer = await originalFile.arrayBuffer()

    console.log(`Serving original file: ${downloadFilename} (${Math.round(fileBuffer.byteLength / 1024)} KB)`)

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
    
    if (error instanceof Error) {
      // Handle authentication errors first
      if (error.message.includes('Authentication failed') || error.message.includes('User not authenticated')) {
        return new NextResponse('Authentication required', { status: 401 })
      }
      
      if (error.message.includes('not found') || error.message.includes('PGRST116')) {
        return new NextResponse('Document or file not found', { status: 404 })
      }
      
      if (error.message.includes('storage') || error.message.includes('bucket')) {
        return new NextResponse('Storage service error. Please try again later.', { status: 503 })
      }

      if (error.message.includes('permission') || error.message.includes('access')) {
        return new NextResponse('Access denied', { status: 403 })
      }
      
      return new NextResponse(`Download error: ${error.message}`, { status: 500 })
    }
    
    return new NextResponse('Unknown download error occurred', { status: 500 })
  }
}

// Alternative endpoint for direct file access via signed URL
export async function HEAD(request: NextRequest, context: RouteContext) {
  try {
    // Validate authentication first
    const user = await validateAuth()
    
    const { slug } = await context.params

    if (!slug) {
      return new NextResponse(null, { status: 400 })
    }

    // Initialize services
    const supabase = await createClient()
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