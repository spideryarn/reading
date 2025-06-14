import { DocumentParser } from '@/lib/services/document-parser'
import DocumentPageClient from './page-client'
import { MutationProvider } from '@/lib/context/mutation-context'
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
  const user = await requireAuth({
    returnTo: `/documents/${slug}`
  })
  
  const doc = await getDocumentBySlug(slug)
  
  if (!doc) {
    return <div className="p-8">Document not found</div>
  }

  // Get enhancement flags from the document_enhancements table
  const supabase = await createClient()
  const documentService = new DocumentService(supabase)
  const enhancementFlags = await documentService.getEnhancementFlags(doc.id)

  // Get HTML content from database
  const html = doc.html_content
  const markdownContent = doc.plaintext_content
  
  const parser = new DocumentParser()
  const documentId = doc.id
  const elements = parser.parse(html, documentId)

  return (
    <MutationProvider initialDocument={elements}>
      <DocumentPageClient 
        html={html}
        markdownContent={markdownContent}
        elements={elements}
        documentId={documentId}
        initialTitle={doc.title}
        slug={slug}
        storagePath={doc.storage_path}
        originalFileType={doc.original_file_type}
        documentCreatedAt={doc.created_at}
        documentSourceUrl={doc.source_url}
        aiHeadingsGenerated={enhancementFlags.aiHeadingsGenerated}
        summaryGenerated={enhancementFlags.summaryGenerated}
        glossaryGenerated={enhancementFlags.glossaryGenerated}
        ownerEmail={user.email}
        isPublic={doc.is_public}
      />
    </MutationProvider>
  )
}