import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { validateAuth } from '@/lib/auth/server-auth'
import { getCurrentUserAdminStatus } from '@/lib/auth/admin-utils'
import { createRequestLogger, generateCorrelationId } from '@/lib/services/logger'

/**
 * POST /api/delete-document
 * Delete a document and its associated storage files
 * Requires authentication and user ownership
 */
export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/delete-document', correlationId)
  
  try {
    // Validate authentication first
    const user = await validateAuth()
    
    const { documentId } = await request.json()
    
    requestLogger.info({
      method: 'POST',
      userId: user.id,
      documentId: documentId || 'missing'
    }, 'Document deletion request')
    
    if (!documentId) {
      requestLogger.warn({ userId: user.id }, 'Document deletion failed - missing document ID')
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const documentService = new DocumentService(supabase)
    
    // Check if user owns the document or has admin access
    const isOwned = await documentService.isOwnedByUser(documentId, user.id)
    const adminStatus = await getCurrentUserAdminStatus()
    
    if (!isOwned && !adminStatus.isAdmin) {
      requestLogger.warn({
        userId: user.id,
        documentId,
        isOwned,
        isAdmin: adminStatus.isAdmin
      }, 'Unauthorized document deletion attempt - access denied')
      
      return NextResponse.json(
        { error: 'Document not found' }, // Use 404 to prevent information leakage
        { status: 404 }
      )
    }
    
    // Delete document and associated storage files
    const deleted = await documentService.deleteWithStorage(documentId)
    
    if (!deleted) {
      requestLogger.warn({
        userId: user.id,
        documentId
      }, 'Document deletion failed - document not found or could not be deleted')
      
      return NextResponse.json(
        { error: 'Document not found or could not be deleted' },
        { status: 404 }
      )
    }

    requestLogger.info({
      userId: user.id,
      documentId,
      isAdmin: adminStatus.isAdmin
    }, 'Document deleted successfully')

    return NextResponse.json({ success: true })
    
  } catch (error) {
    requestLogger.error({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Delete document error')
    
    // Handle authentication errors first
    if (error instanceof Error && (error.message.includes('Authentication failed') || error.message.includes('User not authenticated'))) {
      requestLogger.warn({
        error: error.message
      }, 'Document deletion failed - authentication required')
      
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred while deleting the document'
      
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}