import { AppHeader } from "@/components/app-header"
import { SignupForm } from "@/components/auth/signup-form"

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Or{' '}
              <a
                href="/auth/login"
                className="font-medium text-spideryarn-orange hover:text-orange-500"
              >
                log in to your existing account
              </a>
            </p>
          </div>
          <SignupForm />
        </div>
      </main>
    </div>
  )
}