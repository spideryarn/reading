import Link from 'next/link'
import { AppHeader } from '@/components/app-header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { DeleteDocumentButton } from '@/components/delete-document-button'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { generateSlug } from '@/lib/utils/slug'
import { getUserId } from '@/lib/auth/server-auth'
import { getCurrentUserAdminStatus } from '@/lib/auth/admin-utils'
import type { Document } from '@/lib/types/database'
import { Plus } from '@phosphor-icons/react/dist/ssr/Plus'
import { Shield } from '@phosphor-icons/react/dist/ssr/Shield'
import { Globe } from '@phosphor-icons/react/dist/ssr/Globe'
import { Lock } from '@phosphor-icons/react/dist/ssr/Lock'
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'

async function getUserDocuments(): Promise<{ documents: Document[]; isAdmin: boolean }> {
  const supabase = await createClient()
  const documentService = new DocumentService(supabase)
  
  try {
    const userId = await getUserId()
    
    if (!userId) {
      return { documents: [], isAdmin: false } // No user logged in, return empty array
    }
    
    // Check if current user is admin
    const adminStatus = await getCurrentUserAdminStatus()
    const isAdmin = adminStatus.isAdmin
    
    let result
    if (isAdmin) {
      // Admin users see all documents in the system
      result = await documentService.list({ limit: 1000 }) // Large limit to get all documents
    } else {
      // Regular users see only their own documents
      result = await documentService.getByUserId(userId)
    }
    
    const sortedDocuments = result.documents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Sort by newest first
    
    return { documents: sortedDocuments, isAdmin }
  } catch (error) {
    console.error('Failed to fetch user documents:', error)
    return { documents: [], isAdmin: false }
  }
}

export default async function DocumentsPage() {
  const { documents, isAdmin } = await getUserDocuments()
  
  return (
    <div className="min-h-screen">
      <AppHeader 
        title="Documents" 
        logoLink="/read"
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
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">
              {isAdmin ? 'All Documents' : 'Your Documents'}
            </h2>
            {isAdmin && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-sm font-medium">
                <Shield size={16} />
                Admin View
              </div>
            )}
          </div>
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
                  className="flex items-center p-4 border rounded-lg transition-colors"
                >
                  <Link
                    href={`/read/${slug}`}
                    className="flex-1 min-w-0 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium">{doc.title}</h3>
                        <p className="text-sm text-gray-500">
                          {doc.word_count ? `${doc.word_count.toLocaleString()} words` : 'No word count'}
                          {doc.language_code && doc.language_code !== 'en' && ` • ${doc.language_code.toUpperCase()}`}
                          {isAdmin && doc.created_by && ` • Owner: ${doc.created_by.slice(0, 8)}...`}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                    <TooltipOrPopover
                      content={
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <div className="text-sm text-gray-700">
                            {doc.is_public === true ? (
                              <>This document is <strong>public</strong> and can be viewed by anyone with the link.</>
                            ) : (
                              <>This document is <strong>private</strong> and can only be viewed by you.</>
                            )}
                          </div>
                        </div>
                      }
                      side="top"
                      align="center"
                      sideOffset={8}
                      showIndicator={false}
                      contentClassName="p-0 bg-transparent border-0 shadow-none"
                    >
                      <div className="p-1">
                        {doc.is_public === true ? (
                          <Globe size={16} className="text-green-600" />
                        ) : (
                          <Lock size={16} className="text-gray-500" />
                        )}
                      </div>
                    </TooltipOrPopover>
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