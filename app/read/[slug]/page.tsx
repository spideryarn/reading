import { DocumentParser } from '@/lib/services/document-parser'
import DocumentPageClient from './page-client'
import { MutationProvider } from '@/lib/context/mutation-context'
import { getAuthUser } from '@/lib/auth/route-protection'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import type { Document } from '@/lib/types/database'
import { NotAuthorizedPage } from '@/components/not-authorized-page'

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
  
  // Check authentication status without requiring it
  const user = await getAuthUser()
  
  const doc = await getDocumentBySlug(slug)
  
  // If document not found or not accessible, show not authorized page
  // This conflates "not found" and "no permission" for security
  if (!doc) {
    return <NotAuthorizedPage userEmail={user?.email ?? null} slug={slug} />
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
        uploadMetadata={doc.upload_metadata}
        documentCreatedAt={doc.created_at}
        documentSourceUrl={doc.source_url}
        wordCount={doc.word_count}
        aiHeadingsGenerated={enhancementFlags.aiHeadingsGenerated}
        summaryGenerated={enhancementFlags.summaryGenerated}
        glossaryGenerated={enhancementFlags.glossaryGenerated}
        {...(user?.email !== undefined && { ownerEmail: user.email })}
        isPublic={doc.is_public}
      />
    </MutationProvider>
  )
}