import Link from 'next/link'
import { AppHeader } from '@/components/app-header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { DeleteDocumentButton } from '@/components/delete-document-button'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { generateSlug } from '@/lib/utils/slug'
import { getUserId } from '@/lib/auth/server-auth'
import type { Document } from '@/lib/types/database'
import { Plus } from '@phosphor-icons/react/dist/ssr/Plus'

async function getUserDocuments(): Promise<Document[]> {
  const supabase = await createClient()
  const documentService = new DocumentService(supabase)
  
  try {
    const userId = await getUserId()
    
    if (!userId) {
      return [] // No user logged in, return empty array
    }
    
    const documents = await documentService.getByUserId(userId)
    
    return documents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Sort by newest first
  } catch (error) {
    console.error('Failed to fetch user documents:', error)
    return []
  }
}

export default async function DocumentsPage() {
  const documents = await getUserDocuments()
  
  return (
    <div className="min-h-screen">
      <AppHeader 
        title="Documents" 
        actions={
          <div>
            <Button asChild variant="orange" size="sm">
              <Link href="/upload">
                <Plus size={16} />
                Add Document
              </Link>
            </Button>
          </div>
        }
      />
      
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
          <h2 className="text-2xl font-semibold">Your Documents</h2>
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No documents yet. Upload your first document to get started.</p>
              <Button asChild variant="orange">
                <Link href="/upload">
                  <Plus size={16} />
                  Upload Document
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
            {documents.map(doc => {
              // Generate slug from title to maintain URL compatibility
              const slug = generateSlug(doc.title)
                
              return (
                <div
                  key={doc.id}
                  className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Link
                    href={`/documents/${slug}`}
                    className="flex-1 min-w-0"
                  >
                    <h3 className="font-medium">{doc.title}</h3>
                    <p className="text-sm text-gray-500">
                      {doc.word_count ? `${doc.word_count.toLocaleString()} words` : 'No word count'}
                      {doc.language_code && doc.language_code !== 'en' && ` • ${doc.language_code.toUpperCase()}`}
                    </p>
                  </Link>
                  <div className="ml-4 flex-shrink-0">
                    <DeleteDocumentButton
                      documentId={doc.id}
                      documentTitle={doc.title}
                    />
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}