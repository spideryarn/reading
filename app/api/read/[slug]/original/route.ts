import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { requireAuth } from '@/lib/auth/server-auth'
import { getCurrentUserAdminStatus } from '@/lib/auth/admin-utils'
import type { Database } from '@/lib/types/database'

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

async function getDocumentBySlug(slug: string): Promise<Document | null> {
  const supabase = await createClient()
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
    // Validate authentication first
    const user = await requireAuth()
    
    const { slug } = await params
    const doc = await getDocumentBySlug(slug)
    
    if (!doc) {
      return new Response('Document not found', { status: 404 })
    }

    // Check if user owns the document or has admin access
    const supabase = await createClient()
    const documentService = new DocumentService(supabase)
    const isOwned = await documentService.isOwnedByUser(doc.id, user.id)
    const adminStatus = await getCurrentUserAdminStatus()
    
    if (!isOwned && !adminStatus.isAdmin) {
      return new Response('Document not found', { status: 404 }) // Use 404 to prevent information leakage
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
    console.error('Original document API error:', error)
    
    // Handle authentication errors
    if (error instanceof Error && (error.message.includes('Authentication failed') || error.message.includes('User not authenticated'))) {
      return new Response('Authentication required', { status: 401 })
    }
    
    return new Response('Internal server error', { status: 500 })
  }
}