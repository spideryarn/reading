import { ResizableDocumentLayout } from '@/components/resizable-document-layout'

// Force dynamic rendering to avoid useSearchParams SSG issues
export const dynamic = 'force-dynamic'

// Simple test page for mobile screenshots
export default function TestMobilePage() {
  const mockElements = [
    {
      id: '1',
      type: 'heading' as const,
      level: 1,
      text: 'Introduction to Mobile Reading',
      properties: {}
    },
    {
      id: '2', 
      type: 'paragraph' as const,
      text: 'This is a test document to see how the Spideryarn Reading interface looks on mobile devices. We want to make sure that the layout is responsive and that whitespace is minimized on smaller screens.',
      properties: {}
    },
    {
      id: '3',
      type: 'heading' as const,
      level: 2,
      text: 'Key Features',
      properties: {}
    },
    {
      id: '4',
      type: 'paragraph' as const,
      text: 'The application includes AI-powered features like automatic table of contents generation, hierarchical summaries, glossary extraction, and intelligent navigation tools.',
      properties: {}
    },
    {
      id: '5',
      type: 'heading' as const,
      level: 2,
      text: 'Mobile Optimization',
      properties: {}
    },
    {
      id: '6',
      type: 'paragraph' as const,
      text: 'On mobile devices, screen real estate is limited. We need to ensure that padding, margins, and other whitespace elements are appropriately sized for smaller screens while maintaining readability.',
      properties: {}
    }
  ]

  return (
    <ResizableDocumentLayout
      elements={mockElements}
      documentId="test-doc"
      documentTitle="Mobile Test Document"
      documentUrl="https://example.com"
      aiHeadingsGenerated={true}
      summaryGenerated={true}
      ownerEmail="test@example.com"
    />
  )
}