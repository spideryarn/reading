import { NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { requireAuth } from '@/lib/auth/server-auth'
import { getCurrentUserAdminStatus } from '@/lib/auth/admin-utils'
import { createProblemDetail } from '@/lib/api/error-utils'
import { generateCorrelationId } from '@/lib/services/logger'
import type { Database } from '@/lib/types/database-auto-generated'

type Document = Database['public']['Tables']['documents']['Row']

/**
 * API route to serve original HTML documents without any Spideryarn modifications.
 * 
 * This is implemented as an API route rather than a page route because Next.js's 
 * layout system makes it difficult to serve completely unmodified HTML. Page routes
 * always inherit the root layout (which includes the Spideryarn header), and there's
 * no clean way to bypass this. API routes, however, can return raw HTML with proper
 * Content-Type headers, allowing the browser to render the original document exactly
 * as it would appear when opened directly in a browser.
 */

async function getDocumentBySlug(slug: string, request: NextRequest): Promise<Document | null> {
  const supabase = await getSupabaseServerClient(request)
  const documentService = new DocumentService(supabase)
  
  try {
    // Direct database lookup by slug (performance improvement)
    return await documentService.getBySlug(slug)
  } catch (error) {
    console.error('Failed to find document by slug:', error)
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const correlationId = generateCorrelationId()
    // Validate authentication first
    const user = await requireAuth({ allowBearer: true, request })
    
    const { slug } = await params
    const doc = await getDocumentBySlug(slug, request)
    
    if (!doc) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/document-not-found',
        title: 'Document not found',
        status: 404,
        detail: 'Document not found.',
        correlationId
      })
    }

    // Check if user owns the document or has admin access
    const supabase = await getSupabaseServerClient(request, { allowBearer: true })
    const documentService = new DocumentService(supabase)
    const isOwned = await documentService.isOwnedByUser(doc.id, user.id)
    const adminStatus = await getCurrentUserAdminStatus()
    
    if (!isOwned && !adminStatus.isAdmin) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/document-not-found',
        title: 'Document not found',
        status: 404,
        detail: 'Document not found.',
        correlationId
      }) // Use 404 to prevent information leakage
    }

    // Get HTML content from database
    const html = doc.html_content
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    const correlationId = generateCorrelationId()
    console.error('Original document API error:', error)
    
    // Handle authentication errors
    if (error instanceof Error && (error.message.includes('Authentication failed') || error.message.includes('User not authenticated'))) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/auth-required',
        title: 'Authentication required',
        status: 401,
        detail: 'Authentication required.',
        correlationId
      })
    }
    
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/internal-server-error',
      title: 'Internal server error',
      status: 500,
      detail: 'Internal server error.',
      correlationId
    })
  }
}