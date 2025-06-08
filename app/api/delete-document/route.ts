import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'

/**
 * POST /api/delete-document
 * Delete a document and its associated storage files
 */
export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json()
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const documentService = new DocumentService(supabase)
    
    // Delete document and associated storage files
    const deleted = await documentService.deleteWithStorage(documentId)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Document not found or could not be deleted' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Delete document error:', error)
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred while deleting the document'
      
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}