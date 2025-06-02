import { readFile } from 'fs/promises'
import { readdirSync } from 'fs'
import { join } from 'path'
import Link from 'next/link'
import { AppHeader } from '@/components/app-header'
import { DocumentParser } from '@/lib/services/document-parser'
import { v4 as uuidv4 } from 'uuid'
import DocumentPageClient from '../page-client'
import { MutationProvider } from '@/lib/context/mutation-context'

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

export default async function DocumentSharePage({ params }: PageProps) {
  const { slug } = await params
  const doc = findDocumentBySlug(slug)
  
  if (!doc) {
    return (
      <div className="h-screen flex flex-col">
        <AppHeader 
          title="Document Not Found"
          titleLink="/"
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

  const filePath = join(process.cwd(), 'static', 'examples', doc.filename)
  const html = await readFile(filePath, 'utf-8')
  
  const parser = new DocumentParser()
  const documentId = uuidv4()
  const elements = parser.parse(html, documentId)
  const markdownContent = parser.convertToMarkdown(html)

  return (
    <div className="h-screen flex flex-col">
      <AppHeader 
        title={`${doc.title} (Shared)`}
        titleLink={`/documents/${slug}/share`}
        actions={
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>📤 Shared Document</span>
            <a 
              href={`/documents/${slug}`}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Sign in to access full features
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