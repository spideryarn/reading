import { AppHeader } from '@/components/app-header'
import { DocumentParser } from '@/lib/services/document-parser'
import DocumentPageClient from './page-client'
import { MutationProvider } from '@/lib/context/mutation-context'
import { DocumentHeaderActions } from '@/components/document-header-actions'
import { requireAuth } from '@/lib/auth/route-protection'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import type { Document } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ slug: string }>
}

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

export default async function DocumentPage({ params }: PageProps) {
  const { slug } = await params
  
  // Require authentication for document access
  await requireAuth({
    returnTo: `/documents/${slug}`
  })
  
  const doc = await getDocumentBySlug(slug)
  
  if (!doc) {
    return <div className="p-8">Document not found</div>
  }

  // Get HTML content from database
  const html = doc.html_content
  const markdownContent = doc.plaintext_content
  
  const parser = new DocumentParser()
  const documentId = doc.id
  const elements = parser.parse(html, documentId)

  return (
    <div className="h-screen flex flex-col">
      <AppHeader 
        title={doc.title}
        titleLink={`/documents/${slug}`}
        actions={<DocumentHeaderActions slug={slug} />}
      />
      <MutationProvider initialDocument={elements}>
        <DocumentPageClient 
          html={html}
          markdownContent={markdownContent}
          elements={elements}
          documentId={documentId}
        />
      </MutationProvider>
    </div>
  )
}