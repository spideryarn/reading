import Link from 'next/link'
import { AppHeader } from '@/components/app-header'
import { DocumentParser } from '@/lib/services/document-parser'
import DocumentPageClient from '../page-client'
import { MutationProvider } from '@/lib/context/mutation-context'
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

export default async function DocumentSharePage({ params }: PageProps) {
  const { slug } = await params
  const doc = await getDocumentBySlug(slug)
  
  if (!doc) {
    return (
      <div className="h-screen flex flex-col">
        <AppHeader 
          title="Document Not Found"
          titleLink="/"
          logoLink="/read"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Document Not Found</h1>
            <p className="text-gray-600 mb-6">The document you&apos;re looking for doesn&apos;t exist.</p>
            <Link 
              href="/" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    )
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
        title={`${doc.title} (Shared)`}
        titleLink={`/read/${slug}/share`}
        logoLink="/read"
        actions={
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>📤 Shared Document</span>
            <a 
              href={`/read/${slug}`}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Log in to access full features
            </a>
          </div>
        }
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