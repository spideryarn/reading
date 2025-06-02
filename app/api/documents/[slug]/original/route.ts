import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { findDocumentBySlug } from '@/lib/utils/slug'
import type { Document } from '@/lib/types/database'

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
    // Get all public documents and find the one that matches the slug
    const { documents } = await documentService.list({
      isPublic: true,
      limit: 100
    })
    
    // Use utility function to find document by slug
    return findDocumentBySlug(documents, slug)
  } catch (error) {
    console.error('Failed to find document by slug:', error)
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const doc = await getDocumentBySlug(slug)
  
  if (!doc) {
    return new Response('Document not found', { status: 404 })
  }

  // Get HTML content from database
  const html = doc.html_content
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}