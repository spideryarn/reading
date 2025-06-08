import { redirect } from 'next/navigation'
import { AppHeader } from "@/components/app-header"
import { LoginForm } from "@/components/auth/login-form"
import { getUser } from "@/lib/auth/server-auth"

interface LoginPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { user } = await getUser()
  
  // If user is already logged in, redirect them
  if (user) {
    const nextUrl = typeof searchParams.next === 'string' ? searchParams.next : null
    
    // Basic validation: ensure it's a relative URL to prevent open redirects
    if (nextUrl && nextUrl.startsWith('/') && !nextUrl.startsWith('//') && !nextUrl.startsWith('/auth/')) {
      redirect(nextUrl)
    } else {
      redirect('/')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Log in to your account
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