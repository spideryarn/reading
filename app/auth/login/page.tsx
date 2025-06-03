import { AppHeader } from "@/components/app-header"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Or{' '}
              <a
                href="/auth/signup"
                className="font-medium text-spideryarn-orange hover:text-orange-500"
              >
                create a new account
              </a>
            </p>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  )
}