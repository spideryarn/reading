import { ResizableDocumentLayout } from '@/components/resizable-document-layout'
import type { DocumentElement } from '@/lib/types/document'

// Force dynamic rendering to avoid useSearchParams SSG issues
export const dynamic = 'force-dynamic'

// Simple test page for mobile screenshots
export default function TestMobilePage() {
  const mockElements: DocumentElement[] = [
    {
      id: '1',
      document_id: 'test-doc',
      parent_id: null,
      tag_name: 'h1',
      content: 'Introduction to Mobile Reading',
      attributes: {},
      position: 0,
      level: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      document_id: 'test-doc',
      parent_id: null,
      tag_name: 'p',
      content: 'This is a test document to see how the Spideryarn Reading interface looks on mobile devices. We want to make sure that the layout is responsive and that whitespace is minimized on smaller screens.',
      attributes: {},
      position: 1,
      level: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      document_id: 'test-doc',
      parent_id: null,
      tag_name: 'h2',
      content: 'Key Features',
      attributes: {},
      position: 2,
      level: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '4',
      document_id: 'test-doc',
      parent_id: null,
      tag_name: 'p',
      content: 'The application includes AI-powered features like automatic table of contents generation, hierarchical summaries, glossary extraction, and intelligent navigation tools.',
      attributes: {},
      position: 3,
      level: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '5',
      document_id: 'test-doc',
      parent_id: null,
      tag_name: 'h2',
      content: 'Mobile Optimization',
      attributes: {},
      position: 4,
      level: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '6',
      document_id: 'test-doc',
      parent_id: null,
      tag_name: 'p',
      content: 'On mobile devices, screen real estate is limited. We need to ensure that padding, margins, and other whitespace elements are appropriately sized for smaller screens while maintaining readability.',
      attributes: {},
      position: 5,
      level: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]

  return (
    <ResizableDocumentLayout
      html="<h1>Introduction to Mobile Reading</h1><p>This is a test document...</p>"
      elements={mockElements}
      documentId="test-doc"
      markdownContent="# Introduction to Mobile Reading\n\nThis is a test document..."
      documentTitle="Mobile Test Document"
      documentCreatedAt={new Date().toISOString()}
      wordCount={150}
      slug="test-mobile-doc"
      storagePath="test/mobile"
      glossaryEntities={[]}
      isLoadingGlossary={false}
      showGlossary={false}
      glossaryError={null}
      glossaryCached={false}
      onLoadGlossary={() => {}}
    />
  )
}