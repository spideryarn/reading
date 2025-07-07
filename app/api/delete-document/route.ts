import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { requireAuth } from '@/lib/auth/server-auth'
import { getCurrentUserAdminStatus } from '@/lib/auth/admin-utils'
import { createRequestLogger, generateCorrelationId } from '@/lib/services/logger'
import { createProblemDetail } from '@/lib/api/error-utils'

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
    const user = await requireAuth({ allowBearer: true, request })
    
    const { documentId } = await request.json()
    
    requestLogger.info({
      method: 'POST',
      userId: user.id,
      documentId: documentId || 'missing'
    }, 'Document deletion request')
    
    if (!documentId) {
      requestLogger.warn({ userId: user.id }, 'Document deletion failed - missing document ID')
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/invalid-input',
        title: 'Document ID required',
        status: 400,
        detail: 'Please provide a valid documentId.',
        correlationId
      })
    }

    const supabase = await getSupabaseServerClient(request, { allowBearer: true })
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
      
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/document-not-found',
        title: 'Document not found',
        status: 404,
        detail: 'The specified document does not exist or you do not have permission to access it.',
        correlationId
      })
    }
    
    // Delete document and associated storage files
    const deleted = await documentService.deleteWithStorage(documentId)
    
    if (!deleted) {
      requestLogger.warn({
        userId: user.id,
        documentId
      }, 'Document deletion failed - document not found or could not be deleted')
      
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/document-deletion-failed',
        title: 'Document not found or could not be deleted',
        status: 404,
        detail: 'The specified document may have already been removed.',
        correlationId
      })
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
      
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/auth-required',
        title: 'Authentication required',
        status: 401,
        detail: 'Please sign in to delete documents.'
      })
    }
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred while deleting the document'
      
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/document-deletion-failed',
      title: 'Document deletion failed',
      status: 500,
      detail: errorMessage,
      correlationId
    })
  }
}