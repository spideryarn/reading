import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/auth/server-auth'
import { createClient } from '@/lib/supabase/server'
import { ProfileService } from '@/lib/services/database/profiles'
import { DocumentService } from '@/lib/services/database/documents'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DocumentList } from '@/components/document-list'
import { BackgroundForm } from '@/components/profile/background-form'
import { ArrowLeft, FileText } from '@phosphor-icons/react/dist/ssr'
import { formatProfileDate } from '@/lib/utils/date-formatting'

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
          {/* Profile Information and Background */}
          <div className="lg:col-span-1 space-y-6">
            {/* Account Information */}
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
                    <time 
                      dateTime={formatProfileDate(user.created_at).iso}
                      title={formatProfileDate(user.created_at).absolute}
                    >
                      {formatProfileDate(user.created_at).relative}
                    </time>
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Profile Created</label>
                  <p className="text-gray-900">
                    {profile?.created_at ? (
                      <time 
                        dateTime={formatProfileDate(profile.created_at).iso}
                        title={formatProfileDate(profile.created_at).absolute}
                      >
                        {formatProfileDate(profile.created_at).relative}
                      </time>
                    ) : (
                      'Unknown'
                    )}
                  </p>
                </div>
              </div>
            </Card>

            {/* Background Form */}
            <BackgroundForm initialBackground={profile?.background || ''} />
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

              <DocumentList
                documents={documents}
                emptyStateMessage="No documents yet. Upload your first document to get started."
                showDeleteActions={true}
                currentUserId={user.id}
              />
              
              {documents.length === 10 && (
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-600">
                    Showing your 10 most recent documents
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}