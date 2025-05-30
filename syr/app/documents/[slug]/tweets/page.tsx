import { readFile } from 'fs/promises'
import { readdirSync } from 'fs'
import { join } from 'path'
import { DocumentParser } from '@/lib/services/document-parser'
import { TweetThreadView } from '@/components/tweet-thread-view'
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
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title="Tweet Thread"
        backLink={`/documents/${slug}`}
        backText="Back to document"
      />

      {/* Document title */}
      <div className="max-w-4xl mx-auto px-6 py-4 bg-white border-b">
        <div className="text-sm text-gray-600">{doc.title}</div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <TweetThreadView documentContent={markdownContent} isActive={true} />
      </div>
    </div>
  )
}