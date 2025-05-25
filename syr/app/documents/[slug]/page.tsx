import { readFile } from 'fs/promises'
import { join } from 'path'
import { DocumentViewer } from '@/components/document-viewer'
import { DocumentSummary } from '@/components/document-summary'
import { DocumentParser } from '@/lib/services/document-parser'
import { v4 as uuidv4 } from 'uuid'

const documents = {
  chalmers: {
    filename: 'Chalmers (1995) - Facing Up to the Problem of Consciousness.html',
    title: 'Facing Up to the Problem of Consciousness'
  },
  rhizome: {
    filename: 'Rhizome - 1000 Plateaus introduction - Lambert says yes 231210.html',
    title: 'Rhizome - 1000 Plateaus Introduction'
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function DocumentPage({ params }: PageProps) {
  const { slug } = await params
  const doc = documents[slug as keyof typeof documents]
  
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