import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAuthUser } from '@/lib/auth/server-auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  // Check if user is authenticated
  const user = await getAuthUser()
  
  // Redirect to /read if user is logged in
  if (user) {
    redirect('/read')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">Spideryarn Reading</h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-assisted reading and analysis application
        </p>
        <Button
          asChild
          variant="blue"
          size="lg"
        >
          <Link href="/read">
            Browse Documents
          </Link>
        </Button>
      </div>
    </div>
  )
}
