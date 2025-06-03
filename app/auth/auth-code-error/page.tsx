import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Authentication Error
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              There was a problem with your authentication link. This could happen if:
            </p>
            <ul className="mt-4 text-sm text-gray-600 text-left space-y-1">
              <li>• The link has expired</li>
              <li>• The link has already been used</li>
              <li>• The link was corrupted or incomplete</li>
            </ul>
          </div>
          
          <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg sm:px-10">
            <div className="space-y-4">
              <p className="text-sm text-gray-700 text-center">
                Please try one of the following options:
              </p>
              
              <div className="space-y-3">
                <Button asChild size="full" variant="orange">
                  <Link href="/auth/signup">
                    Create a new account
                  </Link>
                </Button>
                
                <Button asChild size="full" variant="outline">
                  <Link href="/auth/login">
                    Log in to existing account
                  </Link>
                </Button>
                
                <Button asChild size="full" variant="ghost">
                  <Link href="/">
                    Return to homepage
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}