import { RealtimeDemo } from '@/components/realtime-demo'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { generateSlug } from '@/lib/utils/slug'

export default async function RealtimeDemoPage() {
  const supabase = await createClient()
  const documentService = new DocumentService(supabase)
  
  // Get or create a demo document
  const demoDoc = await documentService.list({ limit: 1 })
  
  if (demoDoc.documents.length === 0) {
    // Create a demo document if none exist
    const title = 'Real-time Demo Document'
    const newDoc = await documentService.create({
      title,
      slug: generateSlug(title),
      html_content: '<h1>Demo Document</h1><p>This document is used for testing real-time enhancement updates.</p>',
      plaintext_content: 'Demo Document\nThis document is used for testing real-time enhancement updates.',
      source_url: 'https://example.com/demo',
      word_count: 10
    })
    
    if (newDoc) {
      demoDoc.documents = [newDoc]
    }
  }

  const document = demoDoc.documents[0]

  if (!document) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Real-time Demo</h1>
        <p className="text-red-600">Unable to create demo document. Please check database connection.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Real-time Subscription Demo</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Demo Document:</h2>
        <p><strong>Title:</strong> {document.title}</p>
        <p><strong>ID:</strong> <code className="text-sm bg-gray-200 px-1 rounded">{document.id}</code></p>
      </div>

      <RealtimeDemo documentId={document.id} />

      <div className="mt-8 p-4 border-t">
        <h3 className="font-semibold mb-2">Testing Real-time Updates:</h3>
        <p className="text-sm text-gray-600 mb-2">
          Open this page in multiple browser tabs to see real-time synchronisation.
          When you click &quot;Start Real-time Demo&quot; in one tab, all tabs will update simultaneously.
        </p>
        <p className="text-sm text-gray-600">
          You can also monitor the updates in Supabase Studio at{' '}
          <a href="http://localhost:54343" className="text-blue-600 underline">
            http://localhost:54343
          </a>
        </p>
      </div>
    </div>
  )
}