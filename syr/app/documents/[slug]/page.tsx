import { readFile } from 'fs/promises'
import { readdirSync } from 'fs'
import { join } from 'path'
import { DocumentViewer } from '@/components/document-viewer'
import { DocumentSummary } from '@/components/document-summary'
import { DocumentParser } from '@/lib/services/document-parser'
import { v4 as uuidv4 } from 'uuid'

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

export default async function DocumentPage({ params }: PageProps) {
  const { slug } = await params
  const doc = findDocumentBySlug(slug)
  
  if (!doc) {
    return <div className="p-8">Document not found</div>
  }

  const filePath = join(process.cwd(), 'static', 'examples', doc.filename)
  const html = await readFile(filePath, 'utf-8')
  
  const parser = new DocumentParser()
  const documentId = uuidv4()
  const elements = parser.parse(html, documentId)
  const markdownContent = parser.convertToMarkdown(html)
  
  console.log('Document Page: HTML preview (first 500 chars):', html.substring(0, 500))
  console.log('Document Page: Markdown preview (first 500 chars):', markdownContent.substring(0, 500))
  console.log('Document Page: HTML length:', html.length)
  console.log('Document Page: Markdown length:', markdownContent.length)

  return (
    <div className="h-screen">
      <div className="border-b px-4 py-2">
        <h1 className="text-xl font-semibold">{doc.title}</h1>
      </div>
      <DocumentSummary content={markdownContent} />
      <DocumentViewer elements={elements} />
    </div>
  )
}