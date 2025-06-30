import Link from 'next/link'
import { TweetThreadPageClient } from './page-client'
import { AppHeader } from '@/components/app-header'
import { requireAuth } from '@/lib/auth/server-auth'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { createRequestLogger, generateCorrelationId } from '@/lib/services/logger'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getDocumentBySlug(slug: string) {
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

export default async function TweetThreadPage({ params }: PageProps) {
  const { slug } = await params
  
  // Require authentication for tweet thread access
  await requireAuth({
    redirectTo: `/auth/login?next=/read/${slug}/tweets`
  })
  
  const doc = await getDocumentBySlug(slug)
  
  // Initialise structured logging for this request
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/read/[slug]/tweets', correlationId)

  requestLogger.info({
    slug,
    correlationId,
    found: Boolean(doc)
  }, 'Tweet thread page request received')
  
  if (!doc) {
    requestLogger.error({
      slug,
      correlationId
    }, 'Document not found when rendering tweet thread page')
    return <div className="p-8">Document not found</div>
  }

  const MIN_CHARS = 100

  const documentContent = (doc.plaintext_content || '').trim()

  // Fail-fast if unexpectedly short (likely ingestion bug)
  if (documentContent.length < MIN_CHARS) {
    const errMsg = `Unexpectedly short plaintext_content for tweet thread (length=${documentContent.length}, expected > ${MIN_CHARS}). This suggests the document ingestion pipeline failed.`

    requestLogger.error({
      correlationId,
      documentId: doc.id,
      plaintextLength: documentContent.length,
      wordCount: doc.word_count || null,
      slug,
      title: doc.title
    }, errMsg)

    throw new Error(errMsg)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <AppHeader 
        title={`${doc.title} - Tweet Thread`}
        titleLink={`/read/${slug}`}
        logoLink="/read"
      />

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back Button */}
        <div className="mb-8">
          <Link 
            href={`/read/${slug}`}
            className="inline-flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:border-gray-300 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to {doc.title}</span>
          </Link>
        </div>
        
        <TweetThreadPageClient 
          documentContent={documentContent} 
          documentTitle={doc.title}
          documentId={doc.id}
          slug={slug}
        />
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-20 right-10 w-32 h-32 bg-blue-200/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-10 w-40 h-40 bg-indigo-200/20 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-100/10 rounded-full blur-2xl"></div>
      </div>
    </div>
  )
}