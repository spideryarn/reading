import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
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
          <Link href="/documents">
            Browse Documents
          </Link>
        </Button>
      </div>
    </div>
  )
}
