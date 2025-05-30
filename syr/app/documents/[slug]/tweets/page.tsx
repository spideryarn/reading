import { readFile } from 'fs/promises'
import { readdirSync } from 'fs'
import { join } from 'path'
import Link from 'next/link'
import { DocumentParser } from '@/lib/services/document-parser'
import { TweetThreadPageClient } from './page-client'
import { AppHeader } from '@/components/app-header'

interface PageProps {
  params: Promise<{ slug: string }>
}

function findDocumentBySlug(slug: string): { filename: string; title: string } | null {
  const examplesDir = join(process.cwd(), 'static', 'examples')
  const files = readdirSync(examplesDir)
  
  // Find the file that matches this slug
  const matchingFile = files.find(file => {
    if (!file.endsWith('.html')) return false
    
    const fileSlug = file
      .replace('.html', '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    
    return fileSlug === slug
  })
  
  if (!matchingFile) return null
  
  return {
    filename: matchingFile,
    title: matchingFile.replace('.html', '')
  }
}

export default async function TweetThreadPage({ params }: PageProps) {
  const { slug } = await params
  const doc = findDocumentBySlug(slug)
  
  if (!doc) {
    return <div className="p-8">Document not found</div>
  }

  const filePath = join(process.cwd(), 'static', 'examples', doc.filename)
  const html = await readFile(filePath, 'utf-8')
  
  const parser = new DocumentParser()
  const markdownContent = parser.convertToMarkdown(html)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <AppHeader 
        title={`${doc.title} - Tweet Thread`}
        titleLink={`/documents/${slug}`}
      />

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back Button */}
        <div className="mb-8">
          <Link 
            href={`/documents/${slug}`}
            className="inline-flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:border-gray-300 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to {doc.title}</span>
          </Link>
        </div>
        
        <TweetThreadPageClient 
          documentContent={markdownContent} 
          documentTitle={doc.title}
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