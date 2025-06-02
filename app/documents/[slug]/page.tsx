import { AppHeader } from '@/components/app-header'
import { DocumentParser } from '@/lib/services/document-parser'
import DocumentPageClient from './page-client'
import { MutationProvider } from '@/lib/context/mutation-context'
import { DocumentHeaderActions } from '@/components/document-header-actions'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { findDocumentBySlug } from '@/lib/utils/slug'
import type { Document } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ slug: string }>
}

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

export default async function DocumentPage({ params }: PageProps) {
  const { slug } = await params
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