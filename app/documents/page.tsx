import Link from 'next/link'
import { AppHeader } from '@/components/app-header'
import { Footer } from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { generateSlug } from '@/lib/utils/slug'
import type { Document } from '@/lib/types/database'

async function getDocuments(): Promise<Document[]> {
  const supabase = await createClient()
  const documentService = new DocumentService(supabase)
  
  try {
    const { documents } = await documentService.list({
      isPublic: true,
      limit: 50 // Get all public documents
    })
    
    return documents.sort((a, b) => a.title.localeCompare(b.title))
  } catch (error) {
    console.error('Failed to fetch documents:', error)
    return []
  }
}

export default async function DocumentsPage() {
  const documents = await getDocuments()
  
  return (
    <div className="min-h-screen">
      <AppHeader title="Documents" />
      
      <div className="pb-16 px-8">
        <div className="max-w-4xl mx-auto text-center py-16">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">Spideryarn Reading</h1>
          <p className="text-xl text-gray-600">
            AI-assisted document reading and analysis application
          </p>
        </div>
      </div>
      
      <main className="max-w-4xl mx-auto px-8">
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Sample Documents</h2>
          <div className="grid gap-4">
            {documents.map(doc => {
              // Generate slug from title to maintain URL compatibility
              const slug = generateSlug(doc.title)
                
              return (
                <Link
                  key={doc.id}
                  href={`/documents/${slug}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium">{doc.title}</h3>
                  <p className="text-sm text-gray-500">
                    {doc.word_count ? `${doc.word_count.toLocaleString()} words` : 'No word count'}
                    {doc.language_code && doc.language_code !== 'en' && ` • ${doc.language_code.toUpperCase()}`}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}