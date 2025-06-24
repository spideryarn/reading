import { AppHeader } from "@/components/app-header"
import Link from "next/link"
import { notFound } from "next/navigation"

interface NotAuthorizedPageProps {
  userEmail?: string | null
  slug: string
}

export function NotAuthorizedPage({ }: NotAuthorizedPageProps) {
  // Return 404-like response for security (conflates not found with no permission)
  notFound()
}

export function NotAuthorizedPageComponent({ userEmail }: NotAuthorizedPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Document Not Available
            </h2>
            <p className="mt-4 text-base text-gray-600">
              You don&apos;t have permission to view this document.
            </p>
            {userEmail ? (
              <div className="mt-6">
                <p className="text-sm text-gray-500">
                  Currently logged in as: <span className="font-medium">{userEmail}</span>
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  This document may be private or may not exist.
                </p>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-sm text-gray-600">
                  This document may require you to log in to view it.
                </p>
                <Link
                  href={`/auth/login?next=${encodeURIComponent(`/read/${slug}`)}`}
                  className="mt-4 inline-block font-medium text-spideryarn-orange hover:text-orange-500"
                >
                  Log in to access this document
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}