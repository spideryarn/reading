import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/auth/server-auth'
import { createClient } from '@/lib/supabase/server'
import { ProfileService } from '@/lib/services/database/profiles'
import { DocumentService } from '@/lib/services/database/documents'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, Clock, Globe } from '@phosphor-icons/react/dist/ssr'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const { user } = await getUser()
  
  if (!user) {
    redirect('/auth/login?next=/auth/profile')
  }

  const supabase = await createClient()
  const profileService = new ProfileService(supabase)
  const documentService = new DocumentService(supabase)

  // Get user profile
  const profile = await profileService.getByUserId(user.id)
  
  // Get user's documents
  const { documents } = await documentService.getByUserId(user.id, { limit: 10 })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Account Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Display Name</label>
                  <p className="text-gray-900">
                    {profile?.display_name || 'Not set'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Member Since</label>
                  <p className="text-gray-900">
                    {new Date(user.created_at).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Profile Created</label>
                  <p className="text-gray-900">
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Unknown'
                    }
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Documents */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Your Documents</h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText size={16} />
                  {documents.length} documents
                </div>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">No documents yet</p>
                  <Link href="/">
                    <Button>Upload Your First Document</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((document) => (
                    <div 
                      key={document.id} 
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Link 
                            href={`/documents/${document.slug}`}
                            className="text-lg font-medium text-gray-900 hover:text-orange-600 transition-colors"
                          >
                            {document.title}
                          </Link>
                          
                          {document.description && (
                            <p className="text-gray-600 mt-1 text-sm">
                              {document.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock size={14} />
                              {new Date(document.created_at).toLocaleDateString('en-GB')}
                            </div>
                            
                            {document.word_count && (
                              <div>{document.word_count.toLocaleString()} words</div>
                            )}
                            
                            <div className="flex items-center gap-1">
                              <Globe size={14} />
                              {document.is_public ? 'Public' : 'Private'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Link href={`/documents/${document.slug}`}>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                          
                          {document.is_public && (
                            <Link href={`/documents/${document.slug}/share`}>
                              <Button variant="outline" size="sm">Share</Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {documents.length === 10 && (
                    <div className="text-center pt-4">
                      <p className="text-sm text-gray-600">
                        Showing your 10 most recent documents
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}